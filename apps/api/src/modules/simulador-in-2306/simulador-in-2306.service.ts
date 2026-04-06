import { SimuladorIN2306Repository, CreateIN2306SimulationData } from './simulador-in-2306.repository';
import { ClientRepository } from '../clients/client.repository';
import { FiscalFileRepository } from '../fiscal-files/fiscal-file.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  calcularCenario2025,
  calcularAno2026,
  agregarAnual,
  detalheProporcaoTrimestre,
  rateioAdicionalIrpjPorTrimestre,
} from './calculations';
import type {
  SimulateIN2306Input,
  SimulateTributarioIN2306Input,
  CenarioAnual,
  SimuladorTributarioResponse,
  UpdateIN2306SimulationInput,
} from '@shared/core';
import type { IN2306Simulation } from '@shared/core';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class SimuladorIN2306Service {
  constructor(
    private repo: SimuladorIN2306Repository,
    private clientRepo: ClientRepository,
    private fiscalFileRepo: FiscalFileRepository
  ) {}

  private normalizePrefillFromStored(
    raw: Record<string, unknown>,
    competence: string
  ): {
    ano: number;
    trimestres: Array<{
      produtos_mercadorias: number;
      servicos: number;
      servicos_favorecida: number;
      servicos_hospitalares: number;
      demais_receitas: number;
    }>;
    deducoes_trimestrais: Array<{ pis_cofins_zero: number; icms_destacado: number }>;
    retencoes_trimestrais: Array<{ irrf: number; orgaos_publicos: number }>;
    aplicar_equiparacao_hospitalar: boolean;
  } {
    const yearFromCompetence = parseInt(competence.slice(0, 4), 10);
    let ano =
      typeof raw.ano === 'number' && Number.isFinite(raw.ano)
        ? Math.min(2030, Math.max(2020, Math.floor(raw.ano)))
        : yearFromCompetence;
    if (!Number.isFinite(ano) || ano < 2020) ano = new Date().getFullYear();

    const trimRaw = Array.isArray(raw.trimestres) ? raw.trimestres : [];
    const trimestres = [0, 1, 2, 3].map((i) => {
      const t = trimRaw[i] as Record<string, unknown> | undefined;
      return {
        produtos_mercadorias: round2(Number(t?.produtos_mercadorias ?? 0)),
        servicos: round2(Number(t?.servicos ?? 0)),
        servicos_favorecida: round2(Number(t?.servicos_favorecida ?? 0)),
        servicos_hospitalares: round2(Number(t?.servicos_hospitalares ?? 0)),
        demais_receitas: round2(Number(t?.demais_receitas ?? 0)),
      };
    });

    const dedRaw = Array.isArray(raw.deducoes_trimestrais) ? raw.deducoes_trimestrais : [];
    const deducoes_trimestrais = [0, 1, 2, 3].map((i) => {
      const d = dedRaw[i] as Record<string, unknown> | undefined;
      return {
        pis_cofins_zero: round2(Number(d?.pis_cofins_zero ?? 0)),
        icms_destacado: round2(Number(d?.icms_destacado ?? 0)),
      };
    });

    const retRaw = Array.isArray(raw.retencoes_trimestrais) ? raw.retencoes_trimestrais : [];
    const retencoes_trimestrais = [0, 1, 2, 3].map((i) => {
      const r = retRaw[i] as Record<string, unknown> | undefined;
      return {
        irrf: round2(Number(r?.irrf ?? 0)),
        orgaos_publicos: round2(Number(r?.orgaos_publicos ?? 0)),
      };
    });

    return {
      ano,
      trimestres,
      deducoes_trimestrais,
      retencoes_trimestrais,
      aplicar_equiparacao_hospitalar: Boolean(raw.aplicar_equiparacao_hospitalar),
    };
  }

  private toIso(d: Date | string): string {
    if (d instanceof Date) return d.toISOString();
    return String(d);
  }

  /**
   * Competências com SPED/ECD processado e prefill do simulador extraído (validação no servidor).
   */
  async listProcessedSpedPrefillCompetences(clientId: string): Promise<string[]> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }
    return this.fiscalFileRepo.listDistinctSimuladorPrefillCompetences(clientId);
  }

  /**
   * Consolida o último `module_prefill_simulador_in2306` para cliente + competência.
   */
  async getPrefillByCompetence(clientId: string, competence: string): Promise<{
    client_id: string;
    competence: string;
    fiscal_file: {
      id: string;
      client_id: string;
      competence: string;
      file_name: string;
    } | null;
    extracted_at: string;
    source_files: Array<{ id: string; file_name: string; created_at: string }>;
    prefill: {
      ano: number;
      trimestres: Array<{
        produtos_mercadorias: number;
        servicos: number;
        servicos_favorecida: number;
        servicos_hospitalares: number;
        demais_receitas: number;
      }>;
      deducoes_trimestrais: Array<{ pis_cofins_zero: number; icms_destacado: number }>;
      retencoes_trimestrais: Array<{ irrf: number; orgaos_publicos: number }>;
      aplicar_equiparacao_hospitalar: boolean;
    };
    meta: {
      confidence?: { overall?: number; coverage?: number; linhas_analisadas?: number; linhas_classificadas?: number };
      origem?: string;
    };
  }> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
    }

    const row = await this.fiscalFileRepo.findLatestSimuladorIn2306PrefillByCompetence(
      clientId,
      competence
    );
    if (!row) {
      throw new AppError(
        'Não há dados do simulador extraídos do SPED para este cliente e competência. Envie e processe um arquivo ECD/ECF com leiaute suportado.',
        'NO_EXTRACTED_DATA',
        404
      );
    }

    const fiscalFile = await this.fiscalFileRepo.findById(row.fiscal_file_id);
    const data = (row.data || {}) as Record<string, unknown>;
    const prefill = this.normalizePrefillFromStored(data, competence);

    const sourceFiles = await this.fiscalFileRepo.listProcessedFiscalFilesWithSimuladorPrefill({
      client_id: clientId,
      competence,
      limit: 50,
    });

    const conf = data.confidence as Record<string, unknown> | undefined;
    const meta: {
      confidence?: { overall?: number; coverage?: number; linhas_analisadas?: number; linhas_classificadas?: number };
      origem?: string;
    } = {};
    if (conf && typeof conf === 'object') {
      meta.confidence = {
        overall: typeof conf.overall === 'number' ? conf.overall : undefined,
        coverage: typeof conf.coverage === 'number' ? conf.coverage : undefined,
        linhas_analisadas: typeof conf.linhas_analisadas === 'number' ? conf.linhas_analisadas : undefined,
        linhas_classificadas: typeof conf.linhas_classificadas === 'number' ? conf.linhas_classificadas : undefined,
      };
    }
    if (typeof data.origem === 'string') meta.origem = data.origem;

    return {
      client_id: clientId,
      competence,
      fiscal_file: fiscalFile
        ? {
            id: fiscalFile.id,
            client_id: fiscalFile.client_id,
            competence: fiscalFile.competence,
            file_name: fiscalFile.file_name,
          }
        : null,
      extracted_at: this.toIso(row.created_at),
      source_files: sourceFiles.map((f) => ({
        id: f.id,
        file_name: f.file_name,
        created_at: this.toIso(f.created_at),
      })),
      prefill,
      meta,
    };
  }

  /**
   * Executa simulação conforme parâmetros da IN 2.306/2026
   * Cálculo inicial: valor financiado, parcela, resumo
   */
  async simulate(
    input: SimulateIN2306Input,
    userId?: string
  ): Promise<{
    simulation_id?: string;
    input_data: Record<string, unknown>;
    result_data: {
      valor_total: number;
      valor_entrada: number;
      valor_financiado: number;
      numero_parcelas: number;
      valor_parcela?: number;
      parcelas?: Array<{ numero: number; valor: number; vencimento?: string }>;
      resumo?: Record<string, unknown>;
    };
    is_simulation: boolean;
  }> {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    if (input.save_simulation && !input.client_id) {
      throw new AppError('client_id é obrigatório ao salvar a simulação', 'CLIENT_REQUIRED', 400);
    }

    const valorTotal = input.valor_total ?? 0;
    const valorEntrada = input.valor_entrada ?? 0;
    const numeroParcelas = Math.max(1, input.numero_parcelas ?? 1);
    const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
    const valorParcela = numeroParcelas > 0 ? valorFinanciado / numeroParcelas : 0;

    const inputData: Record<string, unknown> = {
      competence: input.competence,
      client_id: input.client_id,
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      numero_parcelas: numeroParcelas,
      tipo_calculo: input.tipo_calculo,
      opcoes: input.opcoes,
    };

    const parcelas = Array.from({ length: numeroParcelas }, (_, i) => ({
      numero: i + 1,
      valor: Math.round(valorParcela * 100) / 100,
      vencimento: undefined as string | undefined,
    }));

    const resultData = {
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      valor_financiado: valorFinanciado,
      numero_parcelas: numeroParcelas,
      valor_parcela: Math.round(valorParcela * 100) / 100,
      parcelas,
      resumo: {
        tipo_calculo: input.tipo_calculo,
        competencia: input.competence,
      },
    };

    let simulationId: string | undefined;
    if (input.save_simulation && input.client_id) {
      const createData: CreateIN2306SimulationData = {
        client_id: input.client_id,
        competence: input.competence,
        input_data: inputData,
        result_data: resultData,
        title: input.title ?? null,
        created_by: userId ?? null,
      };
      const created = await this.repo.create(createData);
      simulationId = created.id;
    }

    return {
      simulation_id: simulationId,
      input_data: inputData,
      result_data: resultData,
      is_simulation: true,
    };
  }

  async getById(id: string): Promise<IN2306Simulation> {
    const simulation = await this.repo.findById(id);
    if (!simulation) {
      throw new AppError('Simulação não encontrada', 'SIMULATION_NOT_FOUND', 404);
    }
    return simulation;
  }

  async list(options: {
    client_id?: string;
    competence?: string;
    page?: number;
    limit?: number;
  }) {
    return this.repo.list(options);
  }

  async delete(id: string, _userId?: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }

  /**
   * Atualiza simulação existente. Re-simula com os dados enviados.
   * Determina o tipo (tributário ou parcelamento) pelo conteúdo do body.
   */
  async update(
    id: string,
    input: UpdateIN2306SimulationInput,
    _userId?: string
  ): Promise<{ simulation: IN2306Simulation; result_data: Record<string, unknown> }> {
    const existing = await this.getById(id);
    const existingInput = existing.input_data as Record<string, unknown>;

    const isTributario =
      typeof existingInput?.ano === 'number' && Array.isArray(existingInput?.trimestres);

    if (isTributario) {
      const tribInput = input as SimulateTributarioIN2306Input;
      if (typeof tribInput.ano !== 'number' || !Array.isArray(tribInput.trimestres)) {
        throw new AppError(
          'Simulação é do tipo tributário. Envie ano e trimestres.',
          'INVALID_UPDATE_PAYLOAD',
          400
        );
      }
      const result = await this.simulateTributario(
        { ...tribInput, save_simulation: false },
        _userId
      );
      const inputData = {
        ano: tribInput.ano,
        trimestres: tribInput.trimestres,
        deducoes_trimestrais:
          tribInput.deducoes_trimestrais ?? [
            { pis_cofins_zero: 0, icms_destacado: 0 },
            { pis_cofins_zero: 0, icms_destacado: 0 },
            { pis_cofins_zero: 0, icms_destacado: 0 },
            { pis_cofins_zero: 0, icms_destacado: 0 },
          ],
        retencoes_trimestrais:
          tribInput.retencoes_trimestrais ?? [
            { irrf: 0, orgaos_publicos: 0 },
            { irrf: 0, orgaos_publicos: 0 },
            { irrf: 0, orgaos_publicos: 0 },
            { irrf: 0, orgaos_publicos: 0 },
          ],
        aplicar_equiparacao_hospitalar: tribInput.aplicar_equiparacao_hospitalar ?? false,
      };
      const updated = await this.repo.update(id, {
        client_id: tribInput.client_id ?? existing.client_id,
        competence: `${tribInput.ano}-12`,
        input_data: inputData,
        result_data: result as unknown as Record<string, unknown>,
        title: tribInput.title ?? existing.title ?? null,
      });
      return {
        simulation: updated,
        result_data: result as unknown as Record<string, unknown>,
      };
    }

    const parcInput = input as SimulateIN2306Input;
    if (!parcInput.competence) {
      throw new AppError(
        'Simulação é do tipo parcelamento. Envie competence.',
        'INVALID_UPDATE_PAYLOAD',
        400
      );
    }
    const simResult = await this.simulate(
      { ...parcInput, save_simulation: false },
      _userId
    );
    const updated = await this.repo.update(id, {
      client_id: parcInput.client_id ?? existing.client_id,
      competence: parcInput.competence,
      input_data: simResult.input_data,
      result_data: simResult.result_data as Record<string, unknown>,
      title: parcInput.title ?? existing.title ?? null,
    });
    return {
      simulation: updated,
      result_data: simResult.result_data as Record<string, unknown>,
    };
  }

  /**
   * Simulação tributária comparativa: Cálculo 2025 x Projeção 2026 (IN 2.306) x Cenário Equiparação Hospitalar
   */
  async simulateTributario(
    input: SimulateTributarioIN2306Input,
    userId?: string
  ): Promise<SimuladorTributarioResponse & { simulation_id?: string }> {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }
    if (input.save_simulation && !input.client_id) {
      throw new AppError('client_id é obrigatório ao salvar a simulação', 'CLIENT_REQUIRED', 400);
    }

    const ded = input.deducoes_trimestrais ?? [
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 },
      { pis_cofins_zero: 0, icms_destacado: 0 },
    ];
    const ret = input.retencoes_trimestrais ?? [
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 },
      { irrf: 0, orgaos_publicos: 0 },
    ];

    const tri2025 = calcularCenario2025(input.trimestres, ded, ret, false);
    const { resultados: tri2026, ajusteAnual } = calcularAno2026(input.trimestres, ded, ret, false);
    const { resultados: triEquip } = calcularAno2026(input.trimestres, ded, ret, true);

    const toCenarioAnual = (trimestres: ReturnType<typeof calcularCenario2025>): CenarioAnual => {
      const totais = agregarAnual(trimestres);
      return {
        receita_bruta_total: totais.receita_bruta_total,
        irpj_total: totais.irpj_total,
        irpj_adicional_total: totais.irpj_adicional_total,
        csll_total: totais.csll_total,
        irpj_a_rec_total: totais.irpj_a_rec_total,
        csll_a_rec_total: totais.csll_a_rec_total,
        pis_a_rec_total: totais.pis_a_rec_total,
        cofins_a_rec_total: totais.cofins_a_rec_total,
        trimestres: trimestres.map((t) => ({
          trimestre: t.trimestre,
          receita_bruta: t.receita_bruta,
          receita_excedente_limite: t.receita_excedente_limite,
          base_calculo_irpj: t.base_calculo_irpj,
          base_calculo_csll: t.base_calculo_csll,
          irpj: t.irpj,
          irpj_adicional: t.irpj_adicional,
          csll: t.csll,
          irpj_a_rec: t.irpj_a_rec,
          csll_a_rec: t.csll_a_rec,
          pis_a_rec: t.pis_a_rec,
          cofins_a_rec: t.cofins_a_rec,
        })),
      };
    };

    const cenario_2025 = toCenarioAnual(tri2025);
    const cenario_2026 = toCenarioAnual(tri2026);
    const cenario_equiparacao = toCenarioAnual(triEquip);

    const imposto2025 = cenario_2025.irpj_a_rec_total + cenario_2025.csll_a_rec_total;
    const imposto2026 = cenario_2026.irpj_a_rec_total + cenario_2026.csll_a_rec_total;
    const impostoEquip = cenario_equiparacao.irpj_a_rec_total + cenario_equiparacao.csll_a_rec_total;

    const comparativo = {
      imposto_a_maior_2026_vs_2025: Math.round((imposto2026 - imposto2025) * 100) / 100,
      imposto_a_maior_2026_vs_equiparacao: Math.round((imposto2026 - impostoEquip) * 100) / 100,
      economia_equiparacao_vs_2026: Math.round((imposto2026 - impostoEquip) * 100) / 100,
    };

    const proporcaoTrimestres: unknown[] = [];
    for (let t = 0; t < 4; t++) {
      const receitas = input.trimestres[t];
      if (!receitas) continue;
      const detalhe = detalheProporcaoTrimestre(receitas, false, t + 1, input.ano);
      if (detalhe) proporcaoTrimestres.push(detalhe);
    }

    const rateio2025 = rateioAdicionalIrpjPorTrimestre(input.trimestres, false, false, input.ano);
    const rateio2026 = rateioAdicionalIrpjPorTrimestre(input.trimestres, false, true, input.ano);
    const rateioEquiparacao = input.aplicar_equiparacao_hospitalar
      ? rateioAdicionalIrpjPorTrimestre(input.trimestres, true, true, 2026)
      : [];

    const result: SimuladorTributarioResponse = {
      ano: input.ano,
      cenario_2025,
      cenario_2026,
      cenario_equiparacao,
      comparativo,
      memoria_calculo: {
        limite_trimestral: 1_250_000,
        limite_anual: 5_000_000,
        acrescimo_presuncao: '10% sobre a parcela que excede o limite (IN 2.306/2026)',
        equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar
          ? 'Serviços tributados com 8% IRPJ e 12% CSLL'
          : 'Não aplicada',
        proporcao_trimestres: proporcaoTrimestres,
        rateio_adicional_irpj: {
          cenario_2025: rateio2025,
          cenario_2026: rateio2026,
          cenario_equiparacao: rateioEquiparacao,
        },
        ajuste_anual_aplicado: ajusteAnual.aplicado,
        ajuste_anual_compensacao_irpj: ajusteAnual.compensacao_irpj,
        ajuste_anual_compensacao_csll: ajusteAnual.compensacao_csll,
        ajuste_anual_compensacao_por_trimestre: ajusteAnual.compensacao_por_trimestre,
      },
    };

    let simulationId: string | undefined;
    if (input.save_simulation && input.client_id) {
      const created = await this.repo.create({
        client_id: input.client_id,
        competence: `${input.ano}-12`,
        input_data: {
          ano: input.ano,
          trimestres: input.trimestres,
          deducoes_trimestrais: ded,
          retencoes_trimestrais: ret,
          aplicar_equiparacao_hospitalar: input.aplicar_equiparacao_hospitalar,
        },
        result_data: result as unknown as Record<string, unknown>,
        title: input.title ?? null,
        created_by: userId ?? null,
      });
      simulationId = created.id;
    }

    return { ...result, simulation_id: simulationId };
  }
}
