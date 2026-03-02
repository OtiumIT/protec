/**
 * Motor de Cálculo Tributário IN 2.306/2026 - Lucro Presumido
 * Regras: Art. 14 e 15 da IN RFB nº 2.306/2026, ajuste anual § 5º, equiparação hospitalar, adicional IRPJ 10%
 *
 * Receita Federal - Perguntas e Respostas (Redução Incentivos V2):
 * - Pergunta 12: IRPJ acréscimo a partir do 1º trim/2026; CSLL a partir do 2º trim/2026.
 * - Pergunta 13: CSLL limite anual 2026 = R$ 3.750.000 (¾ do limite pleno).
 * - Pergunta 14: Proporção por atividade no trimestre — já implementado.
 */
import type { ReceitasTrimestre, DeducoesTrimestre, RetencoesTrimestre } from '@shared/core';
/** Receita bruta total do trimestre */
export declare function receitaBrutaTrimestre(r: ReceitasTrimestre): number;
export interface ProporcaoAtividade {
    chave: keyof ReceitasTrimestre;
    label: string;
    receita: number;
    participacao_pct: number;
    limite_proporcional: number;
    excedente: number;
    percentual_irpj_normal: number;
    percentual_irpj_acrescimo: number;
    percentual_csll_normal: number;
    percentual_csll_acrescimo: number;
    /** Fórmula resumida: "(limite × P%) + (excedente × P'%)" para esta atividade */
    formula_resumida: string;
}
export interface ProporcaoTrimestre {
    trimestre: number;
    receita_bruta_total: number;
    limite_trimestral: number;
    aplica_acrescimo_irpj: boolean;
    aplica_acrescimo_csll: boolean;
    atividades: ProporcaoAtividade[];
    /** Fórmula geral: (R$ A × P%) + (R$ B × P'%) + ... */
    formula_geral_irpj: string;
    formula_geral_csll: string;
}
/**
 * Detalhe do cálculo por proporção (Pergunta 14 RF / § 6º).
 * Retorna null quando a receita do trimestre não excede o limite (não há parcela excedente).
 * Usado para demonstrar na tela: participação de cada atividade, limite proporcional e excedente.
 */
export declare function detalheProporcaoTrimestre(r: ReceitasTrimestre, equiparacaoHospitalar: boolean, numTrimestre: number, ano: number): ProporcaoTrimestre | null;
export interface TrimestreResult {
    trimestre: number;
    receita_bruta: number;
    receita_excedente_limite?: number;
    base_calculo_irpj: number;
    base_calculo_csll: number;
    irpj: number;
    irpj_adicional: number;
    csll: number;
    irpj_a_rec: number;
    csll_a_rec: number;
    pis_a_rec: number;
    cofins_a_rec: number;
}
/** Calcula um trimestre para cenário 2025 (sem acréscimo IN 2.306) */
export declare function calcularTrimestre2025(receitas: ReceitasTrimestre, deducoes: DeducoesTrimestre, retencoes: RetencoesTrimestre, equiparacao: boolean, numTrimestre: number): TrimestreResult;
/** Calcula os 4 trimestres para 2026 COM acréscimo IN 2.306 e aplica ajuste anual (§ 5º) */
export declare function calcularAno2026(trimestres: ReceitasTrimestre[], deducoesTrimestrais: (DeducoesTrimestre | undefined)[], retencoesTrimestrais: (RetencoesTrimestre | undefined)[], equiparacao: boolean): TrimestreResult[];
/** Cenário 2025: 4 trimestres sem acréscimo IN 2.306 */
export declare function calcularCenario2025(trimestres: ReceitasTrimestre[], deducoesTrimestrais: (DeducoesTrimestre | undefined)[], retencoesTrimestrais: (RetencoesTrimestre | undefined)[], equiparacao: boolean): TrimestreResult[];
/** Agrega resultados trimestrais em totais anuais */
export declare function agregarAnual(trimestres: TrimestreResult[]): {
    receita_bruta_total: number;
    irpj_total: number;
    irpj_adicional_total: number;
    csll_total: number;
    irpj_a_rec_total: number;
    csll_a_rec_total: number;
    pis_a_rec_total: number;
    cofins_a_rec_total: number;
};
//# sourceMappingURL=calculations.d.ts.map