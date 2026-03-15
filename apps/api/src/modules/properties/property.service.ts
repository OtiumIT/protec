import { PropertyRepository } from './property.repository';
import { PropertySimulationRepository } from './property-simulation.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  calcularPF,
  calcularPJ,
  calcularReforma2027,
  calcularBreakEven,
  verificarContribuinteIbsCbsPF,
  type OpcoesReformaCalculo,
} from './calculations';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyTransactionInput,
  SimulatePropertyTaxInput,
  SimulateStandaloneInput,
  SimulateStandaloneAndSaveInput,
  UpdatePropertySimulationInput,
  PropertyTaxSimulationResponse,
  PropertySimulation,
  FluxoCaixa,
  BreakEven,
  UpsertMonthlyTotalsInput,
  EmbasamentoLegal,
} from '@shared/core';

/** Embasamentos legais por cenário (fonte oficial para resultado tributário) */
const EMBASAMENTOS_LEGAIS: EmbasamentoLegal[] = [
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

export class PropertyService {
  constructor(
    private repo: PropertyRepository,
    private clientRepo: ClientRepository,
    private simulationRepo?: PropertySimulationRepository
  ) {}

  async create(data: CreatePropertyInput) {
    const client = await this.clientRepo.findById(data.client_id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
    return this.repo.create({
      client_id: data.client_id,
      tipo_locacao: data.tipo_locacao,
      identificador: data.identificador,
      modo_entrada: data.modo_entrada ?? 'detalhado',
    });
  }

  async getById(id: string) {
    const prop = await this.repo.findByIdWithClient(id);
    if (!prop) {
      throw new AppError('Imóvel não encontrado', 'PROPERTY_NOT_FOUND', 404);
    }
    return prop;
  }

  async update(id: string, data: UpdatePropertyInput) {
    await this.getById(id);
    if (data.client_id) {
      const client = await this.clientRepo.findById(data.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    return this.repo.update(id, {
      client_id: data.client_id,
      tipo_locacao: data.tipo_locacao,
      identificador: data.identificador,
      modo_entrada: data.modo_entrada,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    await this.repo.delete(id);
  }

  async list(options: { client_id?: string; page?: number; limit?: number }) {
    return this.repo.list(options);
  }

  // --- Transactions ---

  async addTransaction(propertyId: string, data: PropertyTransactionInput) {
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

  async addTransactionsBatch(
    propertyId: string,
    transactions: PropertyTransactionInput[]
  ) {
    await this.getById(propertyId);
    return this.repo.createTransactionsBatch(propertyId, transactions);
  }

  async deleteTransaction(propertyId: string, txId: string) {
    const tx = await this.repo.getTransactionById(txId);
    if (!tx || tx.property_id !== propertyId) {
      throw new AppError('Transação não encontrada', 'TRANSACTION_NOT_FOUND', 404);
    }
    await this.repo.deleteTransaction(txId);
  }

  async upsertMonthlyTotals(input: UpsertMonthlyTotalsInput) {
    const propertyId = input.property_id;
    if (!propertyId) {
      throw new AppError('property_id é obrigatório', 'VALIDATION_ERROR', 400);
    }
    const prop = await this.repo.findById(propertyId);
    if (!prop) {
      throw new AppError('Imóvel não encontrado', 'PROPERTY_NOT_FOUND', 404);
    }
    if (prop.modo_entrada !== 'reduzido') {
      throw new AppError(
        'Este imóvel usa modo detalhado. Use lançamentos individuais.',
        'INVALID_MODE',
        400
      );
    }
    await this.repo.upsertMonthlyTotals(propertyId, input.ano, input.meses);
  }

  async getMonthlyTotals(propertyId: string, ano: number) {
    await this.getById(propertyId);
    return this.repo.getMonthlyTotals(propertyId, ano);
  }

  async listTransactions(
    propertyId: string,
    options?: { ano?: number; mes?: string }
  ) {
    await this.getById(propertyId);
    return this.repo.listTransactions(propertyId, options);
  }

  // --- Simulation ---

  async simulate(
    input: SimulatePropertyTaxInput
  ): Promise<PropertyTaxSimulationResponse> {
    for (const pid of input.property_ids) {
      const prop = await this.repo.findById(pid);
      if (!prop) {
        throw new AppError(
          `Imóvel não encontrado: ${pid}`,
          'PROPERTY_NOT_FOUND',
          404
        );
      }
    }

    const aggregatedMap = await this.repo.aggregateByPropertiesYear(
      input.property_ids,
      input.ano
    );

    // Somar agregados de todos os imóveis
    let receitaTotal = 0;
    let despesasDedutiveisTotal = 0;
    let custosOperacionaisTotal = 0;
    const mesesSoma: Array<{
      mes: string;
      receita: number;
      despesas_dedutiveis: number;
      custos_operacionais: number;
    }> = [];

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

    const cenarioPF = calcularPF(
      aggregatedTotal,
      input.aliquota_efetiva_dirpf
    );
    const cenarioPJ = calcularPJ(aggregatedTotal);

    const redutorLocacaoSimulate =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
        ? 50
        : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);
    const opcoesReformaSimulate: OpcoesReformaCalculo = {
      ano: input.ano,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      aliquota_ibs_plena: input.opcoes_reforma?.aliquota_ibs_plena,
      aliquota_cbs_estimada: input.opcoes_reforma?.aliquota_cbs_estimada,
      redutor_locacao_pct: redutorLocacaoSimulate,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedTotal,
      undefined,
      redutorLocacaoSimulate,
      opcoesReformaSimulate
    );
    const quantidadeImoveisSimulate = input.property_ids.length;
    const { contribuinte: contribuinteIbsCbsPF } = verificarContribuinteIbsCbsPF(
      quantidadeImoveisSimulate,
      aggregatedTotal.receita_total
    );
    /** Em 2027 a PF continua pagando IR (Carnê-Leão) além de IBS/CBS; total = IR + IBS/CBS. Se não for contribuinte IBS/CBS, só IR. */
    const impostoTotalPFReforma = contribuinteIbsCbsPF
      ? Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100
      : cenarioPF.imposto_total;
    const aliquotaEfetivaPFReforma =
      aggregatedTotal.receita_total > 0
        ? Math.round(
            (impostoTotalPFReforma / aggregatedTotal.receita_total) * 100 * 100
          ) / 100
        : 0;
    const cenarioReformaPF = {
      ...cenarioReforma,
      imposto_total: impostoTotalPFReforma,
      aliquota_efetiva: aliquotaEfetivaPFReforma,
      ir_pf: cenarioPF.imposto_total,
      ...(contribuinteIbsCbsPF ? {} : { ibs_cbs_liquido: 0 }),
    };

    /** Reforma PJ: IBS/CBS + IRPJ + CSLL (PIS/COFINS substituídos por IBS/CBS) */
    const irpjReforma = cenarioPJ.irpj + (cenarioPJ.irpj_adicional ?? 0) + (cenarioPJ.irpj_postergado ?? 0);
    const impostoTotalReformaPJ =
      Math.round((cenarioReforma.ibs_cbs_liquido + irpjReforma + cenarioPJ.csll) * 100) / 100;
    const aliquotaEfetivaReformaPJ =
      aggregatedTotal.receita_total > 0
        ? Math.round((impostoTotalReformaPJ / aggregatedTotal.receita_total) * 100 * 100) / 100
        : 0;
    const cenarioReformaPJ = {
      ...cenarioReforma,
      imposto_total: impostoTotalReformaPJ,
      aliquota_efetiva: aliquotaEfetivaReformaPJ,
      irpj: Math.round(irpjReforma * 100) / 100,
      csll: cenarioPJ.csll,
    };

    const breakEvenVal = calcularBreakEven(
      cenarioPF.aliquota_efetiva_anual,
      cenarioPJ.aliquota_efetiva
    );
    const break_even: BreakEven | undefined = breakEvenVal
      ? {
          valor_mensal_break_even: breakEvenVal,
          descricao: `Ponto aproximado onde PJ se torna mais vantajosa (carga PJ ${cenarioPJ.aliquota_efetiva.toFixed(1)}% < PF ${cenarioPF.aliquota_efetiva_anual.toFixed(1)}%)`,
        }
      : undefined;

    const fluxo_caixa: FluxoCaixa[] = [];
    for (const [pid, entry] of aggregatedMap) {
      const agg = entry.aggregated;
      const pfForProp = calcularPF(agg);
      const pjForProp = calcularPJ(agg);
      fluxo_caixa.push({
        property_id: pid,
        identificador: entry.identificador,
        receita_total: agg.receita_total,
        despesas_total: agg.despesas_dedutiveis_total + agg.custos_operacionais_total,
        impostos_pf: pfForProp.imposto_total,
        impostos_pj: pjForProp.imposto_total,
        lucro_liquido_pf:
          agg.receita_total -
          agg.despesas_dedutiveis_total -
          agg.custos_operacionais_total -
          pfForProp.imposto_total,
        lucro_liquido_pj:
          agg.receita_total -
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
        reforma_2027_pj: cenarioReformaPJ,
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
          presuncao_irpj_pct: (input.aplicar_equiparacao_hospitalar ?? false)
            ? 8
            : (input.aplicar_presuncao_16_servicos ?? false)
              ? 16
              : 32,
          presuncao_csll_pct: (input.aplicar_equiparacao_hospitalar ?? false) ? 12 : 32,
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
  async simulateStandalone(
    input: SimulateStandaloneInput
  ): Promise<PropertyTaxSimulationResponse> {
    const mesesSoma = input.meses.map((m) => {
      const receita =
        (m.receita_aluguel_tradicional ?? 0) +
        (m.receita_aluguel_curto ?? 0) +
        (m.receita_garagem ?? 0) +
        (m.receita_outras ?? 0);
      const despesasDedutiveis =
        (m.iptu ?? 0) +
        (m.condominio ?? 0) +
        (m.seguro_imovel ?? 0) +
        (m.juros_financiamento ?? 0) +
        (m.manutencao_conservacao ?? 0) +
        (m.outras_dedutiveis ?? 0);
      const custosOperacionais =
        (m.reformas_melhorias ?? 0) +
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
    const despesasDedutiveisTotal = mesesSoma.reduce(
      (s, x) => s + x.despesas_dedutiveis,
      0
    );
    const custosOperacionaisTotal = mesesSoma.reduce(
      (s, x) => s + x.custos_operacionais,
      0
    );
    const receitaLongaTotal = input.meses.reduce(
      (s, m) => s + (m.receita_aluguel_tradicional ?? 0),
      0
    );
    const receitaShortTotal = input.meses.reduce(
      (s, m) => s + (m.receita_aluguel_curto ?? 0),
      0
    );

    const aggregatedTotal = {
      ano: input.ano,
      receita_total: receitaTotal,
      despesas_dedutiveis_total: despesasDedutiveisTotal,
      custos_operacionais_total: custosOperacionaisTotal,
      meses: mesesSoma,
    };

    const cenarioPF = calcularPF(aggregatedTotal);
    const cenarioPJ = calcularPJ(aggregatedTotal);
    // cenarioPJ32Fixo removido - presunção 16% agora é automática baseada na receita
    const redutorLocacao =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
        ? 50
        : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);
    const usarRedutorDiferenciado =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada';
    const opcoesReformaStandalone: OpcoesReformaCalculo = {
      ano: input.ano,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      aliquota_ibs_plena: input.opcoes_reforma?.aliquota_ibs_plena,
      aliquota_cbs_estimada: input.opcoes_reforma?.aliquota_cbs_estimada,
      redutor_locacao_pct: redutorLocacao,
      redutor_short_stay_pct: input.opcoes_reforma?.redutor_short_stay_pct,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
      usar_redutor_diferenciado_short: usarRedutorDiferenciado,
      receita_longa_total: receitaLongaTotal,
      receita_short_total: receitaShortTotal,
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedTotal,
      undefined,
      redutorLocacao,
      opcoesReformaStandalone
    );
    const quantidadeImoveisStandalone = input.quantidade_imoveis ?? 1;
    const { contribuinte: contribuinteIbsCbsPFStandalone } = verificarContribuinteIbsCbsPF(
      quantidadeImoveisStandalone,
      receitaTotal
    );
    /** Em 2027 a PF continua pagando IR (Carnê-Leão) além de IBS/CBS; total = IR + IBS/CBS. Se não for contribuinte IBS/CBS, só IR. */
    const impostoTotalPFReformaStandalone = contribuinteIbsCbsPFStandalone
      ? Math.round((cenarioPF.imposto_total + cenarioReforma.ibs_cbs_liquido) * 100) / 100
      : cenarioPF.imposto_total;
    const aliquotaEfetivaPFReformaStandalone =
      receitaTotal > 0
        ? Math.round(
            (impostoTotalPFReformaStandalone / receitaTotal) * 100 * 100
          ) / 100
        : 0;
    const cenarioReformaPFStandalone = {
      ...cenarioReforma,
      imposto_total: impostoTotalPFReformaStandalone,
      aliquota_efetiva: aliquotaEfetivaPFReformaStandalone,
      ir_pf: cenarioPF.imposto_total,
      ...(contribuinteIbsCbsPFStandalone ? {} : { ibs_cbs_liquido: 0 }),
    };

    /** Reforma PJ: IBS/CBS + IRPJ + CSLL (PIS/COFINS substituídos por IBS/CBS) */
    const irpjReformaStandalone =
      cenarioPJ.irpj + (cenarioPJ.irpj_adicional ?? 0) + (cenarioPJ.irpj_postergado ?? 0);
    const impostoTotalReformaPJStandalone =
      Math.round((cenarioReforma.ibs_cbs_liquido + irpjReformaStandalone + cenarioPJ.csll) * 100) /
      100;
    const aliquotaEfetivaReformaPJStandalone =
      receitaTotal > 0
        ? Math.round(
            (impostoTotalReformaPJStandalone / receitaTotal) * 100 * 100
          ) / 100
        : 0;
    const cenarioReformaPJStandalone = {
      ...cenarioReforma,
      imposto_total: impostoTotalReformaPJStandalone,
      aliquota_efetiva: aliquotaEfetivaReformaPJStandalone,
      irpj: Math.round(irpjReformaStandalone * 100) / 100,
      csll: cenarioPJ.csll,
    };

    const breakEvenVal = calcularBreakEven(
      cenarioPF.aliquota_efetiva_anual,
      cenarioPJ.aliquota_efetiva
    );
    const break_even: BreakEven | undefined = breakEvenVal
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
        reforma_2027_pj: cenarioReformaPJStandalone,
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
          lucro_liquido_pf:
            receitaTotal -
            despesasDedutiveisTotal -
            custosOperacionaisTotal -
            cenarioPF.imposto_total,
          lucro_liquido_pj:
            receitaTotal -
            despesasDedutiveisTotal -
            custosOperacionaisTotal -
            cenarioPJ.imposto_total,
        },
      ],
      memoria_calculo: {
        ano: input.ano,
        modo: 'standalone',
        aplicar_presuncao_16_servicos: cenarioPJ.aplicou_presuncao_16,
        aliquota_ibs_cbs_reforma: cenarioReforma.aliquota_nominal_ibs_cbs,
        redutor_locacao_pct: redutorLocacao,
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
          presuncao_irpj_pct: cenarioPJ.aplicou_presuncao_16 ? 16 : 32,
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

  /** Simular e salvar (persistir simulação standalone) */
  async simulateStandaloneAndSave(
    input: SimulateStandaloneAndSaveInput,
    userId?: string
  ): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    if (input.save_simulation && !input.client_id) {
      throw new AppError('client_id é obrigatório ao salvar a simulação', 'CLIENT_REQUIRED', 400);
    }
    if (input.client_id && this.clientRepo) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    const result = await this.simulateStandalone(input);
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    const simulation = await this.simulationRepo.create({
      client_id: input.client_id!,
      ano: input.ano,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    });
    return { simulation, result };
  }

  async listSimulations(options: {
    client_id?: string;
    ano?: number;
    page?: number;
    limit?: number;
  }) {
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    return this.simulationRepo.list(options);
  }

  async getSimulationById(id: string): Promise<PropertySimulation> {
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    const sim = await this.simulationRepo.findById(id);
    if (!sim) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    return sim;
  }

  async updateSimulation(
    id: string,
    input: UpdatePropertySimulationInput
  ): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    await this.getSimulationById(id);
    const result = await this.simulateStandalone(input);
    const simulation = await this.simulationRepo.update(id, {
      ano: input.ano,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
    });
    return { simulation, result };
  }

  async deleteSimulation(id: string): Promise<void> {
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    await this.getSimulationById(id);
    await this.simulationRepo.delete(id);
  }
}
