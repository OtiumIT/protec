import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { useClients } from '../../../shared/hooks/useClients';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import { LeaseDocuments } from '../components/LeaseDocuments';
import { Badge, Field, GARANTIA_TIPOS, brl, inputCls, isoDate, sectionTitle, today } from '../ui';
import type { PropertyLease, PropertyTenant } from '@shared/core';

type FormState = {
  property_id: string;
  tenant_id: string;
  numero: string;
  data_inicio: string;
  data_fim: string;
  prazo_meses: string;
  valor_aluguel: string;
  dia_vencimento: string;
  indice_reajuste: string;
  status: string;
  observacao: string;
  tem_imobiliaria: boolean;
  imobiliaria_tipo: string;
  imobiliaria_valor: string;
};

function emptyForm(propertyId = ''): FormState {
  return {
    property_id: propertyId,
    tenant_id: '',
    numero: '',
    data_inicio: today(),
    data_fim: '',
    prazo_meses: '30',
    valor_aluguel: '',
    dia_vencimento: '10',
    indice_reajuste: 'IPCA',
    status: 'ativo',
    observacao: '',
    tem_imobiliaria: false,
    imobiliaria_tipo: 'percentual',
    imobiliaria_valor: '',
  };
}

function addMonthsMinusDay(start: string, months: number): string {
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime()) || months <= 0) return '';
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function ContratoFicha() {
  const { leaseId } = useParams<{ leaseId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: showError, ToastContainer } = useToast();
  const isNew = !leaseId || leaseId === 'novo';

  const { clients } = useClients();
  const [properties, setProperties] = useState<PropertyWithClient[]>([]);
  const [tenants, setTenants] = useState<PropertyTenant[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(search.get('property_id') ?? ''));
  const [lease, setLease] = useState<PropertyLease | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [newTenant, setNewTenant] = useState({ nome: '', tipo_pessoa: 'pf' as 'pf' | 'pj', documento: '', email: '' });
  const [creatingTenant, setCreatingTenant] = useState(false);

  const [garantiaTipo, setGarantiaTipo] = useState('');
  const [garantiaValor, setGarantiaValor] = useState('');
  const [garantiaDesc, setGarantiaDesc] = useState('');
  const [garantiaId, setGarantiaId] = useState<string | null>(null);

  const [simResult, setSimResult] = useState<any>(null);
  const [savingRegime, setSavingRegime] = useState(false);

  useEffect(() => {
    propertyService.list({ limit: 100 }).then((r) => setProperties(r.properties)).catch(() => setProperties([]));
    svc.listTenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    svc.getLease(leaseId!)
      .then(async (l) => {
        setLease(l);
        setForm({
          property_id: l.property_id,
          tenant_id: l.tenant_id ?? '',
          numero: l.numero ?? '',
          data_inicio: isoDate(l.data_inicio),
          data_fim: isoDate(l.data_fim),
          prazo_meses: l.prazo_meses != null ? String(l.prazo_meses) : '',
          valor_aluguel: String(l.valor_aluguel ?? ''),
          dia_vencimento: String(l.dia_vencimento ?? '10'),
          indice_reajuste: l.indice_reajuste ?? 'IPCA',
          status: l.status ?? 'ativo',
          observacao: l.observacao ?? '',
          tem_imobiliaria: !!l.tem_imobiliaria,
          imobiliaria_tipo: l.imobiliaria_tipo ?? 'percentual',
          imobiliaria_valor: String(l.imobiliaria_valor ?? ''),
        });
        const gs = await svc.listGuarantees(l.id).catch(() => []);
        const g = gs[0];
        if (g) {
          setGarantiaId(g.id);
          setGarantiaTipo(g.tipo);
          setGarantiaValor(g.valor != null ? String(g.valor) : '');
          setGarantiaDesc(g.descricao ?? '');
        }
      })
      .catch((e) => { showError(e instanceof Error ? e.message : 'Contrato não encontrado'); navigate('/gestao-imobiliaria/contratos'); })
      .finally(() => setLoading(false));
  }, [isNew, leaseId]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === form.property_id),
    [properties, form.property_id]
  );
  const ownerName = selectedProperty?.client_name
    ?? lease?.property_client_name
    ?? clients.find((c) => c.id === selectedProperty?.client_id)?.name
    ?? '—';

  const set = (patch: Partial<FormState>) => setForm((f) => {
    const next = { ...f, ...patch };
    if (patch.prazo_meses !== undefined || patch.data_inicio !== undefined) {
      const months = Number(next.prazo_meses);
      if (months > 0 && next.data_inicio) next.data_fim = addMonthsMinusDay(next.data_inicio, months);
    }
    return next;
  });

  const createTenant = async () => {
    if (!newTenant.nome.trim()) return showError('Informe o nome do inquilino');
    setCreatingTenant(true);
    try {
      const t = await svc.createTenant({
        nome: newTenant.nome.trim(),
        tipo_pessoa: newTenant.tipo_pessoa,
        documento: newTenant.documento.trim() || null,
        email: newTenant.email.trim() || null,
        client_id: selectedProperty?.client_id ?? null,
      });
      setTenants((prev) => [...prev, t].sort((a, b) => a.nome.localeCompare(b.nome)));
      set({ tenant_id: t.id });
      setNewTenant({ nome: '', tipo_pessoa: 'pf', documento: '', email: '' });
      success('Inquilino criado');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao criar inquilino');
    } finally {
      setCreatingTenant(false);
    }
  };

  const persistGuarantee = async (savedLeaseId: string) => {
    if (!garantiaTipo) return;
    const body = {
      tipo: garantiaTipo,
      valor: garantiaValor ? Number(garantiaValor) : null,
      descricao: garantiaDesc.trim() || null,
      status: 'ativa',
    };
    if (garantiaId) await svc.updateGuarantee(garantiaId, body);
    else {
      const created = await svc.createGuarantee(savedLeaseId, body);
      setGarantiaId(created.id);
    }
  };

  const submit = async () => {
    if (!form.property_id) return showError('Selecione o imóvel');
    if (!form.data_inicio) return showError('Informe a data de início');
    setSaving(true);
    const payload: Record<string, unknown> = {
      property_id: form.property_id,
      tenant_id: form.tenant_id || null,
      numero: form.numero.trim() || null,
      prazo_meses: form.prazo_meses ? Number(form.prazo_meses) : null,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      valor_aluguel: Number(form.valor_aluguel) || 0,
      dia_vencimento: Number(form.dia_vencimento) || 10,
      indice_reajuste: form.indice_reajuste,
      status: form.status,
      observacao: form.observacao || null,
      tem_imobiliaria: form.tem_imobiliaria,
      imobiliaria_tipo: form.tem_imobiliaria ? form.imobiliaria_tipo : null,
      imobiliaria_valor: form.tem_imobiliaria ? (Number(form.imobiliaria_valor) || 0) : 0,
    };
    try {
      let saved: PropertyLease;
      if (isNew) {
        saved = await svc.createLease(payload);
        success('Contrato criado');
      } else {
        const { property_id: _, ...upd } = payload;
        saved = await svc.updateLease(leaseId!, upd);
        success('Contrato atualizado');
      }
      setLease(saved);
      await persistGuarantee(saved.id);
      if ((Number(form.valor_aluguel) || 0) > 0) {
        try {
          setSimResult(await svc.quickSimulateLease(saved.id));
        } catch { /* simulação opcional */ }
      }
      if (isNew) navigate(`/gestao-imobiliaria/contratos/${saved.id}`, { replace: true });
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar contrato');
    } finally {
      setSaving(false);
    }
  };

  const chooseRegime = async (regime: 'pf' | 'pj') => {
    const id = lease?.id ?? leaseId;
    if (!id || id === 'novo') return;
    setSavingRegime(true);
    try {
      const updated = await svc.saveLeaseRegime(id, regime);
      setLease(updated);
      success(`Regime ${regime.toUpperCase()} salvo`);
      setSimResult(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar regime');
    } finally {
      setSavingRegime(false);
    }
  };

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-sm">Carregando contrato…</div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/gestao-imobiliaria/contratos')} className="text-xs font-semibold text-indigo-700 mb-1">
            ← Contratos
          </button>
          <h1 className="text-xl font-bold text-slate-900">{isNew ? 'Novo contrato' : (lease?.numero ? `Contrato ${lease.numero}` : 'Ficha do contrato')}</h1>
          <p className="text-xs text-slate-500">Partes, vigência, garantia e anexos. A simulação tributária vem depois do cadastro jurídico.</p>
        </div>
        {lease?.status && <Badge status={lease.status} />}
      </header>

      <Card title="Partes">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Imóvel *">
            <select value={form.property_id} onChange={(e) => set({ property_id: e.target.value })} className={inputCls} disabled={!isNew} required>
              <option value="">Selecione…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.identificador}{p.client_name ? ` · ${p.client_name}` : ''}</option>)}
            </select>
          </Field>
          <Field label="Proprietário">
            <input value={ownerName} readOnly className={`${inputCls} bg-slate-50 text-slate-600`} />
          </Field>
          <Field label="Inquilino">
            <select value={form.tenant_id} onChange={(e) => set({ tenant_id: e.target.value })} className={inputCls}>
              <option value="">Sem inquilino</option>
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.documento ? ` · ${t.documento}` : ''}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-3">
          <div className={sectionTitle}>Cadastrar inquilino</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Nome *"><input value={newTenant.nome} onChange={(e) => setNewTenant({ ...newTenant, nome: e.target.value })} className={inputCls} /></Field>
            <Field label="Tipo">
              <select value={newTenant.tipo_pessoa} onChange={(e) => setNewTenant({ ...newTenant, tipo_pessoa: e.target.value as 'pf' | 'pj' })} className={inputCls}>
                <option value="pf">Pessoa física</option>
                <option value="pj">Pessoa jurídica</option>
              </select>
            </Field>
            <Field label={newTenant.tipo_pessoa === 'pj' ? 'CNPJ' : 'CPF'}>
              <input value={newTenant.documento} onChange={(e) => setNewTenant({ ...newTenant, documento: e.target.value })} className={inputCls} />
            </Field>
            <Field label="E-mail"><input type="email" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="secondary" onClick={createTenant} disabled={creatingTenant || !newTenant.nome.trim()}>
              {creatingTenant ? 'Salvando…' : 'Adicionar inquilino'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Vigência">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Nº do contrato"><input value={form.numero} onChange={(e) => set({ numero: e.target.value })} className={inputCls} placeholder="Opcional" /></Field>
          <Field label="Início *"><input type="date" value={form.data_inicio} onChange={(e) => set({ data_inicio: e.target.value })} className={inputCls} required /></Field>
          <Field label="Prazo (meses)">
            <input type="number" min={1} max={240} value={form.prazo_meses} onChange={(e) => set({ prazo_meses: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Fim"><input type="date" value={form.data_fim} onChange={(e) => set({ data_fim: e.target.value })} className={inputCls} /></Field>
          <Field label="Dia de vencimento"><input type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => set({ dia_vencimento: e.target.value })} className={inputCls} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputCls}>
              {['ativo', 'rascunho', 'encerrado', 'inadimplente'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Valores">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Aluguel (R$)"><input type="number" value={form.valor_aluguel} onChange={(e) => set({ valor_aluguel: e.target.value })} className={inputCls} /></Field>
          <Field label="Índice de reajuste">
            <select value={form.indice_reajuste} onChange={(e) => set({ indice_reajuste: e.target.value })} className={inputCls}>
              {['IPCA', 'IGPM', 'INPC', 'OUTRO', 'NENHUM'].map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <div className="md:col-span-3">
            <Field label="Observação"><input value={form.observacao} onChange={(e) => set({ observacao: e.target.value })} className={inputCls} /></Field>
          </div>
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.tem_imobiliaria} onChange={(e) => set({ tem_imobiliaria: e.target.checked })} className="rounded border-slate-300" />
            Possui imobiliária?
          </label>
          {form.tem_imobiliaria && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Field label="Tipo da taxa">
                <select value={form.imobiliaria_tipo} onChange={(e) => set({ imobiliaria_tipo: e.target.value })} className={inputCls}>
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor fixo (R$)</option>
                </select>
              </Field>
              <Field label={form.imobiliaria_tipo === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}>
                <input type="number" value={form.imobiliaria_valor} onChange={(e) => set({ imobiliaria_valor: e.target.value })} className={inputCls} step="0.01" min="0" />
              </Field>
            </div>
          )}
        </div>
      </Card>

      <Card title="Garantia">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Tipo">
            <select value={garantiaTipo} onChange={(e) => setGarantiaTipo(e.target.value)} className={inputCls}>
              {GARANTIA_TIPOS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          {garantiaTipo && (
            <>
              <Field label="Valor (R$)"><input type="number" value={garantiaValor} onChange={(e) => setGarantiaValor(e.target.value)} className={inputCls} /></Field>
              <Field label="Descrição"><input value={garantiaDesc} onChange={(e) => setGarantiaDesc(e.target.value)} className={inputCls} placeholder="Fiador, apólice…" /></Field>
            </>
          )}
        </div>
      </Card>

      {!isNew && lease && (
        <Card title="Anexos">
          <LeaseDocuments leaseId={lease.id} onError={showError} onSuccess={success} />
        </Card>
      )}
      {isNew && (
        <p className="text-xs text-slate-500">Salve o contrato para anexar o PDF assinado e demais documentos.</p>
      )}

      {simResult && (
        <Card title="Simulação tributária — PF vs PJ">
          <p className="text-sm text-slate-600 mb-3">Com base no aluguel e nos custos do imóvel.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['pf', 'pj'] as const).map((k) => (
              <div key={k} className={`rounded-xl border-2 p-4 ${simResult.recomendacao === k ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">{k === 'pf' ? 'PF — Carnê-Leão' : 'PJ — Lucro Presumido'}</span>
                  {simResult.recomendacao === k && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Recomendado</span>}
                </div>
                <div className="text-2xl font-bold text-slate-900">{brl(simResult[k].imposto_anual)}<span className="text-sm font-normal text-slate-500">/ano</span></div>
                <div className="text-sm text-slate-500 mt-1">Alíquota efetiva: {pct(simResult[k].aliquota_efetiva)}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800 mt-3">
            Economia de <strong>{brl(simResult.economia_anual)}/ano</strong> optando por <strong>{String(simResult.recomendacao).toUpperCase()}</strong>.
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button size="sm" variant="secondary" onClick={() => setSimResult(null)}>Decidir depois</Button>
            <Button size="sm" variant={simResult.recomendacao === 'pf' ? 'primary' : 'secondary'} onClick={() => chooseRegime('pf')} disabled={savingRegime}>Usar PF</Button>
            <Button size="sm" variant={simResult.recomendacao === 'pj' ? 'primary' : 'secondary'} onClick={() => chooseRegime('pj')} disabled={savingRegime}>Usar PJ</Button>
          </div>
        </Card>
      )}

      {!isNew && lease?.regime_tributario && !simResult && (
        <div className="text-sm text-slate-600">
          Regime tributário deste contrato:{' '}
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${lease.regime_tributario === 'pf' ? 'bg-violet-100 text-violet-800' : 'bg-cyan-100 text-cyan-800'}`}>
            {lease.regime_tributario.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 pb-6">
        <Button size="sm" variant="secondary" onClick={() => navigate('/gestao-imobiliaria/contratos')}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving}>{saving ? 'Salvando…' : (isNew ? 'Cadastrar contrato' : 'Salvar')}</Button>
      </div>
    </div>
  );
}
