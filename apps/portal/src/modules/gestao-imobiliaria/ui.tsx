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

export type CostPeriod = 'mensal' | 'anual';

export type CostFieldDef = { key: CostKey; label: string; period: CostPeriod };

export const COST_GROUPS: { id: string; title: string; hint: string; fields: CostFieldDef[] }[] = [
  {
    id: 'encargos',
    title: 'Encargos do imóvel',
    hint: 'IPTU e seguro entram no valor anual; o sistema converte para mensal na simulação.',
    fields: [
      { key: 'iptu_mensal_padrao', label: 'IPTU', period: 'anual' },
      { key: 'condominio_mensal_padrao', label: 'Condomínio', period: 'mensal' },
      { key: 'seguro_mensal_padrao', label: 'Seguro', period: 'anual' },
    ],
  },
  {
    id: 'operacao',
    title: 'Operação e short stay',
    hint: 'Mais comum em Airbnb e locação flexível.',
    fields: [
      { key: 'camareira_mensal_padrao', label: 'Camareira', period: 'mensal' },
      { key: 'seguranca_mensal_padrao', label: 'Segurança', period: 'mensal' },
      { key: 'material_limpeza_mensal_padrao', label: 'Material de limpeza', period: 'mensal' },
      { key: 'lavanderia_enxoval_mensal_padrao', label: 'Lavanderia / enxoval', period: 'mensal' },
      { key: 'checkin_checkout_mensal_padrao', label: 'Check-in / check-out', period: 'mensal' },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro e provisões',
    hint: 'Taxas, tarifas e reservas para vacância ou inadimplência.',
    fields: [
      { key: 'taxas_pagamento_mensal_padrao', label: 'Taxas de pagamento', period: 'mensal' },
      { key: 'tarifas_bancarias_mensal_padrao', label: 'Tarifas bancárias', period: 'mensal' },
      { key: 'vacancia_mensal_padrao', label: 'Vacância', period: 'mensal' },
      { key: 'inadimplencia_mensal_padrao', label: 'Inadimplência', period: 'mensal' },
    ],
  },
];

export const COST_FIELDS: CostFieldDef[] = COST_GROUPS.flatMap((g) => g.fields);

export function monthlyCostValue(field: CostFieldDef, storedMonthly: number): number {
  return field.period === 'anual' ? storedMonthly * 12 : storedMonthly;
}

export function toStoredMonthly(field: CostFieldDef, displayed: number): number {
  return field.period === 'anual' ? displayed / 12 : displayed;
}

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
