/**
 * Simulador: distribuição de lucros vs aplicação na PJ (Lei 15.270/2025).
 * Lógica pura — usada pelo portal e pela API ao persistir simulações.
 */

export const APP_KEYS = [
  'cdb_pre',
  'cdb_pos',
  'lci_lca',
  'fundo_rf',
  'poupanca',
] as const;

export type AppKey = (typeof APP_KEYS)[number];

export interface AppTaxConfig {
  taxa: number;
  isentoIRPF: boolean;
  nomeApp: string;
  comeCotas: boolean;
}

export const TAXAS: Record<AppKey, AppTaxConfig> = {
  cdb_pre: { taxa: 0.15, isentoIRPF: false, nomeApp: 'CDB pré-fixado 15% a.a.', comeCotas: false },
  cdb_pos: { taxa: 0.1375, isentoIRPF: false, nomeApp: 'CDB pós-fixado (CDI 100%)', comeCotas: false },
  lci_lca: { taxa: 0.13, isentoIRPF: true, nomeApp: 'LCI / LCA 13% a.a.', comeCotas: false },
  fundo_rf: { taxa: 0.135, isentoIRPF: false, nomeApp: 'Fundo RF 13,5% a.a.', comeCotas: true },
  poupanca: { taxa: 0.0617, isentoIRPF: true, nomeApp: 'Poupança 6,17% a.a.', comeCotas: false },
};

export function irpfRendimentos(prazoMeses: number): number {
  if (prazoMeses <= 6) return 0.225;
  if (prazoMeses <= 12) return 0.2;
  if (prazoMeses <= 24) return 0.175;
  return 0.15;
}

export function fmt(v: number): string {
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
}

export function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

export function calcSaldo(
  principal: number,
  taxaAnual: number,
  meses: number,
  isentoIRPF: boolean,
  irpjRate: number,
  comeCotas: boolean,
  ehPJ: boolean
): number {
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  let saldo = principal;
  for (let m = 1; m <= meses; m++) {
    const rendimento = saldo * taxaMensal;
    let rendLiq = rendimento;
    if (ehPJ) {
      rendLiq = rendimento * (1 - irpjRate);
    } else {
      if (comeCotas && m % 6 === 0) {
        const aliq = m <= 12 ? 0.2 : 0.15;
        rendLiq = rendimento * (1 - aliq);
      } else if (!isentoIRPF && !comeCotas) {
        rendLiq = rendimento;
      }
    }
    saldo += rendLiq;
  }
  if (!ehPJ && !isentoIRPF && !comeCotas) {
    const aliq = irpfRendimentos(meses);
    const totalRendimento = saldo - principal;
    saldo = principal + totalRendimento * (1 - aliq);
  }
  return saldo;
}

export interface ChartPoint {
  name: string;
  pj: number;
  pf: number;
  diff: number;
}

export interface DistribuicaoLucrosSimulationInput {
  valor: number;
  meses: number;
  irpjRate: number;
  appKey: AppKey;
}

export interface DistribuicaoLucrosSimulationResult {
  app: AppTaxConfig;
  retencao: number;
  liquidoPF: number;
  aliqPF: number;
  chartData: ChartPoint[];
  seriesPJ: number[];
  seriesPF: number[];
  seriesDiff: number[];
  labels: string[];
  breakEvenMes: number | null;
  saldoPJFinal: number;
  saldoPFFinal: number;
  diff: number;
  pfGanha: boolean;
  breakEvenLabel: string;
  vantagemSub: string;
}

export function runDistribuicaoLucrosSimulation(
  input: DistribuicaoLucrosSimulationInput
): DistribuicaoLucrosSimulationResult {
  const { valor, meses, irpjRate, appKey } = input;
  const app = TAXAS[appKey];

  const retencao = valor * 0.1;
  const liquidoPF = valor - retencao;
  const aliqPF = irpfRendimentos(meses);

  const labels: string[] = [];
  const seriesPJ: number[] = [];
  const seriesPF: number[] = [];
  const seriesDiff: number[] = [];
  const chartData: ChartPoint[] = [];
  let breakEvenMes: number | null = null;

  for (let m = 0; m <= meses; m++) {
    const name = m === 0 ? 'Início' : `${m}m`;
    labels.push(name);
    const sPJ = calcSaldo(valor, app.taxa, m, app.isentoIRPF, irpjRate, app.comeCotas, true);
    const sPF = calcSaldo(liquidoPF, app.taxa, m, app.isentoIRPF, irpjRate, app.comeCotas, false);
    const rPJ = Math.round(sPJ);
    const rPF = Math.round(sPF);
    const rDiff = Math.round(sPF - sPJ);
    seriesPJ.push(rPJ);
    seriesPF.push(rPF);
    seriesDiff.push(rDiff);
    chartData.push({ name, pj: rPJ, pf: rPF, diff: rDiff });
    if (breakEvenMes === null && sPF >= sPJ) breakEvenMes = m;
  }

  const saldoPJFinal = seriesPJ[seriesPJ.length - 1]!;
  const saldoPFFinal = seriesPF[seriesPF.length - 1]!;
  const diff = saldoPFFinal - saldoPJFinal;
  const pfGanha = diff > 0;

  let breakEvenLabel: string;
  if (breakEvenMes === null) breakEvenLabel = 'Nunca (neste horizonte)';
  else if (breakEvenMes === 0) breakEvenLabel = 'Imediato';
  else breakEvenLabel = `${breakEvenMes} meses`;

  const vantagemSub = pfGanha ? 'a favor da PF' : 'a favor da PJ';

  return {
    app,
    retencao,
    liquidoPF,
    aliqPF,
    chartData,
    seriesPJ,
    seriesPF,
    seriesDiff,
    labels,
    breakEvenMes,
    saldoPJFinal,
    saldoPFFinal,
    diff,
    pfGanha,
    breakEvenLabel,
    vantagemSub,
  };
}

/** Alias para compatibilidade com código que usa o nome curto */
export const runSimulation = runDistribuicaoLucrosSimulation;
