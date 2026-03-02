/**
 * Motor de Cálculo Tributário Imobiliário - PF vs PJ vs Reforma 2027
 *
 * Cenário A (PF): Tabela progressiva Carnê-Leão, deduções Lei 7.713/88
 * Cenário B (PJ): Lucro Presumido 32%, IN 2.306/2026
 * Cenário C (Reforma): IBS/CBS com créditos sobre custos operacionais
 */
export interface AggregatedMonth {
    mes: string;
    receita: number;
    despesas_dedutiveis: number;
    custos_operacionais: number;
}
export interface AggregatedYear {
    ano: number;
    receita_total: number;
    despesas_dedutiveis_total: number;
    custos_operacionais_total: number;
    meses: AggregatedMonth[];
}
/** IR mensal sobre base de cálculo (tabela progressiva) */
export declare function impostoIRPFMensal(baseCalculo: number): number;
/** Cenário PF: calcular impostos anuais sobre renda de locação */
export declare function calcularPF(aggregated: AggregatedYear, aliquotaEfetivaDirpf?: number): {
    receita_bruta_total: number;
    despesas_dedutiveis_total: number;
    base_calculo_total: number;
    imposto_total: number;
    aliquota_efetiva_anual: number;
    trimestres: Array<{
        trimestre: number;
        receita: number;
        despesas_dedutiveis: number;
        base_calculo: number;
        imposto: number;
    }>;
};
/** Cenário PJ: Lucro Presumido com IN 2.306/2026
 * Regra 16% (Bruno Sacani): PJ prestadora de serviço em geral, receita anual até R$ 120k
 * pode usar 16%. Se receita acumulada até um trimestre > 120k, passa a 32% e recolhe
 * a diferença do imposto postergado nos trimestres anteriores.
 */
export declare function calcularPJ(aggregated: AggregatedYear, elegivelPresuncao16: boolean): {
    receita_bruta_total: number;
    base_presumida_irpj: number;
    base_presumida_csll: number;
    irpj: number;
    irpj_adicional: number;
    irpj_postergado: number;
    csll: number;
    pis: number;
    cofins: number;
    imposto_total: number;
    aliquota_efetiva: number;
    aplicou_in_2306: boolean;
    trimestres: Array<{
        trimestre: number;
        receita: number;
        base_irpj: number;
        base_csll: number;
        presuncao_irpj_pct: number;
        irpj: number;
        irpj_adicional: number;
        irpj_postergado: number;
        csll: number;
        pis: number;
        cofins: number;
    }>;
};
export interface OpcoesReformaCalculo {
    ano: number;
    /** Override da alíquota nominal; se não informado, 2027/2028 = 9% (CBS), 2029+ = 26,5% */
    aliquota_ibs_cbs_estimada?: number;
    redutor_locacao_pct?: number;
    redutor_short_stay_pct?: number;
    /** Regime transição: 3,65% sobre receita; resultado = min(3,65%, regime normal) */
    contrato_antes_16012025?: boolean;
    /** Se true, aplica 50% no montante de receita short e 70% no long (quando short > long) */
    usar_redutor_diferenciado_short?: boolean;
    receita_longa_total?: number;
    receita_short_total?: number;
}
/**
 * Cenário Reforma: IBS/CBS com créditos sobre custos.
 * 2027/2028: apenas CBS (~9%); 2029+: IBS+CBS (26,5% a 28%).
 * Redutor 70% locação residencial; 50% curta temporada quando dominante (Art. 261 e redutor diferenciado).
 * Regime transição Art. 487: opção 3,65% sobre faturamento (contratos antes 16/01/2025).
 */
export declare function calcularReforma2027(aggregated: AggregatedYear, aliquotaIbsCbsOverride?: number, redutorLocacaoPct?: number, opcoes?: OpcoesReformaCalculo): {
    receita_bruta_total: number;
    custos_operacionais_total: number;
    creditos_ibs_cbs: number;
    ibs_cbs_sobre_receita: number;
    ibs_cbs_liquido: number;
    imposto_total: number;
    aliquota_efetiva: number;
    aliquota_nominal_ibs_cbs: number;
    redutor_locacao_aplicado_pct: number;
    /** Regime transição Art. 487 aplicado (imposto a 3,65%) */
    imposto_transicao_365?: number;
    aplicou_transicao_art487?: boolean;
    /** Quando short > long: redutor 50% na parte short, 70% na long */
    redutor_diferenciado_short?: boolean;
};
/** Break-even: valor mensal aproximado onde PJ vence PF (carga PJ < carga PF) */
export declare function calcularBreakEven(cargaPFPercentual: number, cargaPJPercentual: number): number | null;
//# sourceMappingURL=calculations.d.ts.map