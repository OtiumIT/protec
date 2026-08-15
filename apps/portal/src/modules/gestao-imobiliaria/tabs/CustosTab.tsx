import { useMemo, useState } from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import {
  COST_FIELDS,
  COST_GROUPS,
  brl,
  getPropertyCosts,
  inputCls,
  monthlyCostValue,
  toStoredMonthly,
  type CostFieldDef,
} from '../ui';

type FilterKey = 'todos' | 'com' | 'sem';

function propVals(p: PropertyWithClient): Record<string, number> {
  const a = p as unknown as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const f of COST_FIELDS) out[f.key] = Number(a[f.key]) || 0;
  return out;
}

function filledChips(vals: Record<string, number>): { label: string; amount: number }[] {
  return COST_FIELDS
    .map((f) => ({ label: f.label, amount: vals[f.key] || 0 }))
    .filter((c) => c.amount > 0)
    .slice(0, 4);
}

export function CustosTab({
  clientId,
  properties,
  onChanged,
  onError,
  onSuccess,
}: {
  clientId: string;
  properties: PropertyWithClient[];
  onChanged: () => void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const scoped = useMemo(
    () => (clientId ? properties.filter((p) => p.client_id === clientId) : properties),
    [clientId, properties]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((p) => {
      const total = getPropertyCosts(p);
      if (filter === 'com' && total <= 0) return false;
      if (filter === 'sem' && total > 0) return false;
      if (!q) return true;
      return (
        p.identificador?.toLowerCase().includes(q) ||
        (p.client_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [scoped, search, filter]);

  const portfolioTotal = scoped.reduce((s, p) => s + getPropertyCosts(p), 0);
  const withCosts = scoped.filter((p) => getPropertyCosts(p) > 0).length;

  const openEditor = (p: PropertyWithClient) => {
    setOpenId(p.id);
    setDraft(propVals(p));
  };

  const closeEditor = () => {
    setOpenId(null);
    setDraft({});
  };

  const setField = (field: CostFieldDef, displayed: number) => {
    setDraft((prev) => ({ ...prev, [field.key]: toStoredMonthly(field, displayed) }));
  };

  const draftTotal = COST_FIELDS.reduce((s, f) => s + (Number(draft[f.key]) || 0), 0);
  const openProp = scoped.find((p) => p.id === openId);
  const isDirty = openProp
    ? COST_FIELDS.some((f) => Math.abs((draft[f.key] || 0) - (propVals(openProp)[f.key] || 0)) > 0.005)
    : false;

  const tryCloseOrSwitch = (next?: PropertyWithClient) => {
    if (isDirty && !confirm('Descartar alterações deste imóvel?')) return;
    if (next) openEditor(next);
    else closeEditor();
  };

  const save = async (propId: string) => {
    setSavingId(propId);
    try {
      const payload: Record<string, number> = {};
      for (const f of COST_FIELDS) payload[f.key] = Number(draft[f.key]) || 0;
      await propertyService.update(propId, payload);
      onChanged();
      try {
        const leases = await svc.listLeases({ property_id: propId, status: 'ativo' });
        let resimulated = 0;
        for (const l of leases) {
          if (Number(l.valor_aluguel) > 0) {
            await svc.quickSimulateLease(l.id);
            resimulated++;
          }
        }
        onSuccess(resimulated > 0
          ? `Custos salvos — ${resimulated} contrato(s) re-simulado(s)`
          : 'Custos salvos');
      } catch {
        onSuccess('Custos salvos');
      }
      closeEditor();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erro ao salvar custos');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Custo mensal do portfólio</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{brl(portfolioTotal)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Imóveis com custo</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{withCosts} de {scoped.length}</div>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Custos padrão de cada imóvel alimentam a simulação PF vs PJ do contrato. Edite um imóvel de cada vez.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar imóvel ou cliente…"
          className={`${inputCls} max-w-sm`}
        />
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {([
            { key: 'todos', label: 'Todos' },
            { key: 'com', label: 'Com custo' },
            { key: 'sem', label: 'Sem custo' },
          ] as const).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === f.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400">
          {scoped.length === 0 ? 'Cadastre um imóvel para informar os custos.' : 'Nenhum imóvel neste filtro.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const vals = propVals(p);
            const total = getPropertyCosts(p);
            const chips = filledChips(vals);
            const open = openId === p.id;
            const isFlex = p.tipo_locacao === 'flexivel';

            return (
              <li key={p.id} className={`rounded-xl border bg-white ${open ? 'border-indigo-300 shadow-sm' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => (open ? tryCloseOrSwitch() : tryCloseOrSwitch(p))}
                  className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{p.identificador}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${isFlex ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isFlex ? 'Airbnb' : 'Fixa'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.client_name ?? '—'}</div>
                    {!open && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.length === 0
                          ? <span className="text-xs text-slate-400">Nenhum custo informado</span>
                          : chips.map((c) => (
                            <span key={c.label} className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                              {c.label} {brl(c.amount)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-base font-bold ${total > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                      {total > 0 ? brl(total) : '—'}
                    </div>
                    <div className="text-xs text-slate-400">por mês</div>
                    <div className="text-xs font-semibold text-indigo-700 mt-1">{open ? 'Fechar' : 'Editar'}</div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-5">
                    {COST_GROUPS.map((group) => {
                      const groupHasValue = group.fields.some((f) => (draft[f.key] || 0) > 0);
                      const defaultOpen = group.id === 'encargos' || groupHasValue || (group.id === 'operacao' && isFlex);
                      return (
                        <CostGroup
                          key={group.id}
                          title={group.title}
                          hint={group.hint}
                          defaultOpen={defaultOpen}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.fields.map((f) => (
                              <MoneyInput
                                key={f.key}
                                label={`${f.label} (${f.period})`}
                                value={monthlyCostValue(f, draft[f.key] || 0)}
                                onChange={(v) => setField(f, v)}
                              />
                            ))}
                          </div>
                        </CostGroup>
                      );
                    })}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-500">Total mensal</div>
                        <div className="text-lg font-bold text-red-700">{brl(draftTotal)}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => tryCloseOrSwitch()} disabled={savingId === p.id}>Cancelar</Button>
                        <Button size="sm" onClick={() => save(p.id)} disabled={savingId === p.id || !isDirty}>
                          {savingId === p.id ? 'Salvando…' : 'Salvar custos'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CostGroup({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-left">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
          {open && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <span className="text-xs font-semibold text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
