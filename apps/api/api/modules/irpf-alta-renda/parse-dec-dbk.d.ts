/**
 * Parser para arquivos .dec e .dbk (DIRPF - Programa IRPF / e-CAC).
 * Suporta dois formatos:
 * - Pipe-delimitado (|) — leiaute TXT de alguns anos
 * - Fixed-width (posições fixas) — formato binário/texto do PGD (ex.: 2025)
 * Referência: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/dirpf
 */
import { type DeclaracaoIrpfCompleta } from '@shared/core';
/** Versão do parser (3 = tipo 24 posições corrigidas, tipo 19 imposto pago, códigos 06/10/11/12 classificados) */
export declare const DEC_DBK_PARSER_VERSION = 3;
export type ParseDecDbkResult = {
    ano: number;
    dados: import('@shared/core').DadosIrpfAltaRenda;
    declaracao_completa: DeclaracaoIrpfCompleta;
    parser_version?: number;
    diagnostico?: {
        fonte: 'dec_dbk_fixed_width' | 'dec_dbk_pipe';
        completude: 'alta' | 'media' | 'baixa';
        avisos: string[];
    };
};
/**
 * Parseia arquivo .dec ou .dbk e retorna dados para o formulário IRPF Alta Renda.
 */
export declare function parseDecDbk(buffer: Buffer, filename?: string): ParseDecDbkResult;
//# sourceMappingURL=parse-dec-dbk.d.ts.map