/**
 * Motor de ITBI (v1).
 *
 * Fato gerador no motor: integralizacao | permuta | onerosa.
 * A tela da v1 expõe só integralização; permuta/onerosa reusam este motor na v2.2.
 *
 * Tema 796 / STF: imunidade do ITBI na integralização de capital em holding
 * patrimonial até o valor de referência declarado (mercado, referência ITBI ou IPTU).
 * Sims antigas sem criterio_referencia: fallback mercado → venal → integralização.
 * Atividade operacional: incidência integral.
 *
 * Alíquota é informada pelo aluno. Não consulta prefeitura. Laudêmio: alerta, sem cálculo.
 */
import {
  ITBI_CRITERIO_LABEL,
  type ItbiCriterioReferencia,
  type ItbiSimulationInput,
  type ItbiSimulationResult,
  type ItbiMemoriaItemSchema,
} from '../schemas/itbi.schema.js';
import type { z } from 'zod';

type MemoriaItem = z.infer<typeof ItbiMemoriaItemSchema>;

const AVISO =
  'Simulação para reunião. Não substitui guia municipal, DAA nem parecer. Alíquota informada pelo usuário; não há consulta à prefeitura.';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function resolveReferencia(input: ItbiSimulationInput): {
  valor: number;
  criterio?: ItbiCriterioReferencia;
  label: string;
} {
  const criterio = input.criterio_referencia;
  if (criterio === 'mercado') {
    return { valor: input.valor_mercado, criterio, label: ITBI_CRITERIO_LABEL.mercado };
  }
  if (criterio === 'referencia_itbi') {
    return {
      valor: input.valor_referencia_itbi ?? 0,
      criterio,
      label: ITBI_CRITERIO_LABEL.referencia_itbi,
    };
  }
  if (criterio === 'iptu') {
    return { valor: input.valor_venal, criterio, label: ITBI_CRITERIO_LABEL.iptu };
  }
  const valor =
    input.valor_mercado > 0
      ? input.valor_mercado
      : input.valor_venal > 0
        ? input.valor_venal
        : input.valor_integralizacao;
  return { valor, label: 'valor de referência (mercado, senão IPTU/venal, senão integralização)' };
}

export function calcularItbi(input: ItbiSimulationInput): ItbiSimulationResult {
  const percentual = input.percentual_imovel / 100;
  const resolvido = resolveReferencia(input);
  const valorReferencia = round2(resolvido.valor);
  const baseCheia = round2(valorReferencia * percentual);
  const capitalImuneBruto = round2(input.valor_integralizacao * percentual);
  const aliquota = input.aliquota_percent;

  const memoria: MemoriaItem[] = [
    { ordem: 1, descricao: `Fato gerador: ${input.fato_gerador}` },
    { ordem: 2, descricao: `UF/município: ${input.uf}/${input.municipio}` },
    { ordem: 3, descricao: `Referência usada: ${resolvido.label}`, valor: valorReferencia },
    { ordem: 4, descricao: `% do imóvel (${input.percentual_imovel}%) sobre a referência`, valor: baseCheia },
  ];

  let enquadramento: ItbiSimulationResult['enquadramento'] = 'incidencia';
  let capitalImune = 0;
  let baseTributavel = baseCheia;

  if (input.fato_gerador === 'integralizacao') {
    if (input.atividade_pj === 'operacional') {
      enquadramento = 'incidencia';
      capitalImune = 0;
      baseTributavel = baseCheia;
      memoria.push({
        ordem: 5,
        descricao: 'Tema 796: PJ operacional — sem imunidade na integralização',
        valor: baseCheia,
      });
    } else if (capitalImuneBruto >= baseCheia - 0.005) {
      enquadramento = 'imunidade_total';
      capitalImune = baseCheia;
      baseTributavel = 0;
      memoria.push({
        ordem: 5,
        descricao: 'Tema 796: holding patrimonial — capital ≥ referência (imunidade total)',
        valor: 0,
      });
    } else if (capitalImuneBruto > 0) {
      enquadramento = 'imunidade_parcial';
      capitalImune = capitalImuneBruto;
      baseTributavel = round2(baseCheia - capitalImuneBruto);
      memoria.push({
        ordem: 5,
        descricao: 'Tema 796: holding patrimonial — imunidade até o capital integralizado',
        valor: capitalImune,
      });
      memoria.push({
        ordem: 6,
        descricao: 'Excesso (referência − capital) tributável',
        valor: baseTributavel,
      });
    } else {
      enquadramento = 'incidencia';
      capitalImune = 0;
      baseTributavel = baseCheia;
      memoria.push({
        ordem: 5,
        descricao: 'Sem valor de integralização — incidência sobre a referência',
        valor: baseCheia,
      });
    }
  } else {
    enquadramento = 'incidencia';
    capitalImune = 0;
    baseTributavel = baseCheia;
    memoria.push({
      ordem: 5,
      descricao: `Fato ${input.fato_gerador}: incidência sobre a base (sem Tema 796)`,
      valor: baseCheia,
    });
  }

  const itbi = round2(baseTributavel * (aliquota / 100));
  memoria.push({
    ordem: memoria.length + 1,
    descricao: `ITBI = base × ${aliquota}%`,
    valor: itbi,
  });

  return {
    enquadramento,
    valor_referencia: valorReferencia,
    criterio_referencia: resolvido.criterio,
    criterio_referencia_label: resolvido.label,
    base_cheia: baseCheia,
    capital_imune: capitalImune,
    base_tributavel: baseTributavel,
    aliquota_percent: aliquota,
    itbi,
    alerta_laudemio: input.terreno_marinha,
    memoria,
    aviso: AVISO,
  };
}
