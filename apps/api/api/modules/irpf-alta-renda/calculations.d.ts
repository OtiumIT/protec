/**
 * Motor de cálculo IRPF Alta Renda - Lei 15.270/2025
 *
 * Fórmula legal (Art. 16-A § 2º II): Alíquota % = (REND/60.000) − 10
 * Para rendimentos entre 600k e 1,2M. Acima de 1,2M: 10% fixo.
 */
import type { RendimentoIsentoDividendo, DadosIrpfAltaRenda, ImpactoIncrementalCategoria, MemoriaLegalExclusao, OtimizacaoIsentoVsTributado, OutroIsentoQueEntraBase, RendimentoTributadoLei7713 } from '@shared/core';
/** Parâmetros da Lei 15.270/2025 – alterar aqui quando houver regulamentação ou nova lei */
export declare const CONFIG_LEI_15270_2025: {
    readonly limite_isento: 600000;
    readonly limite_progressiva: 1200000;
    readonly aliquota_fixa_percentual: 10;
    readonly limite_retencao_mensal: 50000;
    readonly fonte_normativa: "Lei 15.270/2025";
    readonly observacao_progressiva: "Alíquota % = (REND/60.000) − 10 (Art. 16-A § 2º II). Faixa 600k–1,2M.";
};
export type FaixaAltaRenda = 'isento' | 'progressiva' | 'fixa_10';
export interface ResultadoSimulacao {
    base_calculo_combinada: number;
    faixa: FaixaAltaRenda;
    aliquota_percentual: number;
    imposto_estimado: number;
    excedente_sobre_600k?: number;
    risco_retencao_mensal: boolean;
    risco_retencao_detalhe?: string;
    memoria_calculo?: Record<string, unknown>;
}
/**
 * Calcula BCC = RT + soma isentos (09, 13) − lucros aprovados até 31/12/2025 − ganho capital − FIIs.
 * Art. 16-A § 1º: exclui ganho de capital (I), FIIs qualificados (V-j), lucros aprovados até 31/12/2025 (XII).
 */
export declare function calcularBCC(rendimentosTributaveis: number, rendimentosIsentosDividendos: RendimentoIsentoDividendo[], lucrosAprovadosAte31dez2025?: number, ganhoCapitalExcluido?: number, rendimentosFiisExcluidos?: number, outrosIsentosQueEntramBase?: number, outrosExcluidosArt16A?: number): number;
/**
 * Aplica faixas da Lei 15.270/2025 e retorna alíquota e imposto.
 * Progressiva 600k–1,2M: interpolada até 10% (ver CONFIG_LEI_15270_2025.observacao_progressiva).
 */
export declare function aplicarFaixas(bcc: number): Omit<ResultadoSimulacao, 'risco_retencao_mensal' | 'risco_retencao_detalhe'>;
/**
 * Verifica risco de retenção 10% na fonte (Art. 5º): pagamento no mês > R$ 50.000.
 * Simplificação: se alguma fonte tem valor anual que, dividido por 12, supera 50k, sinaliza risco.
 */
export declare function avaliarRiscoRetencao(rendimentosIsentosDividendos: RendimentoIsentoDividendo[]): {
    risco_retencao_mensal: boolean;
    risco_retencao_detalhe?: string;
};
/**
 * Gera sugestões de planejamento tributário com base nos dados e no resultado da simulação.
 * Lei 15.270/2025 – estratégias para holding, segregação e redução do impacto.
 */
export declare function gerarSugestoesPlanejamento(dados: DadosIrpfAltaRenda, resultado: {
    base_calculo_combinada: number;
    faixa: string;
    imposto_estimado: number;
    risco_retencao_mensal: boolean;
    risco_retencao_detalhe?: string;
}): string[];
export declare function comporRendaParaDashboard(dados: DadosIrpfAltaRenda): {
    tributaveis: number;
    isentos_que_entram_base: number;
    dividendos_09_13: number;
    isentos_excluidos: number;
    tributacao_exclusiva_lei_7713: number;
};
export declare function calcularImpactoIncrementalBase(dados: DadosIrpfAltaRenda): ImpactoIncrementalCategoria[];
export declare function construirMemoriaLegalExclusoes(dados: DadosIrpfAltaRenda): MemoriaLegalExclusao[];
export declare function simularOtimizacaoIsentoVsTributado(dados: DadosIrpfAltaRenda, baseCalculoAtual: number, impostoComplementarAtual: number, deducoesAtuais: number): OtimizacaoIsentoVsTributado | undefined;
export declare function classificarIsentosArt16A(itens: Array<{
    codigo?: string;
    descricao?: string;
    nome_fonte?: string;
    valor?: number;
}>): {
    outros_excluidos_art_16a: number;
    rendimentos_fiis_excluidos: number;
    ganho_capital_excluido: number;
    lucros_aprovados_ate_31dez2025: number;
    outros_isentos_que_entram_base: OutroIsentoQueEntraBase[];
    rendimentos_tributados_exclusivamente_lei_7713: RendimentoTributadoLei7713[];
};
export declare function identificarOutrosExcluidosArt16A(itens: Array<{
    descricao?: string;
    valor?: number;
}>): number;
export interface ComparativoPfPj {
    rendimento_bruto: number;
    /** PF tributação exclusiva (Lei 7.713): aplicação NÃO entra na BCC, só IRRF */
    cenario_pf_tributacao_exclusiva: {
        imposto_total: number;
        irrf: number;
        rendimento_liquido: number;
    };
    /** PF aplicação entra na base: impacto IRPFM + IRRF compensável */
    cenario_pf_entra_base: {
        imposto_total: number;
        irrf_compensavel: number;
        rendimento_liquido: number;
    };
    /** Mantido para compatibilidade (aponta para tributação exclusiva) */
    cenario_pf: {
        imposto_total: number;
        irrf_compensavel: number;
        rendimento_liquido: number;
    };
    cenario_pj: {
        irpj: number;
        adicional_irpj: number;
        csll: number;
        carga_efetiva_percentual: number;
        rendimento_liquido: number;
    };
    /** % a mais de imposto na PJ em relação ao líquido PF (tributação exclusiva) */
    diferenca_percentual_pj_mais_caro: number;
}
/**
 * Compara eficiência tributária: mesma aplicação financeira em PF vs PJ (Lucro Presumido).
 * PF: IR retido na fonte + impacto IRPFM (base combinada) com IRRF compensável.
 * PJ: base 100%, IRPJ 15%, Adicional 10% sobre excedente R$ 20k/mês, CSLL 9% — carga até ~34%.
 */
export declare function compararEficienciaPfPj(valorAplicacao: number, dados: DadosIrpfAltaRenda, resultadoSimulacao: {
    base_calculo_combinada: number;
    imposto_estimado: number;
    deducoes_imposto_ja_pago: number;
    aliquota_percentual: number;
}, rendimentosFinanceirosPj?: number): ComparativoPfPj | undefined;
//# sourceMappingURL=calculations.d.ts.map