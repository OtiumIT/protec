/**
 * Extração estruturada de PDF contábil para o Rating Validator.
 * Dois perfis de prompt: (1) ECD/SPED padrão; (2) balancete/balanço.
 * Com texto extraível, o perfil é escolhido por heurística; em PDF escaneado,
 * envia ambos os conjuntos de regras em um único prompt para o modelo decidir.
 * Requer OPENAI_API_KEY no ambiente.
 */

import OpenAI from 'openai';
import {
  EcdExtractedSchema,
  SimulateRatingSchema,
  ecdExtractedToSimulateRatingInput,
  type EcdExtracted,
} from '@shared/core';
import type { z } from 'zod';
import { AppError } from '../../shared/utils/error-handler';

type SimulateRatingInput = z.infer<typeof SimulateRatingSchema>;

/** Perfil usado na extração (texto) ou ambos combinados (PDF sem camada de texto). */
export type ExtracaoPdfContabilPerfil = 'ecd' | 'balancete' | 'pdf_escaneado_duplo';

export type ExtractEcdPdfResult = {
  /** JSON extraído (mesmo schema para ECD e balancete) */
  ecd: EcdExtracted;
  simulação_prefill: Omit<SimulateRatingInput, 'client_id' | 'rating_real' | 'save_simulation'>;
  /** Qual conjunto de regras foi aplicado (ou ambos, se o PDF foi analisado só por visão) */
  extracao_perfil?: ExtracaoPdfContabilPerfil;
};

const EXTRACTION_JSON_SCHEMA = `Schema JSON de saída (siga rigorosamente; use 0 ou "" quando ausente):

{
  "documento_info": {
    "tipo": "Escrituração Contábil Digital (ECD)",
    "versao_leiaute": "string",
    "natureza_livro": "string",
    "numero_ordem": number,
    "periodo_escrituracao": { "inicio": "YYYY-MM-DD", "fim": "YYYY-MM-DD" },
    "data_autenticacao": "ISO datetime",
    "hash_arquivo": "string"
  },
  "entidade": {
    "nome": "razão social",
    "cnpj": "XX.XXX.XXX/XXXX-XX",
    "signatarios": [{ "nome": "string", "qualificacao": "string", "cpf": "string", "responsavel_legal": true }]
  },
  "demonstrativo_contabil": {
    "balanco_patrimonial": {
      "ativo": {
        "circulante": { "total": number, "contas": { "clientes": number, "outros_creditos": number, "caixa_equivalentes": number, "aplicacoes_financeiras": number, "estoques": number, ... } },
        "nao_circulante": { "total": number, "realizavel_a_longo_prazo": number, "emprestimos_socios": number, "depositos_judiciais": number, "investimentos": number, "imobilizado": number, "intangivel": number },
        "total_geral": number
      },
      "passivo": {
        "circulante": { "total": number, "fornecedores": number, "parcelamento_iptu": number, "emprestimos_financiamentos": number, "obrigacoes_trabalhistas": number, "tributos_pagar": number, "contas_pagar": number, "provisoes": number },
        "nao_circulante": { "total": number, "obrigacoes_tributarias_longo_prazo": number, "obrigacoes_coligadas": number, "provisoes": number }
      },
      "patrimonio_liquido": { "total": number, "capital_social": number, "reservas": number, "prejuizos_acumulados": number }
    },
    "dre": {
      "receita_liquida": number,
      "lucro_bruto": number,
      "despesas_operacionais": number,
      "despesas_financeiras": number,
      "resultado_liquido_periodo": number
    }
  }
}`;

/** Modelo 1 — ECD/SPED (Recibo de Entrega + balanço + DRE no layout típico). */
const ECD_RULES_BODY = `Role: Atue como um Especialista em Contabilidade Brasileira e Engenheiro de Dados.

Tarefa: Realize o OCR e a extração estruturada do arquivo PDF da ECD (Escrituração Contábil Digital - SPED). O documento contém o Recibo de Entrega, o Balanço Patrimonial e a DRE.

Instruções técnicas:
1. Conversão numérica: Valores entre parênteses (ex.: (100,00)) devem ser convertidos para negativos (-100.00). Remova "R$", pontos de milhar e use ponto como separador decimal.
2. Hierarquia: Identifique contas sintéticas (grupos) e analíticas (detalhes). Mantenha totais e subcontas quando existirem.
3. Consistência: Se houver hash do arquivo no recibo e notas de rodapé nas páginas seguintes, mencione no documento_info; não é obrigatório validar na extração.
4. Saída: Retorne APENAS um único objeto JSON válido, sem markdown e sem texto antes ou depois.

Estrutura do documento:
- Página 1: Recibo de Entrega (hash, dados do contador, período, versão do leiaute).
- Páginas 2-3: Balanço Patrimonial (Ativo Circulante, Ativo Não Circulante, Passivo Circulante, Passivo Não Circulante, Patrimônio Líquido).
- Página 4: DRE (Demonstração do Resultado do Exercício).`;

const ECD_SYSTEM_PROMPT = `${ECD_RULES_BODY}

${EXTRACTION_JSON_SCHEMA}`;

const ECD_USER_PROMPT_TEXT = `Extraia todos os dados do PDF da ECD (Recibo de Entrega, Balanço Patrimonial e DRE) conforme o schema informado. Retorne APENAS o objeto JSON, sem markdown.`;

/** Modelo 2 — balancete / balanço emitido por sistema contábil (sem recibo SPED). */
const BALANCETE_RULES_BODY = `Role: Atue como um Especialista em Contabilidade Brasileira e Engenheiro de Dados.

Tarefa: Extraia dados estruturados de PDF de **balancete** ou **balanço patrimonial** gerado por sistema contábil. Não presuma Recibo de Entrega ECD; pode haver DRE ou contas de resultado nas páginas seguintes.

Instruções técnicas:
1. Conversão numérica: Valores entre parênteses (ex.: (100,00)) devem ser convertidos para negativos (-100.00). Remova "R$", pontos de milhar e use ponto como separador decimal.
2. Colunas "Saldo Atual", "Saldo Anterior", "Débito", "Crédito": use SEMPRE a coluna **Saldo Atual** para o período do relatório (cabeçalho "Período" / exercício). Nunca use Saldo Anterior como total do exercício atual. Valores podem vir colados a D ou C (natureza); extraia só o número (ex.: "18.623.930,69C" → 18623930.69). Não inverta sinal só por causa de D/C.
3. Totais de grupo (CRÍTICO): use APENAS a linha **sintética** do grupo (ex.: "PASSIVO NAO-CIRCULANTE", "PASSIVO NÃO CIRCULANTE", classificador agregador tipo 2.2). NÃO trate como total do grupo uma subconta analítica (ex.: "OBRIGACOES TRIBUTARIAS" 2.2.3) nem some só parte das contas filhas — o total do grupo está na linha sintética.
4. Hierarquia: Preencha subcampos do JSON com analíticas quando houver; o campo *.total de cada grupo deve refletir a linha sintética correspondente.
5. documento_info: preencha "tipo" como "Balancete" ou "Balanço patrimonial" quando aplicável; demais campos do recibo ECD podem ficar vazios ou genéricos.
6. Saída: Retorne APENAS um único objeto JSON válido, sem markdown e sem texto antes ou depois.

Estrutura típica: cabeçalho empresa/CNPJ/período; tabela com código da conta, descrição e saldos. Use o cabeçalho da tabela para identificar a coluna "Saldo Atual".`;

const BALANCETE_SYSTEM_PROMPT = `${BALANCETE_RULES_BODY}

${EXTRACTION_JSON_SCHEMA}`;

const BALANCETE_USER_PROMPT_TEXT = `Extraia balanço/balancete e DRE (se houver) conforme o schema. Totais de grupo (ATIVO CIRCULANTE, PASSIVO NAO-CIRCULANTE, etc.) vêm das linhas sintéticas com esses rótulos no Saldo Atual, não de subcontas isoladas. Retorne APENAS o objeto JSON, sem markdown.`;

/** PDF escaneado: duas famílias de regras; o modelo escolhe a que se aplica. */
const VISION_DUAL_SYSTEM_PROMPT = `O PDF é um documento contábil brasileiro. Ele pode seguir um de dois formatos. Identifique qual se aplica ao documento anexo e extraia os dados usando SOMENTE as regras desse formato (ignore o outro bloco).

--- FORMATO 1: ECD / SPED (Recibo de Entrega + balanço + DRE) ---
${ECD_RULES_BODY}

--- FORMATO 2: Balancete / balanço patrimonial (sem recibo ECD; colunas Saldo Atual / Saldo Anterior) ---
${BALANCETE_RULES_BODY}

${EXTRACTION_JSON_SCHEMA}`;

const VISION_DUAL_USER_TEXT = `Analise o PDF anexo, identifique se é ECD/SPED ou balancete/balanço, e retorne APENAS o objeto JSON conforme o schema, sem markdown.`;

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/**
 * Heurística sobre texto extraído do PDF (primeiros trechos).
 * Padrão: ECD quando não há sinais fortes de balancete.
 */
export function detectContabilPdfKind(sample: string): 'ecd' | 'balancete' {
  const head = stripAccents(sample.slice(0, 16000)).toUpperCase();
  const balanceteStrong =
    /\bBALANCETE\b/.test(head) && (/SALDO ATUAL/.test(head) || /SALDO ANTERIOR/.test(head));
  const ecdStrong =
    /ESCRITURACAO CONTABIL DIGITAL/.test(head) ||
    /RECIBO DE ENTREGA/.test(head) ||
    /\bECD\b/.test(head);

  if (balanceteStrong && !ecdStrong) return 'balancete';
  if (ecdStrong && !balanceteStrong) return 'ecd';
  if (balanceteStrong) return 'balancete';
  return 'ecd';
}

export async function extractEcdFromPdf(pdfBuffer: Buffer): Promise<ExtractEcdPdfResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF da ECD.');
  }

  const minSize = 100;
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < minSize) {
    throw new AppError(
      'Arquivo inválido ou vazio. Envie um PDF da ECD com tamanho adequado.',
      'ECD_PDF_INVALID',
      400
    );
  }
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new AppError(
      'O arquivo não parece ser um PDF válido. Verifique se o arquivo é um Recibo de Entrega da ECD (SPED).',
      'ECD_PDF_INVALID',
      400
    );
  }

  let text: string;
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    let result: { text?: string } | null;
    try {
      result = await parser.getText();
    } catch {
      try {
        result = await (parser as { getText: (opts?: { preserveStructure?: boolean }) => Promise<{ text?: string }> }).getText({
          preserveStructure: true,
        });
      } catch {
        result = null;
      }
    }
    text = typeof result?.text === 'string' ? result.text : String(result ?? '');
  } catch (err) {
    console.error('[extractEcdFromPdf] Falha ao extrair texto (tentando via Files API como PDF escaneado):', err);
    text = '';
  }

  const openai = new OpenAI({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  const hasText = cleanText.length > 200;

  let rawContent: string | null | undefined;
  let extracaoPerfil: ExtracaoPdfContabilPerfil;

  if (hasText) {
    const kind = detectContabilPdfKind(cleanText);
    extracaoPerfil = kind;
    const systemPrompt = kind === 'balancete' ? BALANCETE_SYSTEM_PROMPT : ECD_SYSTEM_PROMPT;
    const userPrompt = kind === 'balancete' ? BALANCETE_USER_PROMPT_TEXT : ECD_USER_PROMPT_TEXT;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userPrompt}\n\nConteúdo extraído do PDF:\n\n${cleanText.slice(0, 28000)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    rawContent = completion.choices[0]?.message?.content?.trim();
  } else {
    extracaoPerfil = 'pdf_escaneado_duplo';
    const { toFile } = await import('openai');
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, 'ecd_sped.pdf', { type: 'application/pdf' }),
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
              { type: 'input_text', text: `${VISION_DUAL_SYSTEM_PROMPT}\n\n${VISION_DUAL_USER_TEXT}` } as any,
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
    throw new AppError(
      'Resposta vazia da extração. Verifique se o PDF é um Recibo de Entrega ECD válido e tente novamente.',
      'ECD_PDF_EMPTY_RESPONSE',
      400
    );
  }

  let parsed: unknown;
  try {
    const cleaned = rawContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, '$1');
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(
      'Resposta da extração em formato inválido. Verifique o PDF e preencha os dados manualmente se necessário.',
      'ECD_PDF_INVALID_RESPONSE',
      400
    );
  }

  const parsedEcd = EcdExtractedSchema.safeParse(parsed);
  if (!parsedEcd.success) {
    const firstError = parsedEcd.error.flatten().fieldErrors;
    const msg = Object.keys(firstError).length ? JSON.stringify(firstError).slice(0, 200) : 'estrutura inválida';
    throw new AppError(
      'Dados extraídos não correspondem ao schema da ECD. Ajuste o PDF ou preencha manualmente. ' + msg,
      'ECD_PDF_SCHEMA_MISMATCH',
      400
    );
  }

  const ecd = parsedEcd.data;
  const prefill = ecdExtractedToSimulateRatingInput(ecd);

  return {
    ecd,
    extracao_perfil: extracaoPerfil,
    simulação_prefill: {
      ativo_circulante: prefill.ativo_circulante,
      ativo_nao_circulante: prefill.ativo_nao_circulante,
      passivo_circulante: prefill.passivo_circulante,
      passivo_nao_circulante: prefill.passivo_nao_circulante,
      patrimonio_liquido: prefill.patrimonio_liquido,
      competencia: prefill.competencia,
      dre: prefill.dre,
    },
  };
}
