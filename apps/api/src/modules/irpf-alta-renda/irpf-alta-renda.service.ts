import { IrpfAltaRendaRepository, type CreateIrpfAltaRendaData, type IrpfAltaRendaRecord } from './irpf-alta-renda.repository';
import { CompanyRepository } from '../companies/company.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  calcularBCC,
  aplicarFaixas,
  avaliarRiscoRetencao,
  gerarSugestoesPlanejamento,
  comporRendaParaDashboard,
  calcularImpactoIncrementalBase,
  construirMemoriaLegalExclusoes,
  simularOtimizacaoIsentoVsTributado,
  compararEficienciaPfPj,
  CONFIG_LEI_15270_2025,
} from './calculations';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
  ReportSummaryIrpfAltaRendaInput,
  ReportSummaryIrpfAltaRendaResponse,
} from '@shared/core';

function buildMemoriaCalculo(
  input: SimulateIrpfAltaRendaInput,
  bcc: number,
  resultado: ReturnType<typeof aplicarFaixas>
): Record<string, unknown> {
  const rt = input.dados.rendimentos_tributaveis;
  const dividendos = input.dados.rendimentos_isentos_dividendos;
  const somaDividendos = dividendos.reduce((s, d) => s + d.valor, 0);
  const detalheFontes = dividendos.map((d) => ({
    codigo: d.codigo ?? '09',
    nome_fonte: d.nome_fonte ?? d.cnpj_fonte ?? 'Fonte',
    valor: d.valor,
  }));

  const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
  const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
  const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
  const outrosExclArt16A = input.dados.outros_excluidos_art_16a ?? 0;
  const outrosIsentosQueEntram = (input.dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
  const premissasAplicadas: string[] = [];
  if (dividendos.length > 0) {
    premissasAplicadas.push(
      'Risco de retenção mensal foi avaliado por aproximação (valor anual por fonte dividido por 12).'
    );
  }
  const itensLei7713 = input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
  if (itensLei7713.some((i) => (i.irrf ?? 0) <= 0)) {
    premissasAplicadas.push(
      'Itens da Lei 7.713 sem IRRF informado usam alíquota estimada para simulação de compensação.'
    );
  }

  return {
    ...resultado.memoria_calculo,
    rendimentos_tributaveis: rt,
    soma_dividendos: Math.round(somaDividendos * 100) / 100,
    lucros_aprovados_ate_31dez2025: Math.round(lucrosExcl * 100) / 100,
    ganho_capital_excluido: Math.round(ganhoCapitalExcl * 100) / 100,
    rendimentos_fiis_excluidos: Math.round(fiisExcl * 100) / 100,
    outros_excluidos_art_16a: Math.round(outrosExclArt16A * 100) / 100,
    outros_isentos_que_entram_base: Math.round(outrosIsentosQueEntram * 100) / 100,
    detalhe_fontes: detalheFontes,
    base_calculo_combinada: bcc,
    faixa_aplicada: resultado.faixa,
    excedente_sobre_600k: resultado.excedente_sobre_600k ?? 0,
    aliquota_aplicada_percentual: resultado.aliquota_percentual,
    fonte_normativa: CONFIG_LEI_15270_2025.fonte_normativa,
    observacao_progressiva: CONFIG_LEI_15270_2025.observacao_progressiva,
    premissas_aplicadas: premissasAplicadas,
  };
}

export class IrpfAltaRendaService {
  constructor(
    private repo: IrpfAltaRendaRepository,
    private companyRepo: CompanyRepository
  ) {}

  /**
   * Simula impacto tributário (Lei 15.270/2025) sem persistir.
   */
  async simulate(input: SimulateIrpfAltaRendaInput): Promise<IrpfAltaRendaSimulacaoResponse> {
    const rendimentosLei7713 = input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
    if ((input.dados.optou_ajuste_anual_lei_7713 ?? false) && rendimentosLei7713.length > 0) {
      throw new AppError(
        'Rendimentos da Lei 7.713 (art. 12-A) só podem ser tratados como exclusão quando não há opção pelo ajuste anual.',
        'LEI_7713_AJUSTE_ANUAL_INCOMPATIVEL',
        422
      );
    }

    const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
    const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
    const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
    const outrosExclArt16A = input.dados.outros_excluidos_art_16a ?? 0;
    const outrosIsentosQueEntramBase = (input.dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
    const bcc = calcularBCC(
      input.dados.rendimentos_tributaveis,
      input.dados.rendimentos_isentos_dividendos,
      lucrosExcl,
      ganhoCapitalExcl,
      fiisExcl,
      outrosIsentosQueEntramBase,
      outrosExclArt16A
    );
    const resultado = aplicarFaixas(bcc);

    // Art. 16-A § 3º: deduzir do imposto mínimo o IR já pago
    const impostoMinimo = resultado.imposto_estimado;
    const retencao = input.dados.imposto_ja_pago_retencao_fonte ?? 0;
    const carneLeao = input.dados.imposto_ja_pago_carne_leao ?? 0;
    const aplicacoes = input.dados.imposto_ja_pago_aplicacoes ?? 0;
    const antecipado = input.dados.imposto_antecipado_dividendos ?? 0;
    const deducoesTotal = retencao + carneLeao + aplicacoes + antecipado;
    const impostoComplementar = Math.max(0, impostoMinimo - deducoesTotal);

    const risco = avaliarRiscoRetencao(input.dados.rendimentos_isentos_dividendos);
    const memoria_calculo = buildMemoriaCalculo(input, bcc, resultado);

    const ANO_VIGENCIA_IRPFM = 2027;
    const avisoAnoForaVigencia =
      input.ano < ANO_VIGENCIA_IRPFM
        ? `A Lei 15.270/2025 (IRPFM) entra em vigor a partir do ano-calendário 2026 (declaração 2027). Esta simulação para ${input.ano} é apenas projeção; a base legal aplicável na data da declaração pode divergir.`
        : undefined;
    if (avisoAnoForaVigencia) {
      (memoria_calculo as Record<string, unknown>).aviso_vigencia = avisoAnoForaVigencia;
    }
    const composicaoRenda = comporRendaParaDashboard(input.dados);
    const impactoIncrementalBase = calcularImpactoIncrementalBase(input.dados);
    const memoriaLegalExclusoes = construirMemoriaLegalExclusoes(input.dados);
    const otimizacao = simularOtimizacaoIsentoVsTributado(input.dados, bcc, impostoComplementar, deducoesTotal);
    const sugestoes_planejamento = gerarSugestoesPlanejamento(input.dados, {
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      imposto_estimado: impostoComplementar,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe,
    });
    (memoria_calculo as Record<string, unknown>).imposto_minimo = impostoMinimo;
    (memoria_calculo as Record<string, unknown>).deducoes_imposto_ja_pago = deducoesTotal;
    (memoria_calculo as Record<string, unknown>).detalhe_deducoes = {
      retencao_fonte: retencao,
      carne_leao: carneLeao,
      aplicacoes: aplicacoes,
      antecipado_dividendos: antecipado,
    };
    if (otimizacao) {
      (memoria_calculo as Record<string, unknown>).comparativo_investimentos = {
        cenario_atual: {
          bcc: otimizacao.bcc_cenario_atual,
          imposto_complementar: otimizacao.imposto_complementar_atual,
          rendimento_liquido: otimizacao.rendimento_liquido_cenario_isento,
        },
        cenario_otimizado: {
          bcc: otimizacao.bcc_cenario_otimizado,
          imposto_complementar: otimizacao.imposto_complementar_otimizado,
          irrf_compensavel: otimizacao.irrf_compensavel_estimado,
          rendimento_liquido: otimizacao.rendimento_liquido_cenario_tributado,
        },
      };
      if (otimizacao.ganho_liquido_estimado > 0) {
        sugestoes_planejamento.unshift(
          `Otimizacao de carteira: migracao simulada de ${otimizacao.valor_migrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para ativo tributado com IRRF compensavel pode gerar ganho liquido estimado de ${otimizacao.ganho_liquido_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
        );
      }
    }

    const valorHipotetico = input.dados.valor_hipotetico_comparativo_pf_pj;
    const valorAplicacaoRef =
      (valorHipotetico !== undefined && valorHipotetico > 0 ? valorHipotetico : null) ??
      (input.dados.rendimentos_tributados_exclusivamente_lei_7713 ?? []).reduce(
        (s, i) => s + (i.valor_bruto ?? 0),
        0
      ) ||
      (input.dados.outros_rendimentos?.aplicacoes_financeiras_exclusiva ?? 0) ||
      (input.dados.outros_rendimentos?.juros_capital_proprio ?? 0) ||
      100_000;
    const rendimentosPj = input.dados.rendimentos_aplicacoes_financeiras_pj ?? 0;
    const comparativoPfPj = compararEficienciaPfPj(
      valorAplicacaoRef,
      input.dados,
      {
        base_calculo_combinada: resultado.base_calculo_combinada,
        imposto_estimado: impostoComplementar,
        deducoes_imposto_ja_pago: deducoesTotal,
        aliquota_percentual: resultado.aliquota_percentual,
      },
      rendimentosPj
    );
    if (comparativoPfPj && comparativoPfPj.diferenca_percentual_pj_mais_caro > 0) {
      sugestoes_planejamento.push(
        `Investir via PJ: para aplicacao de ${comparativoPfPj.rendimento_bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, a carga na PJ (Lucro Presumido) e ${comparativoPfPj.diferenca_percentual_pj_mais_caro.toFixed(1)}% maior em relacao ao cenario PF.`
      );
    }

    if (comparativoPfPj) {
      const irrfCompensavelPj = comparativoPfPj.cenario_pf_tributacao_exclusiva.irrf;
      const porTrimestre = Math.round((irrfCompensavelPj / 4) * 100) / 100;
      const aliquotaUsada = input.dados.aliquota_irrf_comparativo_percentual ?? 15;
      (memoria_calculo as Record<string, unknown>).irrf_compensavel_pj = {
        anual: irrfCompensavelPj,
        trimestre: { Q1: porTrimestre, Q2: porTrimestre, Q3: porTrimestre, Q4: porTrimestre },
        aliquota_irrf_percentual: aliquotaUsada,
        observacao:
          'IRRF retido na fonte sobre receitas financeiras na PJ (CDB 15-22,5%, JCP 15%, FII 20%). Pode ser compensado com IRPJ devido. Valores por trimestre assumem distribuição uniforme.',
      };
    }

    return {
      ano: input.ano,
      aviso_ano_fora_vigencia: avisoAnoForaVigencia,
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      aliquota_percentual: resultado.aliquota_percentual,
      imposto_minimo: impostoMinimo,
      deducoes_imposto_ja_pago: deducoesTotal,
      imposto_estimado: impostoComplementar,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe,
      sugestoes_planejamento,
      composicao_renda: composicaoRenda,
      impacto_incremental_base: impactoIncrementalBase,
      memoria_legal_exclusoes: memoriaLegalExclusoes,
      otimizacao_isento_vs_tributado: otimizacao,
      comparativo_pf_pj: comparativoPfPj,
      memoria_calculo,
    };
  }

  /**
   * Simula e persiste no tenant. Valida company_id se informado.
   */
  async simulateAndSave(
    input: SimulateAndSaveIrpfAltaRendaInput,
    userId?: string
  ): Promise<{ registro: IrpfAltaRendaRecord; resultado: IrpfAltaRendaSimulacaoResponse }> {
    if (input.company_id) {
      const company = await this.companyRepo.findById(input.company_id);
      if (!company) {
        throw new AppError('Empresa não encontrada', 'COMPANY_NOT_FOUND', 404);
      }
    }

    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });

    const createData: CreateIrpfAltaRendaData = {
      company_id: input.company_id ?? null,
      ano: input.ano,
      contribuinte_nome: input.dados.contribuinte.nome,
      contribuinte_cpf: input.dados.contribuinte.cpf,
      rendimentos_tributaveis: input.dados.rendimentos_tributaveis,
      dados_dividendos: input.dados.rendimentos_isentos_dividendos,
      base_calculo_combinada: resultado.base_calculo_combinada,
      resultado_simulacao: resultado as unknown as Record<string, unknown>,
      title: input.title ?? null,
      created_by: userId ?? null,
    };

    const registro = await this.repo.create(createData);

    return { registro, resultado };
  }

  async getById(id: string): Promise<IrpfAltaRendaRecord> {
    const record = await this.repo.findById(id);
    if (!record) {
      throw new AppError('Simulação IRPF Alta Renda não encontrada', 'IRPF_ALTA_RENDA_NOT_FOUND', 404);
    }
    return record;
  }

  async list(options: { company_id?: string; ano?: number; page?: number; limit?: number }) {
    return this.repo.list(options);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }

  async buildReportSummary(input: ReportSummaryIrpfAltaRendaInput): Promise<ReportSummaryIrpfAltaRendaResponse> {
    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });
    return {
      scenario_name: input.scenario_name?.trim() || `Simulacao IRPFM ${input.ano}`,
      gerado_em: new Date().toISOString(),
      resumo_executivo: {
        faixa: resultado.faixa,
        aliquota_percentual: resultado.aliquota_percentual,
        imposto_a_complementar: resultado.imposto_estimado,
        economia_potencial_otimizacao: resultado.otimizacao_isento_vs_tributado?.ganho_liquido_estimado,
      },
      composicao: {
        tributaveis: resultado.composicao_renda?.tributaveis ?? 0,
        isentos_que_entram_base: resultado.composicao_renda?.isentos_que_entram_base ?? 0,
        isentos_excluidos: resultado.composicao_renda?.isentos_excluidos ?? 0,
      },
      comparativo_otimizacao: resultado.otimizacao_isento_vs_tributado,
      memoria_legal_exclusoes: resultado.memoria_legal_exclusoes ?? [],
      recomendacoes_priorizadas: resultado.sugestoes_planejamento ?? [],
    };
  }
}
