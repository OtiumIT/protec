/**
 * Extração OCR e estruturada do PDF do Recibo de Adesão e Consolidação PGFN
 * para uso no comparativo de rating. Usa OpenAI para interpretar o PDF
 * e retornar JSON no schema esperado.
 * Requer OPENAI_API_KEY no ambiente.
 */

import OpenAI from 'openai';
import { ParcelamentoPGFNSchema } from '@shared/core';
import type { z } from 'zod';
import { AppError } from '../../shared/utils/error-handler';

export type ParcelamentoPGFN = z.infer<typeof ParcelamentoPGFNSchema>;

export type ExtractPGFNPdfResult = {
  parcelamento: ParcelamentoPGFN;
  confianca_extracao?: number;
  campos_incertos?: string[];
};

const PGFN_SYSTEM_PROMPT = `Role: Atue como um Especialista em Direito Tributário Brasileiro e Engenheiro de Dados.

Tarefa: Realize o OCR e a extração estruturada do arquivo PDF do Recibo de Adesão e Consolidação de Negociação da PGFN (Procuradoria-Geral da Fazenda Nacional).

Instruções técnicas:
1. Conversão numérica: Remova "R$", pontos de milhar e use ponto como separador decimal. Exemplo: "R$ 244.857,85" → 244857.85
2. Percentuais: Converta para número. "0,00 %" → 0
3. Datas: Use formato "DD/MM/YYYY" como string.
4. Inferir Rating: Baseado na modalidade:
   - "SEM REDUCAO" ou sem desconto permitido → provavelmente Rating "A"
   - Desconto até 50% → provavelmente Rating "B"  
   - Desconto até 65% → provavelmente Rating "C"
   - Desconto até 70% ou mais → provavelmente Rating "D"
5. Saída: Retorne APENAS um único objeto JSON válido, sem markdown e sem texto antes ou depois.

Estrutura típica do documento PGFN:
- Seção "INFORMAÇÃO DA NEGOCIAÇÃO": número da conta, CNPJ, nome, negociação, modalidade
- Seção "DÍVIDAS NEGOCIADAS": tabela com dívida, devedor, código receita, principal, multa, juros, encargo legal, total
- Seção "CAPACIDADE DE PAGAMENTO": valor da dívida na adesão, capacidade em 60 meses, permite desconto, desconto máximo
- Seção "DEMONSTRATIVO DE CONSOLIDAÇÃO": total sem desconto, entrada, desconto, créditos, total a pagar
- Seção "DEMONSTRATIVO DE PAGAMENTO": entrada (quantidade x valor), parcelas básicas (quantidade x valor)

Schema JSON de saída (siga rigorosamente; use 0 ou "" quando ausente):

{
  "numero_conta": "string ou null",
  "cnpj": "XX.XXX.XXX/XXXX-XX",
  "razao_social": "string",
  "negociacao": "descrição completa da negociação (ex: TRANSACAO POR ADESAO - EDITAL...)",
  "modalidade": "descrição da modalidade (ex: DEMAIS DEBITOS - ATE 60 PRESTACOES - SEM REDUCAO)",
  "data_adesao": "DD/MM/YYYY",
  
  "dividas": [
    {
      "numero_divida": "string",
      "devedor_cnpj": "string ou null",
      "codigo_receita": "string ou null",
      "data_consolidacao": "DD/MM/YYYY ou null",
      "principal": number,
      "multa": number,
      "juros": number,
      "encargo_legal": number,
      "total": number
    }
  ],
  
  "capacidade_pagamento": {
    "valor_divida_adesao": number,
    "capacidade_60_meses": number,
    "permite_desconto": boolean,
    "desconto_maximo_pct": number
  },
  
  "consolidacao": {
    "principal": number,
    "multa": number,
    "juros": number,
    "encargo_legal": number,
    "total_sem_desconto": number,
    "entrada_total": number,
    "desconto_total": number,
    "creditos_utilizados": number,
    "total_a_pagar": number
  },
  
  "pagamento": {
    "entrada_qtd": number,
    "entrada_valor": number,
    "parcelas_qtd": number,
    "parcelas_valor": number
  },
  
  "rating_inferido": "A" | "B" | "C" | "D" | null,
  
  "_confianca_extracao": number (0-100, sua confiança na extração),
  "_campos_incertos": ["lista de campos onde você teve dúvida"]
}`;

const PGFN_USER_PROMPT_TEXT = `Extraia todos os dados do PDF do Recibo de Adesão PGFN conforme o schema informado. 

IMPORTANTE:
- Na seção "CAPACIDADE DE PAGAMENTO", extraia corretamente:
  - "VALOR DA DÍVIDA NA DATA DA ADESÃO" → valor_divida_adesao
  - "CAPACIDADE DE PAGAMENTO EM 60 MESES" → capacidade_60_meses  
  - "PERMITE APLICAÇÃO DE DESCONTO" → permite_desconto (Sim=true, Não=false)
  - "DESCONTO MÁXIMO POSSÍVEL" → desconto_maximo_pct

- Na seção "DEMONSTRATIVO DE PAGAMENTO":
  - "ENTRADA Nx valor" → entrada_qtd e entrada_valor
  - "BÁSICA Nx valor" → parcelas_qtd e parcelas_valor

Retorne APENAS o objeto JSON, sem markdown.`;

function inferRatingFromModalidade(modalidade: string, permiteDesconto: boolean, descontoMaxPct: number): 'A' | 'B' | 'C' | 'D' | undefined {
  const mod = modalidade.toUpperCase();
  
  if (mod.includes('SEM REDUCAO') || mod.includes('SEM REDUÇÃO') || !permiteDesconto || descontoMaxPct === 0) {
    return 'A';
  }
  
  if (descontoMaxPct <= 50) {
    return 'B';
  }
  
  if (descontoMaxPct <= 65) {
    return 'C';
  }
  
  if (descontoMaxPct > 65) {
    return 'D';
  }
  
  return undefined;
}

export async function extractPgfnFromPdf(pdfBuffer: Buffer): Promise<ExtractPGFNPdfResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF PGFN.');
  }

  const minSize = 100;
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < minSize) {
    throw new AppError(
      'Arquivo inválido ou vazio. Envie um PDF do Recibo de Adesão PGFN com tamanho adequado.',
      'PGFN_PDF_INVALID',
      400
    );
  }
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new AppError(
      'O arquivo não parece ser um PDF válido. Verifique se o arquivo é um Recibo de Adesão PGFN.',
      'PGFN_PDF_INVALID',
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
    console.error('[extractPgfnFromPdf] Falha ao extrair texto (tentando via Files API como PDF escaneado):', err);
    text = '';
  }

  const openai = new OpenAI({ apiKey });
  const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
  const hasText = cleanText.length > 200;

  let rawContent: string | null | undefined;

  if (hasText) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: PGFN_SYSTEM_PROMPT },
        { role: 'user', content: `${PGFN_USER_PROMPT_TEXT}\n\nConteúdo extraído do PDF:\n\n${cleanText.slice(0, 28000)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    rawContent = completion.choices[0]?.message?.content?.trim();
  } else {
    const { toFile } = await import('openai');
    const uploadedFile = await openai.files.create({
      file: await toFile(pdfBuffer, 'recibo_pgfn.pdf', { type: 'application/pdf' }),
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
              { type: 'input_text', text: `${PGFN_SYSTEM_PROMPT}\n\n${PGFN_USER_PROMPT_TEXT}\n\nAnalise o PDF anexo (Recibo PGFN).` } as any,
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
      'Resposta vazia da extração. Verifique se o PDF é um Recibo de Adesão PGFN válido e tente novamente.',
      'PGFN_PDF_EMPTY_RESPONSE',
      400
    );
  }

  let parsed: any;
  try {
    const cleaned = rawContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, '$1');
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AppError(
      'Resposta da extração em formato inválido. Verifique o PDF e preencha os dados manualmente se necessário.',
      'PGFN_PDF_INVALID_RESPONSE',
      400
    );
  }

  const confianca = parsed._confianca_extracao;
  const camposIncertos = parsed._campos_incertos;
  delete parsed._confianca_extracao;
  delete parsed._campos_incertos;

  if (!parsed.rating_inferido && parsed.modalidade && parsed.capacidade_pagamento) {
    parsed.rating_inferido = inferRatingFromModalidade(
      parsed.modalidade,
      parsed.capacidade_pagamento.permite_desconto,
      parsed.capacidade_pagamento.desconto_maximo_pct
    );
  }

  const parsedPgfn = ParcelamentoPGFNSchema.safeParse(parsed);
  if (!parsedPgfn.success) {
    const firstError = parsedPgfn.error.flatten().fieldErrors;
    const msg = Object.keys(firstError).length ? JSON.stringify(firstError).slice(0, 200) : 'estrutura inválida';
    throw new AppError(
      'Dados extraídos não correspondem ao schema do Recibo PGFN. Ajuste o PDF ou preencha manualmente. ' + msg,
      'PGFN_PDF_SCHEMA_MISMATCH',
      400
    );
  }

  return {
    parcelamento: parsedPgfn.data,
    confianca_extracao: typeof confianca === 'number' ? confianca : undefined,
    campos_incertos: Array.isArray(camposIncertos) ? camposIncertos : undefined,
  };
}
