import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import type { PropertyWithClient } from '../../properties/services/property.service';
import type { PropertyLease } from '@shared/core';
import { brl, getPropertyCosts, isoDate } from '../ui';

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-emerald-700' : tone === 'neg' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

export function PortfolioTab({ clientId, properties }: { clientId: string; properties: PropertyWithClient[] }) {
  const navigate = useNavigate();
  const filtered = useMemo(() => clientId ? properties.filter((p) => p.client_id === clientId) : properties, [clientId, properties]);
  const [leases, setLeases] = useState<PropertyLease[]>([]);
  useEffect(() => {
    svc.listLeases(clientId ? { client_id: clientId } : undefined).then(setLeases).catch(() => setLeases([]));
  }, [clientId]);

  const activeLeaseByProp = useMemo(() => {
    const map = new Map<string, PropertyLease>();
    for (const l of leases) {
      if (l.status === 'ativo' || l.status === 'inadimplente') {
        if (!map.has(l.property_id) || Number(l.valor_aluguel) > Number(map.get(l.property_id)!.valor_aluguel)) {
          map.set(l.property_id, l);
        }
      }
    }
    return map;
  }, [leases]);

  const rows = useMemo(() => filtered.map((p) => {
    const lease = activeLeaseByProp.get(p.id);
    const aluguel = lease ? Number(lease.valor_aluguel) || 0 : 0;
    const custos = getPropertyCosts(p);
    const sim = lease?.ultimo_resultado_simulacao as PropertyLease['ultimo_resultado_simulacao'];
    const regime = lease?.regime_tributario ?? null;
    let impostoMensal = 0;
    if (sim && regime && sim[regime]) {
      impostoMensal = (sim[regime].imposto_anual || 0) / 12;
    }
    const liquido = aluguel - custos - impostoMensal;
    return {
      id: p.id,
      identificador: p.identificador,
      clientName: p.client_name ?? '—',
      tenantName: lease?.tenant_nome ?? '—',
      aluguel,
      custos,
      impostoMensal,
      liquido,
      regime,
      hasLease: !!lease,
      leaseId: lease?.id,
      dataFim: isoDate(lease?.data_fim),
    };
  }), [filtered, activeLeaseByProp]);

  const totalAluguel = rows.reduce((s, r) => s + r.aluguel, 0);
  const totalCustos = rows.reduce((s, r) => s + r.custos, 0);
  const totalImposto = rows.reduce((s, r) => s + r.impostoMensal, 0);
  const totalLiquido = totalAluguel - totalCustos - totalImposto;
  const countPf = rows.filter((r) => r.regime === 'pf').length;
  const countPj = rows.filter((r) => r.regime === 'pj').length;
  const countAtivos = rows.filter((r) => r.hasLease).length;

  const openRow = (r: (typeof rows)[number]) => {
    if (r.leaseId) navigate(`/gestao-imobiliaria/contratos/${r.leaseId}`);
    else navigate('/gestao-imobiliaria/imoveis');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Receita mensal" value={brl(totalAluguel)} />
        <Kpi label="Custos mensais" value={brl(totalCustos)} />
        <Kpi label="Imposto estimado" value={brl(totalImposto)} />
        <Kpi label="Líquido mensal" value={brl(totalLiquido)} tone={totalLiquido >= 0 ? 'pos' : 'neg'} />
        <Kpi label="Imóveis" value={`${rows.length} (${countAtivos} ocupados · ${countPf} PF · ${countPj} PJ)`} />
      </div>
      <Card title="Desempenho mensal por imóvel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2">Imóvel</th>
                <th>Cliente</th>
                <th>Inquilino</th>
                <th>Ocupação</th>
                <th>Fim do contrato</th>
                <th>Regime</th>
                <th className="text-right">Receita</th>
                <th className="text-right">Custos</th>
                <th className="text-right">Imposto</th>
                <th className="text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  onClick={() => openRow(r)}
                >
                  <td className="py-2 font-medium">{r.identificador}</td>
                  <td className="text-slate-500">{r.clientName}</td>
                  <td className="text-slate-600">{r.hasLease ? r.tenantName : '—'}</td>
                  <td>
                    {r.hasLease
                      ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Ocupado</span>
                      : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Vago</span>}
                  </td>
                  <td className="text-slate-500">{r.dataFim || '—'}</td>
                  <td>
                    {r.regime
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${r.regime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>{r.regime.toUpperCase()}</span>
                      : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="text-right text-emerald-700">{r.aluguel > 0 ? brl(r.aluguel) : <span className="text-slate-400">—</span>}</td>
                  <td className="text-right text-red-700">{r.custos > 0 ? brl(r.custos) : '—'}</td>
                  <td className="text-right text-amber-700">{r.impostoMensal > 0 ? brl(r.impostoMensal) : '—'}</td>
                  <td className={`text-right font-semibold ${r.liquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{brl(r.liquido)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="py-4 text-slate-400 text-center">Nenhum imóvel cadastrado.</td></tr>}
            </tbody>
            {rows.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="py-2" colSpan={6}>Total</td>
                  <td className="text-right text-emerald-700">{brl(totalAluguel)}</td>
                  <td className="text-right text-red-700">{totalCustos > 0 ? brl(totalCustos) : '—'}</td>
                  <td className="text-right text-amber-700">{totalImposto > 0 ? brl(totalImposto) : '—'}</td>
                  <td className={`text-right ${totalLiquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{brl(totalLiquido)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
