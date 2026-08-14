import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { useBranding } from '../../../shared/hooks/useBranding';
import type { ClientWithCreatedAt } from '../../clients/services/client.service';
import { useClients } from '../../../shared/hooks/useClients';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import {
  gestaoImobiliariaService as svc,
  type StatementData, type AlertItem,
} from '../services/gestao-imobiliaria.service';
import type { PropertyLease, PropertyLedgerEntry, PropertyTenant } from '@shared/core';
import { Badge, Field, brl, inputCls, today } from '../ui';
import { PortfolioTab } from '../tabs/PortfolioTab';
import { ImoveisTab } from '../tabs/ImoveisTab';
import { ContratosTab } from '../tabs/ContratosTab';
import { CustosTab } from '../tabs/CustosTab';

const TABS = [
  { key: 'portfolio', label: 'Portfólio' },
  { key: 'imoveis', label: 'Imóveis' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'custos', label: 'Custos' },
] as const;
type TabKey = (typeof TABS)[number]['key'];
/** Telas ocultas no menu (código mantido para reativação). */
const HIDDEN_SECTIONS = new Set(['financeiro', 'operacao', 'integracoes', 'alertas', 'notas-fiscais']);

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

const currentCompetencia = () => new Date().toISOString().slice(0, 7);

export function GestaoImobiliaria() {
  const { success, error: showError, ToastContainer } = useToast();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const tabKeys = TABS.map((t) => t.key) as string[];
  const tab = (tabKeys.includes(section ?? '') ? section : 'portfolio') as TabKey;
  const setTab = (k: TabKey) => navigate(`/gestao-imobiliaria/${k}`);
  const showMonth = tab === 'portfolio';
  const { clients, refetch: reloadClients } = useClients();
  const [clientId, setClientId] = useState<string>('');
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [competencia, setCompetencia] = useState<string>(currentCompetencia());

  const isAdmin = useMemo(() => {
    try { return ['admin', 'super_admin'].includes(JSON.parse(localStorage.getItem('user') || '{}')?.role); }
    catch { return false; }
  }, []);

  const reloadProperties = useCallback(() => {
    propertyService.list(clientId ? { client_id: clientId, limit: 100 } : { limit: 100 })
      .then((r) => setProperties(r.properties)).catch(() => setProperties([]));
  }, [clientId]);

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
      {tab === 'contratos' && <ContratosTab clientId={clientId} onError={showError} onSuccess={success} isAdmin={isAdmin} />}
      {tab === 'custos' && <CustosTab clientId={clientId} properties={properties} onChanged={reloadProperties} onError={showError} onSuccess={success} />}
      {false && <NotasFiscaisTab clientId={clientId} properties={properties} />}
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
export function ExtratosTab({ clients, clientId, onError, onSuccess, isAdmin }: {
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



// ---------------- Notas Fiscais ----------------

type NfFormState = {
  leaseId: string;
  competencia: string;
  valorServico: string;
  descricaoServico: string;
  issAliquota: string;
  issRetido: boolean;
  tomadorNome: string;
  tomadorDocumento: string;
  tomadorEndereco: string;
  prestadorNome: string;
  prestadorCnpj: string;
  prestadorEndereco: string;
};

function emptyNfForm(): NfFormState {
  return {
    leaseId: '', competencia: currentCompetencia(), valorServico: '', descricaoServico: '',
    issAliquota: '5', issRetido: false,
    tomadorNome: '', tomadorDocumento: '', tomadorEndereco: '',
    prestadorNome: '', prestadorCnpj: '', prestadorEndereco: '',
  };
}

function buildPropertyAddress(p: PropertyWithClient): string {
  const a = p as any;
  const parts: string[] = [];
  if (a.logradouro) parts.push(a.logradouro);
  if (a.numero) parts.push(a.numero);
  if (a.complemento) parts.push(a.complemento);
  if (a.bairro) parts.push(a.bairro);
  if (a.cidade) parts.push(a.cidade + (a.uf ? `/${a.uf}` : ''));
  return parts.join(', ') || p.identificador;
}

function NotasFiscaisTab({ clientId, properties }: { clientId: string; properties: PropertyWithClient[] }) {
  const branding = useBranding();
  const [leases, setLeases] = useState<PropertyLease[]>([]);
  const [tenants, setTenants] = useState<PropertyTenant[]>([]);
  const [form, setForm] = useState<NfFormState>(emptyNfForm());
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    svc.listLeases(clientId ? { client_id: clientId, status: 'ativo' } : { status: 'ativo' })
      .then(setLeases).catch(() => setLeases([]));
    svc.listTenants(clientId || undefined).then(setTenants).catch(() => setTenants([]));
  }, [clientId]);

  const activeLeases = useMemo(() => leases.filter((l) => l.status === 'ativo' || l.status === 'inadimplente'), [leases]);

  const selectedLease = useMemo(() => activeLeases.find((l) => l.id === form.leaseId), [activeLeases, form.leaseId]);
  const selectedProperty = useMemo(() => properties.find((p) => p.id === selectedLease?.property_id), [properties, selectedLease]);
  const selectedTenant = useMemo(() => tenants.find((t) => t.id === selectedLease?.tenant_id), [tenants, selectedLease]);

  useEffect(() => {
    if (!selectedLease || !selectedProperty) return;
    const addr = buildPropertyAddress(selectedProperty);
    const comp = form.competencia || currentCompetencia();
    const [y, m] = comp.split('-');
    const compLabel = `${m}/${y}`;

    setForm((f) => ({
      ...f,
      valorServico: f.valorServico || String(selectedLease.valor_aluguel ?? 0),
      descricaoServico: f.descricaoServico || `Locação de imóvel - ${addr} - Competência ${compLabel}`,
      tomadorNome: selectedTenant?.nome ?? '',
      tomadorDocumento: selectedTenant?.documento ?? '',
      tomadorEndereco: '',
      prestadorNome: branding?.report_brand_name ?? '',
      prestadorCnpj: '',
      prestadorEndereco: '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLease?.id, selectedProperty?.id, selectedTenant?.id, branding?.report_brand_name]);

  const handleLeaseChange = (leaseId: string) => {
    const lease = activeLeases.find((l) => l.id === leaseId);
    const prop = properties.find((p) => p.id === lease?.property_id);
    const tenant = tenants.find((t) => t.id === lease?.tenant_id);
    const addr = prop ? buildPropertyAddress(prop) : '';
    const comp = form.competencia || currentCompetencia();
    const [y, m] = comp.split('-');
    const compLabel = `${m}/${y}`;

    setForm({
      ...emptyNfForm(),
      leaseId,
      competencia: form.competencia,
      valorServico: String(lease?.valor_aluguel ?? ''),
      descricaoServico: lease ? `Locação de imóvel - ${addr} - Competência ${compLabel}` : '',
      issAliquota: '5',
      issRetido: false,
      tomadorNome: tenant?.nome ?? '',
      tomadorDocumento: tenant?.documento ?? '',
      tomadorEndereco: '',
      prestadorNome: branding?.report_brand_name ?? '',
      prestadorCnpj: '',
      prestadorEndereco: '',
    });
    setShowPreview(false);
  };

  const valorServico = Number(form.valorServico) || 0;
  const issAliquota = Number(form.issAliquota) || 0;
  const valorIss = valorServico * (issAliquota / 100);
  const valorLiquido = form.issRetido ? valorServico - valorIss : valorServico;

  const canPreview = !!form.leaseId && valorServico > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800 flex items-start gap-2">
        <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div>
          <strong>Pré-visualização de NF:</strong> Esta tela permite preencher e visualizar os dados da nota fiscal de serviço.
          A emissão real será integrada com o sistema de Nota Fiscal em uma próxima atualização.
        </div>
      </div>

      <Card title="Dados da Nota Fiscal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Contrato *">
            <select value={form.leaseId} onChange={(e) => handleLeaseChange(e.target.value)} className={inputCls}>
              <option value="">Selecione um contrato ativo…</option>
              {activeLeases.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.property_identificador ?? '—'} — {l.tenant_nome ?? 'Sem inquilino'} ({brl(Number(l.valor_aluguel))})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Competência">
            <input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Valor do Serviço (R$)">
            <input type="number" step="0.01" min="0" value={form.valorServico} onChange={(e) => setForm({ ...form, valorServico: e.target.value })} className={inputCls} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Descrição do Serviço">
              <textarea value={form.descricaoServico} onChange={(e) => setForm({ ...form, descricaoServico: e.target.value })} className={`${inputCls} min-h-[60px]`} rows={2} />
            </Field>
          </div>
          <Field label="ISS Alíquota (%)">
            <input type="number" step="0.01" min="0" max="100" value={form.issAliquota} onChange={(e) => setForm({ ...form, issAliquota: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.issRetido} onChange={(e) => setForm({ ...form, issRetido: e.target.checked })} className="rounded border-slate-300" />
              ISS retido na fonte?
            </label>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Dados do Tomador</div>
              <div className="space-y-2">
                <Field label="Nome / Razão Social">
                  <input value={form.tomadorNome} onChange={(e) => setForm({ ...form, tomadorNome: e.target.value })} className={inputCls} />
                </Field>
                <Field label="CPF / CNPJ">
                  <input value={form.tomadorDocumento} onChange={(e) => setForm({ ...form, tomadorDocumento: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Endereço">
                  <input value={form.tomadorEndereco} onChange={(e) => setForm({ ...form, tomadorEndereco: e.target.value })} className={inputCls} placeholder="Endereço completo do tomador" />
                </Field>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Dados do Prestador</div>
              <div className="space-y-2">
                <Field label="Nome / Razão Social">
                  <input value={form.prestadorNome} onChange={(e) => setForm({ ...form, prestadorNome: e.target.value })} className={inputCls} />
                </Field>
                <Field label="CNPJ">
                  <input value={form.prestadorCnpj} onChange={(e) => setForm({ ...form, prestadorCnpj: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Endereço">
                  <input value={form.prestadorEndereco} onChange={(e) => setForm({ ...form, prestadorEndereco: e.target.value })} className={inputCls} placeholder="Endereço completo do prestador" />
                </Field>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setForm(emptyNfForm()); setShowPreview(false); }}>Limpar</Button>
          <Button size="sm" onClick={() => setShowPreview(true)} disabled={!canPreview}>Pré-visualizar NF</Button>
        </div>
      </Card>

      {showPreview && canPreview && (
        <Card title="Pré-visualização da Nota Fiscal">
          <div className="border border-slate-300 rounded-xl p-6 bg-white space-y-5 print:border-none">
            {/* NF Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
              <div>
                <div className="text-lg font-bold text-slate-900">NOTA FISCAL DE SERVIÇO</div>
                <div className="text-xs text-slate-500 mt-1">Pré-visualização — documento não fiscal</div>
                {form.competencia && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Competência: {form.competencia.split('-').reverse().join('/')}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-indigo-700">{form.prestadorNome || 'Prestador'}</div>
                {form.prestadorCnpj && <div className="text-xs text-slate-500">CNPJ: {form.prestadorCnpj}</div>}
                {form.prestadorEndereco && <div className="text-xs text-slate-500">{form.prestadorEndereco}</div>}
              </div>
            </div>

            {/* Parties section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Prestador
                </div>
                <div className="font-medium text-slate-800">{form.prestadorNome || '—'}</div>
                {form.prestadorCnpj && <div className="text-slate-600 mt-0.5">CNPJ: {form.prestadorCnpj}</div>}
                {form.prestadorEndereco && <div className="text-slate-600 mt-0.5">{form.prestadorEndereco}</div>}
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <div className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Tomador
                </div>
                <div className="font-medium text-slate-800">{form.tomadorNome || '—'}</div>
                {form.tomadorDocumento && <div className="text-slate-600 mt-0.5">{selectedTenant?.tipo_pessoa === 'pf' ? 'CPF' : 'CNPJ'}: {form.tomadorDocumento}</div>}
                {form.tomadorEndereco && <div className="text-slate-600 mt-0.5">{form.tomadorEndereco}</div>}
              </div>
            </div>

            {/* Service description */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-bold uppercase text-slate-500 mb-1">Descrição do Serviço</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{form.descricaoServico || '—'}</div>
            </div>

            {/* Values table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Valor do Serviço</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{brl(valorServico)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-600">Base de Cálculo</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{brl(valorServico)}</td>
                  </tr>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-600">Alíquota ISS</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{issAliquota.toFixed(2)}%</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-600">
                      Valor ISS {form.issRetido ? <span className="text-xs text-amber-600 font-medium ml-1">(retido na fonte)</span> : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{brl(valorIss)}</td>
                  </tr>
                  <tr className="bg-slate-900 text-white">
                    <td className="px-4 py-3 font-bold">Valor Líquido</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">{brl(valorLiquido)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>NF será gerada após integração com o sistema de emissão.</span>
            </div>

            <div className="flex justify-end">
              <div className="relative group">
                <Button size="sm" disabled>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Gerar NF
                  </span>
                </Button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                  <div className="rounded-lg bg-slate-900 text-white text-xs px-3 py-2 whitespace-nowrap shadow-lg">
                    Integração com sistema de emissão em breve
                    <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Notas Fiscais Emitidas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2">Competência</th>
                <th>Imóvel</th>
                <th>Inquilino</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-slate-600 text-sm font-medium">Nenhuma nota fiscal gerada ainda</p>
                      <p className="text-slate-400 text-xs mt-1">A integração com o sistema de emissão será disponibilizada em breve.</p>
                      <p className="text-slate-400 text-xs mt-0.5">Use a pré-visualização acima para preparar os dados da NF.</p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default GestaoImobiliaria;
