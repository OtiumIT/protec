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

// ── Prompts por etapa (extração em até 4 etapas) ───────────────────────────────

const STAGE1_PROMPT = `Você é um especialista em contabilidade tributária brasileira. ETAPA 1: Extraia APENAS identificação, dependentes e resumo da Declaração de IRPF.

Retorne JSON com: "identificacao" (nome, cpf, data_nascimento, exercicio, ano_calendario, tipo_declaracao), "dependentes" (array), "resumo" (base_calculo_ir, imposto_devido, imposto_pago_retencao, imposto_a_restituir, imposto_a_pagar).
Use "" e 0 quando ausente. Nunca invente CPF/CNPJ. RETORNE APENAS JSON válido, sem markdown.`;

const STAGE2_PROMPT = `Você é um especialista em contabilidade tributária brasileira. ETAPA 2: Extraia APENAS rendimentos tributáveis da Declaração de IRPF.

Retorne JSON com: "rendimentos_tributaveis_pj" (total, itens com cnpj, nome_fonte, codigo, valor), "rendimentos_tributaveis_pf" (total, itens com cpf_pagador, nome_pagador, descricao, valor, mes), "rendimentos_tributaveis_outros" (total, itens), "rendimentos_tributacao_exclusiva_definitiva" (total, itens com codigo 06/10, descricao, valor).
Fichas: Recebidos de PJ, Recebidos de PF, Tributação exclusiva (aplicações, JCP). Mantenha centavos, não arredonde além de 2 casas. RETORNE APENAS JSON válido, sem markdown.`;

const STAGE3_PROMPT = `Você é um especialista em contabilidade tributária brasileira. ETAPA 3: Extraia rendimentos isentos e classifique conforme Lei 15.270/2025 (Art. 16-A § 1º).

Retorne JSON com:
1. "rendimentos_isentos_nao_tributaveis": { "total", "itens" } — cada item com codigo, descricao, cnpj_fonte, nome_fonte, valor
2. "lei_15_270_classificacao": { "ganho_capital_excluido", "rendimentos_fiis_excluidos", "lucros_aprovados_ate_31dez2025", "outros_excluidos_art_16a" }

CLASSIFICAÇÃO (valores a EXCLUIR da base de cálculo da alta renda):
- ganho_capital_excluido: Ganho de capital que NÃO é em bolsa/mercado organizado (venda imóveis, participações societárias, etc.)
- rendimentos_fiis_excluidos: Rendimentos de FIIs com 100+ cotistas
- lucros_aprovados_ate_31dez2025: Lucros/dividendos aprovados em assembleia até 31/12/2025
- outros_excluidos_art_16a: LHI, CRI, LIG, LCD e demais do Art. 16-A § 1º

Códigos isentos: 09 (lucros/dividendos), 13 (sócio Simples), 01/03 (herança). Para cada item, preserve codigo e descricao literal quando houver. Some e preencha lei_15_270_classificacao. RETORNE APENAS JSON válido, sem markdown.`;

const STAGE4_PROMPT = `Você é um especialista em contabilidade tributária brasileira. ETAPA 4: Extraia bens e direitos, dívidas, pagamentos e doações da Declaração de IRPF.

Retorne JSON com: "bens_direitos" (total, itens com codigo 01/02/11/12, descricao, situacao_31dez, valor_atual), "dividas_onus" (total, itens), "pagamentos_efetuados" (array), "doacoes_deducoes" (array), "informacoes_complementares".
RETORNE APENAS JSON válido, sem markdown.`;

// ── Extração em 4 etapas ───────────────────────────────────────────────────────

async function extractInStages(openai: OpenAI, text: string): Promise<{
  json: string;
  stageFailures: string[];
  wasTrimmed: boolean;
}> {
  const MAX_STAGE_TEXT = 18000;
  const trimmed = text.slice(0, MAX_STAGE_TEXT);
  const wasTrimmed = text.length > MAX_STAGE_TEXT;
  const stages = [
    { prompt: STAGE1_PROMPT, label: 'Etapa 1 (identificação)' },
    { prompt: STAGE2_PROMPT, label: 'Etapa 2 (rendimentos)' },
    { prompt: STAGE3_PROMPT, label: 'Etapa 3 (isentos + Lei 15.270)' },
    { prompt: STAGE4_PROMPT, label: 'Etapa 4 (bens, pagamentos)' },
  ];

  const merged: Record<string, unknown> = {};
  const stageFailures: string[] = [];
  for (const { prompt, label } of stages) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Extraia os dados da declaração de IRPF (${label}):\n\n${trimmed}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        Object.assign(merged, parsed);
      }
    } catch (err) {
      console.warn(`[extractIrpfFromPdf] ${label} falhou:`, err);
      stageFailures.push(label);
    }
  }
  return { json: JSON.stringify(merged), stageFailures, wasTrimmed };
}

/** Prompt completo para PDF escaneado (1 chamada via Files API) */
const SYSTEM_PROMPT_FILES = `Extraia 100% dos dados do PDF da Declaração de IRPF. Retorne JSON com: identificacao, dependentes, rendimentos_tributaveis_pj, rendimentos_tributaveis_pf, rendimentos_tributaveis_outros, rendimentos_isentos_nao_tributaveis, rendimentos_tributacao_exclusiva_definitiva, bens_direitos, dividas_onus, resumo, pagamentos_efetuados, doacoes_deducoes.
Inclua lei_15_270_classificacao: { ganho_capital_excluido, rendimentos_fiis_excluidos, lucros_aprovados_ate_31dez2025, outros_excluidos_art_16a }.
Regras: preservar códigos/descrições como no documento, não inventar fontes, usar 0 quando ausente, retornar APENAS JSON válido.`;

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
    const result = await parser.getText();
    text = typeof result?.text === 'string' ? result.text : String(result ?? '');
  } catch {
    throw new Error('Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido.');
  }

  const openai = new OpenAI({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  const hasText = cleanText.length > 200;

  console.log('[extractIrpfFromPdf] hasText:', hasText, 'cleanText.length:', cleanText.length);

  let rawContent: string | null | undefined;
  let diagnosticSource: 'pdf_texto' | 'pdf_escaneado' = hasText ? 'pdf_texto' : 'pdf_escaneado';
  let stageFailures: string[] = [];
  let wasTrimmed = false;

  if (hasText) {
    const extraction = await extractInStages(openai, cleanText);
    rawContent = extraction.json;
    stageFailures = extraction.stageFailures;
    wasTrimmed = extraction.wasTrimmed;
  } else {
    console.log('[extractIrpfFromPdf] PDF escaneado, usando Files API');
    const { toFile } = await import('openai');
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, 'declaracao_irpf.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    });
    try {
      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
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
    } finally {
      await openai.files.delete(uploadedFile.id).catch(() => {});
    }
  }

  if (!rawContent) {
    throw new Error('Resposta vazia da extração. Tente novamente ou preencha manualmente.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('Resposta da extração em formato inválido. Preencha os dados manualmente.');
  }

  // Tentar formato completo; se falhar, formato antigo
  const validatedFull = DeclaracaoIrpfCompletaSchema.safeParse(normalizeParsedToDeclaracao(parsed));
  const warnings: string[] = [];
  if (wasTrimmed) {
    warnings.push('Texto do PDF muito extenso; foi aplicada extração parcial por etapas para manter estabilidade.');
  }
  if (stageFailures.length > 0) {
    warnings.push(`Falha em etapas da extração (${stageFailures.join(', ')}). Revise os dados antes de simular.`);
  }
  if (validatedFull.success) {
    const ano = validatedFull.data.identificacao?.exercicio ?? validatedFull.data.identificacao?.ano_calendario ?? new Date().getFullYear();
    const dados = mapDeclaracaoCompletaToDados(validatedFull.data);
    const completude: 'alta' | 'media' | 'baixa' = stageFailures.length > 1 ? 'baixa' : stageFailures.length === 1 || wasTrimmed ? 'media' : 'alta';
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
    warnings.push('Formato legado detectado na extração. Recomenda-se validação manual dos campos antes da simulação.');
    return {
      declaracao_completa,
      ano: validatedOld.data.ano,
      dados,
      diagnostico: {
        fonte: diagnosticSource,
        completude: 'media',
        avisos: warnings,
      },
    };
  }

  const msg = validatedFull.error?.errors?.[0]?.message ?? 'estrutura invalida';
  throw new Error('Formato inesperado. Extraia os dados manualmente. (' + msg + ')');
}

/** Normaliza objeto parseado para estrutura DeclaracaoIrpfCompleta (nomes variam) */
function normalizeParsedToDeclaracao(parsed: unknown): unknown {
  if (parsed && typeof parsed === 'object') {
    const p = parsed as Record<string, unknown>;
    return {
      identificacao: p.identificacao ?? p.contribuinte ?? {},
      dependentes: p.dependentes ?? [],
      rendimentos_tributaveis_pj: p.rendimentos_tributaveis_pj ?? { total: 0, itens: [] },
      rendimentos_tributaveis_pf: p.rendimentos_tributaveis_pf ?? { total: 0, itens: [] },
      rendimentos_tributaveis_outros: p.rendimentos_tributaveis_outros ?? { total: 0, itens: [] },
      rendimentos_isentos_nao_tributaveis: p.rendimentos_isentos_nao_tributaveis ?? { total: 0, itens: [] },
      rendimentos_tributacao_exclusiva_definitiva: p.rendimentos_tributacao_exclusiva_definitiva ?? { total: 0, itens: [] },
      bens_direitos: p.bens_direitos ?? { total: 0, itens: [] },
      dividas_onus: p.dividas_onus ?? { total: 0, itens: [] },
      resumo: p.resumo ?? { base_calculo_ir: 0, imposto_devido: 0, imposto_pago_retencao: 0, imposto_a_restituir: 0, imposto_a_pagar: 0 },
      lei_15_270_classificacao: p.lei_15_270_classificacao ?? { ganho_capital_excluido: 0, rendimentos_fiis_excluidos: 0, lucros_aprovados_ate_31dez2025: 0, outros_excluidos_art_16a: 0 },
      pagamentos_efetuados: p.pagamentos_efetuados ?? [],
      doacoes_deducoes: p.doacoes_deducoes ?? [],
      informacoes_complementares: p.informacoes_complementares ?? '',
    };
  }
  return parsed;
}

function mapDeclaracaoCompletaToDados(d: z.infer<typeof DeclaracaoIrpfCompletaSchema>): z.infer<typeof DadosIrpfAltaRendaSchema> {
  const ident = (d as any).identificacao ?? (d as any).contribuinte ?? {};
  const nome = String(ident?.nome ?? '').trim() || 'Contribuinte (verifique)';
  const cpf = String(ident.cpf ?? '').replace(/\D/g, '');

  const rtPj = d.rendimentos_tributaveis_pj ?? { total: 0, itens: [] };
  const rtPf = d.rendimentos_tributaveis_pf ?? { total: 0, itens: [] };
  const tributaveis_pj = (rtPj.itens ?? []).map((i: any) => ({ fonte: i.nome_fonte ?? i.fonte ?? '', cnpj: i.cnpj, valor: round2(i.valor ?? 0) }));
  let tributaveis_pf_alugueis = (rtPf.itens ?? []).map((i: any) => ({ mes: i.mes ?? '', valor: round2(i.valor ?? 0) }));
  if (tributaveis_pf_alugueis.length === 0 && (rtPf.total ?? 0) > 0) {
    tributaveis_pf_alugueis = [{ mes: 'Anual', valor: round2(rtPf.total) }];
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

  const rendimentos_tributaveis = round2((rtPj.total ?? 0) + (rtPf.total ?? 0));

  const bens = d.bens_direitos?.itens ?? [];
  const patrimonio_imobiliario = bens
    .filter((i: any) => ['01', '11', '12'].includes(String(i.codigo ?? '')))
    .map((i: any) => ({ descricao: i.descricao ?? '', valor_atual: round2(i.valor_atual ?? 0) }));

  const resumo = (d as any).resumo ?? {};
  const impostoPagoRetencao = round2(Number(resumo.imposto_pago_retencao ?? 0));

  const tributadosLei7713 = excl.map((i: any) => ({
    descricao: i.descricao ?? i.nome_fonte ?? `Codigo ${i.codigo ?? 'N/A'}`,
    valor_bruto: round2(i.valor ?? 0),
    irrf: 0,
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
    imposto_ja_pago_carne_leao: 0,
    imposto_ja_pago_aplicacoes: 0,
    imposto_antecipado_dividendos: 0,
    lucros_aprovados_ate_31dez2025: lucrosExcl,
    ganho_capital_excluido: ganhoCapital > 0 ? ganhoCapital : ganhoCapitalDeterministico,
    rendimentos_fiis_excluidos: fiisFallback,
    outros_excluidos_art_16a: outrosExclFallback,
    rendimentos_tributados_exclusivamente_lei_7713: tributadosLei7713,
    optou_ajuste_anual_lei_7713: false,
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
