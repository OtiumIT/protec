import type { OpcoesReforma } from '@shared/core';
import type { LimitesContribuinteIbsCbsPF } from './calculations';
import { getIpcaContextoLc214ParaAno } from '../fiscal-indices/bcb-ipca.service';

export type IndicesLc214Resposta = {
  ipca_fonte: 'bcb_online' | 'cache' | 'embutido';
  serie_sgs_codigo: number;
  mes_referencia_fim: string;
  fator_acumulado_desde_publicacao: number;
  redutor_social_mensal_nominal: number;
  redutor_social_mensal_efetivo: number;
  limite_receita_pf_contribuinte: number;
  limite_receita_pf_absoluto: number;
  data_consulta_bcb?: string;
  parametros_origem: 'calculado' | 'manual_parcial' | 'manual_completo';
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve redutor social anual, limites PF e payload de transparência IPCA/LC 214.
 */
export async function resolveLc214IndicesParaSimulacao(input: {
  anoCalendario: number;
  quantidadeImoveisResidenciais: number;
  opcoesReforma?: OpcoesReforma | null;
}): Promise<{
  redutorSocialResidencialAnual: number | undefined;
  limitesContribuinte: LimitesContribuinteIbsCbsPF;
  indices_lc214: IndicesLc214Resposta;
}> {
  const { anoCalendario, quantidadeImoveisResidenciais, opcoesReforma } = input;
  const ctx = await getIpcaContextoLc214ParaAno(anoCalendario);

  const manualLim240 = opcoesReforma?.limite_receita_contribuinte_pf_manual;
  const manualLim288 = opcoesReforma?.limite_receita_absoluto_contribuinte_pf_manual;
  const manualRedutorMensal = opcoesReforma?.redutor_social_mensal_manual;
  const overrideAnualLegado = opcoesReforma?.redutor_social_residencial_anual;

  let lim240 = ctx.limite_receita_pf_contribuinte;
  let lim288 = ctx.limite_receita_pf_absoluto;
  if (manualLim240 != null) {
    lim240 = manualLim240;
    lim288 =
      manualLim288 != null
        ? manualLim288
        : round2(manualLim240 * 1.2);
  } else if (manualLim288 != null) {
    lim288 = manualLim288;
  }

  let redutorMensalAplicado = ctx.redutor_social_mensal_efetivo;
  if (manualRedutorMensal != null) {
    redutorMensalAplicado = manualRedutorMensal;
  }

  let redutorSocialResidencialAnual: number | undefined;
  if (quantidadeImoveisResidenciais > 0) {
    if (overrideAnualLegado != null) {
      redutorSocialResidencialAnual = overrideAnualLegado;
    } else {
      redutorSocialResidencialAnual = round2(
        redutorMensalAplicado * 12 * quantidadeImoveisResidenciais
      );
    }
  }

  const anyManual =
    manualLim240 != null ||
    manualLim288 != null ||
    manualRedutorMensal != null ||
    overrideAnualLegado != null;
  const allManualCore =
    manualLim240 != null &&
    manualLim288 != null &&
    (manualRedutorMensal != null || overrideAnualLegado != null);

  let parametros_origem: IndicesLc214Resposta['parametros_origem'] = 'calculado';
  if (anyManual) {
    parametros_origem = allManualCore ? 'manual_completo' : 'manual_parcial';
  }

  const redutorMensalExibido =
    quantidadeImoveisResidenciais > 0 && overrideAnualLegado != null
      ? round2(overrideAnualLegado / (12 * quantidadeImoveisResidenciais))
      : redutorMensalAplicado;

  const indices_lc214: IndicesLc214Resposta = {
    ipca_fonte: ctx.ipca_fonte,
    serie_sgs_codigo: ctx.serie_sgs_codigo,
    mes_referencia_fim: ctx.mes_referencia_fim,
    fator_acumulado_desde_publicacao: ctx.fator_acumulado_desde_publicacao,
    redutor_social_mensal_nominal: ctx.redutor_social_mensal_nominal,
    redutor_social_mensal_efetivo: redutorMensalExibido,
    limite_receita_pf_contribuinte: lim240,
    limite_receita_pf_absoluto: lim288,
    data_consulta_bcb: ctx.data_consulta_bcb,
    parametros_origem,
  };

  return {
    redutorSocialResidencialAnual,
    limitesContribuinte: {
      limite_receita_com_mais_de_tres_imoveis: lim240,
      limite_receita_absoluto: lim288,
    },
    indices_lc214,
  };
}
