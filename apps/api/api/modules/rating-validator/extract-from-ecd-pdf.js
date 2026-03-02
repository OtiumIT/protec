"use strict";
/**
 * Extração OCR e estruturada do PDF da ECD (SPED Contábil) para uso na
 * Análise de Capacidade de Pagamento. Usa OpenAI para interpretar o PDF
 * e retornar JSON no schema esperado.
 * Requer OPENAI_API_KEY no ambiente.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEcdFromPdf = extractEcdFromPdf;
const openai_1 = __importDefault(require("openai"));
const core_1 = require("@shared/core");
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
async function extractEcdFromPdf(pdfBuffer) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey?.trim()) {
        throw new Error('OPENAI_API_KEY não configurada. Não é possível extrair dados do PDF da ECD.');
    }
    let text;
    try {
        const { PDFParse } = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
        const parser = new PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        text = typeof result?.text === 'string' ? result.text : String(result ?? '');
    }
    catch {
        throw new Error('Não foi possível ler o PDF. Verifique se o arquivo é um PDF válido da ECD.');
    }
    const openai = new openai_1.default({ apiKey });
    const cleanText = text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim();
    const hasText = cleanText.length > 200;
    let rawContent;
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
    }
    else {
        const { toFile } = await Promise.resolve().then(() => __importStar(require('openai')));
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
                            { type: 'input_file', file_id: uploadedFile.id },
                            { type: 'input_text', text: `${ECD_SYSTEM_PROMPT}\n\n${ECD_USER_PROMPT_TEXT}\n\nAnalise o PDF anexo (ECD/SPED).` },
                        ],
                    },
                ],
                text: { format: { type: 'json_object' } },
            });
            const outputItem = response.output?.find((o) => o.type === 'message');
            rawContent = outputItem?.content?.find((c) => c.type === 'output_text')?.text?.trim();
        }
        finally {
            await openai.files.delete(uploadedFile.id).catch(() => { });
        }
    }
    if (!rawContent) {
        throw new Error('Resposta vazia da extração. Verifique se o PDF é um Recibo de Entrega ECD válido e tente novamente.');
    }
    let parsed;
    try {
        const cleaned = rawContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, '$1');
        parsed = JSON.parse(cleaned);
    }
    catch {
        throw new Error('Resposta da extração em formato inválido. Verifique o PDF e preencha os dados manualmente se necessário.');
    }
    const parsedEcd = core_1.EcdExtractedSchema.safeParse(parsed);
    if (!parsedEcd.success) {
        const firstError = parsedEcd.error.flatten().fieldErrors;
        const msg = Object.keys(firstError).length ? JSON.stringify(firstError).slice(0, 200) : 'estrutura inválida';
        throw new Error('Dados extraídos não correspondem ao schema da ECD. Ajuste o PDF ou preencha manualmente. ' + msg);
    }
    const ecd = parsedEcd.data;
    const prefill = (0, core_1.ecdExtractedToSimulateRatingInput)(ecd);
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
