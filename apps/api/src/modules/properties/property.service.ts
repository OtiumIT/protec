import { PropertyRepository } from './property.repository';
import { PropertySimulationRepository } from './property-simulation.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  calcularPF,
  calcularPFDirpfSimplificado,
  calcularPJ,
  calcularReforma2027,
  calcularBreakEven,
  verificarContribuinteIbsCbsPF,
  type OpcoesReformaCalculo,
} from './calculations';
import { resolveLc214IndicesParaSimulacao } from './property-lc214-resolve';
import type {
  CreatePropertyInput,
  CreatePropertiesBatchInput,
  UpdatePropertyInput,
  PropertyTransactionInput,
  SimulatePropertyTaxInput,
  SimulatePropertyTaxAndSaveInput,
  SimulateStandaloneInput,
  SimulateStandaloneAndSaveInput,
  UpdatePropertySimulationInput,
  PropertyTaxSimulationResponse,
  PropertySimulation,
  FluxoCaixa,
  BreakEven,
  UpsertMonthlyTotalsInput,
  EmbasamentoLegal,
  SimulateStandaloneMesInput,
  SaveGanhoCapitalSimulationInput,
  UpdateGanhoCapitalSimulationInput,
  SimulationKind,
} from '@shared/core';
import {
  SaveGanhoCapitalSimulationInputSchema,
  UpdateGanhoCapitalSimulationInputSchema,
  SIMULATION_KIND_LOCACAO_PF_PJ,
  SIMULATION_KIND_GANHO_CAPITAL_IMOVEL,
} from '@shared/core';

/** Embasamentos legais por cenário (fonte oficial para resultado tributário) */
const EMBASAMENTOS_LEGAIS: EmbasamentoLegal[] = [
  {
    cenario: 'pf',
    norma: 'Lei n. 7.739/1989',
    artigo: 'Art. 14',
    descricao:
      'Exclusões da receita de aluguel na base do IR (IPTU, taxas, despesas de cobrança/recebimento, condomínio pago pelo locador, juros de financiamento da aquisição, manutenção etc.). Tratamento consolidado no art. 42 do RIR/2018 (Decreto n. 9.580/2018).',
  },
  {
    cenario: 'pf',
    norma: 'Lei 9.250/95 e legislação do IR',
    descricao: 'Imposto de Renda sobre rendimentos de locação: tabela progressiva mensal (Carnê-Leão), aplicável à base líquida após deduções.',
  },
  {
    cenario: 'pf',
    norma: 'Lei 9.250/95',
    artigo: 'Desconto simplificado (DIRPF)',
    descricao:
      'Na declaração de ajuste anual, o contribuinte pode optar pelo desconto simplificado de 20% dos rendimentos tributáveis, limitado a R$ 16.754,34 (até ano-calendário 2025) ou R$ 17.640,00 (a partir de 2026). Não se aplica ao carnê-leão mensal; o IR pago no carnê-leão é compensado no ajuste.',
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
    descricao: 'Redução de 40% nas alíquotas do IBS/CBS para operações de hospedagem e locação de curtíssima temporada (short stay, Art. 281 LC 214/2025).',
  },
];

type CustoCategoriaAnalise = {
  categoria: string;
  valor: number;
  participacao_percentual: number;
  impacto_lucro_liquido: number;
  gera_credito_ibs_cbs: boolean;
  credito_potencial: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildAnaliseCustos(params: {
  meses: SimulateStandaloneMesInput[];
  receitaTotal: number;
  impostosPf: number;
  impostosPj: number;
  creditosAproveitados: number;
}) {
  const categoriasBase: Array<{ categoria: string; valor: number; geraCredito: boolean }> = [
    { categoria: 'reformas_melhorias', valor: params.meses.reduce((s, m) => s + (m.reformas_melhorias ?? 0), 0), geraCredito: true },
    { categoria: 'mobilia_equipamentos', valor: params.meses.reduce((s, m) => s + (m.mobilia_equipamentos ?? 0), 0), geraCredito: true },
    { categoria: 'limpeza_higienizacao', valor: params.meses.reduce((s, m) => s + (m.limpeza_higienizacao ?? 0), 0), geraCredito: true },
    { categoria: 'comissao_corretagem', valor: params.meses.reduce((s, m) => s + (m.comissao_corretagem ?? 0), 0), geraCredito: true },
    { categoria: 'taxa_plataforma', valor: params.meses.reduce((s, m) => s + (m.taxa_plataforma ?? 0), 0), geraCredito: true },
    { categoria: 'custo_camareira', valor: params.meses.reduce((s, m) => s + (m.custo_camareira ?? 0), 0), geraCredito: true },
    { categoria: 'custo_seguranca', valor: params.meses.reduce((s, m) => s + (m.custo_seguranca ?? 0), 0), geraCredito: true },
    { categoria: 'custo_material_limpeza', valor: params.meses.reduce((s, m) => s + (m.custo_material_limpeza ?? 0), 0), geraCredito: true },
    { categoria: 'custo_lavanderia_enxoval', valor: params.meses.reduce((s, m) => s + (m.custo_lavanderia_enxoval ?? 0), 0), geraCredito: true },
    { categoria: 'custo_checkin_checkout_terceiros', valor: params.meses.reduce((s, m) => s + (m.custo_checkin_checkout_terceiros ?? 0), 0), geraCredito: true },
    { categoria: 'taxas_meios_pagamento', valor: params.meses.reduce((s, m) => s + (m.taxas_meios_pagamento ?? 0), 0), geraCredito: true },
    { categoria: 'tarifas_bancarias', valor: params.meses.reduce((s, m) => s + (m.tarifas_bancarias ?? 0), 0), geraCredito: false },
    { categoria: 'mao_de_obra_operacional', valor: params.meses.reduce((s, m) => s + (m.mao_de_obra_operacional ?? 0), 0), geraCredito: true },
    { categoria: 'encargos_folha', valor: params.meses.reduce((s, m) => s + (m.encargos_folha ?? 0), 0), geraCredito: false },
    { categoria: 'vacancia_estimada', valor: params.meses.reduce((s, m) => s + (m.vacancia_estimada ?? 0), 0), geraCredito: false },
    { categoria: 'inadimplencia_estimada', valor: params.meses.reduce((s, m) => s + (m.inadimplencia_estimada ?? 0), 0), geraCredito: false },
    { categoria: 'outros_custos', valor: params.meses.reduce((s, m) => s + (m.outros_custos ?? 0), 0), geraCredito: false },
  ];
  const custoTotal = categoriasBase.reduce((s, x) => s + x.valor, 0);
  const categorias: CustoCategoriaAnalise[] = categoriasBase
    .filter((x) => x.valor > 0)
    .map((x) => ({
      categoria: x.categoria,
      valor: round2(x.valor),
      participacao_percentual: round2(custoTotal > 0 ? (x.valor / custoTotal) * 100 : 0),
      impacto_lucro_liquido: round2(x.valor),
      gera_credito_ibs_cbs: x.geraCredito,
      credito_potencial: 0,
    }));

  const totalPotencial = categorias.reduce((s, x) => s + (x.gera_credito_ibs_cbs ? x.valor : 0), 0);
  const fatorCredito = totalPotencial > 0 ? params.creditosAproveitados / totalPotencial : 0;
  for (const cat of categorias) {
    cat.credito_potencial = round2(cat.gera_credito_ibs_cbs ? cat.valor * fatorCredito : 0);
  }

  const lucroLiquidoPf = params.receitaTotal - custoTotal - params.impostosPf;
  const lucroLiquidoPj = params.receitaTotal - custoTotal - params.impostosPj;
  const lucroLiquidoPjMais10 = params.receitaTotal - (custoTotal * 1.1) - params.impostosPj;
  const custoOutros = categoriasBase.find((x) => x.categoria === 'outros_custos')?.valor ?? 0;

  return {
    custo_total: round2(custoTotal),
    custo_outros_percentual: round2(custoTotal > 0 ? (custoOutros / custoTotal) * 100 : 0),
    categorias,
    creditos_ibs_cbs: {
      total_potencial: round2(totalPotencial),
      total_aproveitado: round2(params.creditosAproveitados),
      nao_aproveitado: round2(Math.max(0, totalPotencial - params.creditosAproveitados)),
    },
    indicadores: {
      margem_operacional_antes_tributos: round2(params.receitaTotal > 0 ? ((params.receitaTotal - custoTotal) / params.receitaTotal) * 100 : 0),
      margem_operacional_apos_tributos_pf: round2(params.receitaTotal > 0 ? (lucroLiquidoPf / params.receitaTotal) * 100 : 0),
      margem_operacional_apos_tributos_pj: round2(params.receitaTotal > 0 ? (lucroLiquidoPj / params.receitaTotal) * 100 : 0),
      custo_medio_mensal: round2(custoTotal / 12),
      custo_por_diaria: undefined,
    },
    sensibilidade: {
      cenario_base_lucro_liquido_pj: round2(lucroLiquidoPj),
      cenario_custos_mais_10_lucro_liquido_pj: round2(lucroLiquidoPjMais10),
      variacao_lucro_liquido_pj: round2(lucroLiquidoPjMais10 - lucroLiquidoPj),
    },
    alertas: [
      ...(custoTotal > 0 && (custoOutros / custoTotal) > 0.3 ? ['Custos em categoria "outros" acima de 30% do total. Recomenda-se classificar melhor para análise fiscal.'] : []),
    ],
  };
}

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
    const existing = await this.repo.findByClientAndIdentificador(
      data.client_id,
      data.identificador
    );
    if (existing) {
      throw new AppError(
        `Já existe um imóvel com o identificador "${data.identificador}" para este cliente.`,
        'PROPERTY_DUPLICATE',
        409
      );
    }
    return this.repo.create({
      client_id: data.client_id,
      tipo_locacao: data.tipo_locacao,
      natureza_locacao: data.natureza_locacao ?? 'residencial',
      identificador: data.identificador,
      valor_aluguel_mensal: data.valor_aluguel_mensal ?? 0,
      modo_entrada: data.modo_entrada ?? 'detalhado',
      matricula_imovel: data.matricula_imovel,
      inscricao_iptu: data.inscricao_iptu,
      cartorio_registro: data.cartorio_registro,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      iptu_mensal_padrao: data.iptu_mensal_padrao,
      condominio_mensal_padrao: data.condominio_mensal_padrao,
      seguro_mensal_padrao: data.seguro_mensal_padrao,
      camareira_mensal_padrao: data.camareira_mensal_padrao,
      seguranca_mensal_padrao: data.seguranca_mensal_padrao,
      material_limpeza_mensal_padrao: data.material_limpeza_mensal_padrao,
      lavanderia_enxoval_mensal_padrao: data.lavanderia_enxoval_mensal_padrao,
      checkin_checkout_mensal_padrao: data.checkin_checkout_mensal_padrao,
      taxas_pagamento_mensal_padrao: data.taxas_pagamento_mensal_padrao,
      tarifas_bancarias_mensal_padrao: data.tarifas_bancarias_mensal_padrao,
      vacancia_mensal_padrao: data.vacancia_mensal_padrao,
      inadimplencia_mensal_padrao: data.inadimplencia_mensal_padrao,
    });
  }

  async createBatch(input: CreatePropertiesBatchInput) {
    const client = await this.clientRepo.findById(input.client_id);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }

    const seen = new Set<string>();
    const normalized = input.properties.map((item) => ({
      ...item,
      identificador: item.identificador.trim(),
    }));

    for (const item of normalized) {
      const key = item.identificador.toLowerCase();
      if (seen.has(key)) {
        throw new AppError(
          `Identificador duplicado no lote: "${item.identificador}"`,
          'PROPERTY_BATCH_DUPLICATE_IDENTIFIER',
          409
        );
      }
      seen.add(key);
    }

    for (const item of normalized) {
      const existing = await this.repo.findByClientAndIdentificador(
        input.client_id,
        item.identificador
      );
      if (existing) {
        throw new AppError(
          `Já existe um imóvel com o identificador "${item.identificador}" para este cliente.`,
          'PROPERTY_DUPLICATE',
          409
        );
      }
    }

    const created = await this.repo.createBatch(
      normalized.map((item) => ({
        client_id: input.client_id,
        tipo_locacao: item.tipo_locacao,
        natureza_locacao: item.natureza_locacao ?? 'residencial',
        identificador: item.identificador,
        valor_aluguel_mensal: item.valor_aluguel_mensal ?? 0,
        modo_entrada: item.modo_entrada ?? 'detalhado',
        matricula_imovel: item.matricula_imovel,
        inscricao_iptu: item.inscricao_iptu,
        cartorio_registro: item.cartorio_registro,
        cep: item.cep,
        logradouro: item.logradouro,
        numero: item.numero,
        complemento: item.complemento,
        bairro: item.bairro,
        cidade: item.cidade,
        uf: item.uf,
        iptu_mensal_padrao: item.iptu_mensal_padrao,
        condominio_mensal_padrao: item.condominio_mensal_padrao,
        seguro_mensal_padrao: item.seguro_mensal_padrao,
        camareira_mensal_padrao: item.camareira_mensal_padrao,
        seguranca_mensal_padrao: item.seguranca_mensal_padrao,
        material_limpeza_mensal_padrao: item.material_limpeza_mensal_padrao,
        lavanderia_enxoval_mensal_padrao: item.lavanderia_enxoval_mensal_padrao,
        checkin_checkout_mensal_padrao: item.checkin_checkout_mensal_padrao,
        taxas_pagamento_mensal_padrao: item.taxas_pagamento_mensal_padrao,
        tarifas_bancarias_mensal_padrao: item.tarifas_bancarias_mensal_padrao,
        vacancia_mensal_padrao: item.vacancia_mensal_padrao,
        inadimplencia_mensal_padrao: item.inadimplencia_mensal_padrao,
      }))
    );

    return { properties: created };
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
      natureza_locacao: data.natureza_locacao,
      identificador: data.identificador,
      valor_aluguel_mensal: data.valor_aluguel_mensal,
      modo_entrada: data.modo_entrada,
      matricula_imovel: data.matricula_imovel,
      inscricao_iptu: data.inscricao_iptu,
      cartorio_registro: data.cartorio_registro,
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
      iptu_mensal_padrao: data.iptu_mensal_padrao,
      condominio_mensal_padrao: data.condominio_mensal_padrao,
      seguro_mensal_padrao: data.seguro_mensal_padrao,
      camareira_mensal_padrao: data.camareira_mensal_padrao,
      seguranca_mensal_padrao: data.seguranca_mensal_padrao,
      material_limpeza_mensal_padrao: data.material_limpeza_mensal_padrao,
      lavanderia_enxoval_mensal_padrao: data.lavanderia_enxoval_mensal_padrao,
      checkin_checkout_mensal_padrao: data.checkin_checkout_mensal_padrao,
      taxas_pagamento_mensal_padrao: data.taxas_pagamento_mensal_padrao,
      tarifas_bancarias_mensal_padrao: data.tarifas_bancarias_mensal_padrao,
      vacancia_mensal_padrao: data.vacancia_mensal_padrao,
      inadimplencia_mensal_padrao: data.inadimplencia_mensal_padrao,
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
      gera_credito_ibs_cbs: data.gera_credito_ibs_cbs,
      tipo_credito: data.tipo_credito,
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

  /**
   * Retorna dados agregados dos imóveis em formato compatível com a grid do simulador standalone.
   * Usado para preencher a grid quando o usuário seleciona imóveis cadastrados.
   */
  async checkExists(clientId: string, identificador: string) {
    const prop = await this.repo.findByClientAndIdentificador(clientId, identificador);
    return {
      exists: !!prop,
      property_id: prop?.id,
    };
  }

  async aggregatePreview(propertyIds: string[], ano: number) {
    if (propertyIds.length === 0) {
      const emptyMeses = Array.from({ length: 12 }, (_, i) => ({
        mes_referencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
        receita_aluguel_tradicional: 0,
        receita_aluguel_curto: 0,
        receita_garagem: 0,
        receita_outras: 0,
        iptu: 0,
        condominio: 0,
        seguro_imovel: 0,
        juros_financiamento: 0,
        manutencao_conservacao: 0,
        outras_dedutiveis: 0,
        reformas_melhorias: 0,
        mobilia_equipamentos: 0,
        limpeza_higienizacao: 0,
        comissao_corretagem: 0,
        taxa_plataforma: 0,
        custo_camareira: 0,
        custo_seguranca: 0,
        custo_material_limpeza: 0,
        custo_lavanderia_enxoval: 0,
        custo_checkin_checkout_terceiros: 0,
        taxas_meios_pagamento: 0,
        tarifas_bancarias: 0,
        mao_de_obra_operacional: 0,
        encargos_folha: 0,
        vacancia_estimada: 0,
        inadimplencia_estimada: 0,
        outros_custos: 0,
      }));
      return {
        meses: emptyMeses,
        receita_total: 0,
        despesas_dedutiveis_total: 0,
        custos_operacionais_total: 0,
        metadata: {
          usou_defaults_cadastro: false,
          quantidade_imoveis_com_defaults: 0,
        },
      };
    }

    const aggregatedMap = await this.repo.aggregateByPropertiesYear(propertyIds, ano);
    let usouDefaultsCadastro = false;
    let quantidadeImoveisComDefaults = 0;
    for (const [, entry] of aggregatedMap) {
      const hasDefaults =
        (entry.defaults.iptu_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.condominio_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.seguro_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.camareira_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.seguranca_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.material_limpeza_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.lavanderia_enxoval_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.checkin_checkout_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.taxas_pagamento_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.tarifas_bancarias_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.vacancia_mensal_padrao ?? 0) > 0 ||
        (entry.defaults.inadimplencia_mensal_padrao ?? 0) > 0;
      if (hasDefaults) {
        quantidadeImoveisComDefaults += 1;
      }
    }

    let receitaTotal = 0;
    let despesasDedutiveisTotal = 0;
    let custosOperacionaisTotal = 0;
    const meses: Array<{
      mes_referencia: string;
      receita_aluguel_tradicional: number;
      receita_aluguel_curto: number;
      receita_garagem: number;
      receita_outras: number;
      iptu: number;
      condominio: number;
      seguro_imovel: number;
      juros_financiamento: number;
      manutencao_conservacao: number;
      outras_dedutiveis: number;
      reformas_melhorias: number;
      mobilia_equipamentos: number;
      limpeza_higienizacao: number;
      comissao_corretagem: number;
      taxa_plataforma: number;
      custo_camareira: number;
      custo_seguranca: number;
      custo_material_limpeza: number;
      custo_lavanderia_enxoval: number;
      custo_checkin_checkout_terceiros: number;
      taxas_meios_pagamento: number;
      tarifas_bancarias: number;
      mao_de_obra_operacional: number;
      encargos_folha: number;
      vacancia_estimada: number;
      inadimplencia_estimada: number;
      outros_custos: number;
    }> = [];

    for (let m = 1; m <= 12; m++) {
      const mesStr = `${ano}-${String(m).padStart(2, '0')}`;
      let recTrad = 0;
      let recCurto = 0;
      let desp = 0;
      let custo = 0;
      let defaultIptu = 0;
      let defaultCondominio = 0;
      let defaultSeguro = 0;
      let defaultCamareira = 0;
      let defaultSeguranca = 0;
      let defaultMaterialLimpeza = 0;
      let defaultLavanderia = 0;
      let defaultCheckinCheckout = 0;
      let defaultTaxasPagamento = 0;
      let defaultTarifasBancarias = 0;
      let defaultVacancia = 0;
      let defaultInadimplencia = 0;
      for (const [, entry] of aggregatedMap) {
        const mesData = entry.aggregated.meses.find((x) => x.mes === mesStr);
        const receitaMesLançada = mesData?.receita ?? 0;
        const receitaMensalCadastro = entry.defaults.valor_aluguel_mensal ?? 0;
        const receitaBaseMes = receitaMesLançada > 0 ? receitaMesLançada : receitaMensalCadastro;
        if (entry.tipo_locacao === 'flexivel') {
          recCurto += receitaBaseMes;
        } else {
          recTrad += receitaBaseMes;
        }
        if (mesData) {
          desp += mesData.despesas_dedutiveis;
          custo += mesData.custos_operacionais;
        }
        defaultIptu += entry.defaults.iptu_mensal_padrao ?? 0;
        defaultCondominio += entry.defaults.condominio_mensal_padrao ?? 0;
        defaultSeguro += entry.defaults.seguro_mensal_padrao ?? 0;
        defaultCamareira += entry.defaults.camareira_mensal_padrao ?? 0;
        defaultSeguranca += entry.defaults.seguranca_mensal_padrao ?? 0;
        defaultMaterialLimpeza += entry.defaults.material_limpeza_mensal_padrao ?? 0;
        defaultLavanderia += entry.defaults.lavanderia_enxoval_mensal_padrao ?? 0;
        defaultCheckinCheckout += entry.defaults.checkin_checkout_mensal_padrao ?? 0;
        defaultTaxasPagamento += entry.defaults.taxas_pagamento_mensal_padrao ?? 0;
        defaultTarifasBancarias += entry.defaults.tarifas_bancarias_mensal_padrao ?? 0;
        defaultVacancia += entry.defaults.vacancia_mensal_padrao ?? 0;
        defaultInadimplencia += entry.defaults.inadimplencia_mensal_padrao ?? 0;
      }
      const rec = recTrad + recCurto;
      // IPTU e Seguro são despesas anuais: o valor anual total (mensal × 12) é concentrado
      // em Janeiro para refletir corretamente a natureza da despesa no simulador.
      // Nos demais meses, ambos ficam como 0 (o total anual dedutível permanece idêntico).
      const isJaneiro = m === 1;
      const defaultIptuMes = isJaneiro ? defaultIptu * 12 : 0;
      const defaultSeguroMes = isJaneiro ? defaultSeguro * 12 : 0;
      const defaultDesp = defaultIptuMes + defaultCondominio + defaultSeguroMes;
      const defaultCusto =
        defaultCamareira +
        defaultSeguranca +
        defaultMaterialLimpeza +
        defaultLavanderia +
        defaultCheckinCheckout +
        defaultTaxasPagamento +
        defaultTarifasBancarias +
        defaultVacancia +
        defaultInadimplencia;
      const despFinal = Math.max(desp, defaultDesp);
      const custoFinal = Math.max(custo, defaultCusto);
      if (despFinal > desp || custoFinal > custo) {
        usouDefaultsCadastro = true;
      }
      const outrasDedutiveis = Math.max(
        0,
        despFinal - (defaultIptuMes + defaultCondominio + defaultSeguroMes)
      );
      const outrosCustos = Math.max(
        0,
        custoFinal -
          (defaultCamareira +
            defaultSeguranca +
            defaultMaterialLimpeza +
            defaultLavanderia +
            defaultCheckinCheckout +
            defaultTaxasPagamento +
            defaultTarifasBancarias +
            defaultVacancia +
            defaultInadimplencia)
      );
      meses.push({
        mes_referencia: mesStr,
        receita_aluguel_tradicional: Math.round(recTrad * 100) / 100,
        receita_aluguel_curto: Math.round(recCurto * 100) / 100,
        receita_garagem: 0,
        receita_outras: 0,
        iptu: Math.round(defaultIptuMes * 100) / 100,
        condominio: Math.round(defaultCondominio * 100) / 100,
        seguro_imovel: Math.round(defaultSeguroMes * 100) / 100,
        juros_financiamento: 0,
        manutencao_conservacao: 0,
        outras_dedutiveis: Math.round(outrasDedutiveis * 100) / 100,
        reformas_melhorias: 0,
        mobilia_equipamentos: 0,
        limpeza_higienizacao: 0,
        comissao_corretagem: 0,
        taxa_plataforma: 0,
        custo_camareira: Math.round(defaultCamareira * 100) / 100,
        custo_seguranca: Math.round(defaultSeguranca * 100) / 100,
        custo_material_limpeza: Math.round(defaultMaterialLimpeza * 100) / 100,
        custo_lavanderia_enxoval: Math.round(defaultLavanderia * 100) / 100,
        custo_checkin_checkout_terceiros: Math.round(defaultCheckinCheckout * 100) / 100,
        taxas_meios_pagamento: Math.round(defaultTaxasPagamento * 100) / 100,
        tarifas_bancarias: Math.round(defaultTarifasBancarias * 100) / 100,
        mao_de_obra_operacional: 0,
        encargos_folha: 0,
        vacancia_estimada: Math.round(defaultVacancia * 100) / 100,
        inadimplencia_estimada: Math.round(defaultInadimplencia * 100) / 100,
        outros_custos: Math.round(outrosCustos * 100) / 100,
      });
      receitaTotal += rec;
      despesasDedutiveisTotal += despFinal;
      custosOperacionaisTotal += custoFinal;
    }

    return {
      meses,
      receita_total: Math.round(receitaTotal * 100) / 100,
      despesas_dedutiveis_total: Math.round(despesasDedutiveisTotal * 100) / 100,
      custos_operacionais_total: Math.round(custosOperacionaisTotal * 100) / 100,
      metadata: {
        usou_defaults_cadastro: usouDefaultsCadastro,
        quantidade_imoveis_com_defaults: quantidadeImoveisComDefaults,
      },
    };
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
    let receitaLocacaoResidencialAnualAuto = 0;
    let receitaLocacaoNaoResidencialAnualAuto = 0;
    /** Soma anual alinhada ao aggregatePreview: fixa → tradicional, flexível → curto */
    let receitaLongaTotalAuto = 0;
    let receitaShortTotalAuto = 0;
    let quantidadeImoveisResidenciaisAuto = 0;
    let quantidadeImoveisComerciaisAuto = 0;
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
        const receitaMesLançada = mesData?.receita ?? 0;
        const receitaMensalCadastro = entry.defaults.valor_aluguel_mensal ?? 0;
        const receitaBaseMes = receitaMesLançada > 0 ? receitaMesLançada : receitaMensalCadastro;
        rec += receitaBaseMes;
        if (entry.tipo_locacao === 'flexivel') {
          receitaShortTotalAuto += receitaBaseMes;
        } else {
          receitaLongaTotalAuto += receitaBaseMes;
        }
        if (entry.natureza_locacao === 'nao_residencial') {
          receitaLocacaoNaoResidencialAnualAuto += receitaBaseMes;
        } else {
          receitaLocacaoResidencialAnualAuto += receitaBaseMes;
        }
        if (mesData) {
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

    for (const [, entry] of aggregatedMap) {
      if (entry.natureza_locacao === 'nao_residencial') {
        quantidadeImoveisComerciaisAuto += 1;
      } else {
        quantidadeImoveisResidenciaisAuto += 1;
      }
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
    const cenarioPFDirpfSimplificado = calcularPFDirpfSimplificado(
      aggregatedTotal,
      cenarioPF.imposto_total,
      input.ano
    );
    const cenarioPJ = calcularPJ(aggregatedTotal, undefined, {
      aplicar_equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar,
    });
    const creditoInfo = await this.repo.getCreditoIbsCbsAproveitamento(
      input.property_ids,
      input.ano
    );

    const redutorLocacaoSimulate =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
        ? 40
        : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);

    const perfilLocacaoReforma = input.opcoes_reforma?.perfil_locacao;
    let usarAmbosRedutoresSimulate = perfilLocacaoReforma === 'ambos';
    let usarRedutorDiferenciadoSimulate = perfilLocacaoReforma === 'hospedagem_temporada';
    if (
      perfilLocacaoReforma === undefined &&
      receitaLongaTotalAuto > 0 &&
      receitaShortTotalAuto > 0
    ) {
      usarAmbosRedutoresSimulate = true;
      usarRedutorDiferenciadoSimulate = false;
    }

    const quantidadeImoveisResidenciaisSimulate =
      input.quantidade_imoveis_residenciais ?? quantidadeImoveisResidenciaisAuto;
    const quantidadeImoveisComerciaisSimulate =
      input.quantidade_imoveis_comerciais ?? quantidadeImoveisComerciaisAuto;
    const receitaLocacaoResidencialAnualSimulate =
      input.receita_locacao_residencial_anual ?? receitaLocacaoResidencialAnualAuto;
    const receitaLocacaoNaoResidencialAnualSimulate =
      input.receita_locacao_nao_residencial_anual ?? receitaLocacaoNaoResidencialAnualAuto;

    // Art. 260 LC 214/2025: redutor social só para imóveis residenciais de longa duração (> 90 dias).
    const quantidadeImoveisResidenciaisLongaSimulate =
      input.quantidade_imoveis_residenciais_longa ??
      (perfilLocacaoReforma === 'residencial_comum' || perfilLocacaoReforma === undefined
        ? quantidadeImoveisResidenciaisSimulate
        : 0);

    const lc214Simulate = await resolveLc214IndicesParaSimulacao({
      anoCalendario: input.ano,
      quantidadeImoveisResidenciais: quantidadeImoveisResidenciaisLongaSimulate,
      opcoesReforma: input.opcoes_reforma ?? undefined,
    });
    const redutorSocialResidencialAnualSimulate = lc214Simulate.redutorSocialResidencialAnual;

    const anoRefReformaSimulate = input.opcoes_reforma?.ano_referencia_reforma ?? 2033;
    const opcoesReformaSimulate: OpcoesReformaCalculo = {
      ano: anoRefReformaSimulate,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      aliquota_ibs_plena: input.opcoes_reforma?.aliquota_ibs_plena,
      aliquota_cbs_estimada: input.opcoes_reforma?.aliquota_cbs_estimada,
      redutor_locacao_pct: redutorLocacaoSimulate,
      redutor_short_stay_pct: input.opcoes_reforma?.redutor_short_stay_pct,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
      usar_redutor_diferenciado_short: usarAmbosRedutoresSimulate
        ? false
        : usarRedutorDiferenciadoSimulate,
      usar_ambos_redutores: usarAmbosRedutoresSimulate,
      receita_longa_total: receitaLongaTotalAuto,
      receita_short_total: receitaShortTotalAuto,
      redutor_social_residencial_anual:
        input.opcoes_reforma?.redutor_social_residencial_anual ??
        redutorSocialResidencialAnualSimulate,
      receita_locacao_residencial_anual: receitaLocacaoResidencialAnualSimulate,
      receita_locacao_nao_residencial_anual: receitaLocacaoNaoResidencialAnualSimulate,
      fator_credito_custos_operacionais: creditoInfo.fator_aproveitamento,
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedTotal,
      undefined,
      redutorLocacaoSimulate,
      opcoesReformaSimulate
    );
    const quantidadeImoveisResidenciaisParaContribuinte =
      quantidadeImoveisResidenciaisSimulate || 0;
    const quantidadeImoveisTotalSimulate =
      (input.quantidade_imoveis_residenciais != null ||
      input.quantidade_imoveis_comerciais != null
        ? quantidadeImoveisResidenciaisParaContribuinte +
          quantidadeImoveisComerciaisSimulate
        : quantidadeImoveisResidenciaisAuto + quantidadeImoveisComerciaisAuto) || 0;
    const { contribuinte: contribuinteIbsCbsPF } = verificarContribuinteIbsCbsPF(
      quantidadeImoveisTotalSimulate,
      aggregatedTotal.receita_total,
      lc214Simulate.limitesContribuinte
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

    const analiseCustosImoveis = buildAnaliseCustos({
      meses: mesesSoma.map((m) => ({
        mes_referencia: m.mes,
        receita_aluguel_tradicional: 0,
        receita_aluguel_curto: 0,
        receita_garagem: 0,
        receita_outras: 0,
        iptu: 0,
        condominio: 0,
        seguro_imovel: 0,
        juros_financiamento: 0,
        manutencao_conservacao: 0,
        outras_dedutiveis: 0,
        reformas_melhorias: 0,
        mobilia_equipamentos: 0,
        limpeza_higienizacao: 0,
        comissao_corretagem: 0,
        taxa_plataforma: 0,
        custo_camareira: 0,
        custo_seguranca: 0,
        custo_material_limpeza: 0,
        custo_lavanderia_enxoval: 0,
        custo_checkin_checkout_terceiros: 0,
        taxas_meios_pagamento: 0,
        tarifas_bancarias: 0,
        mao_de_obra_operacional: 0,
        encargos_folha: 0,
        vacancia_estimada: 0,
        inadimplencia_estimada: 0,
        outros_custos: m.custos_operacionais,
      })),
      receitaTotal: receitaTotal,
      impostosPf: cenarioPF.imposto_total,
      impostosPj: cenarioPJ.imposto_total,
      creditosAproveitados: cenarioReforma.creditos_ibs_cbs,
    });

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
      const pjForProp = calcularPJ(agg, undefined, {
        aplicar_equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar,
      });
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
        pf_dirpf_simplificado: cenarioPFDirpfSimplificado,
        pj: cenarioPJ,
        reforma_2027_pf: cenarioReformaPF,
        reforma_2027_pj: cenarioReformaPJ,
        reforma_2027: cenarioReforma,
      },
      break_even,
      fluxo_caixa,
      analise_custos: analiseCustosImoveis,
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
        detalhe_pf_dirpf_simplificado: cenarioPFDirpfSimplificado,
        detalhe_pj: {
          receita_bruta_total: cenarioPJ.receita_bruta_total,
          presuncao_irpj_pct: (input.aplicar_equiparacao_hospitalar ?? false)
            ? 8
            : (cenarioPJ.aplicou_presuncao_16 ? 16 : 32),
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
          ...(cenarioReforma.redutor_social_base_deduzida_anual != null && {
            redutor_social_base_deduzida_anual: cenarioReforma.redutor_social_base_deduzida_anual,
          }),
          ...(cenarioReforma.redutor_social_aplicado != null && {
            redutor_social_aplicado: cenarioReforma.redutor_social_aplicado,
          }),
        },
      },
      embasamentos_legais: EMBASAMENTOS_LEGAIS,
      indices_lc214: lc214Simulate.indices_lc214,
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
        (m.custo_camareira ?? 0) +
        (m.custo_seguranca ?? 0) +
        (m.custo_material_limpeza ?? 0) +
        (m.custo_lavanderia_enxoval ?? 0) +
        (m.custo_checkin_checkout_terceiros ?? 0) +
        (m.taxas_meios_pagamento ?? 0) +
        (m.tarifas_bancarias ?? 0) +
        (m.mao_de_obra_operacional ?? 0) +
        (m.encargos_folha ?? 0) +
        (m.vacancia_estimada ?? 0) +
        (m.inadimplencia_estimada ?? 0) +
        (m.outros_custos ?? 0);
      return {
        mes: m.mes_referencia,
        receita,
        despesas_dedutiveis: despesasDedutiveis,
        custos_operacionais: custosOperacionais,
      };
    });
    let receitaTotal = mesesSoma.reduce((s, x) => s + x.receita, 0);
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

    // Bug 1.1: Quando receita residencial e não residencial são ambas informadas,
    // usar a soma como base para PF/PJ (não apenas a soma dos meses).
    const receitaResidencial = input.receita_locacao_residencial_anual ?? 0;
    const receitaNaoResidencial = input.receita_locacao_nao_residencial_anual ?? 0;
    const receitaTotalFromSplit = receitaResidencial + receitaNaoResidencial;
    if (receitaResidencial > 0 && receitaNaoResidencial > 0 && receitaTotalFromSplit > 0) {
      if (receitaTotal > 0) {
        const fator = receitaTotalFromSplit / receitaTotal;
        for (let i = 0; i < mesesSoma.length; i++) {
          mesesSoma[i] = {
            ...mesesSoma[i],
            receita: Math.round(mesesSoma[i].receita * fator * 100) / 100,
          };
        }
      } else {
        const mensal = Math.round((receitaTotalFromSplit / 12) * 100) / 100;
        for (let i = 0; i < mesesSoma.length; i++) {
          const ultimo = i === 11;
          mesesSoma[i] = {
            ...mesesSoma[i],
            receita: ultimo
              ? Math.round((receitaTotalFromSplit - mensal * 11) * 100) / 100
              : mensal,
          };
        }
      }
      receitaTotal = receitaTotalFromSplit;
    }

    const quantidadeImoveisResidenciaisStandalone =
      input.quantidade_imoveis_residenciais ??
      input.quantidade_imoveis ??
      0;

    // Art. 260 LC 214/2025: redutor social só para imóveis residenciais de longa duração (> 90 dias).
    // Curta temporada é equiparada a hotelaria (Arts. 253/278) e não gera redutor social.
    const quantidadeImoveisResidenciaisLongaStandalone =
      input.quantidade_imoveis_residenciais_longa ??
      (input.opcoes_reforma?.perfil_locacao === 'residencial_comum' || input.opcoes_reforma?.perfil_locacao === undefined
        ? quantidadeImoveisResidenciaisStandalone
        : 0);

    const lc214Standalone = await resolveLc214IndicesParaSimulacao({
      anoCalendario: input.ano,
      quantidadeImoveisResidenciais: quantidadeImoveisResidenciaisLongaStandalone,
      opcoesReforma: input.opcoes_reforma ?? undefined,
    });
    const redutorSocialResidencialAnualStandalone =
      lc214Standalone.redutorSocialResidencialAnual;

    const aggregatedTotal = {
      ano: input.ano,
      receita_total: receitaTotal,
      despesas_dedutiveis_total: despesasDedutiveisTotal,
      custos_operacionais_total: custosOperacionaisTotal,
      meses: mesesSoma,
    };

    // Para Reforma com split residencial/não residencial, usar receita segregada
    const aggregatedReforma =
      receitaResidencial > 0 && receitaNaoResidencial > 0
        ? {
            ...aggregatedTotal,
            receita_total: receitaResidencial + receitaNaoResidencial,
          }
        : aggregatedTotal;

    const cenarioPF = calcularPF(aggregatedTotal);
    const cenarioPFDirpfSimplificado = calcularPFDirpfSimplificado(
      aggregatedTotal,
      cenarioPF.imposto_total,
      input.ano
    );
    const cenarioPJ = calcularPJ(aggregatedTotal, undefined, {
      aplicar_equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar,
    });
    // cenarioPJ32Fixo removido - presunção 16% agora é automática baseada na receita
    const redutorLocacao =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada'
        ? 40
        : (input.opcoes_reforma?.redutor_locacao_pct ?? 70);
    let usarRedutorDiferenciado =
      input.opcoes_reforma?.perfil_locacao === 'hospedagem_temporada';
    let usarAmbosRedutores = input.opcoes_reforma?.perfil_locacao === 'ambos';
    if (
      input.opcoes_reforma?.perfil_locacao === undefined &&
      receitaLongaTotal > 0 &&
      receitaShortTotal > 0
    ) {
      usarAmbosRedutores = true;
      usarRedutorDiferenciado = false;
    }
    const anoRefReforma = input.opcoes_reforma?.ano_referencia_reforma ?? 2033;
    const opcoesReformaStandalone: OpcoesReformaCalculo = {
      ano: anoRefReforma,
      aliquota_ibs_cbs_estimada: input.opcoes_reforma?.aliquota_ibs_cbs_estimada,
      aliquota_ibs_plena: input.opcoes_reforma?.aliquota_ibs_plena,
      aliquota_cbs_estimada: input.opcoes_reforma?.aliquota_cbs_estimada,
      redutor_locacao_pct: redutorLocacao,
      redutor_short_stay_pct: input.opcoes_reforma?.redutor_short_stay_pct,
      contrato_antes_16012025: input.opcoes_reforma?.contrato_antes_16012025,
      usar_redutor_diferenciado_short: usarAmbosRedutores ? false : usarRedutorDiferenciado,
      usar_ambos_redutores: usarAmbosRedutores,
      receita_longa_total: receitaLongaTotal,
      receita_short_total: receitaShortTotal,
      receita_locacao_residencial_anual: input.receita_locacao_residencial_anual,
      receita_locacao_nao_residencial_anual: input.receita_locacao_nao_residencial_anual,
      redutor_social_residencial_anual:
        input.opcoes_reforma?.redutor_social_residencial_anual ??
        redutorSocialResidencialAnualStandalone,
    };
    const cenarioReforma = calcularReforma2027(
      aggregatedReforma,
      undefined,
      redutorLocacao,
      opcoesReformaStandalone
    );
    const quantidadeImoveisComerciaisStandalone =
      input.quantidade_imoveis_comerciais ?? 0;
    const quantidadeImoveisTotalStandalone =
      (input.quantidade_imoveis_residenciais != null ||
      input.quantidade_imoveis_comerciais != null
        ? quantidadeImoveisResidenciaisStandalone +
          quantidadeImoveisComerciaisStandalone
        : input.quantidade_imoveis ?? 1) || 1;

    const { contribuinte: contribuinteIbsCbsPFStandalone } = verificarContribuinteIbsCbsPF(
      quantidadeImoveisTotalStandalone,
      receitaTotal,
      lc214Standalone.limitesContribuinte
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

    const analiseCustos = buildAnaliseCustos({
      meses: input.meses,
      receitaTotal,
      impostosPf: cenarioPF.imposto_total,
      impostosPj: cenarioPJ.imposto_total,
      creditosAproveitados: cenarioReforma.creditos_ibs_cbs,
    });

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
        pf_dirpf_simplificado: cenarioPFDirpfSimplificado,
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
      analise_custos: analiseCustos,
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
        detalhe_pf_dirpf_simplificado: cenarioPFDirpfSimplificado,
        detalhe_pj: {
          receita_bruta_total: cenarioPJ.receita_bruta_total,
          presuncao_irpj_pct: (input.aplicar_equiparacao_hospitalar ?? false)
            ? 8
            : (cenarioPJ.aplicou_presuncao_16 ? 16 : 32),
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
          aliquota_efetiva: cenarioReformaPFStandalone.aliquota_efetiva,
          receita_bruta_total: cenarioReforma.receita_bruta_total,
          custos_operacionais_total: cenarioReforma.custos_operacionais_total,
          creditos_ibs_cbs: cenarioReforma.creditos_ibs_cbs,
          ibs_cbs_sobre_receita: cenarioReforma.ibs_cbs_sobre_receita,
          ibs_cbs_liquido: cenarioReforma.ibs_cbs_liquido,
          imposto_total: cenarioReformaPFStandalone.imposto_total,
          ir_pf: cenarioReformaPFStandalone.ir_pf,
          ...(cenarioReforma.redutor_social_base_deduzida_anual != null && {
            redutor_social_base_deduzida_anual: cenarioReforma.redutor_social_base_deduzida_anual,
          }),
          ...(cenarioReforma.redutor_social_aplicado != null && {
            redutor_social_aplicado: cenarioReforma.redutor_social_aplicado,
          }),
        },
      },
      embasamentos_legais: EMBASAMENTOS_LEGAIS,
      indices_lc214: lc214Standalone.indices_lc214,
    };
  }

  /** Simular por property_ids e salvar no histórico (ex.: tela de detalhe do imóvel). */
  async simulateAndSaveFromProperties(
    input: SimulatePropertyTaxAndSaveInput,
    userId?: string
  ): Promise<{ simulation: PropertySimulation; result: PropertyTaxSimulationResponse }> {
    if (this.clientRepo) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    const result = await this.simulate(input);
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    const simulation = await this.simulationRepo.create({
      client_id: input.client_id,
      ano: input.ano,
      simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    });
    return { simulation, result };
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
      simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ,
      input_data: input as unknown as Record<string, unknown>,
      result_data: result as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    });
    return { simulation, result };
  }

  /** Persistir simulação Ganho de Capital (cálculo exclusivamente no cliente) */
  async createGanhoCapitalSimulation(
    input: SaveGanhoCapitalSimulationInput,
    userId?: string
  ): Promise<{ simulation: PropertySimulation }> {
    const parsed = SaveGanhoCapitalSimulationInputSchema.parse(input);
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    if (this.clientRepo) {
      const client = await this.clientRepo.findById(parsed.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    const simulation = await this.simulationRepo.create({
      client_id: parsed.client_id,
      ano: parsed.ano,
      simulation_kind: SIMULATION_KIND_GANHO_CAPITAL_IMOVEL,
      input_data: parsed.input as unknown as Record<string, unknown>,
      result_data: parsed.result as unknown as Record<string, unknown>,
      title: parsed.title ?? null,
      created_by: userId ?? null,
    });
    return { simulation };
  }

  async updateGanhoCapitalSimulation(
    id: string,
    input: UpdateGanhoCapitalSimulationInput
  ): Promise<{ simulation: PropertySimulation }> {
    if (!this.simulationRepo) {
      throw new AppError('Simulador de persistência não configurado', 'INTERNAL_ERROR', 500);
    }
    const existing = await this.getSimulationById(id);
    if (existing.simulation_kind !== SIMULATION_KIND_GANHO_CAPITAL_IMOVEL) {
      throw new AppError(
        'Esta simulação não é do tipo ganho de capital',
        'WRONG_SIMULATION_KIND',
        400
      );
    }
    const parsed = UpdateGanhoCapitalSimulationInputSchema.parse(input);
    const clientId = parsed.client_id ?? existing.client_id;
    if (clientId && this.clientRepo) {
      const client = await this.clientRepo.findById(clientId);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    const simulation = await this.simulationRepo.update(id, {
      ano: parsed.ano,
      client_id: clientId,
      simulation_kind: SIMULATION_KIND_GANHO_CAPITAL_IMOVEL,
      input_data: parsed.input as unknown as Record<string, unknown>,
      result_data: parsed.result as unknown as Record<string, unknown>,
      title: parsed.title !== undefined ? parsed.title : existing.title,
    });
    return { simulation };
  }

  async listSimulations(options: {
    client_id?: string;
    ano?: number;
    simulation_kind?: SimulationKind;
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
    const existing = await this.getSimulationById(id);
    if (existing.simulation_kind === SIMULATION_KIND_GANHO_CAPITAL_IMOVEL) {
      throw new AppError(
        'Use PATCH /properties/simulations/:id/ganho-capital para atualizar esta simulação',
        'WRONG_SIMULATION_KIND',
        400
      );
    }
    const result = await this.simulateStandalone(input);
    const simulation = await this.simulationRepo.update(id, {
      ano: input.ano,
      simulation_kind: SIMULATION_KIND_LOCACAO_PF_PJ,
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
