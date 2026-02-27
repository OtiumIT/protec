/**
 * Extração de 100% dos dados da Declaração de Ajuste Anual (DAA) do IRPF a partir de PDF,
 * usando OpenAI para interpretar o conteúdo e retornar JSON estruturado completo.
 * Requer OPENAI_API_KEY no ambiente.
 */

import OpenAI from 'openai';
import { DadosIrpfAltaRendaSchema, DeclaracaoIrpfCompletaSchema } from '@shared/core';
import { z } from 'zod';
import { classificarIsentosArt16A, identificarOutrosExcluidosArt16A } from './calculations';

// ── Formatos de fallback (LLM às vezes retorna estrutura diferente) ─────────────

const OldFormatRendPJ = z.object({ fonte: z.string().optional(), cnpj: z.string().optional(), valor: z.number().nonnegative().default(0) });
const OldFormatRendPF = z.object({ mes: z.string().optional(), valor: z.number().nonnegative().default(0) });
const OldFormatRendIsento = z.object({ nome_fonte: z.string().optional(), cnpj_fonte: z.string().optional(), valor: z.number().nonnegative().default(0) });
const OldFormatSchema = z.object({
  ano: z.number().int().min(2020).max(2035).default(new Date().getFullYear()),
  contribuinte: z.object({ nome: z.string().default(''), cpf: z.string().default('') }),
  base_calculo_alta_renda: z.object({
    tributaveis_pj: z.array(OldFormatRendPJ).default([]),
    tributaveis_pf_alugueis: z.array(OldFormatRendPF).default([]),
    isentos_lucros_dividendos: z.array(OldFormatRendIsento).default([]),
    isentos_simples_nacional: z.array(OldFormatRendIsento).default([]),
  }),
  outros_rendimentos: z.object({
    aplicacoes_financeiras_exclusiva: z.number().nonnegative().default(0),
    juros_capital_proprio: z.number().nonnegative().default(0),
    poupanca_lci_lca: z.number().nonnegative().default(0),
  }).optional().default({}),
  patrimonio_imobiliario: z.array(z.object({ descricao: z.string().optional(), valor_atual: z.number().nonnegative().default(0) })).default([]),
}).passthrough();

type OldFormatResult = z.infer<typeof OldFormatSchema>;

export type ExtractIrpfFromPdfResult = {
  declaracao_completa: z.infer<typeof DeclaracaoIrpfCompletaSchema>;
  ano: number;
  dados: z.infer<typeof DadosIrpfAltaRendaSchema>;
  diagnostico?: {
    fonte: 'pdf_texto' | 'pdf_escaneado';
    completude: 'alta' | 'media' | 'baixa';
    avisos: string[];
  };
};

// ── Prompt unificado (extração em contexto único) ──────────────────────────────

const SYSTEM_PROMPT_SINGLE_PASS = `Você é um especialista em contabilidade tributária brasileira e extração de tabelas da Declaração de IRPF.

Objetivo: reconstruir 100% dos dados da declaração em UM ÚNICO JSON, sem resumir listas.

Regras obrigatórias:
1) Integridade numérica:
- PROIBIDO retornar 0, 0.00 ou null quando houver valor monetário legível associado ao item no texto.
- Se descrição e valor estiverem separados, faça varredura na mesma linha ou na linha imediatamente abaixo (padrão tabular do IRPF).
- Só use null quando o valor realmente estiver ilegível/ausente no documento.

2) Reconstrução de tabelas:
- Trate o texto extraído como tabelas por linhas.
- Cada linha representa uma entidade única: descrição e colunas monetárias da mesma linha pertencem ao mesmo item.
- Em "Bens e Direitos", respeite colunas como situação em 31/12 de anos distintos; capture o valor do ano mais recente como valor_atual e preserve contexto em situacao_31dez quando disponível.

3) Não resumo:
- Extraia TODOS os itens de listas. Não agrupe, não consolide e não omita.
- Isso é obrigatório para: "Bens e Direitos", "Rendimentos Isentos e Não Tributáveis" e "Pagamentos Efetuados".

4) Ano da declaração:
- Confirme no cabeçalho: Exercício e Ano-Calendário.
- Exemplo de regra: Exercício 2025 corresponde a Ano-Calendário 2024.

5) Formato da resposta:
- A resposta deve ser estritamente um JSON válido, sem markdown e sem texto adicional.
- O JSON deve ser compatível com o schema canônico de declaração completa, contendo no mínimo:
  identificacao, dependentes, rendimentos_tributaveis_pj, rendimentos_tributaveis_pf, rendimentos_tributaveis_outros, rendimentos_isentos_nao_tributaveis, rendimentos_tributacao_exclusiva_definitiva, bens_direitos, dividas_onus, resumo, pagamentos_efetuados, doacoes_deducoes, lei_15_270_classificacao.
- Nunca invente CPF/CNPJ/fonte pagadora.`;

function previewForLog(value: string, maxLen = 2000): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}... [truncado ${normalized.length - maxLen} chars]`;
}

// ── Extração em chamada única (contexto completo) ──────────────────────────────

async function extractSinglePassFromText(openai: OpenAI, text: string): Promise<string> {
  console.log('[extractIrpfFromPdf] Iniciando extração em chamada única. text.length:', text.length);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_SINGLE_PASS },
      {
        role: 'user',
        content:
          `Analise o conteúdo integral da Declaração de IRPF abaixo e extraia todos os campos no formato JSON canônico.\n` +
          `Não resuma listas, não omita itens e preserve os valores monetários por linha.\n\n${text}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Resposta vazia do modelo na extração textual.');
  }
  console.log('[extractIrpfFromPdf] retorno bruto chamada única:', previewForLog(content));
  return content;
}

/** Prompt para PDF escaneado (1 chamada via Files API) */
const SYSTEM_PROMPT_FILES = `${SYSTEM_PROMPT_SINGLE_PASS}
Adicional para PDF escaneado:
- Considere possíveis ruídos de OCR e preserve alinhamento tabular quando possível.
- Mesmo com OCR parcial, extraia todos os itens legíveis das seções obrigatórias.`;

type ExtractionCompleteness = 'alta' | 'media' | 'baixa';

type ExtractionQuality = {
  score: number;
  completude: ExtractionCompleteness;
  secoesFracas: string[];
  suspectedMostlyZero: boolean;
};

function hasMeaningfulMoney(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) > 0;
}

function hasAnyMoneyInSection(section: { total?: number; itens?: unknown[] } | undefined): boolean {
  if (!section) return false;
  if (hasMeaningfulMoney(section.total)) return true;
  for (const item of section.itens ?? []) {
    if (!item || typeof item !== 'object') continue;
    for (const v of Object.values(item as Record<string, unknown>)) {
      if (hasMeaningfulMoney(v)) return true;
    }
  }
  return false;
}

function sumMoneyFromSectionItems(section: { itens?: unknown[] } | undefined): number {
  if (!section?.itens?.length) return 0;
  let sum = 0;
  for (const item of section.itens) {
    if (!item || typeof item !== 'object') continue;
    const value = (item as Record<string, unknown>).valor;
    if (typeof value === 'number' && Number.isFinite(value)) {
      sum += value;
    }
  }
  return Math.round(sum * 100) / 100;
}

function evaluateExtractionQuality(d: z.infer<typeof DeclaracaoIrpfCompletaSchema>): ExtractionQuality {
  const identificacao = d.identificacao ?? ({} as Record<string, unknown>);
  const resumo = d.resumo ?? ({} as Record<string, unknown>);
  const pj = d.rendimentos_tributaveis_pj;
  const pf = d.rendimentos_tributaveis_pf;
  const outrosTrib = d.rendimentos_tributaveis_outros;
  const isentos = d.rendimentos_isentos_nao_tributaveis;
  const exclusiva = d.rendimentos_tributacao_exclusiva_definitiva;
  const bens = d.bens_direitos;
  const dividas = d.dividas_onus;

  const checks = [
    {
      nome: 'identificacao',
      ok:
        String((identificacao as any).nome ?? '').trim().length > 2 ||
        String((identificacao as any).cpf ?? '').replace(/\D/g, '').length >= 11,
    },
    {
      nome: 'tributaveis',
      ok:
        hasAnyMoneyInSection(pj) ||
        hasAnyMoneyInSection(pf) ||
        hasAnyMoneyInSection(outrosTrib) ||
        ((pj?.itens?.length ?? 0) + (pf?.itens?.length ?? 0) + (outrosTrib?.itens?.length ?? 0) > 0),
    },
    {
      nome: 'isentos',
      ok: hasAnyMoneyInSection(isentos) || (isentos?.itens?.length ?? 0) > 0,
    },
    {
      nome: 'resumo',
      ok: Object.values(resumo).some((v) => hasMeaningfulMoney(v)),
    },
    {
      nome: 'bens_dividas',
      ok:
        hasAnyMoneyInSection(bens) ||
        hasAnyMoneyInSection(dividas) ||
        ((bens?.itens?.length ?? 0) + (dividas?.itens?.length ?? 0) > 0),
    },
  ];

  const points = checks.filter((c) => c.ok).length;
  const score = Math.round((points / checks.length) * 100);
  const secoesFracas = checks.filter((c) => !c.ok).map((c) => c.nome);

  const moneySignals = [
    hasAnyMoneyInSection(pj),
    hasAnyMoneyInSection(pf),
    hasAnyMoneyInSection(outrosTrib),
    hasAnyMoneyInSection(isentos),
    hasAnyMoneyInSection(exclusiva),
    hasAnyMoneyInSection(bens),
    hasAnyMoneyInSection(dividas),
    Object.values(resumo).some((v) => hasMeaningfulMoney(v)),
  ].filter(Boolean).length;

  const itemSignals =
    (pj?.itens?.length ?? 0) +
    (pf?.itens?.length ?? 0) +
    (outrosTrib?.itens?.length ?? 0) +
    (isentos?.itens?.length ?? 0) +
    (exclusiva?.itens?.length ?? 0) +
    (bens?.itens?.length ?? 0) +
    (dividas?.itens?.length ?? 0);

  const suspectedMostlyZero = moneySignals <= 1 && itemSignals <= 2;
  const completude: ExtractionCompleteness = score >= 80 ? 'alta' : score >= 45 ? 'media' : 'baixa';
  return { score, completude, secoesFracas, suspectedMostlyZero };
}

// ── Exportação principal ──────────────────────────────────────────────────────

export async function extractIrpfFromPdf(pdfBuffer: Buffer): Promise<ExtractIrpfFromPdfResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF.');
  }

  let text: string;
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    let result: any;
    try {
      // Tentativa de preservar estrutura de colunas para melhorar leitura tabular pelo modelo.
      result = await (parser as any).getText({ preserveStructure: true });
    } catch {
      result = await parser.getText();
    }
    text = typeof result?.text === 'string' ? result.text : String(result ?? '');
  } catch {
    throw new Error('Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido.');
  }

  const openai = new OpenAI({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  const hasText = cleanText.length > 200;

  console.log('[extractIrpfFromPdf] hasText:', hasText, 'cleanText.length:', cleanText.length);
  console.log('[extractIrpfFromPdf] preview do texto extraído do PDF:', previewForLog(cleanText, 2500));

  let rawContent: string | null | undefined;
  let diagnosticSource: 'pdf_texto' | 'pdf_escaneado' = hasText ? 'pdf_texto' : 'pdf_escaneado';
  const modelUsed: 'gpt-4o' = 'gpt-4o';

  if (hasText) {
    rawContent = await extractSinglePassFromText(openai, cleanText);
  } else {
    console.log('[extractIrpfFromPdf] PDF escaneado, usando Files API');
    const { toFile } = await import('openai');
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, 'declaracao_irpf.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    });
    try {
      const response = await openai.responses.create({
        model: 'gpt-4o',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_file', file_id: uploadedFile.id } as any,
              {
                type: 'input_text',
                text: `${SYSTEM_PROMPT_FILES}\n\nAnalise este PDF da Declaração de IRPF e extraia 100% dos dados. Retorne APENAS o JSON, sem markdown.`,
              } as any,
            ],
          },
        ],
        text: { format: { type: 'json_object' } } as any,
      } as any);
      const outputItem = (response as any).output?.find((o: any) => o.type === 'message');
      rawContent = outputItem?.content?.find((c: any) => c.type === 'output_text')?.text?.trim();
      if (rawContent) {
        console.log('[extractIrpfFromPdf] retorno bruto Files API:', previewForLog(rawContent));
      }
    } finally {
      await openai.files.delete(uploadedFile.id).catch(() => {});
    }
  }

  if (!rawContent) {
    throw new Error('Resposta vazia da extração. Tente novamente ou preencha manualmente.');
  }

  let parsed: unknown;
  try {
    console.log('[extractIrpfFromPdf] rawContent.length:', rawContent.length);
    console.log('[extractIrpfFromPdf] rawContent preview:', previewForLog(rawContent));
    parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === 'object') {
      console.log('[extractIrpfFromPdf] chaves no JSON parseado:', Object.keys(parsed as Record<string, unknown>));
    }
  } catch {
    throw new Error('Resposta da extração em formato inválido. Preencha os dados manualmente.');
  }

  // Tentar formato completo; se falhar por variação de estrutura, aplicar segunda normalização defensiva
  const normalizedBase = normalizeParsedToDeclaracao(parsed);
  let validatedFull = DeclaracaoIrpfCompletaSchema.safeParse(normalizedBase);
  if (!validatedFull.success) {
    const retryNormalized = collapseUnexpectedObjectArrays(normalizedBase);
    validatedFull = DeclaracaoIrpfCompletaSchema.safeParse(retryNormalized);
  }
  const warnings: string[] = [];
  if (validatedFull.success) {
    const ano = validatedFull.data.identificacao?.exercicio ?? validatedFull.data.identificacao?.ano_calendario ?? new Date().getFullYear();
    const dados = mapDeclaracaoCompletaToDados(validatedFull.data);
    const quality = evaluateExtractionQuality(validatedFull.data);
    const completudeBase: 'alta' | 'media' | 'baixa' = diagnosticSource === 'pdf_escaneado' ? 'media' : 'alta';
    let completude: 'alta' | 'media' | 'baixa' = completudeBase;
    if (quality.completude === 'baixa') completude = 'baixa';
    if (quality.completude === 'media' && completude === 'alta') completude = 'media';
    if (quality.suspectedMostlyZero) completude = 'baixa';
    if (quality.secoesFracas.length > 0) {
      warnings.push(`Seções com baixa cobertura: ${quality.secoesFracas.join(', ')}.`);
    }
    if (quality.suspectedMostlyZero) {
      warnings.push('Extração com poucos valores monetários identificados. Para maior confiabilidade, utilize o arquivo .dec/.dbk sempre que disponível.');
    }
    warnings.push(`Confiabilidade da extração: ${quality.completude}.`);
    warnings.push('Para maior precisão e consistência dos dados, a importação por arquivo .dec/.dbk é a opção mais confiável.');
    console.log('[extractIrpfFromPdf] quality:', quality, 'modelUsed:', modelUsed);
    return {
      declaracao_completa: validatedFull.data,
      ano,
      dados,
      diagnostico: {
        fonte: diagnosticSource,
        completude,
        avisos: warnings,
      },
    };
  }

  const validatedOld = OldFormatSchema.safeParse(parsed);
  if (validatedOld.success) {
    console.log('[extractIrpfFromPdf] Formato antigo detectado; convertendo');
    const declaracao_completa = mapOldFormatToDeclaracaoCompleta(validatedOld.data);
    const dados = mapOldFormatToDados(validatedOld.data);
    const quality = evaluateExtractionQuality(declaracao_completa);
    warnings.push('Formato legado detectado na extração. Recomenda-se validação manual dos campos antes da simulação.');
    if (quality.secoesFracas.length > 0) {
      warnings.push(`Seções com baixa cobertura: ${quality.secoesFracas.join(', ')}.`);
    }
    if (quality.suspectedMostlyZero) {
      warnings.push('Extração com poucos valores monetários identificados. Para maior confiabilidade, utilize o arquivo .dec/.dbk sempre que disponível.');
    }
    warnings.push(`Confiabilidade da extração: ${quality.completude}.`);
    warnings.push('Para maior precisão e consistência dos dados, a importação por arquivo .dec/.dbk é a opção mais confiável.');
    return {
      declaracao_completa,
      ano: validatedOld.data.ano,
      dados,
      diagnostico: {
        fonte: diagnosticSource,
        completude: quality.completude === 'alta' ? 'media' : quality.completude,
        avisos: warnings,
      },
    };
  }

  const firstErr = validatedFull.error?.errors?.[0];
  const path = firstErr?.path?.length ? firstErr.path.join('.') : 'root';
  const msg = firstErr?.message ? `${firstErr.message} @ ${path}` : 'estrutura invalida';
  throw new Error('Formato inesperado. Extraia os dados manualmente. (' + msg + ')');
}

/** Normaliza objeto parseado para estrutura DeclaracaoIrpfCompleta (nomes variam) */
function normalizeParsedToDeclaracao(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    const firstObject = parsed.find((item) => item && typeof item === 'object');
    if (firstObject) {
      return normalizeParsedToDeclaracao(firstObject);
    }
    return {};
  }
  if (parsed && typeof parsed === 'object') {
    const p = parsed as Record<string, unknown>;
    const identificacao = normalizeObjectField(p.identificacao ?? p.contribuinte);
    const resumo = normalizeObjectField(p.resumo);
    const lei15270 = normalizeObjectField(p.lei_15_270_classificacao);
    const dependentes = normalizeStructuredArrayField(p.dependentes, 'dependentes');
    const pagamentosEfetuados = normalizeStructuredArrayField(p.pagamentos_efetuados, 'pagamentos');
    const doacoesDeducoes = normalizeStructuredArrayField(p.doacoes_deducoes, 'doacoes');
    return coerceNumericFields({
      identificacao,
      dependentes,
      rendimentos_tributaveis_pj: normalizeSectionWithItems(p.rendimentos_tributaveis_pj, 'rendimentos_tributaveis_pj'),
      rendimentos_tributaveis_pf: normalizeSectionWithItems(p.rendimentos_tributaveis_pf, 'rendimentos_tributaveis_pf'),
      rendimentos_tributaveis_outros: normalizeSectionWithItems(p.rendimentos_tributaveis_outros, 'rendimentos_tributaveis_outros'),
      rendimentos_isentos_nao_tributaveis: normalizeSectionWithItems(p.rendimentos_isentos_nao_tributaveis, 'rendimentos_isentos_nao_tributaveis'),
      rendimentos_tributacao_exclusiva_definitiva: normalizeSectionWithItems(p.rendimentos_tributacao_exclusiva_definitiva, 'rendimentos_tributacao_exclusiva_definitiva'),
      bens_direitos: normalizeSectionWithItems(p.bens_direitos, 'bens_direitos'),
      dividas_onus: normalizeSectionWithItems(p.dividas_onus, 'dividas_onus'),
      resumo: {
        base_calculo_ir: 0,
        imposto_devido: 0,
        imposto_pago_retencao: 0,
        imposto_a_restituir: 0,
        imposto_a_pagar: 0,
        ...resumo,
      },
      lei_15_270_classificacao: {
        ganho_capital_excluido: 0,
        rendimentos_fiis_excluidos: 0,
        lucros_aprovados_ate_31dez2025: 0,
        outros_excluidos_art_16a: 0,
        ...lei15270,
      },
      pagamentos_efetuados: pagamentosEfetuados,
      doacoes_deducoes: doacoesDeducoes,
      informacoes_complementares: p.informacoes_complementares ?? '',
    });
  }
  return parsed;
}

function normalizeArrayField(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.itens)) return obj.itens;
    if (Object.keys(obj).length === 0) return [];
    return [obj];
  }
  return [];
}

function normalizeDependenteItem(item: unknown): Record<string, unknown> | null {
  if (item && typeof item === 'object' && !Array.isArray(item)) return item as Record<string, unknown>;
  if (typeof item === 'string' && item.trim()) return { nome: item.trim(), cpf: '' };
  return null;
}

function normalizePagamentoItem(item: unknown): Record<string, unknown> | null {
  if (item && typeof item === 'object' && !Array.isArray(item)) return item as Record<string, unknown>;
  if (typeof item === 'string' && item.trim()) return { tipo: item.trim(), valor: 0 };
  const value = coerceMoneyValue(item);
  if (value != null) return { tipo: undefined, valor: value };
  return null;
}

function normalizeDoacaoItem(item: unknown): Record<string, unknown> | null {
  if (item && typeof item === 'object' && !Array.isArray(item)) return item as Record<string, unknown>;
  if (typeof item === 'string' && item.trim()) return { descricao: item.trim(), valor: 0 };
  const value = coerceMoneyValue(item);
  if (value != null) return { descricao: undefined, valor: value };
  return null;
}

function normalizeStructuredArrayField(
  value: unknown,
  kind: 'dependentes' | 'pagamentos' | 'doacoes'
): Record<string, unknown>[] {
  const raw = normalizeArrayField(value);
  const normalized = raw.map((item) => {
    if (kind === 'dependentes') return normalizeDependenteItem(item);
    if (kind === 'pagamentos') return normalizePagamentoItem(item);
    return normalizeDoacaoItem(item);
  });
  return normalized.filter((item): item is Record<string, unknown> => Boolean(item));
}

function normalizeObjectField(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (Array.isArray(value)) {
    const firstObject = value.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (firstObject) return firstObject as Record<string, unknown>;
  }
  return {};
}

function normalizeSectionItem(item: unknown, sectionKey?: string): Record<string, unknown> | null {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return item as Record<string, unknown>;
  }

  const text = typeof item === 'string' ? item.trim() : '';
  const parsedNumber = coerceMoneyValue(item);
  const asValue = parsedNumber ?? 0;

  if (sectionKey === 'rendimentos_isentos_nao_tributaveis') {
    return { codigo: '', descricao: text || undefined, valor: asValue };
  }
  if (sectionKey === 'dividas_onus') {
    return { descricao: text || undefined, valor: asValue };
  }
  if (sectionKey === 'bens_direitos') {
    return { descricao: text || undefined, valor_atual: asValue, situacao_31dez: '0' };
  }
  if (sectionKey === 'rendimentos_tributaveis_pj') {
    return { nome_fonte: text || undefined, valor: asValue };
  }
  if (sectionKey === 'rendimentos_tributaveis_pf') {
    return { descricao: text || undefined, valor: asValue };
  }
  if (sectionKey === 'rendimentos_tributacao_exclusiva_definitiva') {
    return { descricao: text || undefined, valor: asValue };
  }
  if (sectionKey === 'rendimentos_tributaveis_outros') {
    return { descricao: text || undefined, valor: asValue };
  }

  return text || parsedNumber != null ? { descricao: text || undefined, valor: asValue } : null;
}

function normalizeSectionWithItems(value: unknown, sectionKey?: string): { total: number; itens: unknown[] } {
  if (Array.isArray(value)) {
    return {
      total: 0,
      itens: value.map((item) => normalizeSectionItem(item, sectionKey)).filter((item): item is Record<string, unknown> => Boolean(item)),
    };
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const itens = normalizeArrayField(obj.itens ?? obj.items ?? obj.linhas)
      .map((item) => normalizeSectionItem(item, sectionKey))
      .filter((item): item is Record<string, unknown> => Boolean(item));
    const total = coerceMoneyValue(obj.total) ?? 0;
    return { total, itens };
  }
  return { total: 0, itens: [] };
}

const KNOWN_ARRAY_KEYS = new Set([
  'dependentes',
  'pagamentos_efetuados',
  'doacoes_deducoes',
  'itens',
]);

function collapseUnexpectedObjectArrays(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    if (key && KNOWN_ARRAY_KEYS.has(key)) {
      return value.map((item) => collapseUnexpectedObjectArrays(item));
    }
    const firstObject = value.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    return firstObject ? collapseUnexpectedObjectArrays(firstObject) : {};
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = collapseUnexpectedObjectArrays(v, k);
    }
    return out;
  }
  return value;
}

const NUMERIC_KEYS = new Set([
  'exercicio',
  'ano_calendario',
  'total',
  'valor',
  'irrf',
  'base_calculo_ir',
  'imposto_devido',
  'imposto_pago_retencao',
  'imposto_ja_pago_carne_leao',
  'imposto_carne_leao',
  'imposto_a_restituir',
  'imposto_a_pagar',
  'situacao_31dez',
  'valor_atual',
  'ganho_capital_excluido',
  'rendimentos_fiis_excluidos',
  'lucros_aprovados_ate_31dez2025',
  'outros_excluidos_art_16a',
]);

const YEAR_KEYS = new Set(['exercicio', 'ano_calendario']);

const MONEY_KEYS = new Set([
  'total',
  'valor',
  'irrf',
  'base_calculo_ir',
  'imposto_devido',
  'imposto_pago_retencao',
  'imposto_ja_pago_carne_leao',
  'imposto_carne_leao',
  'imposto_a_restituir',
  'imposto_a_pagar',
  'situacao_31dez',
  'valor_atual',
  'ganho_capital_excluido',
  'rendimentos_fiis_excluidos',
  'lucros_aprovados_ate_31dez2025',
  'outros_excluidos_art_16a',
]);

const NON_NUMERIC_KEYS = new Set([
  'cpf',
  'cnpj',
  'codigo',
  'mes',
  'nome',
  'nome_fonte',
  'nome_pagador',
  'descricao',
  'tipo_declaracao',
  'cpf_pagador',
  'cnpj_fonte',
  'informacoes_complementares',
]);

const STRING_KEYS = new Set([
  'cpf',
  'cnpj',
  'codigo',
  'mes',
  'nome',
  'nome_fonte',
  'nome_pagador',
  'descricao',
  'tipo_declaracao',
  'cpf_pagador',
  'cnpj_fonte',
  'situacao_31dez',
  'parentesco',
  'competencia',
  'codigo_receita',
  'tipo',
  'data_nascimento',
  'titulo_eleitor',
]);

function parsePtBrNumber(raw: string): number | null {
  const normalized = raw
    .replace(/[R$\s\u00A0]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function extractPtBrNumberFromText(raw: string): number | null {
  const candidates = raw.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:,\d{2})|-?\d+(?:\.\d+)?/g);
  if (!candidates?.length) return null;
  for (const candidate of candidates) {
    const parsed = parsePtBrNumber(candidate);
    if (parsed != null) return parsed;
    const fallback = Number(candidate.replace(',', '.'));
    if (Number.isFinite(fallback)) return fallback;
  }
  return null;
}

function coerceMoneyValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsedDirect = parsePtBrNumber(trimmed);
    if (parsedDirect != null) return parsedDirect;
    return extractPtBrNumberFromText(trimmed);
  }
  return null;
}

function coerceNumericFields(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => coerceNumericFields(item, key));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = coerceNumericFields(v, k);
    }
    return out;
  }
  if (typeof value === 'string' && key && NUMERIC_KEYS.has(key) && !NON_NUMERIC_KEYS.has(key)) {
    const parsed = coerceMoneyValue(value);
    // Para campos monetários com OCR ruidoso (ex.: "-", "N/A", ""), evita falha de schema.
    if (parsed == null && MONEY_KEYS.has(key)) return 0;
    if (parsed == null && YEAR_KEYS.has(key)) return new Date().getFullYear();
    return parsed ?? value;
  }
  if (typeof value === 'number' && key && STRING_KEYS.has(key)) {
    return String(value);
  }
  return value;
}

function mapDeclaracaoCompletaToDados(d: z.infer<typeof DeclaracaoIrpfCompletaSchema>): z.infer<typeof DadosIrpfAltaRendaSchema> {
  const ident = (d as any).identificacao ?? (d as any).contribuinte ?? {};
  const nome = String(ident?.nome ?? '').trim() || 'Contribuinte (verifique)';
  const cpf = String(ident.cpf ?? '').replace(/\D/g, '');

  const rtPj = d.rendimentos_tributaveis_pj ?? { total: 0, itens: [] };
  const rtPf = d.rendimentos_tributaveis_pf ?? { total: 0, itens: [] };
  const rtPjTotal = (rtPj.total ?? 0) > 0 ? (rtPj.total ?? 0) : sumMoneyFromSectionItems(rtPj);
  const rtPfTotal = (rtPf.total ?? 0) > 0 ? (rtPf.total ?? 0) : sumMoneyFromSectionItems(rtPf);
  const tributaveis_pj = (rtPj.itens ?? []).map((i: any) => ({ fonte: i.nome_fonte ?? i.fonte ?? '', cnpj: i.cnpj, valor: round2(i.valor ?? 0) }));
  let tributaveis_pf_alugueis = (rtPf.itens ?? []).map((i: any) => ({ mes: i.mes ?? '', valor: round2(i.valor ?? 0) }));
  if (tributaveis_pf_alugueis.length === 0 && rtPfTotal > 0) {
    tributaveis_pf_alugueis = [{ mes: 'Anual', valor: round2(rtPfTotal) }];
  }

  const isentos = d.rendimentos_isentos_nao_tributaveis?.itens ?? [];
  const isentos09 = isentos.filter((i: any) => String(i.codigo ?? '').includes('09')).map((i: any) => ({
    nome_fonte: i.nome_fonte ?? i.descricao ?? 'Lucros e dividendos',
    cnpj_fonte: i.cnpj_fonte,
    valor: round2(i.valor ?? 0),
    codigo: '09' as const,
  }));
  const isentos13 = isentos.filter((i: any) => String(i.codigo ?? '').includes('13')).map((i: any) => ({
    nome_fonte: i.nome_fonte ?? i.descricao ?? 'Sócio Simples',
    cnpj_fonte: i.cnpj_fonte,
    valor: round2(i.valor ?? 0),
    codigo: '13' as const,
  }));
  const rendimentos_isentos_dividendos = [...isentos09, ...isentos13];
  const classificacaoDeterministica = classificarIsentosArt16A(
    isentos.map((i: any) => ({
      codigo: String(i.codigo ?? ''),
      descricao: i.descricao ?? i.nome_fonte,
      nome_fonte: i.nome_fonte,
      valor: round2(i.valor ?? 0),
    }))
  );

  const excl = d.rendimentos_tributacao_exclusiva_definitiva?.itens ?? [];
  const aplicacoes = excl.filter((i: any) => String(i.codigo ?? '').includes('06')).reduce((s: number, i: any) => s + (i.valor ?? 0), 0);
  const jcp = excl.filter((i: any) => String(i.codigo ?? '').includes('10')).reduce((s: number, i: any) => s + (i.valor ?? 0), 0);
  const poupanca = (d.rendimentos_isentos_nao_tributaveis?.itens ?? [])
    .filter((i: any) => /poupanca|lci|lca|cra|cri/i.test(String(i.descricao ?? i.codigo ?? '')))
    .reduce((s: number, i: any) => s + (i.valor ?? 0), 0);

  const rendimentos_tributaveis = round2(rtPjTotal + rtPfTotal);

  const bens = d.bens_direitos?.itens ?? [];
  const patrimonio_imobiliario = bens
    .filter((i: any) => ['01', '11', '12'].includes(String(i.codigo ?? '')))
    .map((i: any) => ({ descricao: i.descricao ?? '', valor_atual: round2(i.valor_atual ?? 0) }));

  const resumo = (d as any).resumo ?? {};
  const impostoPagoRetencao = round2(Number(resumo.imposto_pago_retencao ?? 0));
  const impostoCarneLeao = round2(Number(resumo.imposto_ja_pago_carne_leao ?? resumo.imposto_carne_leao ?? 0));

  const impostoAplicacoes = round2(
    (excl as Array<{ codigo?: string; irrf?: number; valor?: number }>)
      .filter((i: any) => String(i.codigo ?? '').includes('06'))
      .reduce((s: number, i: any) => s + (i.irrf ?? 0), 0)
  );

  const tributadosLei7713 = excl.map((i: any) => ({
    descricao: i.descricao ?? i.nome_fonte ?? `Codigo ${i.codigo ?? 'N/A'}`,
    valor_bruto: round2(i.valor ?? 0),
    irrf: round2(i.irrf ?? 0),
    aliquota_irrf_percentual: 15,
  }));

  const lei15270 = (d as any).lei_15_270_classificacao ?? {};
  const ganhoCapital = round2(Number(lei15270.ganho_capital_excluido ?? 0));
  const fiisExcl = round2(Number(lei15270.rendimentos_fiis_excluidos ?? classificacaoDeterministica.rendimentos_fiis_excluidos ?? 0));
  const lucrosExcl = round2(Number(lei15270.lucros_aprovados_ate_31dez2025 ?? classificacaoDeterministica.lucros_aprovados_ate_31dez2025 ?? 0));
  const ganhoCapitalDeterministico = round2(Number(classificacaoDeterministica.ganho_capital_excluido ?? 0));
  const outrosExclLei = round2(Number(lei15270.outros_excluidos_art_16a ?? classificacaoDeterministica.outros_excluidos_art_16a ?? 0));

  const fiisFallback =
    fiisExcl === 0
      ? round2(
          (d.rendimentos_isentos_nao_tributaveis?.itens ?? []).filter((i: any) =>
            /fii|fundo imobili|fundo de investimento imobili/i.test(String(i.descricao ?? i.codigo ?? ''))
          ).reduce((s: number, i: any) => s + (i.valor ?? 0), 0)
        )
      : fiisExcl;
  const outrosExclFallback = outrosExclLei > 0 ? outrosExclLei : identificarOutrosExcluidosArt16A(isentos as Array<{ descricao?: string; valor?: number }>);

  return {
    contribuinte: { nome, cpf },
    rendimentos_tributaveis,
    rendimentos_isentos_dividendos,
    tributaveis_pj,
    tributaveis_pf_alugueis,
    isentos_lucros_dividendos: isentos09,
    isentos_simples_nacional: isentos13,
    outros_isentos_que_entram_base: classificacaoDeterministica.outros_isentos_que_entram_base,
    outros_rendimentos: {
      aplicacoes_financeiras_exclusiva: round2(aplicacoes),
      juros_capital_proprio: round2(jcp),
      poupanca_lci_lca: round2(poupanca),
    },
    patrimonio_imobiliario,
    imposto_ja_pago_retencao_fonte: impostoPagoRetencao,
    imposto_ja_pago_carne_leao: impostoCarneLeao,
    imposto_ja_pago_aplicacoes: impostoAplicacoes,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: lucrosExcl,
    ganho_capital_excluido: ganhoCapital > 0 ? ganhoCapital : ganhoCapitalDeterministico,
    rendimentos_fiis_excluidos: fiisFallback,
    outros_excluidos_art_16a: outrosExclFallback,
    rendimentos_tributados_exclusivamente_lei_7713: tributadosLei7713,
    optou_ajuste_anual_lei_7713: false,
    rendimentos_aplicacoes_financeiras_pj: 0,
    aliquota_irrf_comparativo_percentual: 15,
  };
}

function mapOldFormatToDeclaracaoCompleta(old: OldFormatResult): z.infer<typeof DeclaracaoIrpfCompletaSchema> {
  const bc = old.base_calculo_alta_renda ?? {};
  const pjTotal = (bc.tributaveis_pj ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const pfTotal = (bc.tributaveis_pf_alugueis ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const div09 = (bc.isentos_lucros_dividendos ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const div13 = (bc.isentos_simples_nacional ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);

  return {
    identificacao: {
      nome: old.contribuinte?.nome ?? '',
      cpf: old.contribuinte?.cpf ?? '',
      exercicio: old.ano,
      ano_calendario: old.ano,
    },
    dependentes: [],
    rendimentos_tributaveis_pj: { total: round2(pjTotal), itens: (bc.tributaveis_pj ?? []).map((i) => ({ nome_fonte: i.fonte, cnpj: i.cnpj, valor: i.valor })) },
    rendimentos_tributaveis_pf: {
      total: round2(pfTotal),
      itens: (bc.tributaveis_pf_alugueis ?? []).map((i) => ({ valor: i.valor, mes: i.mes })),
    },
    rendimentos_tributaveis_outros: { total: 0, itens: [] },
    rendimentos_isentos_nao_tributaveis: {
      total: round2(div09 + div13),
      itens: [
        ...(bc.isentos_lucros_dividendos ?? []).map((i) => ({ codigo: '09', nome_fonte: i.nome_fonte, cnpj_fonte: i.cnpj_fonte, valor: i.valor })),
        ...(bc.isentos_simples_nacional ?? []).map((i) => ({ codigo: '13', nome_fonte: i.nome_fonte, cnpj_fonte: i.cnpj_fonte, valor: i.valor })),
      ],
    },
    rendimentos_tributacao_exclusiva_definitiva: {
      total: round2((old.outros_rendimentos?.aplicacoes_financeiras_exclusiva ?? 0) + (old.outros_rendimentos?.juros_capital_proprio ?? 0)),
      itens: [],
    },
    bens_direitos: {
      total: (old.patrimonio_imobiliario ?? []).reduce((s, i) => s + (i.valor_atual ?? 0), 0),
      itens: (old.patrimonio_imobiliario ?? []).map((i) => ({ codigo: '01', descricao: i.descricao, valor_atual: i.valor_atual })),
    },
    dividas_onus: { total: 0, itens: [] },
    resumo: { base_calculo_ir: 0, imposto_devido: 0, imposto_pago_retencao: 0, imposto_a_restituir: 0, imposto_a_pagar: 0 },
    pagamentos_efetuados: [],
    doacoes_deducoes: [],
    lei_15_270_classificacao: {
      ganho_capital_excluido: 0,
      rendimentos_fiis_excluidos: 0,
      lucros_aprovados_ate_31dez2025: 0,
      outros_excluidos_art_16a: 0,
    },
    extraido_em: new Date().toISOString(),
    fonte: 'pdf_daa',
  };
}

function mapOldFormatToDados(old: OldFormatResult): z.infer<typeof DadosIrpfAltaRendaSchema> {
  const bc = old.base_calculo_alta_renda ?? {};
  const rendPj = (bc.tributaveis_pj ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const rendPf = (bc.tributaveis_pf_alugueis ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const outros = old.outros_rendimentos ?? {};

  const isentos09 = (bc.isentos_lucros_dividendos ?? []).map((i) => ({
    nome_fonte: i.nome_fonte ?? '',
    cnpj_fonte: i.cnpj_fonte,
    valor: round2(i.valor ?? 0),
    codigo: '09' as const,
  }));
  const isentos13 = (bc.isentos_simples_nacional ?? []).map((i) => ({
    nome_fonte: i.nome_fonte ?? '',
    cnpj_fonte: i.cnpj_fonte,
    valor: round2(i.valor ?? 0),
    codigo: '13' as const,
  }));

  return {
    contribuinte: { nome: old.contribuinte?.nome ?? '', cpf: (old.contribuinte?.cpf ?? '').replace(/\D/g, '') },
    rendimentos_tributaveis: round2(rendPj + rendPf),
    rendimentos_isentos_dividendos: [...isentos09, ...isentos13],
    tributaveis_pj: (bc.tributaveis_pj ?? []).map((i) => ({ fonte: i.fonte ?? '', cnpj: i.cnpj, valor: round2(i.valor ?? 0) })),
    tributaveis_pf_alugueis: (bc.tributaveis_pf_alugueis ?? []).map((i) => ({ mes: i.mes ?? '', valor: round2(i.valor ?? 0) })),
    isentos_lucros_dividendos: isentos09,
    isentos_simples_nacional: isentos13,
    outros_isentos_que_entram_base: [],
    rendimentos_aplicacoes_financeiras_pj: 0,
    aliquota_irrf_comparativo_percentual: 15,
    rendimentos_tributados_exclusivamente_lei_7713: [],
    outros_rendimentos: {
      aplicacoes_financeiras_exclusiva: round2(outros.aplicacoes_financeiras_exclusiva ?? 0),
      juros_capital_proprio: round2(outros.juros_capital_proprio ?? 0),
      poupanca_lci_lca: round2(outros.poupanca_lci_lca ?? 0),
    },
    patrimonio_imobiliario: (old.patrimonio_imobiliario ?? []).map((i) => ({ descricao: i.descricao ?? '', valor_atual: round2(i.valor_atual ?? 0) })),
    imposto_ja_pago_retencao_fonte: 0,
    imposto_ja_pago_carne_leao: 0,
    imposto_ja_pago_aplicacoes: 0,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: 0,
    ganho_capital_excluido: 0,
    rendimentos_fiis_excluidos: 0,
    outros_excluidos_art_16a: 0,
    optou_ajuste_anual_lei_7713: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
