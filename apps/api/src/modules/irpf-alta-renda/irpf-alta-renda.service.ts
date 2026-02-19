import { IrpfAltaRendaRepository, type CreateIrpfAltaRendaData, type IrpfAltaRendaRecord } from './irpf-alta-renda.repository';
import { CompanyRepository } from '../companies/company.repository';
import { AppError } from '../../shared/utils/error-handler';
import { calcularBCC, aplicarFaixas, avaliarRiscoRetencao, gerarSugestoesPlanejamento, CONFIG_LEI_15270_2025 } from './calculations';
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

  const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
  const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
  const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
  return {
    ...resultado.memoria_calculo,
    rendimentos_tributaveis: rt,
    soma_dividendos: Math.round(somaDividendos * 100) / 100,
    lucros_aprovados_ate_31dez2025: Math.round(lucrosExcl * 100) / 100,
    ganho_capital_excluido: Math.round(ganhoCapitalExcl * 100) / 100,
    rendimentos_fiis_excluidos: Math.round(fiisExcl * 100) / 100,
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
    private companyRepo: CompanyRepository
  ) {}

  /**
   * Simula impacto tributário (Lei 15.270/2025) sem persistir.
   */
  async simulate(input: SimulateIrpfAltaRendaInput): Promise<IrpfAltaRendaSimulacaoResponse> {
    const lucrosExcl = input.dados.lucros_aprovados_ate_31dez2025 ?? 0;
    const ganhoCapitalExcl = input.dados.ganho_capital_excluido ?? 0;
    const fiisExcl = input.dados.rendimentos_fiis_excluidos ?? 0;
    const bcc = calcularBCC(
      input.dados.rendimentos_tributaveis,
      input.dados.rendimentos_isentos_dividendos,
      lucrosExcl,
      ganhoCapitalExcl,
      fiisExcl
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

    return {
      ano: input.ano,
      base_calculo_combinada: resultado.base_calculo_combinada,
      faixa: resultado.faixa,
      aliquota_percentual: resultado.aliquota_percentual,
      imposto_minimo: impostoMinimo,
      deducoes_imposto_ja_pago: deducoesTotal,
      imposto_estimado: impostoComplementar,
      risco_retencao_mensal: risco.risco_retencao_mensal,
      risco_retencao_detalhe: risco.risco_retencao_detalhe,
      sugestoes_planejamento,
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
}
