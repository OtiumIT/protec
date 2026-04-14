import type { GanhoCapitalSimuladorInput, GanhoCapitalSimuladorResult } from '@shared/core';

export function anoCalendarioFromAlienacao(dtAl: string): number {
  const d = new Date(dtAl + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
}

export function buildGanhoCapitalInput(fields: Omit<GanhoCapitalSimuladorInput, 'snapshot_version'>): GanhoCapitalSimuladorInput {
  return { snapshot_version: 1, ...fields };
}

export function buildGanhoCapitalResultSnapshot(args: {
  resultPF: { gcBruto: number; gcTrib: number; ir: { total: number } } | null;
  pjMercTotal: number;
  pjAtivoTotal: number;
  ibsCbsTotalDev: number;
}): GanhoCapitalSimuladorResult {
  const { resultPF, pjMercTotal, pjAtivoTotal, ibsCbsTotalDev } = args;
  return {
    gcBruto: resultPF?.gcBruto ?? 0,
    gcTrib: resultPF?.gcTrib,
    irpfTotal: resultPF?.ir.total ?? 0,
    pjMercTotal,
    pjAtivoTotal,
    ibsCbsTotalDev,
  };
}
