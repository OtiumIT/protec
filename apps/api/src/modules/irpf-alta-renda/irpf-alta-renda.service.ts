import { IrpfAltaRendaRepository, type CreateIrpfAltaRendaData, type IrpfAltaRendaRecord } from './irpf-alta-renda.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import { calcularBCC, aplicarFaixas, avaliarRiscoRetencao, CONFIG_LEI_15270_2025 } from './calculations';
import type {
  SimulateIrpfAltaRendaInput,
  SimulateAndSaveIrpfAltaRendaInput,
  IrpfAltaRendaSimulacaoResponse,
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

  return {
    ...resultado.memoria_calculo,
    rendimentos_tributaveis: rt,
    soma_dividendos: Math.round(somaDividendos * 100) / 100,
    detalhe_fontes: detalheFontes,
    base_calculo_combinada: bcc,
    faixa_aplicada: resultado.faixa,
    excedente_sobre_600k: resultado.excedente_sobre_600k ?? 0,
    aliquota_aplicada_percentual: resultado.aliquota_percentual,
    fonte_normativa: CONFIG_LEI_15270_2025.fonte_normativa,
    observacao_progressiva: CONFIG_LEI_15270_2025.observacao_progressiva,
  };
}

export class IrpfAltaRendaService {
  constructor(
    private repo: IrpfAltaRendaRepository,
    private clientRepo: ClientRepository
  ) {}

  /**
   * Simula impacto tributário (Lei 15.270/2025) sem persistir.
   */
  async simulate(input: SimulateIrpfAltaRendaInput): Promise<IrpfAltaRendaSimulacaoResponse> {
    const bcc = calcularBCC(input.dados.rendimentos_tributaveis, input.dados.rendimentos_isentos_dividendos);
    const resultado = aplicarFaixas(bcc);
    const risco = avaliarRiscoRetencao(input.dados.rendimentos_isentos_dividendos);
    const memoria_calculo = buildMemoriaCalculo(input, bcc, resultado);

    return {
      ano: input.ano,
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      aliquota_percentual: resultado.aliquota_percentual,
      imposto_estimado: resultado.imposto_estimado,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe,
      memoria_calculo,
    };
  }

  /**
   * Simula e persiste no tenant. Valida client_id se informado.
   */
  async simulateAndSave(
    input: SimulateAndSaveIrpfAltaRendaInput,
    userId?: string
  ): Promise<{ registro: IrpfAltaRendaRecord; resultado: IrpfAltaRendaSimulacaoResponse }> {
    if (input.client_id) {
      const client = await this.clientRepo.findById(input.client_id);
      if (!client) {
        throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
      }
    }

    const resultado = await this.simulate({ ano: input.ano, dados: input.dados });

    const createData: CreateIrpfAltaRendaData = {
      client_id: input.client_id ?? null,
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

  async list(options: { client_id?: string; ano?: number; page?: number; limit?: number }) {
    return this.repo.list(options);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }
}
