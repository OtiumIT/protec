"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
const calculations_1 = require("./calculations");
/** Embasamentos legais por cenário (fonte oficial para resultado tributário) */
const EMBASAMENTOS_LEGAIS = [
    {
        cenario: 'pf',
        norma: 'Lei 7.713/88',
        artigo: 'Art. 3º e seguintes',
        descricao: 'Deduções de despesas com imóveis de uso residencial (IPTU, condomínio, juros, manutenção etc.) da base de cálculo do IR.',
    },
    {
        cenario: 'pf',
        norma: 'Lei 9.250/95 e legislação do IR',
        descricao: 'Imposto de Renda sobre rendimentos de locação: tabela progressiva mensal (Carnê-Leão), aplicável à base líquida após deduções.',
    },
    {
        cenario: 'pf',
        norma: 'EC 132/2023',
        descricao: 'Reforma Tributária: previsão do IBS e da CBS no âmbito do consumo.',
    },
    {
        cenario: 'pj',
        norma: 'Lei 9.249/95',
        artigo: 'Art. 15 e 16',
        descricao: 'Lucro Presumido: presunção de lucro para IRPJ e CSLL (32% para locação de imóveis; 16% para serviços em condições legais).',
    },
    {
        cenario: 'pj',
        norma: 'IN RFB 2.306/2026',
        descricao: 'Acréscimo de 10% na presunção quando receita trimestral > R$ 1,25 mi ou anual > R$ 5 mi.',
    },
    {
        cenario: 'pj',
        norma: 'Lei 10.637/02 e 10.833/03',
        descricao: 'PIS e COFINS sobre faturamento (cumulativos no Lucro Presumido).',
    },
    {
        cenario: 'reforma',
        norma: 'LC 214/2025',
        artigo: 'Art. 261, parágrafo único',
        descricao: 'Redução de 70% nas alíquotas do IBS e da CBS nas operações de locação, cessão onerosa e arrendamento de bens imóveis.',
    },
    {
        cenario: 'reforma',
        norma: 'LC 214/2025',
        artigo: 'Arts. 257 e 258',
        descricao: 'Redutor de ajuste vinculado ao imóvel para reduzir a base de cálculo nas operações de alienação (venda).',
    },
    {
        cenario: 'reforma',
        norma: 'LC 214/2025',
        artigo: 'Art. 487',
        descricao: 'Opção de 3,65% sobre faturamento bruto para contratos de locação firmados até 16/01/2025 (regime de transição até fim do contrato ou 31/12/2028).',
    },
    {
        cenario: 'reforma',
        norma: 'Transição 2027-2029',
        descricao: 'Vigência isolada da CBS (9%) em 2027 e 2028; o IBS passa a vigorar a partir de 2029, quando a alíquota nominal IBS+CBS atinge a faixa de 26,5% a 28%.',
    },
    {
        cenario: 'reforma',
        norma: 'Redutor diferenciado (LC 214/2025)',
        descricao: 'Redução de 50% nas alíquotas do IBS/CBS para operações de hospedagem e locação de curtíssima temporada (short stay).',
    },
];
class PropertyService {
    repo;
    clientRepo;
    constructor(repo, clientRepo) {
        this.repo = repo;
        this.clientRepo = clientRepo;
    }
    async create(data) {
        const client = await this.clientRepo.findById(data.client_id);
        if (!client) {
            throw new error_handler_1.AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
        }
        return this.repo.create({
            client_id: data.client_id,
            tipo_locacao: data.tipo_locacao,
            identificador: data.identificador,
            modo_entrada: data.modo_entrada ?? 'detalhado',
        });
    }
    async getById(id) {
        const prop = await this.repo.findByIdWithClient(id);
        if (!prop) {
            throw new error_handler_1.AppError('Imóvel não encontrado', 'PROPERTY_NOT_FOUND', 404);
        }
        return prop;
    }
    async update(id, data) {
        await this.getById(id);
        if (data.client_id) {
            const client = await this.clientRepo.findById(data.client_id);
            if (!client) {
                throw new error_handler_1.AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
            }
        }
        return this.repo.update(id, {
            client_id: data.client_id,
            tipo_locacao: data.tipo_locacao,
            identificador: data.identificador,
            modo_entrada: data.modo_entrada,
        });
    }
    async delete(id) {
        await this.getById(id);
        await this.repo.delete(id);
    }
    async list(options) {
        return this.repo.list(options);
    }
    // --- Transactions ---
    async addTransaction(propertyId, data) {
        await this.getById(propertyId);
        return this.repo.createTransaction({
            property_id: propertyId,
            mes_referencia: data.mes_referencia,
            tipo: data.tipo,
            categoria: data.categoria,
            valor: data.valor,
            observacao: data.observacao,
        });
    }
    async addTransactionsBatch(propertyId, transactions) {
        await this.getById(propertyId);
        return this.repo.createTransactionsBatch(propertyId, transactions);
    }
    async deleteTransaction(propertyId, txId) {
        const tx = await this.repo.getTransactionById(txId);
        if (!tx || tx.property_id !== propertyId) {
            throw new error_handler_1.AppError('Transação não encontrada', 'TRANSACTION_NOT_FOUND', 404);
        }
        await this.repo.deleteTransaction(txId);
    }
    async upsertMonthlyTotals(input) {
        const propertyId = input.property_id;
        if (!propertyId) {
            throw new error_handler_1.AppError('property_id é obrigatório', 'VALIDATION_ERROR', 400);
        }
        const prop = await this.repo.findById(propertyId);
        if (!prop) {
            throw new error_handler_1.AppError('Imóvel não encontrado', 'PROPERTY_NOT_FOUND', 404);
        }
        if (prop.modo_entrada !== 'reduzido') {
            throw new error_handler_1.AppError('Este imóvel usa modo detalhado. Use lançamentos individuais.', 'INVALID_MODE', 400);
        }
        await this.repo.upsertMonthlyTotals(propertyId, input.ano, input.meses);
    }
    async getMonthlyTotals(propertyId, ano) {
        await this.getById(propertyId);
        return this.repo.getMonthlyTotals(propertyId, ano);
    }
    async listTransactions(propertyId, options) {
        await this.getById(propertyId);
        return this.repo.listTransactions(propertyId, options);
    }
    // --- Simulation ---
    async simulate(input) {
        for (const pid of input.property_ids) {
            const prop = await this.repo.findById(pid);
            if (!prop) {
                throw new error_handler_1.AppError(`Imóvel não encontrado: ${pid}`, 'PROPERTY_NOT_FOUND', 404);
            }
        }
        const aggregatedMap = await this.repo.aggregateByPropertiesYear(input.property_ids, input.ano);
        // Somar agregados de todos os imóveis
        let receitaTotal = 0;
        let despesasDedutiveisTotal = 0;
        let custosOperacionaisTotal = 0;
        const mesesSoma = [];
        for (let m = 1; m <= 12; m++) {
            const mesStr = `${input.ano}-${String(m).padStart(2, '0')}`;
            let rec = 0;
            let desp = 0;
            let custo = 0;
            for (const [, entry] of aggregatedMap) {
                const mesData = entry.aggregated.meses.find((x) => x.mes === mesStr);
                if (mesData) {
                    rec += mesData.receita;
                    desp += mesData.despesas_dedutiveis;
                    custo += mesData.custos_operacionais;
                }
            }
            mesesSoma.push({
                mes: mesStr,
                receita: rec,
                despesas_dedutiveis: desp,
                custos_operacionais: custo,
            });
            receitaTotal += rec;
            despesasDedutiveisTotal += desp;
            custosOperacionaisTotal += custo;
        }
        const aggregatedTotal = {
            ano: input.ano,
            receita_total: receitaTotal,
            despesas_dedutiveis_total: despesasDedutiveisTotal,
            custos_operacionais_total: custosOperacionaisTotal,
            meses: mesesSoma,
        };
        const cenarioPF = (0, calculations_1.calcularPF)(aggregatedTotal, input.aliquota_efetiva_dirpf);
        const cenarioPJ = (0, calculations_1.calcularPJ)(aggregatedTotal, input.aplicar_presuncao_16_servicos ?? false);
        const redutorLocacaoSimulate = input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
            ? 50
            : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);
        const opcoesReformaSimulate = {
            ano: input.ano,
            aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
            redutor_locacao_pct: redutorLocacaoSimulate,
            contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
        };
        const cenarioReforma = (0, calculations_1.calcularReforma2027)(aggregatedTotal, input.opcoes_reforma?.aliquota_ibs_cbs_estimada, redutorLocacaoSimulate, opcoesReformaSimulate);
        /** Em 2027 a PF continua pagando IR (Carnê-Leão) além de IBS/CBS; total = IR + IBS/CBS */
        const impostoTotalPFReforma = Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100;
        const aliquotaEfetivaPFReforma = aggregatedTotal.receita_total > 0
            ? Math.round((impostoTotalPFReforma / aggregatedTotal.receita_total) * 100 * 100) / 100
            : 0;
        const cenarioReformaPF = {
            ...cenarioReforma,
            imposto_total: impostoTotalPFReforma,
            aliquota_efetiva: aliquotaEfetivaPFReforma,
            ir_pf: cenarioPF.imposto_total,
        };
        const breakEvenVal = (0, calculations_1.calcularBreakEven)(cenarioPF.aliquota_efetiva_anual, cenarioPJ.aliquota_efetiva);
        const break_even = breakEvenVal
            ? {
                valor_mensal_break_even: breakEvenVal,
                descricao: `Ponto aproximado onde PJ se torna mais vantajosa (carga PJ ${cenarioPJ.aliquota_efetiva.toFixed(1)}% < PF ${cenarioPF.aliquota_efetiva_anual.toFixed(1)}%)`,
            }
            : undefined;
        const fluxo_caixa = [];
        for (const [pid, entry] of aggregatedMap) {
            const agg = entry.aggregated;
            const pfForProp = (0, calculations_1.calcularPF)(agg);
            const pjForProp = (0, calculations_1.calcularPJ)(agg, input.aplicar_presuncao_16_servicos ?? false);
            fluxo_caixa.push({
                property_id: pid,
                identificador: entry.identificador,
                receita_total: agg.receita_total,
                despesas_total: agg.despesas_dedutiveis_total + agg.custos_operacionais_total,
                impostos_pf: pfForProp.imposto_total,
                impostos_pj: pjForProp.imposto_total,
                lucro_liquido_pf: agg.receita_total -
                    agg.despesas_dedutiveis_total -
                    agg.custos_operacionais_total -
                    pfForProp.imposto_total,
                lucro_liquido_pj: agg.receita_total -
                    agg.despesas_dedutiveis_total -
                    agg.custos_operacionais_total -
                    pjForProp.imposto_total,
            });
        }
        return {
            ano: input.ano,
            cenarios: {
                pf: cenarioPF,
                pj: cenarioPJ,
                reforma_2027_pf: cenarioReformaPF,
                reforma_2027_pj: cenarioReforma,
                reforma_2027: cenarioReforma,
            },
            break_even,
            fluxo_caixa,
            memoria_calculo: {
                ano: input.ano,
                modo: 'imoveis',
                property_ids: input.property_ids,
                aliquota_efetiva_dirpf: input.aliquota_efetiva_dirpf,
                aplicar_presuncao_16_servicos: input.aplicar_presuncao_16_servicos,
                aliquota_ibs_cbs_reforma: cenarioReforma.aliquota_nominal_ibs_cbs,
                redutor_locacao_pct: redutorLocacaoSimulate,
                receita_total: aggregatedTotal.receita_total,
                despesas_dedutiveis_total: aggregatedTotal.despesas_dedutiveis_total,
                custos_operacionais_total: aggregatedTotal.custos_operacionais_total,
                detalhe_pf: {
                    receita_bruta_total: cenarioPF.receita_bruta_total,
                    despesas_dedutiveis_total: cenarioPF.despesas_dedutiveis_total,
                    base_calculo_total: cenarioPF.base_calculo_total,
                    imposto_total: cenarioPF.imposto_total,
                    aliquota_efetiva_anual: cenarioPF.aliquota_efetiva_anual,
                    trimestres: cenarioPF.trimestres,
                },
                detalhe_pj: {
                    receita_bruta_total: cenarioPJ.receita_bruta_total,
                    presuncao_irpj_pct: (input.aplicar_presuncao_16_servicos ?? false) ? 16 : 32,
                    presuncao_csll_pct: 32,
                    base_presumida_irpj: cenarioPJ.base_presumida_irpj,
                    base_presumida_csll: cenarioPJ.base_presumida_csll,
                    irpj: cenarioPJ.irpj,
                    irpj_adicional: cenarioPJ.irpj_adicional,
                    irpj_postergado: cenarioPJ.irpj_postergado,
                    csll: cenarioPJ.csll,
                    pis: cenarioPJ.pis,
                    cofins: cenarioPJ.cofins,
                    imposto_total: cenarioPJ.imposto_total,
                    aliquota_efetiva: cenarioPJ.aliquota_efetiva,
                    aplicou_in_2306: cenarioPJ.aplicou_in_2306,
                    trimestres: cenarioPJ.trimestres,
                },
                detalhe_reforma: {
                    aliquota_nominal_ibs_cbs: cenarioReforma.aliquota_nominal_ibs_cbs,
                    redutor_locacao_pct: cenarioReforma.redutor_locacao_aplicado_pct,
                    aliquota_efetiva: cenarioReformaPF.aliquota_efetiva,
                    receita_bruta_total: cenarioReforma.receita_bruta_total,
                    custos_operacionais_total: cenarioReforma.custos_operacionais_total,
                    creditos_ibs_cbs: cenarioReforma.creditos_ibs_cbs,
                    ibs_cbs_sobre_receita: cenarioReforma.ibs_cbs_sobre_receita,
                    ibs_cbs_liquido: cenarioReforma.ibs_cbs_liquido,
                    imposto_total: cenarioReformaPF.imposto_total,
                    ir_pf: cenarioReformaPF.ir_pf,
                },
            },
            embasamentos_legais: EMBASAMENTOS_LEGAIS,
        };
    }
    /** Simulação standalone: dados diretos por mês, sem cadastro de imóveis */
    async simulateStandalone(input) {
        const mesesSoma = input.meses.map((m) => {
            const receita = (m.receita_aluguel_tradicional ?? 0) +
                (m.receita_aluguel_curto ?? 0) +
                (m.receita_garagem ?? 0) +
                (m.receita_outras ?? 0);
            const despesasDedutiveis = (m.iptu ?? 0) +
                (m.condominio ?? 0) +
                (m.seguro_imovel ?? 0) +
                (m.juros_financiamento ?? 0) +
                (m.manutencao_conservacao ?? 0) +
                (m.outras_dedutiveis ?? 0);
            const custosOperacionais = (m.reformas_melhorias ?? 0) +
                (m.mobilia_equipamentos ?? 0) +
                (m.limpeza_higienizacao ?? 0) +
                (m.comissao_corretagem ?? 0) +
                (m.taxa_plataforma ?? 0) +
                (m.outros_custos ?? 0);
            return {
                mes: m.mes_referencia,
                receita,
                despesas_dedutiveis: despesasDedutiveis,
                custos_operacionais: custosOperacionais,
            };
        });
        const receitaTotal = mesesSoma.reduce((s, x) => s + x.receita, 0);
        const despesasDedutiveisTotal = mesesSoma.reduce((s, x) => s + x.despesas_dedutiveis, 0);
        const custosOperacionaisTotal = mesesSoma.reduce((s, x) => s + x.custos_operacionais, 0);
        const receitaLongaTotal = input.meses.reduce((s, m) => s + (m.receita_aluguel_tradicional ?? 0), 0);
        const receitaShortTotal = input.meses.reduce((s, m) => s + (m.receita_aluguel_curto ?? 0), 0);
        const aplicarPresuncao16 = receitaTotal < 120_000 && receitaShortTotal > receitaLongaTotal;
        const aggregatedTotal = {
            ano: input.ano,
            receita_total: receitaTotal,
            despesas_dedutiveis_total: despesasDedutiveisTotal,
            custos_operacionais_total: custosOperacionaisTotal,
            meses: mesesSoma,
        };
        const cenarioPF = (0, calculations_1.calcularPF)(aggregatedTotal);
        const cenarioPJ = (0, calculations_1.calcularPJ)(aggregatedTotal, aplicarPresuncao16);
        const cenarioPJ32Fixo = aplicarPresuncao16
            ? (0, calculations_1.calcularPJ)(aggregatedTotal, false)
            : null;
        const redutorLocacao = input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
            ? 50
            : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);
        const usarRedutorDiferenciado = input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada' ||
            receitaShortTotal > receitaLongaTotal;
        const opcoesReformaStandalone = {
            ano: input.ano,
            aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
            redutor_locacao_pct: redutorLocacao,
            redutor_short_stay_pct: input.opcoes_reforma?.redutor_short_stay_pct,
            contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
            usar_redutor_diferenciado_short: usarRedutorDiferenciado,
            receita_longa_total: receitaLongaTotal,
            receita_short_total: receitaShortTotal,
        };
        const cenarioReforma = (0, calculations_1.calcularReforma2027)(aggregatedTotal, input.opcoes_reforma?.aliquota_ibs_cbs_estimada, redutorLocacao, opcoesReformaStandalone);
        /** Em 2027 a PF continua pagando IR (Carnê-Leão) além de IBS/CBS; total = IR + IBS/CBS */
        const impostoTotalPFReformaStandalone = Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100;
        const aliquotaEfetivaPFReformaStandalone = receitaTotal > 0
            ? Math.round((impostoTotalPFReformaStandalone / receitaTotal) * 100 * 100) / 100
            : 0;
        const cenarioReformaPFStandalone = {
            ...cenarioReforma,
            imposto_total: impostoTotalPFReformaStandalone,
            aliquota_efetiva: aliquotaEfetivaPFReformaStandalone,
            ir_pf: cenarioPF.imposto_total,
        };
        const breakEvenVal = (0, calculations_1.calcularBreakEven)(cenarioPF.aliquota_efetiva_anual, cenarioPJ.aliquota_efetiva);
        const break_even = breakEvenVal
            ? {
                valor_mensal_break_even: breakEvenVal,
                descricao: `Ponto aproximado onde PJ se torna mais vantajosa (carga PJ ${cenarioPJ.aliquota_efetiva.toFixed(1)}% < PF ${cenarioPF.aliquota_efetiva_anual.toFixed(1)}%)`,
            }
            : undefined;
        return {
            ano: input.ano,
            cenarios: {
                pf: cenarioPF,
                pj: cenarioPJ,
                reforma_2027_pf: cenarioReformaPFStandalone,
                reforma_2027_pj: cenarioReforma,
                reforma_2027: cenarioReforma,
            },
            break_even,
            fluxo_caixa: [
                {
                    property_id: '00000000-0000-0000-0000-000000000000',
                    identificador: 'Simulação',
                    receita_total: receitaTotal,
                    despesas_total: despesasDedutiveisTotal + custosOperacionaisTotal,
                    impostos_pf: cenarioPF.imposto_total,
                    impostos_pj: cenarioPJ.imposto_total,
                    lucro_liquido_pf: receitaTotal -
                        despesasDedutiveisTotal -
                        custosOperacionaisTotal -
                        cenarioPF.imposto_total,
                    lucro_liquido_pj: receitaTotal -
                        despesasDedutiveisTotal -
                        custosOperacionaisTotal -
                        cenarioPJ.imposto_total,
                },
            ],
            memoria_calculo: {
                ano: input.ano,
                modo: 'standalone',
                aplicar_presuncao_16_servicos: aplicarPresuncao16,
                aliquota_ibs_cbs_reforma: cenarioReforma.aliquota_nominal_ibs_cbs,
                redutor_locacao_pct: redutorLocacao,
                cenario_32_fixo_imposto: cenarioPJ32Fixo?.imposto_total,
                receita_total: receitaTotal,
                despesas_dedutiveis_total: despesasDedutiveisTotal,
                custos_operacionais_total: custosOperacionaisTotal,
                detalhe_pf: {
                    receita_bruta_total: cenarioPF.receita_bruta_total,
                    despesas_dedutiveis_total: cenarioPF.despesas_dedutiveis_total,
                    base_calculo_total: cenarioPF.base_calculo_total,
                    imposto_total: cenarioPF.imposto_total,
                    aliquota_efetiva_anual: cenarioPF.aliquota_efetiva_anual,
                    trimestres: cenarioPF.trimestres,
                },
                detalhe_pj: {
                    receita_bruta_total: cenarioPJ.receita_bruta_total,
                    presuncao_irpj_pct: aplicarPresuncao16 ? 16 : 32,
                    presuncao_csll_pct: 32,
                    base_presumida_irpj: cenarioPJ.base_presumida_irpj,
                    base_presumida_csll: cenarioPJ.base_presumida_csll,
                    irpj: cenarioPJ.irpj,
                    irpj_adicional: cenarioPJ.irpj_adicional,
                    irpj_postergado: cenarioPJ.irpj_postergado,
                    csll: cenarioPJ.csll,
                    pis: cenarioPJ.pis,
                    cofins: cenarioPJ.cofins,
                    imposto_total: cenarioPJ.imposto_total,
                    aliquota_efetiva: cenarioPJ.aliquota_efetiva,
                    aplicou_in_2306: cenarioPJ.aplicou_in_2306,
                    trimestres: cenarioPJ.trimestres,
                },
                detalhe_reforma: {
                    aliquota_nominal_ibs_cbs: cenarioReforma.aliquota_nominal_ibs_cbs,
                    redutor_locacao_pct: cenarioReforma.redutor_locacao_aplicado_pct,
                    aliquota_efetiva: cenarioReformaPFStandalone.aliquota_efetiva,
                    receita_bruta_total: cenarioReforma.receita_bruta_total,
                    custos_operacionais_total: cenarioReforma.custos_operacionais_total,
                    creditos_ibs_cbs: cenarioReforma.creditos_ibs_cbs,
                    ibs_cbs_sobre_receita: cenarioReforma.ibs_cbs_sobre_receita,
                    ibs_cbs_liquido: cenarioReforma.ibs_cbs_liquido,
                    imposto_total: cenarioReformaPFStandalone.imposto_total,
                    ir_pf: cenarioReformaPFStandalone.ir_pf,
                },
            },
            embasamentos_legais: EMBASAMENTOS_LEGAIS,
        };
    }
}
exports.PropertyService = PropertyService;
