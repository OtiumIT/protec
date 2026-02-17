/**
 * Extração de dados de IRPF a partir do texto de um PDF (ex.: DAA, declaração)
 * usando OpenAI para interpretar o conteúdo e retornar JSON estruturado.
 * Requer OPENAI_API_KEY no ambiente.
 */

import OpenAI from 'openai';
import { DadosIrpfAltaRendaSchema } from '@shared/core';
import { z } from 'zod';

const ExtractResultSchema = z.object({
  ano: z.number().int().min(2020).max(2035),
  dados: DadosIrpfAltaRendaSchema,
});

export type ExtractIrpfFromPdfResult = z.infer<typeof ExtractResultSchema>;

const SYSTEM_PROMPT = `Você é um assistente que extrai dados de declarações de IRPF (PDFs de DAA, resumo da declaração, etc.) para preenchimento de um formulário de simulação de IRPF Alta Renda (Lei 15.270/2025).

Extraia do texto fornecido:
1. **ano** (número): ano de referência da declaração (ex.: 2024, 2025).
2. **dados.contribuinte.nome**: nome completo do contribuinte.
3. **dados.contribuinte.cpf**: CPF (apenas números, 11 dígitos).
4. **dados.rendimentos_tributaveis**: soma de rendimentos tributáveis (pro-labore, salários, aluguéis tributáveis, etc.) em reais (número).
5. **dados.rendimentos_isentos_dividendos**: array de itens com:
   - codigo: "09" (lucros e dividendos) ou "13" (sócio ME/EPP Simples Nacional)
   - nome_fonte ou cnpj_fonte: nome ou CNPJ da fonte pagadora (opcional)
   - valor: valor em reais (número)

Se algum valor não estiver no texto, use 0 para valores numéricos, string vazia apenas se fizer sentido. Para CPF use apenas dígitos. Para ano, use o ano da declaração se identificado, senão o ano corrente.
Responda APENAS com um único objeto JSON válido, sem markdown e sem texto antes ou depois, no formato:
{"ano": 2025, "dados": {"contribuinte": {"nome": "...", "cpf": "..."}, "rendimentos_tributaveis": 0, "rendimentos_isentos_dividendos": [{"codigo": "09", "nome_fonte": "...", "valor": 0}]}}`;

export async function extractIrpfFromPdf(pdfBuffer: Buffer): Promise<ExtractIrpfFromPdfResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF.');
  }

  // 1) Extrair texto do PDF (pdf-parse v2: PDFParse({ data: buffer }))
  let text: string;
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    text = typeof result?.text === 'string' ? result.text : String(result ?? '');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes('Invalid PDF') && !msg.includes('structure')) {
      throw new Error('Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido.');
    }
    throw new Error('Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido.');
  }

  if (!text?.trim()) {
    throw new Error('O PDF não contém texto extraível (pode ser apenas imagens). Preencha os dados manualmente.');
  }

  // 2) Chamar OpenAI
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extraia os dados de IRPF do seguinte texto:\n\n${text.slice(0, 12000)}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const rawContent = completion.choices[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error('Resposta vazia da extração. Tente novamente ou preencha manualmente.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('Resposta da extração em formato inválido. Preencha os dados manualmente.');
  }

  const parsedAno = (parsed as any)?.ano;
  const parsedDados = (parsed as any)?.dados;
  if (parsedDados?.contribuinte?.cpf && typeof parsedDados.contribuinte.cpf === 'string') {
    parsedDados.contribuinte.cpf = parsedDados.contribuinte.cpf.replace(/\D/g, '');
  }
  if (parsedAno == null && typeof (parsed as any)?.ano === 'number') {
    (parsed as any).ano = new Date().getFullYear();
  }

  const validated = ExtractResultSchema.safeParse(parsed);
  if (!validated.success) {
    const first = validated.error.errors[0];
    throw new Error(`Dados extraídos inválidos: ${first?.path?.join('.') ?? 'erro'} - ${first?.message ?? 'revise e preencha manualmente se necessário.'}`);
  }

  return validated.data;
}
