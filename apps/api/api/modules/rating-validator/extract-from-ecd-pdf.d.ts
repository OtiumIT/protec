/**
 * Extração OCR e estruturada do PDF da ECD (SPED Contábil) para uso na
 * Análise de Capacidade de Pagamento. Usa OpenAI para interpretar o PDF
 * e retornar JSON no schema esperado.
 * Requer OPENAI_API_KEY no ambiente.
 */
import { SimulateRatingSchema, type EcdExtracted } from '@shared/core';
import type { z } from 'zod';
type SimulateRatingInput = z.infer<typeof SimulateRatingSchema>;
export type ExtractEcdPdfResult = {
    /** JSON extraído da ECD (documento_info, entidade, demonstrativo_contabil) */
    ecd: EcdExtracted;
    /** Dados mapeados para preencher o formulário de simulação de rating */
    simulação_prefill: Omit<SimulateRatingInput, 'client_id' | 'rating_real' | 'save_simulation'>;
};
export declare function extractEcdFromPdf(pdfBuffer: Buffer): Promise<ExtractEcdPdfResult>;
export {};
//# sourceMappingURL=extract-from-ecd-pdf.d.ts.map