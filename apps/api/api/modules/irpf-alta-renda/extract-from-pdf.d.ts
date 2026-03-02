/**
 * Extração de 100% dos dados da Declaração de Ajuste Anual (DAA) do IRPF a partir de PDF,
 * usando OpenAI para interpretar o conteúdo e retornar JSON estruturado completo.
 * Requer OPENAI_API_KEY no ambiente.
 */
import { DadosIrpfAltaRendaSchema, DeclaracaoIrpfCompletaSchema } from '@shared/core';
import { z } from 'zod';
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
export declare function extractIrpfFromPdf(pdfBuffer: Buffer): Promise<ExtractIrpfFromPdfResult>;
//# sourceMappingURL=extract-from-pdf.d.ts.map