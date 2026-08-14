import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import type { PropertyLease } from '@shared/core';
import { Badge, brl, isoDate } from '../ui';

export function ContratosTab({
  clientId,
  onError,
  onSuccess,
  isAdmin,
}: {
  clientId: string;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const [leases, setLeases] = useState<PropertyLease[]>([]);

  const reload = () => svc.listLeases(clientId ? { client_id: clientId } : undefined).then(setLeases).catch(() => onError('Falha ao listar contratos'));
  useEffect(() => { reload(); }, [clientId]);

  const remove = async (id: string) => {
    if (!confirm('Excluir este contrato?')) return;
    try { await svc.deleteLease(id); onSuccess('Contrato excluído'); reload(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => navigate('/gestao-imobiliaria/contratos/novo')}>+ Novo contrato</Button>
      </div>
      <Card title="Contratos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2">Imóvel</th>
                <th>Nº</th>
                <th>Regime</th>
                <th>Inquilino</th>
                <th>Vigência</th>
                <th>Aluguel</th>
                <th>Anexo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => {
                const regime = l.regime_tributario;
                return (
                  <tr
                    key={l.id}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/gestao-imobiliaria/contratos/${l.id}`)}
                  >
                    <td className="py-2 font-medium">{l.property_identificador ?? '—'}</td>
                    <td className="text-slate-500">{l.numero ?? '—'}</td>
                    <td>
                      {regime
                        ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${regime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>{regime.toUpperCase()}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td>{l.tenant_nome ?? '—'}</td>
                    <td className="text-slate-500">{isoDate(l.data_inicio)}{l.data_fim ? ` → ${isoDate(l.data_fim)}` : ''}</td>
                    <td>{brl(Number(l.valor_aluguel))}</td>
                    <td>
                      {l.tem_anexo
                        ? <span className="text-xs font-semibold text-emerald-700">PDF</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td><Badge status={l.status} /></td>
                    <td className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => navigate(`/gestao-imobiliaria/contratos/${l.id}`)} className="text-indigo-700 text-xs font-semibold">Abrir</button>
                      {isAdmin && <button type="button" onClick={() => remove(l.id)} className="text-red-600 text-xs">Excluir</button>}
                    </td>
                  </tr>
                );
              })}
              {leases.length === 0 && <tr><td colSpan={9} className="py-4 text-slate-400 text-center">Nenhum contrato.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
