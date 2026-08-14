import type { PropertyWithClient } from '../properties/services/property.service';

export const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const today = () => new Date().toISOString().slice(0, 10);
export const isoDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
export const sectionTitle = 'text-xs font-bold uppercase tracking-wide text-slate-500 mt-2 mb-1';

const STATUS_BADGE: Record<string, string> = {
  previsto: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-blue-100 text-blue-800',
  pago: 'bg-emerald-100 text-emerald-800',
  atrasado: 'bg-red-100 text-red-800',
  cancelado: 'bg-slate-100 text-slate-500',
  ativo: 'bg-emerald-100 text-emerald-800',
  encerrado: 'bg-slate-100 text-slate-600',
  rascunho: 'bg-slate-100 text-slate-600',
  inadimplente: 'bg-red-100 text-red-800',
  em_criacao: 'bg-indigo-100 text-indigo-800',
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export type CostKey =
  | 'iptu_mensal_padrao'
  | 'condominio_mensal_padrao'
  | 'seguro_mensal_padrao'
  | 'camareira_mensal_padrao'
  | 'seguranca_mensal_padrao'
  | 'material_limpeza_mensal_padrao'
  | 'lavanderia_enxoval_mensal_padrao'
  | 'checkin_checkout_mensal_padrao'
  | 'taxas_pagamento_mensal_padrao'
  | 'tarifas_bancarias_mensal_padrao'
  | 'vacancia_mensal_padrao'
  | 'inadimplencia_mensal_padrao';

export const COST_FIELDS: { key: CostKey; label: string }[] = [
  { key: 'iptu_mensal_padrao', label: 'IPTU' },
  { key: 'condominio_mensal_padrao', label: 'Condomínio' },
  { key: 'seguro_mensal_padrao', label: 'Seguro' },
  { key: 'camareira_mensal_padrao', label: 'Camareira' },
  { key: 'seguranca_mensal_padrao', label: 'Segurança' },
  { key: 'material_limpeza_mensal_padrao', label: 'Material limpeza' },
  { key: 'lavanderia_enxoval_mensal_padrao', label: 'Lavanderia/enxoval' },
  { key: 'checkin_checkout_mensal_padrao', label: 'Check-in/out' },
  { key: 'taxas_pagamento_mensal_padrao', label: 'Taxas pagamento' },
  { key: 'tarifas_bancarias_mensal_padrao', label: 'Tarifas bancárias' },
  { key: 'vacancia_mensal_padrao', label: 'Vacância' },
  { key: 'inadimplencia_mensal_padrao', label: 'Inadimplência' },
];

export function getPropertyCosts(p: PropertyWithClient): number {
  const a = p as unknown as Record<string, unknown>;
  return COST_FIELDS.reduce((sum, f) => sum + (Number(a[f.key]) || 0), 0);
}

export const GARANTIA_TIPOS: { value: string; label: string }[] = [
  { value: '', label: 'Sem garantia' },
  { value: 'caucao', label: 'Caução' },
  { value: 'fiador', label: 'Fiador' },
  { value: 'seguro_fianca', label: 'Seguro-fiança' },
  { value: 'titulo_capitalizacao', label: 'Título de capitalização' },
  { value: 'outro', label: 'Outro' },
];

export const DOC_CATEGORIAS: { value: string; label: string }[] = [
  { value: 'contrato_assinado', label: 'Contrato assinado' },
  { value: 'identidade_inquilino', label: 'Identidade do inquilino' },
  { value: 'garantia', label: 'Garantia' },
  { value: 'aditivo', label: 'Aditivo' },
  { value: 'outro', label: 'Outro' },
];
