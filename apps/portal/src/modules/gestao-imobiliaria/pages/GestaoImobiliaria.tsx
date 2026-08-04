import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { ClientFormModal } from '../../clients/components/ClientFormModal';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import type { IrpfPropertyCandidate, IrpfPropertyImportResult } from '../../properties/services/property.service';
import {
  gestaoImobiliariaService as svc,
  type StatementData, type AlertItem,
} from '../services/gestao-imobiliaria.service';
import type { PropertyLease, PropertyLedgerEntry, QuickSimulationResult } from '@shared/core';

const TABS = [
  { key: 'portfolio', label: 'Portfólio' },
  { key: 'imoveis', label: 'Imóveis' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'custos', label: 'Custos' },
  { key: 'extratos', label: 'Extratos' },
] as const;
type TabKey = (typeof TABS)[number]['key'];
/** Telas ocultas no menu (código mantido para reativação). */
const HIDDEN_SECTIONS = new Set(['financeiro', 'operacao', 'integracoes', 'alertas']);

/** Categorias do livro operacional (combo — alinhado aos lançamentos tributários). */
const LEDGER_CATEGORIAS: { value: string; label: string }[] = [
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'diarias', label: 'Diárias' },
  { value: 'iptu', label: 'IPTU' },
  { value: 'condominio', label: 'Condomínio' },
  { value: 'taxa_imobiliaria', label: 'Taxa Imobiliária' },
  { value: 'taxa_plataforma', label: 'Taxa Plataforma' },
  { value: 'reforma', label: 'Reforma' },
  { value: 'mobilia', label: 'Mobília' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'energia', label: 'Energia' },
  { value: 'internet', label: 'Internet' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'vacancia', label: 'Vacância' },
  { value: 'inadimplencia', label: 'Inadimplência' },
  { value: 'outros', label: 'Outros' },
];
const LEDGER_CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  LEDGER_CATEGORIAS.map((c) => [c.value, c.label]),
);

const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const currentCompetencia = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

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

function Badge({ status }: { status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

export function GestaoImobiliaria() {
  const { success, error: showError, ToastContainer } = useToast();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const tabKeys = TABS.map((t) => t.key) as string[];
  const tab = (tabKeys.includes(section ?? '') ? section : 'portfolio') as TabKey;
  const setTab = (k: TabKey) => navigate(`/gestao-imobiliaria/${k}`);
  const showMonth = tab === 'portfolio';
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [competencia, setCompetencia] = useState<string>(currentCompetencia());

  const isAdmin = useMemo(() => {
    try { return ['admin', 'super_admin'].includes(JSON.parse(localStorage.getItem('user') || '{}')?.role); }
    catch { return false; }
  }, []);

  const reloadClients = useCallback(() => {
    clientService.list().then(setClients).catch(() => showError('Não foi possível carregar clientes'));
  }, [showError]);

  const reloadProperties = useCallback(() => {
    propertyService.list(clientId ? { client_id: clientId, limit: 100 } : { limit: 100 })
      .then((r) => setProperties(r.properties)).catch(() => setProperties([]));
  }, [clientId]);

  useEffect(() => { reloadClients(); }, [reloadClients]);
  useEffect(() => { reloadProperties(); }, [reloadProperties]);
  useEffect(() => {
    if (section && HIDDEN_SECTIONS.has(section)) navigate('/gestao-imobiliaria/portfolio', { replace: true });
  }, [section, navigate]);

  return (
    <div className="space-y-6">
      <ToastContainer />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestão Imobiliária Contábil</h1>
          <p className="text-xs text-slate-500">Contratos, imóveis e prestação de contas por cliente.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4 0" /></svg>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="bg-transparent focus:outline-none max-w-[160px] text-slate-700">
              <option value="">Todos os clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {showMonth && (
            <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none" />
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold rounded-t-lg -mb-px border-b-2 whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >{t.label}</button>
        ))}
      </nav>

      {tab === 'portfolio' && <PortfolioTab clientId={clientId} properties={properties} />}
      {tab === 'imoveis' && <ImoveisTab clients={clients} clientId={clientId} properties={properties} onChanged={() => { reloadProperties(); }} onClientsChanged={reloadClients} onError={showError} onSuccess={success} isAdmin={isAdmin} />}
      {tab === 'contratos' && <ContratosTab clientId={clientId} properties={properties} onError={showError} onSuccess={success} isAdmin={isAdmin} />}
      {tab === 'custos' && <CustosTab clientId={clientId} properties={properties} onChanged={reloadProperties} onError={showError} onSuccess={success} />}
      {tab === 'extratos' && <ExtratosTab clients={clients} clientId={clientId} onError={showError} onSuccess={success} isAdmin={isAdmin} />}
    </div>
  );
}

// ---------------- Portfólio ----------------

type CostKey = 'iptu_mensal_padrao' | 'condominio_mensal_padrao' | 'seguro_mensal_padrao' | 'camareira_mensal_padrao' |
  'seguranca_mensal_padrao' | 'material_limpeza_mensal_padrao' | 'lavanderia_enxoval_mensal_padrao' |
  'checkin_checkout_mensal_padrao' | 'taxas_pagamento_mensal_padrao' | 'tarifas_bancarias_mensal_padrao' |
  'vacancia_mensal_padrao' | 'inadimplencia_mensal_padrao';

const COST_FIELDS: { key: CostKey; label: string }[] = [
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

function getPropertyCosts(p: PropertyWithClient): number {
  const a = p as any;
  return COST_FIELDS.reduce((sum, f) => sum + (Number(a[f.key]) || 0), 0);
}

function PortfolioTab({ clientId, properties }: { clientId: string; properties: PropertyWithClient[] }) {
  const filtered = useMemo(() => clientId ? properties.filter((p) => p.client_id === clientId) : properties, [clientId, properties]);

  const rows = useMemo(() => filtered.map((p) => {
    const a = p as any;
    const aluguel = Number(a.valor_aluguel_mensal) || 0;
    const custos = getPropertyCosts(p);
    const sim = p.ultimo_resultado_simulacao as any;
    const regime = p.regime_tributario as 'pf' | 'pj' | null | undefined;
    let impostoMensal = 0;
    if (sim && regime && sim[regime]) {
      impostoMensal = (sim[regime].imposto_anual || 0) / 12;
    }
    const liquido = aluguel - custos - impostoMensal;
    return { id: p.id, identificador: p.identificador, clientName: p.client_name ?? '—', aluguel, custos, impostoMensal, liquido, regime };
  }), [filtered]);

  const totalAluguel = rows.reduce((s, r) => s + r.aluguel, 0);
  const totalCustos = rows.reduce((s, r) => s + r.custos, 0);
  const totalImposto = rows.reduce((s, r) => s + r.impostoMensal, 0);
  const totalLiquido = totalAluguel - totalCustos - totalImposto;
  const countPf = rows.filter((r) => r.regime === 'pf').length;
  const countPj = rows.filter((r) => r.regime === 'pj').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Receita mensal" value={brl(totalAluguel)} />
        <Kpi label="Custos mensais" value={brl(totalCustos)} />
        <Kpi label="Imposto estimado" value={brl(totalImposto)} />
        <Kpi label="Líquido mensal" value={brl(totalLiquido)} tone={totalLiquido >= 0 ? 'pos' : 'neg'} />
        <Kpi label="Imóveis" value={`${rows.length} (${countPf} PF · ${countPj} PJ)`} />
      </div>
      <Card title="Desempenho mensal por imóvel">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase">
              <th className="py-2">Imóvel</th><th>Cliente</th><th>Regime</th><th className="text-right">Receita</th><th className="text-right">Custos</th><th className="text-right">Imposto</th><th className="text-right">Líquido</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{r.identificador}</td>
                  <td className="text-slate-500">{r.clientName}</td>
                  <td>{r.regime ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${r.regime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>{r.regime.toUpperCase()}</span> : <span className="text-slate-400 text-xs">—</span>}</td>
                  <td className="text-right text-emerald-700">{brl(r.aluguel)}</td>
                  <td className="text-right text-red-700">{r.custos > 0 ? brl(r.custos) : '—'}</td>
                  <td className="text-right text-amber-700">{r.impostoMensal > 0 ? brl(r.impostoMensal) : '—'}</td>
                  <td className={`text-right font-semibold ${r.liquido >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{brl(r.liquido)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-4 text-slate-400 text-center">Nenhum imóvel cadastrado.</td></tr>}
            </tbody>
            {rows.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold">
                  <td className="py-2" colSpan={3}>Total</td>
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
      {rows.some((r) => r.custos > 0) && (
        <Card title="Detalhamento de custos mensais">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-xs uppercase">
                  <th className="py-2 sticky left-0 bg-white">Imóvel</th>
                  {COST_FIELDS.map((f) => <th key={f.key} className="text-right px-2 whitespace-nowrap">{f.label}</th>)}
                  <th className="text-right px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const a = p as any;
                  const total = getPropertyCosts(p);
                  if (total === 0) return null;
                  return (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-2 font-medium sticky left-0 bg-white">{p.identificador}</td>
                      {COST_FIELDS.map((f) => {
                        const v = Number(a[f.key]) || 0;
                        return <td key={f.key} className="text-right px-2 text-slate-600">{v > 0 ? brl(v) : '—'}</td>;
                      })}
                      <td className="text-right px-2 font-semibold text-red-700">{brl(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  const color = tone === 'pos' ? 'text-emerald-700' : tone === 'neg' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ---------------- Contratos ----------------
function ContratosTab({ clientId, properties, onError, onSuccess, isAdmin }: {
  clientId: string; properties: PropertyWithClient[]; onError: (m: string) => void; onSuccess: (m: string) => void; isAdmin: boolean;
}) {
  const [leases, setLeases] = useState<PropertyLease[]>([]);
  const [tenants, setTenants] = useState<{ id: string; nome: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ property_id: '', tenant_id: '', data_inicio: today(), data_fim: '', valor_aluguel: '', dia_vencimento: '10', indice_reajuste: 'IPCA', status: 'ativo', observacao: '' });
  const [newTenantName, setNewTenantName] = useState('');

  const reload = () => svc.listLeases(clientId ? { client_id: clientId } : undefined).then(setLeases).catch(() => onError('Falha ao listar contratos'));
  const reloadTenants = () => svc.listTenants(clientId || undefined).then(setTenants).catch(() => {});
  useEffect(() => { reload(); reloadTenants(); /* eslint-disable-next-line */ }, [clientId]);

  const selectedProperty = properties.find((p) => p.id === form.property_id);
  const selectedRegime = selectedProperty?.regime_tributario as string | null | undefined;

  const createTenantInline = async () => {
    if (!newTenantName.trim()) return;
    try {
      const t = await svc.createTenant({ nome: newTenantName.trim(), tipo_pessoa: 'pf', client_id: clientId || null });
      setForm({ ...form, tenant_id: t.id });
      setNewTenantName('');
      reloadTenants();
      onSuccess('Inquilino criado');
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao criar inquilino'); }
  };

  const create = async () => {
    if (!form.property_id) return onError('Selecione o imóvel');
    try {
      await svc.createLease({
        property_id: form.property_id, data_inicio: form.data_inicio,
        data_fim: form.data_fim || null, valor_aluguel: Number(form.valor_aluguel) || 0,
        dia_vencimento: Number(form.dia_vencimento) || 10, indice_reajuste: form.indice_reajuste, status: form.status,
        tenant_id: form.tenant_id || null, observacao: form.observacao || null,
      });
      onSuccess('Contrato criado'); setShowForm(false); reload();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao criar contrato'); }
  };
  const remove = async (id: string) => {
    if (!confirm('Excluir este contrato?')) return;
    try { await svc.deleteLease(id); onSuccess('Contrato excluído'); reload(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Fechar' : '+ Novo contrato'}</Button></div>
      {showForm && (
        <Card title="Novo contrato">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Imóvel">
              <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={inputCls}>
                <option value="">Selecione…</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.identificador}</option>)}
              </select>
              {selectedRegime && (
                <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${selectedRegime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>
                  Regime: {selectedRegime.toUpperCase()}
                </span>
              )}
            </Field>
            <Field label="Inquilino">
              <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} className={inputCls}>
                <option value="">Sem inquilino</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <div className="flex gap-1 mt-1">
                <input value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} placeholder="Criar novo…" className={`${inputCls} text-xs`} />
                <Button size="sm" variant="secondary" onClick={createTenantInline} disabled={!newTenantName.trim()}>+</Button>
              </div>
            </Field>
            <Field label="Início"><input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} /></Field>
            <Field label="Fim"><input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} className={inputCls} /></Field>
            <Field label="Aluguel"><input type="number" value={form.valor_aluguel} onChange={(e) => setForm({ ...form, valor_aluguel: e.target.value })} className={inputCls} /></Field>
            <Field label="Dia venc."><input type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} className={inputCls} /></Field>
            <Field label="Índice"><select value={form.indice_reajuste} onChange={(e) => setForm({ ...form, indice_reajuste: e.target.value })} className={inputCls}>{['IPCA', 'IGPM', 'INPC', 'OUTRO', 'NENHUM'].map((i) => <option key={i}>{i}</option>)}</select></Field>
            <div className="md:col-span-2"><Field label="Observação"><input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className={inputCls} placeholder="Anotações sobre o contrato…" /></Field></div>
          </div>
          <div className="mt-4 flex justify-end"><Button size="sm" onClick={create}>Salvar</Button></div>
        </Card>
      )}
      <Card title="Contratos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase"><th className="py-2">Imóvel</th><th>Regime</th><th>Inquilino</th><th>Vigência</th><th>Aluguel</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {leases.map((l) => {
                const prop = properties.find((p) => p.id === l.property_id);
                const regime = prop?.regime_tributario as string | null | undefined;
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{l.property_identificador ?? '—'}</td>
                    <td>{regime ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${regime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>{regime.toUpperCase()}</span> : '—'}</td>
                    <td>{l.tenant_nome ?? '—'}</td>
                    <td className="text-slate-500">{l.data_inicio}{l.data_fim ? ` → ${l.data_fim}` : ''}</td>
                    <td>{brl(Number(l.valor_aluguel))}</td>
                    <td><Badge status={l.status} /></td>
                    <td className="text-right">{isAdmin && <button onClick={() => remove(l.id)} className="text-red-600 text-xs">Excluir</button>}</td>
                  </tr>
                );
              })}
              {leases.length === 0 && <tr><td colSpan={7} className="py-4 text-slate-400 text-center">Nenhum contrato.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Custos (edição inline) ----------------
function CustosTab({ clientId, properties, onChanged, onError, onSuccess }: {
  clientId: string; properties: PropertyWithClient[]; onChanged: () => void; onError: (m: string) => void; onSuccess: (m: string) => void;
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
      onSuccess('Custos atualizados');
      setEditRows((prev) => { const next = { ...prev }; delete next[propId]; return next; });
      onChanged();
      try { await propertyService.quickSimulate(propId); } catch { /* re-sim silently */ }
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
                const a = p as any;
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

// ---------------- Financeiro (Ledger) ----------------
export function FinanceiroTab({ clientId, properties, onError, onSuccess, isAdmin }: {
  clientId: string; properties: PropertyWithClient[]; onError: (m: string) => void; onSuccess: (m: string) => void; isAdmin: boolean;
}) {
  const [entries, setEntries] = useState<PropertyLedgerEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [genComp, setGenComp] = useState(currentCompetencia());
  const [form, setForm] = useState({ property_id: '', competencia: currentCompetencia(), vencimento: today(), natureza: 'receita', categoria: 'aluguel', valor: '', descricao: '' });

  const reload = () => svc.listLedger({ client_id: clientId || '', status: statusFilter, limit: 100 })
    .then((r) => setEntries(r.entries)).catch(() => onError('Falha ao listar lançamentos'));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [clientId, statusFilter]);

  const create = async () => {
    if (!form.property_id) return onError('Selecione o imóvel');
    try {
      await svc.createLedgerEntry({ ...form, valor: Number(form.valor) || 0 });
      onSuccess('Lançamento criado'); setShowForm(false); reload();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao criar'); }
  };
  const settle = async (id: string) => { try { await svc.settleLedgerEntry(id); onSuccess('Baixa registrada'); reload(); } catch (e) { onError(String(e)); } };
  const cancel = async (id: string) => { try { await svc.cancelLedgerEntry(id); onSuccess('Cancelado'); reload(); } catch (e) { onError(String(e)); } };
  const remove = async (id: string) => { if (!confirm('Excluir?')) return; try { await svc.deleteLedgerEntry(id); onSuccess('Excluído'); reload(); } catch (e) { onError(String(e)); } };
  const markOverdue = async () => { try { const r = await svc.markOverdue(); onSuccess(`${r.updated} lançamento(s) marcados como atrasados`); reload(); } catch (e) { onError(String(e)); } };
  const generate = async () => { try { const r = await svc.generateRecurring(genComp); onSuccess(`${r.created} gerado(s), ${r.skipped} já existiam`); reload(); } catch (e) { onError(String(e)); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-40`}>
            <option value="">Todos os status</option>
            {['previsto', 'confirmado', 'pago', 'atrasado', 'cancelado'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="secondary" onClick={markOverdue}>Marcar atrasados</Button>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={genComp} onChange={(e) => setGenComp(e.target.value)} className={`${inputCls} w-36`} />
          <Button size="sm" variant="secondary" onClick={generate}>Gerar recorrências</Button>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Fechar' : '+ Lançamento'}</Button>
        </div>
      </div>
      {showForm && (
        <Card title="Novo lançamento">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Imóvel"><select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={inputCls}><option value="">Selecione…</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.identificador}</option>)}</select></Field>
            <Field label="Competência"><input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className={inputCls} /></Field>
            <Field label="Vencimento"><input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className={inputCls} /></Field>
            <Field label="Natureza"><select value={form.natureza} onChange={(e) => setForm({ ...form, natureza: e.target.value })} className={inputCls}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></Field>
            <Field label="Categoria">
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inputCls}>
                {LEDGER_CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Valor"><input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className={inputCls} /></Field>
            <Field label="Descrição"><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="mt-4 flex justify-end"><Button size="sm" onClick={create}>Salvar</Button></div>
        </Card>
      )}
      <Card title="Livro financeiro">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase"><th className="py-2">Venc.</th><th>Imóvel</th><th>Categoria</th><th>Natureza</th><th>Valor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="py-2">{e.vencimento}</td>
                  <td className="font-medium">{e.property_identificador ?? '—'}</td>
                  <td>{LEDGER_CATEGORIA_LABEL[e.categoria] ?? e.categoria}</td>
                  <td className={e.natureza === 'receita' ? 'text-emerald-700' : 'text-red-700'}>{e.natureza}</td>
                  <td>{brl(Number(e.valor))}</td>
                  <td><Badge status={e.status} /></td>
                  <td className="text-right space-x-2">
                    {e.status !== 'pago' && e.status !== 'cancelado' && <button onClick={() => settle(e.id)} className="text-emerald-700 text-xs">Baixar</button>}
                    {e.status !== 'cancelado' && <button onClick={() => cancel(e.id)} className="text-slate-500 text-xs">Cancelar</button>}
                    {isAdmin && <button onClick={() => remove(e.id)} className="text-red-600 text-xs">Excluir</button>}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={7} className="py-4 text-slate-400 text-center">Nenhum lançamento.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Extratos ----------------
function ExtratosTab({ clients, clientId, onError, onSuccess, isAdmin }: {
  clients: ClientWithCreatedAt[]; clientId: string; onError: (m: string) => void; onSuccess: (m: string) => void; isAdmin: boolean;
}) {
  const [selClient, setSelClient] = useState(clientId);
  const [from, setFrom] = useState(currentCompetencia());
  const [to, setTo] = useState(currentCompetencia());
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [lastLink, setLastLink] = useState<string | null>(null);
  useEffect(() => { setSelClient(clientId); }, [clientId]);
  const reloadShares = () => svc.listStatementShares(selClient || undefined).then(setShares).catch(() => {});
  useEffect(() => { reloadShares(); /* eslint-disable-next-line */ }, [selClient]);

  const build = async () => {
    if (!selClient) return onError('Selecione o cliente');
    try { setStatement(await svc.getStatement({ client_id: selClient, period_from: from, period_to: to })); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao gerar extrato'); }
  };
  const share = async () => {
    if (!selClient) return onError('Selecione o cliente');
    try {
      const r = await svc.createStatementShare({ client_id: selClient, property_ids: [], period_from: from, period_to: to, expires_in_days: 30 });
      const url = `${window.location.origin}/prestacao-de-contas?token=${r.token}`;
      setLastLink(url); onSuccess('Link read-only gerado'); reloadShares();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao gerar link'); }
  };
  const revoke = async (id: string) => { try { await svc.revokeStatementShare(id); onSuccess('Link revogado'); reloadShares(); } catch (e) { onError(String(e)); } };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Configurar extrato">
        <div className="space-y-3">
          <Field label="Cliente"><select value={selClient} onChange={(e) => setSelClient(e.target.value)} className={inputCls}><option value="">Selecione…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="De"><input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
            <Field label="Até"><input type="month" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={build}>Gerar extrato</Button>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Imprimir / PDF</Button>
            <Button size="sm" variant="secondary" onClick={share}>Compartilhar link</Button>
          </div>
          <p className="text-xs text-slate-500">O cliente recebe acesso somente leitura, com prazo e revogação.</p>
          {lastLink && <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-xs break-all text-indigo-800">{lastLink}</div>}
          {shares.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Links gerados</div>
              {shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
                  <span>{s.period_from} → {s.period_to} {s.revoked_at ? '(revogado)' : ''}</span>
                  {isAdmin && !s.revoked_at && <button onClick={() => revoke(s.id)} className="text-red-600">Revogar</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      <Card title="Prévia da prestação de contas">
        {!statement ? <p className="text-sm text-slate-400">Gere o extrato para visualizar.</p> : (
          <div className="report-print-wrapper space-y-3">
            <div className="flex justify-between border-b-2 border-slate-900 pb-2">
              <strong>Prestação de contas</strong><span className="text-indigo-700 font-bold">iaTax</span>
            </div>
            <div className="flex justify-between text-sm"><span>Receitas</span><strong>{brl(statement.resumo.receitas)}</strong></div>
            <div className="flex justify-between text-sm"><span>Despesas</span><strong>− {brl(statement.resumo.despesas)}</strong></div>
            <div className="flex justify-between bg-slate-900 text-white rounded-lg px-3 py-2 font-bold"><span>Resultado líquido</span><span>{brl(statement.resumo.resultado_liquido)}</span></div>
            <div className="mt-2">
              {statement.imoveis.map((i) => (
                <div key={i.property_id} className="flex justify-between text-sm py-1 border-t border-slate-100"><span>{i.identificador}</span><strong>{brl(i.resultado)}</strong></div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------- Alertas ----------------
export function AlertasTab({ clientId, onError }: { clientId: string; onError: (m: string) => void }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  useEffect(() => { svc.getAlerts({ client_id: clientId || undefined, dias: 30 }).then(setAlerts).catch(() => onError('Falha ao carregar alertas')); }, [clientId, onError]);
  const label: Record<string, string> = {
    contrato_encerrando: 'Contrato encerrando', lancamento_atrasado: 'Lançamento atrasado', lancamento_a_vencer: 'A vencer',
  };
  return (
    <Card title="Agenda e vencimentos (próximos 30 dias)">
      {alerts.length === 0 ? <p className="text-sm text-slate-400">Nada a sinalizar.</p> : (
        <div className="space-y-2">
          {alerts.map((a, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div><strong>{label[a.tipo] ?? a.tipo}</strong><span className="text-slate-500"> · {a.property_identificador} · {a.data}</span></div>
              {a.valor != null && <span className="font-semibold">{brl(a.valor)}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------- Operação ----------------
export function OperacaoTab({ properties, onError, onSuccess }: { properties: PropertyWithClient[]; onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [mForm, setMForm] = useState({ property_id: '', titulo: '', prioridade: 'media' });
  const reload = () => { svc.listVendors().then(setVendors).catch(() => {}); svc.listMaintenance().then(setMaintenance).catch(() => {}); };
  useEffect(() => { reload(); }, []);

  const addVendor = async () => { if (!vendorName) return; try { await svc.createVendor({ nome: vendorName }); setVendorName(''); onSuccess('Fornecedor criado'); reload(); } catch (e) { onError(String(e)); } };
  const addMaintenance = async () => {
    if (!mForm.property_id || !mForm.titulo) return onError('Preencha imóvel e título');
    try { await svc.createMaintenance(mForm); setMForm({ property_id: '', titulo: '', prioridade: 'media' }); onSuccess('Chamado criado'); reload(); }
    catch (e) { onError(String(e)); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Fornecedores">
        <div className="flex gap-2 mb-3">
          <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Nome do fornecedor" className={inputCls} />
          <Button size="sm" onClick={addVendor}>Adicionar</Button>
        </div>
        <ul className="text-sm space-y-1">{vendors.map((v) => <li key={v.id} className="border-t border-slate-100 py-1">{v.nome}{v.categoria ? ` · ${v.categoria}` : ''}</li>)}{vendors.length === 0 && <li className="text-slate-400">Nenhum fornecedor.</li>}</ul>
      </Card>
      <Card title="Manutenções">
        <div className="grid grid-cols-1 gap-2 mb-3">
          <select value={mForm.property_id} onChange={(e) => setMForm({ ...mForm, property_id: e.target.value })} className={inputCls}><option value="">Imóvel…</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.identificador}</option>)}</select>
          <input value={mForm.titulo} onChange={(e) => setMForm({ ...mForm, titulo: e.target.value })} placeholder="Título do chamado" className={inputCls} />
          <Button size="sm" onClick={addMaintenance}>Abrir chamado</Button>
        </div>
        <ul className="text-sm space-y-1">{maintenance.map((m) => <li key={m.id} className="flex justify-between border-t border-slate-100 py-1"><span>{m.titulo}</span><Badge status={m.status} /></li>)}{maintenance.length === 0 && <li className="text-slate-400">Nenhum chamado.</li>}</ul>
      </Card>
      <Card title="Vistorias e inventário">
        <p className="text-sm text-slate-500">Registros de entrada/saída, checklist e itens do imóvel disponíveis via API. Selecione um imóvel no cadastro para gerenciar.</p>
      </Card>
    </div>
  );
}

// ---------------- Integrações (stubs em criação) ----------------
export function IntegracoesTab({ clientId, properties, onError, onSuccess }: { clientId: string; properties: PropertyWithClient[]; onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [charges, setCharges] = useState<any[]>([]);
  const [form, setForm] = useState({ property_id: '', metodo: 'boleto', valor: '', vencimento: today() });
  useEffect(() => { svc.listPaymentCharges().then(setCharges).catch(() => {}); }, []);

  const createCharge = async () => {
    if (!form.property_id) return onError('Selecione o imóvel');
    try {
      const r = await svc.createPaymentCharge({ ...form, valor: Number(form.valor) || 0 });
      onSuccess((r as any)?.message ?? 'Cobrança registrada (em criação)');
      svc.listPaymentCharges().then(setCharges).catch(() => {});
    } catch (e) { onError(String(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
        <strong>Em criação:</strong> boleto/PIX, conciliação bancária, assinatura eletrônica, portal do proprietário e envio por e-mail/WhatsApp estão com a interface pronta. Os registros são salvos, mas a execução externa ainda não está disponível.
      </div>
      <Card title="Cobrança (boleto / PIX)">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Imóvel"><select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })} className={inputCls}><option value="">Selecione…</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.identificador}</option>)}</select></Field>
          <Field label="Método"><select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} className={inputCls}><option value="boleto">Boleto</option><option value="pix">PIX</option></select></Field>
          <Field label="Valor"><input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className={inputCls} /></Field>
          <Field label="Vencimento"><input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} className={inputCls} /></Field>
        </div>
        <div className="mt-3 flex justify-end"><Button size="sm" onClick={createCharge}>Registrar cobrança</Button></div>
        <div className="mt-3 space-y-1 text-sm">
          {charges.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between border-t border-slate-100 py-1">
              <span>{ch.metodo?.toUpperCase()} · {brl(Number(ch.valor))} · venc. {ch.vencimento}</span>
              <Badge status={ch.provider_status} />
            </div>
          ))}
          {charges.length === 0 && <p className="text-slate-400">Nenhuma cobrança registrada.</p>}
        </div>
      </Card>
      <p className="text-xs text-slate-400">Cliente selecionado: {clientId || 'todos'}.</p>
    </div>
  );
}

// ---------------- Imóveis (cadastro evoluído) ----------------
type PropertyForm = {
  client_id: string;
  identificador: string;
  tipo_locacao: 'fixa' | 'flexivel';
  natureza_locacao: 'residencial' | 'nao_residencial';
  valor_aluguel_mensal: string;
  modo_entrada: 'detalhado' | 'reduzido';
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  matricula_imovel: string; inscricao_iptu: string; cartorio_registro: string;
  iptu_mensal_padrao: string; condominio_mensal_padrao: string; seguro_mensal_padrao: string;
};

function emptyPropertyForm(clientId = ''): PropertyForm {
  return {
    client_id: clientId, identificador: '', tipo_locacao: 'fixa', natureza_locacao: 'residencial',
    valor_aluguel_mensal: '', modo_entrada: 'reduzido',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    matricula_imovel: '', inscricao_iptu: '', cartorio_registro: '',
    iptu_mensal_padrao: '', condominio_mensal_padrao: '', seguro_mensal_padrao: '',
  };
}

function ImoveisTab({ clients, clientId, properties, onChanged, onClientsChanged, onError, onSuccess, isAdmin }: {
  clients: ClientWithCreatedAt[]; clientId: string; properties: PropertyWithClient[];
  onChanged: () => void; onClientsChanged: () => void; onError: (m: string) => void; onSuccess: (m: string) => void; isAdmin: boolean;
}) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyWithClient | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PropertyWithClient | null>(null);
  const [showImportIrpf, setShowImportIrpf] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      p.identificador?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      (p as any).cidade?.toLowerCase?.().includes(q));
  }, [properties, search]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: PropertyWithClient) => { setEditing(p); setModalOpen(true); };
  const doDelete = async () => {
    if (!confirmDelete) return;
    try { await propertyService.delete(confirmDelete.id); onSuccess('Imóvel excluído'); setConfirmDelete(null); onChanged(); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por imóvel, cliente ou cidade…" className={`${inputCls} w-72`} />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowImportIrpf(true)}>Importar do IRPF</Button>
          <Button size="sm" variant="secondary" onClick={() => setShowClientModal(true)}>+ Novo cliente</Button>
          <Button size="sm" onClick={openNew}>+ Cadastrar imóvel</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><div className="py-10 text-center text-slate-400">Nenhum imóvel cadastrado{clientId ? ' para este cliente' : ''}.</div></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const cidade = (p as any).cidade as string | undefined;
            const uf = (p as any).uf as string | undefined;
            const aluguel = Number((p as any).valor_aluguel_mensal ?? 0);
            const natureza = (p as any).natureza_locacao === 'nao_residencial' ? 'Não residencial' : 'Residencial';
            const regime = p.regime_tributario as 'pf' | 'pj' | null | undefined;
            const sim = p.ultimo_resultado_simulacao as any;
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{p.identificador}</div>
                    <div className="text-xs text-slate-500 truncate">{p.client_name ?? '—'}{cidade ? ` · ${cidade}${uf ? `/${uf}` : ''}` : ''}</div>
                  </div>
                  <div className="flex gap-1">
                    {regime && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${regime === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>
                        {regime.toUpperCase()}{sim?.[regime]?.aliquota_efetiva != null ? ` ${(sim[regime].aliquota_efetiva * 100).toFixed(1)}%` : ''}
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.tipo_locacao === 'flexivel' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                      {p.tipo_locacao === 'flexivel' ? 'Airbnb' : 'Fixa'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{natureza}</span>
                  {aluguel > 0 && <span className="text-slate-700 font-medium">{brl(aluguel)}/mês</span>}
                </div>
                <div className="mt-auto flex items-center gap-3 pt-2 text-xs">
                  <button onClick={() => openEdit(p)} className="text-indigo-700 font-semibold">Editar</button>
                  {isAdmin && <button onClick={() => setConfirmDelete(p)} className="text-red-600 font-semibold">Excluir</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <PropertyFormModal
          clients={clients}
          defaultClientId={clientId}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); onChanged(); }}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}

      <ClientFormModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSuccess={() => { onClientsChanged(); }}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Excluir imóvel"
        message="Tem certeza? Contratos, lançamentos e documentos vinculados a este imóvel serão removidos."
        variant="danger"
      />

      {showImportIrpf && (
        <ImportIrpfModal
          clients={clients}
          defaultClientId={clientId}
          existingIdentificadores={properties.map((p) => p.identificador?.toLowerCase() ?? '')}
          onClose={() => setShowImportIrpf(false)}
          onImported={(count) => { setShowImportIrpf(false); onSuccess(`${count} imóvel(is) importado(s) do IRPF`); onChanged(); }}
          onError={onError}
        />
      )}
    </div>
  );
}

function PropertyFormModal({ clients, defaultClientId, editing, onClose, onSaved, onError, onSuccess }: {
  clients: ClientWithCreatedAt[]; defaultClientId: string; editing: PropertyWithClient | null;
  onClose: () => void; onSaved: () => void; onError: (m: string) => void; onSuccess: (m: string) => void;
}) {
  const [form, setForm] = useState<PropertyForm>(() => {
    if (!editing) return emptyPropertyForm(defaultClientId || clients[0]?.id || '');
    const e = editing as any;
    return {
      client_id: editing.client_id, identificador: editing.identificador,
      tipo_locacao: editing.tipo_locacao as 'fixa' | 'flexivel',
      natureza_locacao: e.natureza_locacao === 'nao_residencial' ? 'nao_residencial' : 'residencial',
      valor_aluguel_mensal: String(e.valor_aluguel_mensal ?? '') || '',
      modo_entrada: e.modo_entrada ?? 'reduzido',
      cep: e.cep ?? '', logradouro: e.logradouro ?? '', numero: e.numero ?? '', complemento: e.complemento ?? '',
      bairro: e.bairro ?? '', cidade: e.cidade ?? '', uf: e.uf ?? '',
      matricula_imovel: e.matricula_imovel ?? '', inscricao_iptu: e.inscricao_iptu ?? '', cartorio_registro: e.cartorio_registro ?? '',
      iptu_mensal_padrao: String(e.iptu_mensal_padrao ?? '') || '', condominio_mensal_padrao: String(e.condominio_mensal_padrao ?? '') || '',
      seguro_mensal_padrao: String(e.seguro_mensal_padrao ?? '') || '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [simResult, setSimResult] = useState<QuickSimulationResult | null>(null);
  const [savingRegime, setSavingRegime] = useState(false);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(editing?.id ?? null);
  const set = (patch: Partial<PropertyForm>) => setForm((f) => ({ ...f, ...patch }));

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) set({ logradouro: data.logradouro || form.logradouro, bairro: data.bairro || form.bairro, cidade: data.localidade || form.cidade, uf: data.uf || form.uf });
    } catch { /* silencioso: preenchimento manual */ }
    finally { setCepLoading(false); }
  };

  const submit = async () => {
    if (!form.client_id) return onError('Selecione o cliente');
    if (!form.identificador.trim()) return onError('Informe o identificador do imóvel');
    setSaving(true);
    const payload = {
      client_id: form.client_id,
      tipo_locacao: form.tipo_locacao,
      natureza_locacao: form.natureza_locacao,
      identificador: form.identificador.trim(),
      valor_aluguel_mensal: Number(form.valor_aluguel_mensal) || undefined,
      modo_entrada: form.modo_entrada,
      cep: form.cep || undefined, logradouro: form.logradouro || undefined, numero: form.numero || undefined,
      complemento: form.complemento || undefined, bairro: form.bairro || undefined, cidade: form.cidade || undefined, uf: form.uf || undefined,
      matricula_imovel: form.matricula_imovel || undefined, inscricao_iptu: form.inscricao_iptu || undefined, cartorio_registro: form.cartorio_registro || undefined,
      iptu_mensal_padrao: Number(form.iptu_mensal_padrao) || undefined,
      condominio_mensal_padrao: Number(form.condominio_mensal_padrao) || undefined,
      seguro_mensal_padrao: Number(form.seguro_mensal_padrao) || undefined,
    };
    try {
      let propId = editing?.id;
      if (editing) {
        await propertyService.update(editing.id, payload);
      } else {
        const created = await propertyService.create(payload);
        propId = created.id;
      }
      onSuccess(editing ? 'Imóvel atualizado' : 'Imóvel cadastrado');
      setSavedPropertyId(propId ?? null);

      if (propId && (Number(form.valor_aluguel_mensal) || 0) > 0) {
        try {
          const sim = await propertyService.quickSimulate(propId);
          setSimResult(sim);
        } catch {
          onSaved();
        }
      } else {
        onSaved();
      }
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar imóvel'); }
    finally { setSaving(false); }
  };

  const chooseRegime = async (regime: 'pf' | 'pj') => {
    if (!savedPropertyId) return;
    setSavingRegime(true);
    try {
      await propertyService.saveRegime(savedPropertyId, regime);
      onSuccess(`Regime ${regime.toUpperCase()} salvo`);
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar regime'); }
    finally { setSavingRegime(false); }
  };

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const sectionTitle = 'text-xs font-bold uppercase tracking-wide text-slate-500 mt-2 mb-1';

  if (simResult) {
    return (
      <Modal isOpen onClose={() => onSaved()} title="Simulação tributária — PF vs PJ" size="lg">
        <div className="space-y-4 p-2">
          <p className="text-sm text-slate-600">Com base no aluguel e custos cadastrados, o sistema calculou a carga tributária estimada para este imóvel.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-xl border-2 p-4 ${simResult.recomendacao === 'pf' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">PF — Carnê-Leão</span>
                {simResult.recomendacao === 'pf' && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Recomendado</span>}
              </div>
              <div className="text-2xl font-bold text-slate-900">{brl(simResult.pf.imposto_anual)}<span className="text-sm font-normal text-slate-500">/ano</span></div>
              <div className="text-sm text-slate-500 mt-1">Alíquota efetiva: {pct(simResult.pf.aliquota_efetiva)}</div>
            </div>
            <div className={`rounded-xl border-2 p-4 ${simResult.recomendacao === 'pj' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">PJ — Lucro Presumido</span>
                {simResult.recomendacao === 'pj' && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Recomendado</span>}
              </div>
              <div className="text-2xl font-bold text-slate-900">{brl(simResult.pj.imposto_anual)}<span className="text-sm font-normal text-slate-500">/ano</span></div>
              <div className="text-sm text-slate-500 mt-1">Alíquota efetiva: {pct(simResult.pj.aliquota_efetiva)}</div>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
            Economia de <strong>{brl(simResult.economia_anual)}/ano</strong> optando por <strong>{simResult.recomendacao.toUpperCase()}</strong>.
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button size="sm" variant="secondary" onClick={() => onSaved()}>Decidir depois</Button>
            <Button size="sm" variant={simResult.recomendacao === 'pf' ? 'primary' : 'secondary'} onClick={() => chooseRegime('pf')} disabled={savingRegime}>Usar PF</Button>
            <Button size="sm" variant={simResult.recomendacao === 'pj' ? 'primary' : 'secondary'} onClick={() => chooseRegime('pj')} disabled={savingRegime}>Usar PJ</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Editar imóvel' : 'Cadastrar imóvel'} size="xl">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className={sectionTitle}>Identificação</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Cliente"><select value={form.client_id} onChange={(e) => set({ client_id: e.target.value })} className={inputCls}><option value="">Selecione…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Identificador (nome ou apelido)"><input value={form.identificador} onChange={(e) => set({ identificador: e.target.value })} className={inputCls} /></Field>
          <Field label="Tipo de locação"><select value={form.tipo_locacao} onChange={(e) => set({ tipo_locacao: e.target.value as any })} className={inputCls}><option value="fixa">Fixa (mensal)</option><option value="flexivel">Flexível (Airbnb)</option></select></Field>
          <Field label="Natureza"><select value={form.natureza_locacao} onChange={(e) => set({ natureza_locacao: e.target.value as any })} className={inputCls}><option value="residencial">Residencial</option><option value="nao_residencial">Não residencial</option></select></Field>
          <Field label="Aluguel mensal (R$)"><input type="number" value={form.valor_aluguel_mensal} onChange={(e) => set({ valor_aluguel_mensal: e.target.value })} className={inputCls} /></Field>
          <Field label="Modo de cadastro"><select value={form.modo_entrada} onChange={(e) => set({ modo_entrada: e.target.value as any })} className={inputCls}><option value="reduzido">Reduzido (totais mensais)</option><option value="detalhado">Detalhado (lançamentos)</option></select></Field>
        </div>

        <div className={sectionTitle}>Endereço</div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">CEP</span>
            <div className="flex gap-2">
              <input value={form.cep} onChange={(e) => set({ cep: e.target.value })} onBlur={lookupCep} placeholder="00000-000" className={inputCls} />
              <Button size="sm" variant="secondary" onClick={lookupCep} disabled={cepLoading}>{cepLoading ? '…' : 'Buscar'}</Button>
            </div>
          </div>
          <div className="col-span-2 md:col-span-3"><Field label="Logradouro"><input value={form.logradouro} onChange={(e) => set({ logradouro: e.target.value })} className={inputCls} /></Field></div>
          <Field label="Número"><input value={form.numero} onChange={(e) => set({ numero: e.target.value })} className={inputCls} /></Field>
          <div className="col-span-2 md:col-span-2"><Field label="Complemento"><input value={form.complemento} onChange={(e) => set({ complemento: e.target.value })} className={inputCls} /></Field></div>
          <div className="col-span-2 md:col-span-2"><Field label="Bairro"><input value={form.bairro} onChange={(e) => set({ bairro: e.target.value })} className={inputCls} /></Field></div>
          <Field label="Cidade"><input value={form.cidade} onChange={(e) => set({ cidade: e.target.value })} className={inputCls} /></Field>
          <Field label="UF"><input value={form.uf} maxLength={2} onChange={(e) => set({ uf: e.target.value.toUpperCase() })} className={inputCls} /></Field>
        </div>

        <div className={sectionTitle}>Documentação</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Matrícula"><input value={form.matricula_imovel} onChange={(e) => set({ matricula_imovel: e.target.value })} className={inputCls} /></Field>
          <Field label="Inscrição IPTU"><input value={form.inscricao_iptu} onChange={(e) => set({ inscricao_iptu: e.target.value })} className={inputCls} /></Field>
          <Field label="Cartório de registro"><input value={form.cartorio_registro} onChange={(e) => set({ cartorio_registro: e.target.value })} className={inputCls} /></Field>
        </div>

        <div className={sectionTitle}>Custos padrão mensais (opcional)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="IPTU (mensal)"><input type="number" value={form.iptu_mensal_padrao} onChange={(e) => set({ iptu_mensal_padrao: e.target.value })} className={inputCls} /></Field>
          <Field label="Condomínio"><input type="number" value={form.condominio_mensal_padrao} onChange={(e) => set({ condominio_mensal_padrao: e.target.value })} className={inputCls} /></Field>
          <Field label="Seguro (mensal)"><input type="number" value={form.seguro_mensal_padrao} onChange={(e) => set({ seguro_mensal_padrao: e.target.value })} className={inputCls} /></Field>
        </div>
        <p className="text-xs text-slate-400">Os custos padrão alimentam os simuladores tributários; o dia a dia financeiro é lançado na aba Financeiro.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving}>{saving ? 'Salvando…' : (editing ? 'Salvar' : 'Cadastrar')}</Button>
      </div>
    </Modal>
  );
}

// ─── Importar do IRPF Modal ─────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'importing';

function ImportIrpfModal({ clients, defaultClientId, existingIdentificadores, onClose, onImported, onError }: {
  clients: ClientWithCreatedAt[]; defaultClientId: string; existingIdentificadores: string[];
  onClose: () => void; onImported: (count: number) => void; onError: (m: string) => void;
}) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [clientId, setClientId] = useState(defaultClientId || clients[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IrpfPropertyImportResult | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editedIds, setEditedIds] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      const ext = f.name.toLowerCase().split('.').pop() ?? '';
      if (!['pdf', 'dec', 'dbk'].includes(ext)) {
        onError('Arquivo inválido. Aceito: PDF, .dec ou .dbk');
        return;
      }
      setFile(f);
    }
  };

  const handleExtract = async () => {
    if (!file) return onError('Selecione um arquivo');
    if (!clientId) return onError('Selecione o cliente');
    setLoading(true);
    try {
      const data = await propertyService.importFromIrpf(file, clientId);
      setResult(data);
      const sel: Record<string, boolean> = {};
      for (const c of data.candidates) {
        const isDuplicate = existingIdentificadores.includes(c.identificador.toLowerCase());
        sel[c.temp_id] = c.selected_default && !isDuplicate;
      }
      setSelected(sel);
      setStep('preview');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao extrair imóveis do arquivo');
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    const next = { ...selected };
    for (const c of result?.candidates ?? []) next[c.temp_id] = checked;
    setSelected(next);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleConfirm = async () => {
    if (!result || selectedCount === 0) return;
    setStep('importing');
    try {
      const items = result.candidates
        .filter((c) => selected[c.temp_id])
        .map((c) => ({
          tipo_locacao: 'fixa' as const,
          natureza_locacao: c.natureza_locacao,
          identificador: editedIds[c.temp_id] ?? c.identificador,
          valor_aluguel_mensal: 0,
          modo_entrada: 'detalhado' as const,
          cidade: c.cidade,
          uf: c.uf,
          logradouro: c.logradouro,
          numero: c.numero,
          complemento: c.complemento,
        }));
      await propertyService.createBatch({ client_id: clientId, properties: items });
      onImported(items.length);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cadastrar imóveis');
      setStep('preview');
    }
  };

  const isDuplicate = (c: IrpfPropertyCandidate) => {
    const id = (editedIds[c.temp_id] ?? c.identificador).toLowerCase();
    return existingIdentificadores.includes(id);
  };

  return (
    <Modal isOpen onClose={onClose} title="Importar imóveis do IRPF" size="lg">
      {step === 'upload' && (
        <div className="space-y-4 p-4 text-left">
          <p className="text-sm text-slate-600">
            Envie a declaração do IRPF (PDF, .dec ou .dbk) para extrair os imóveis automaticamente.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
              <option value="">Selecione...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Arquivo IRPF</label>
            <input type="file" accept=".pdf,.dec,.dbk" onChange={handleFileChange} className="text-sm" />
            {file && <p className="text-xs text-slate-500 mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleExtract} disabled={loading || !file || !clientId}>
              {loading ? 'Extraindo…' : 'Extrair imóveis'}
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && result && (
        <div className="space-y-3 p-4 text-left">
          {result.contribuinte && (
            <p className="text-xs text-slate-500">
              Contribuinte: {result.contribuinte.nome ?? '—'} {result.contribuinte.cpf ? `(CPF: ${result.contribuinte.cpf})` : ''}
            </p>
          )}
          {result.avisos.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
              {result.avisos.map((a, i) => <p key={i}>{a}</p>)}
            </div>
          )}
          {result.candidates.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhum imóvel encontrado no arquivo.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={selectedCount === result.candidates.length} onChange={(e) => toggleAll(e.target.checked)} className="mr-2" />
                  Selecionar todos ({result.candidates.length})
                </label>
                <span className="text-xs text-slate-500">{selectedCount} selecionado(s)</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {result.candidates.map((c) => {
                  const dup = isDuplicate(c);
                  return (
                    <div key={c.temp_id} className={`flex items-start gap-3 px-3 py-2 ${dup ? 'bg-yellow-50' : ''}`}>
                      <input type="checkbox" checked={!!selected[c.temp_id]} onChange={(e) => setSelected({ ...selected, [c.temp_id]: e.target.checked })} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <input
                          value={editedIds[c.temp_id] ?? c.identificador}
                          onChange={(e) => setEditedIds({ ...editedIds, [c.temp_id]: e.target.value })}
                          className="font-medium text-sm text-slate-900 w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none pb-0.5"
                        />
                        <p className="text-xs text-slate-500 truncate mt-0.5" title={c.descricao}>{c.descricao}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-600">
                          {c.cidade && <span>{c.cidade}{c.uf ? `/${c.uf}` : ''}</span>}
                          <span className="capitalize">{c.natureza_locacao === 'nao_residencial' ? 'Comercial' : 'Residencial'}</span>
                          {c.valor_declarado != null && <span>R$ {c.valor_declarado.toLocaleString('pt-BR')}</span>}
                          {dup && <span className="text-amber-700 font-semibold">Já cadastrado</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" variant="secondary" onClick={() => { setStep('upload'); setResult(null); }}>Voltar</Button>
            <Button size="sm" onClick={handleConfirm} disabled={selectedCount === 0}>
              Cadastrar {selectedCount} imóvel(is)
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="p-8 text-center text-slate-500 text-sm">Cadastrando imóveis…</div>
      )}
    </Modal>
  );
}

export default GestaoImobiliaria;
