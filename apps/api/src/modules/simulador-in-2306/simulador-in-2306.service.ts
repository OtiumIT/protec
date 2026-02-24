import { SimuladorIN2306Repository, CreateIN2306SimulationData } from './simulador-in-2306.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  calcularCenario2025,
  calcularAno2026,
  agregarAnual,
  detalheProporcaoTrimestre,
} from './calculations';
import type {
  SimulateIN2306Input,
  SimulateTributarioIN2306Input,
  CenarioAnual,
  SimuladorTributarioResponse,
} from '@shared/core';
import type { IN2306Simulation } from '@shared/core';

export class SimuladorIN2306Service {
  constructor(
    private repo: SimuladorIN2306Repository,
    private clientRepo: ClientRepository
  ) {}

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
    const tri2026 = calcularAno2026(input.trimestres, ded, ret, false);
    const triEquip = calcularCenario2025(input.trimestres, ded, ret, true);

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
