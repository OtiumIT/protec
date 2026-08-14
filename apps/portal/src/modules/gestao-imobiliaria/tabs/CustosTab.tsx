import { useMemo, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import { COST_FIELDS, brl } from '../ui';

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
  const filtered = useMemo(() => clientId ? properties.filter((p) => p.client_id === clientId) : properties, [clientId, properties]);
  const [editRows, setEditRows] = useState<Record<string, Record<string, string>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getEditVal = (propId: string, key: string, original: number) => {
    return editRows[propId]?.[key] ?? String(original || '');
  };
  const setEditVal = (propId: string, key: string, val: string) => {
    setEditRows((prev) => ({ ...prev, [propId]: { ...(prev[propId] ?? {}), [key]: val } }));
  };

  const saveCosts = async (propId: string) => {
    const row = editRows[propId];
    if (!row) return;
    setSavingId(propId);
    try {
      const payload: Record<string, number | undefined> = {};
      for (const f of COST_FIELDS) {
        if (row[f.key] !== undefined) {
          payload[f.key] = Number(row[f.key]) || 0;
        }
      }
      await propertyService.update(propId, payload);
      setEditRows((prev) => { const next = { ...prev }; delete next[propId]; return next; });
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
          ? `Custos atualizados — ${resimulated} contrato(s) re-simulado(s)`
          : 'Custos atualizados');
      } catch {
        onSuccess('Custos atualizados (simulação não re-executada)');
      }
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar custos'); }
    finally { setSavingId(null); }
  };

  return (
    <div className="space-y-4">
      <Card title="Custos mensais padrão por imóvel">
        <p className="text-xs text-slate-500 mb-3">Edite os valores diretamente e clique em Salvar. Ao alterar custos, a simulação tributária é recalculada automaticamente.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2 sticky left-0 bg-white min-w-[140px]">Imóvel</th>
                {COST_FIELDS.map((f) => <th key={f.key} className="text-right px-2 whitespace-nowrap min-w-[90px]">{f.label}</th>)}
                <th className="text-right px-2 min-w-[90px]">Total</th>
                <th className="px-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const a = p as unknown as Record<string, unknown>;
                const isDirty = !!editRows[p.id];
                const total = COST_FIELDS.reduce((sum, f) => sum + (Number(getEditVal(p.id, f.key, Number(a[f.key]) || 0)) || 0), 0);
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-2 font-medium sticky left-0 bg-white">
                      <div>{p.identificador}</div>
                      <div className="text-xs text-slate-400">{p.client_name ?? ''}</div>
                    </td>
                    {COST_FIELDS.map((f) => (
                      <td key={f.key} className="px-1">
                        <input
                          type="number"
                          value={getEditVal(p.id, f.key, Number(a[f.key]) || 0)}
                          onChange={(e) => setEditVal(p.id, f.key, e.target.value)}
                          className="w-full text-right rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          step="0.01"
                          min="0"
                        />
                      </td>
                    ))}
                    <td className="text-right px-2 font-semibold text-red-700 text-xs">{total > 0 ? brl(total) : '—'}</td>
                    <td className="px-2">
                      {isDirty && (
                        <Button size="sm" onClick={() => saveCosts(p.id)} disabled={savingId === p.id}>
                          {savingId === p.id ? '…' : 'Salvar'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={COST_FIELDS.length + 3} className="py-4 text-slate-400 text-center">Nenhum imóvel cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
