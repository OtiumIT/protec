/**
 * Extração OCR e estruturada do PDF da ECD (SPED Contábil) para uso na
 * Análise de Capacidade de Pagamento. Usa OpenAI para interpretar o PDF
 * e retornar JSON no schema esperado.
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

export type ExtractEcdPdfResult = {
  /** JSON extraído da ECD (documento_info, entidade, demonstrativo_contabil) */
  ecd: EcdExtracted;
  /** Dados mapeados para preencher o formulário de simulação de rating */
  simulação_prefill: Omit<SimulateRatingInput, 'client_id' | 'rating_real' | 'save_simulation'>;
};

const ECD_SYSTEM_PROMPT = `Role: Atue como um Especialista em Contabilidade Brasileira e Engenheiro de Dados.

Tarefa: Realize o OCR e a extração estruturada do arquivo PDF da ECD (Escrituração Contábil Digital - SPED). O documento contém o Recibo de Entrega, o Balanço Patrimonial e a DRE.

Instruções técnicas:
1. Conversão numérica: Valores entre parênteses (ex.: (100,00)) devem ser convertidos para negativos (-100.00). Remova "R$", pontos de milhar e use ponto como separador decimal.
2. Hierarquia: Identifique contas sintéticas (grupos) e analíticas (detalhes). Mantenha totais e subcontas quando existirem.
3. Consistência: Se houver hash do arquivo no recibo e notas de rodapé nas páginas seguintes, mencione no documento_info; não é obrigatório validar na extração.
4. Saída: Retorne APENAS um único objeto JSON válido, sem markdown e sem texto antes ou depois.

Estrutura do documento:
- Página 1: Recibo de Entrega (hash, dados do contador, período, versão do leiaute).
- Páginas 2-3: Balanço Patrimonial (Ativo Circulante, Ativo Não Circulante, Passivo Circulante, Passivo Não Circulante, Patrimônio Líquido).
- Página 4: DRE (Demonstração do Resultado do Exercício).

Schema JSON de saída (siga rigorosamente; use 0 ou "" quando ausente):

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

const ECD_USER_PROMPT_TEXT = `Extraia todos os dados do PDF da ECD (Recibo de Entrega, Balanço Patrimonial e DRE) conforme o schema informado. Retorne APENAS o objeto JSON, sem markdown.`;

export async function extractEcdFromPdf(pdfBuffer: Buffer): Promise<ExtractEcdPdfResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF da ECD.');
  }

  // Validação básica: magic bytes %PDF e tamanho mínimo
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
      result = await (parser as { getText: (opts?: { preserveStructure?: boolean }) => Promise<{ text?: string }> }).getText({
        preserveStructure: true,
      });
    } catch {
      result = await parser.getText();
    }
    text = typeof result?.text === 'string' ? result.text : String(result ?? '');
  } catch (err) {
    console.error('[extractEcdFromPdf] Falha ao extrair texto do PDF:', err);
    throw new AppError(
      'Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido da ECD.',
      'ECD_PDF_PARSE_FAILED',
      400
    );
  }

  const openai = new OpenAI({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  const hasText = cleanText.length > 200;

  let rawContent: string | null | undefined;

  if (hasText) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ECD_SYSTEM_PROMPT },
        { role: 'user', content: `${ECD_USER_PROMPT_TEXT}\n\nConteúdo extraído do PDF:\n\n${cleanText.slice(0, 28000)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    rawContent = completion.choices[0]?.message?.content?.trim();
  } else {
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
              { type: 'input_text', text: `${ECD_SYSTEM_PROMPT}\n\n${ECD_USER_PROMPT_TEXT}\n\nAnalise o PDF anexo (ECD/SPED).` } as any,
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
    throw new Error('Resposta vazia da extração. Verifique se o PDF é um Recibo de Entrega ECD válido e tente novamente.');
  }

  let parsed: unknown;
  try {
    const cleaned = rawContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, '$1');
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Resposta da extração em formato inválido. Verifique o PDF e preencha os dados manualmente se necessário.');
  }

  const parsedEcd = EcdExtractedSchema.safeParse(parsed);
  if (!parsedEcd.success) {
    const firstError = parsedEcd.error.flatten().fieldErrors;
    const msg = Object.keys(firstError).length ? JSON.stringify(firstError).slice(0, 200) : 'estrutura inválida';
    throw new Error('Dados extraídos não correspondem ao schema da ECD. Ajuste o PDF ou preencha manualmente. ' + msg);
  }

  const ecd = parsedEcd.data;
  const prefill = ecdExtractedToSimulateRatingInput(ecd);

  return {
    ecd,
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
