/**
 * Motor de ITCMD na doação (v1).
 *
 * Tabelas embutidas (simulação): SP, RJ, MG, RS, PR, SC, GO, DF.
 * Demais UFs: alíquota informada pelo aluno.
 * Usufruto: sim/não + idade → nua propriedade pelas faixas etárias usuais.
 *
 * Fora da v1: 27 UFs completas, causa mortis, otimizador de domicílio.
 */
import { ITCMD_TABELA_UFS, type ItcmdSimulationInput, type ItcmdSimulationResult } from '../schemas/itcmd.schema.js';

const AVISO =
  'Simulação para reunião. Não substitui guia estadual, DAA nem parecer. Tabelas embutidas são referenciais de simulação e podem divergir da legislação vigente do estado.';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Fração do usufruto sobre o bem, por idade do usufrutuário (faixas usuais de cartório/ITCMD). */
export function fracaoUsufrutoPorIdade(idade: number): number {
  if (idade <= 30) return 0.7;
  if (idade <= 40) return 0.6;
  if (idade <= 50) return 0.5;
  if (idade <= 60) return 0.4;
  if (idade <= 70) return 0.3;
  return 0.2;
}

type Faixa = { ate: number; aliquotaPercent: number };

/** Tabelas referenciais de simulação (doação). Enquadramento: alíquota da faixa que contém a base. */
export const ITCMD_TABELAS: Record<(typeof ITCMD_TABELA_UFS)[number], Faixa[]> = {
  SP: [{ ate: Infinity, aliquotaPercent: 4 }],
  RJ: [
    { ate: 100_000, aliquotaPercent: 4 },
    { ate: 200_000, aliquotaPercent: 5 },
    { ate: 300_000, aliquotaPercent: 6 },
    { ate: 400_000, aliquotaPercent: 7 },
    { ate: Infinity, aliquotaPercent: 8 },
  ],
  MG: [{ ate: Infinity, aliquotaPercent: 5 }],
  RS: [
    { ate: 20_000, aliquotaPercent: 3 },
    { ate: 50_000, aliquotaPercent: 4 },
    { ate: 150_000, aliquotaPercent: 5 },
    { ate: Infinity, aliquotaPercent: 6 },
  ],
  PR: [{ ate: Infinity, aliquotaPercent: 4 }],
  SC: [{ ate: Infinity, aliquotaPercent: 8 }],
  GO: [
    { ate: 50_000, aliquotaPercent: 2 },
    { ate: 150_000, aliquotaPercent: 4 },
    { ate: 400_000, aliquotaPercent: 6 },
    { ate: Infinity, aliquotaPercent: 8 },
  ],
  DF: [
    { ate: 1_000_000, aliquotaPercent: 4 },
    { ate: Infinity, aliquotaPercent: 6 },
  ],
};

export function temTabelaItcmd(uf: string): uf is (typeof ITCMD_TABELA_UFS)[number] {
  return (ITCMD_TABELA_UFS as readonly string[]).includes(uf.toUpperCase());
}

function aliquotaDaTabela(uf: (typeof ITCMD_TABELA_UFS)[number], base: number): number {
  const faixas = ITCMD_TABELAS[uf];
  for (const faixa of faixas) {
    if (base <= faixa.ate) return faixa.aliquotaPercent;
  }
  return faixas[faixas.length - 1].aliquotaPercent;
}

export function calcularItcmd(input: ItcmdSimulationInput): ItcmdSimulationResult {
  const uf = input.uf.toUpperCase();
  const tabelaEmbutida = temTabelaItcmd(uf);
  const valorBem = round2(input.valor);

  let fracaoUsufruto = 0;
  let fracaoNua = 1;
  let efeitoUsufruto = 'Doação plena — base igual ao valor do bem.';

  if (input.reserva_usufruto) {
    const idade = input.idade_usufrutuario ?? 0;
    fracaoUsufruto = fracaoUsufrutoPorIdade(idade);
    fracaoNua = round2(1 - fracaoUsufruto);
    efeitoUsufruto = `Reserva de usufruto (idade ${idade}): usufruto ${(fracaoUsufruto * 100).toFixed(0)}% / nua propriedade ${(fracaoNua * 100).toFixed(0)}%. ITCMD incide sobre a nua propriedade.`;
  }

  const base = round2(valorBem * fracaoNua);
  const aliquota = tabelaEmbutida
    ? aliquotaDaTabela(uf, base)
    : (input.aliquota_manual_percent as number);
  const itcmd = round2(base * (aliquota / 100));

  const memoria = [
    { ordem: 1, descricao: `UF ${uf} — ${tabelaEmbutida ? 'tabela embutida (simulação)' : 'alíquota informada'}` },
    { ordem: 2, descricao: `Tipo: ${input.tipo_bem} · parentesco: ${input.parentesco}`, valor: valorBem },
    { ordem: 3, descricao: efeitoUsufruto, valor: base },
    { ordem: 4, descricao: `Alíquota ${aliquota}% sobre a base`, valor: itcmd },
  ];

  return {
    uf,
    tabela_embutida: tabelaEmbutida,
    valor_bem: valorBem,
    fracao_usufruto: fracaoUsufruto,
    fracao_nua_propriedade: fracaoNua,
    base,
    aliquota_percent: aliquota,
    itcmd,
    efeito_usufruto: efeitoUsufruto,
    memoria,
    aviso: AVISO,
  };
}
