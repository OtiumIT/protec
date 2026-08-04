import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { clientService, type ClientWithCreatedAt } from '../../clients/services/client.service';
import { mapeamentoService as svc, type DiagnosisFull, type PortfolioSummary } from '../services/mapeamento-despesas-pj.service';
import type { ExpenseItemAnswer, ExpenseMappingResult, ExpenseMappingDiagnosis, ClassifiedExpenseItem } from '@shared/core';

const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

const CATEGORIES = [
  { key: 'veiculos', nome: 'Veículos e mobilidade' },
  { key: 'imovel', nome: 'Imóvel e home office' },
  { key: 'tecnologia', nome: 'Tecnologia e telecom' },
  { key: 'viagens', nome: 'Viagens e representação' },
  { key: 'servicos', nome: 'Serviços profissionais' },
  { key: 'capacitacao', nome: 'Capacitação' },
  { key: 'saude_beneficios', nome: 'Saúde e benefícios' },
  { key: 'outras', nome: 'Outras despesas' },
];

const CLASS_BADGE: Record<string, string> = {
  potencial: 'bg-emerald-100 text-emerald-800',
  condicionado: 'bg-amber-100 text-amber-800',
  rateio: 'bg-orange-100 text-orange-800',
  nao_recomendado: 'bg-red-100 text-red-800',
};
const CLASS_LABEL: Record<string, string> = {
  potencial: 'Potencial', condicionado: 'Condicionado', rateio: 'Rateio', nao_recomendado: 'Não recomendado',
};

function newItem(): ExpenseItemAnswer {
  return {
    category_key: 'veiculos', label: '', monthly_amount: 0, current_payer: 'pf',
    vinculo_atividade: 'parcial', business_use_pct: 0, beneficiario: 'empresa',
    documento_pj: 'nao', possui_evidencia: false, is_tributo_ou_principal: false, notes: null,
  };
}

type View = { mode: 'list' } | { mode: 'wizard' } | { mode: 'detail'; id: string };

export function MapeamentoDespesasPj() {
  const { success, error: showError, ToastContainer } = useToast();
  const [view, setView] = useState<View>({ mode: 'list' });

  return (
    <div className="space-y-6">
      <ToastContainer />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapeamento de Despesas PF → PJ</h1>
          <p className="text-sm text-slate-500">Diagnóstico e evidência para organização de despesas. Não é parecer nem promessa de crédito.</p>
        </div>
        {view.mode === 'list' && <Button size="sm" onClick={() => setView({ mode: 'wizard' })}>+ Novo diagnóstico</Button>}
        {view.mode !== 'list' && <Button size="sm" variant="secondary" onClick={() => setView({ mode: 'list' })}>← Voltar</Button>}
      </header>

      {view.mode === 'list' && <ListView onOpen={(id) => setView({ mode: 'detail', id })} onError={showError} />}
      {view.mode === 'wizard' && <Wizard onDone={(id) => setView({ mode: 'detail', id })} onError={showError} onSuccess={success} />}
      {view.mode === 'detail' && <DetailView id={view.id} onError={showError} onSuccess={success} onBack={() => setView({ mode: 'list' })} />}
    </div>
  );
}

// ---------------- List + dashboard ----------------
function ListView({ onOpen, onError }: { onOpen: (id: string) => void; onError: (m: string) => void }) {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<ExpenseMappingDiagnosis[]>([]);
  useEffect(() => {
    svc.getDashboard().then(setSummary).catch(() => onError('Falha ao carregar o painel'));
    svc.list({ limit: 50 }).then((r) => setDiagnoses(r.diagnoses)).catch(() => onError('Falha ao listar diagnósticos'));
  }, [onError]);

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox label="Clientes mapeados" value={String(summary.clientes_mapeados)} />
          <KpiBox label="Base anual analisada" value={brl(summary.base_anual_analisada)} />
          <KpiBox label="Potencial operacional" value={brl(summary.potencial_operacional)} tone="pos" />
          <KpiBox label="Pendências abertas" value={String(summary.pendencias_abertas)} tone="warn" />
        </div>
      )}
      <Card title="Diagnósticos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase"><th className="py-2">Cliente</th><th>Ano</th><th>Analisado</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{d.client_name ?? '—'}</td>
                  <td>{d.reference_year}</td>
                  <td>{brl((d.totals as any)?.total_analisado_anual ?? 0)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="text-right"><button onClick={() => onOpen(d.id)} className="text-indigo-700 text-xs font-semibold">Abrir</button></td>
                </tr>
              ))}
              {diagnoses.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-400 text-center">Nenhum diagnóstico ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiBox({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'warn' }) {
  const color = tone === 'pos' ? 'text-emerald-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-900';
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">{label}</div><div className={`mt-1 text-lg font-bold ${color}`}>{value}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', in_review: 'bg-amber-100 text-amber-800', completed: 'bg-emerald-100 text-emerald-800', archived: 'bg-slate-100 text-slate-500' };
  const label: Record<string, string> = { draft: 'Rascunho', in_review: 'Em revisão', completed: 'Concluído', archived: 'Arquivado' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100'}`}>{label[status] ?? status}</span>;
}

// ---------------- Wizard ----------------
function Wizard({ onDone, onError, onSuccess }: { onDone: (id: string) => void; onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<ClientWithCreatedAt[]>([]);
  const [ctx, setCtx] = useState({
    client_id: '', title: '', reference_year: new Date().getFullYear(), activity: '',
    tax_regime: 'simples_nacional', ibs_cbs_treatment: 'nao_avaliar', objective: '',
  });
  const [items, setItems] = useState<ExpenseItemAnswer[]>([newItem()]);
  const [preview, setPreview] = useState<ExpenseMappingResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { clientService.list().then(setClients).catch(() => onError('Falha ao carregar clientes')); }, [onError]);

  const updateItem = (idx: number, patch: Partial<ExpenseItemAnswer>) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const buildInput = () => ({
    context: {
      client_id: ctx.client_id, title: ctx.title || null, reference_year: Number(ctx.reference_year),
      activity: ctx.activity || null, tax_regime: ctx.tax_regime as any, ibs_cbs_treatment: ctx.ibs_cbs_treatment as any,
      objective: ctx.objective || null,
    },
    items: items.filter((i) => i.label.trim()).map((i) => ({ ...i, monthly_amount: Number(i.monthly_amount) || 0, business_use_pct: Number(i.business_use_pct) || 0 })),
    answers: [],
  });

  const runPreview = async () => {
    const input = buildInput();
    if (!input.context.client_id) return onError('Selecione o cliente');
    if (input.items.length === 0) return onError('Adicione ao menos uma despesa com descrição');
    try { setPreview(await svc.analyze(input)); setStep(4); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao analisar'); }
  };
  const save = async () => {
    setSaving(true);
    try { const full = await svc.create(buildInput()); onSuccess('Diagnóstico criado'); onDone(full.diagnosis.id); }
    catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {['Contexto', 'Categorias', 'Perguntas', 'Diagnóstico'].map((s, i) => (
          <div key={s} className={`flex-1 min-w-[120px] border-t-[3px] pt-2 text-xs font-semibold ${step >= i + 1 ? 'border-indigo-600 text-indigo-700' : 'border-slate-200 text-slate-400'}`}>{i + 1}. {s}</div>
        ))}
      </div>

      {step === 1 && (
        <Card title="Contexto da PJ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Cliente</span>
              <select value={ctx.client_id} onChange={(e) => setCtx({ ...ctx, client_id: e.target.value })} className={inputCls}><option value="">Selecione…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ano de referência</span>
              <input type="number" value={ctx.reference_year} onChange={(e) => setCtx({ ...ctx, reference_year: Number(e.target.value) })} className={inputCls} /></label>
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Atividade principal</span>
              <input value={ctx.activity} onChange={(e) => setCtx({ ...ctx, activity: e.target.value })} className={inputCls} /></label>
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Regime atual</span>
              <select value={ctx.tax_regime} onChange={(e) => setCtx({ ...ctx, tax_regime: e.target.value })} className={inputCls}>
                <option value="simples_nacional">Simples Nacional</option><option value="lucro_presumido">Lucro Presumido</option><option value="lucro_real">Lucro Real</option><option value="mei">MEI</option><option value="outro">Outro</option></select></label>
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Tratamento IBS/CBS pretendido</span>
              <select value={ctx.ibs_cbs_treatment} onChange={(e) => setCtx({ ...ctx, ibs_cbs_treatment: e.target.value })} className={inputCls}>
                <option value="nao_avaliar">Não avaliar crédito</option><option value="avaliar_por_fora">Avaliar regime regular por fora</option><option value="regime_regular">Regime regular</option><option value="simples_por_dentro">Simples por dentro</option></select></label>
            <label className="block"><span className="block text-xs font-semibold uppercase text-slate-500 mb-1">Título (opcional)</span>
              <input value={ctx.title} onChange={(e) => setCtx({ ...ctx, title: e.target.value })} className={inputCls} /></label>
          </div>
          <div className="mt-3 rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-xs text-cyan-800">
            A lente de crédito IBS/CBS só aparece quando o regime permite. Optantes do Simples só apropriam crédito ao apurar por fora.
          </div>
          <div className="mt-4 flex justify-end"><Button size="sm" onClick={() => setStep(2)}>Continuar</Button></div>
        </Card>
      )}

      {(step === 2 || step === 3) && (
        <Card title="Despesas mantidas na pessoa física">
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select value={it.category_key} onChange={(e) => updateItem(idx, { category_key: e.target.value as any })} className={inputCls}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.nome}</option>)}</select>
                  <input placeholder="Descrição (ex.: combustível)" value={it.label} onChange={(e) => updateItem(idx, { label: e.target.value })} className={`${inputCls} md:col-span-2`} />
                  <input type="number" placeholder="R$ / mês" value={it.monthly_amount || ''} onChange={(e) => updateItem(idx, { monthly_amount: Number(e.target.value) })} className={inputCls} />
                </div>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="text-xs text-slate-500">Vínculo
                    <select value={it.vinculo_atividade} onChange={(e) => updateItem(idx, { vinculo_atividade: e.target.value as any })} className={inputCls}><option value="sim">Sim</option><option value="parcial">Parcial</option><option value="nao">Não</option></select></label>
                  <label className="text-xs text-slate-500">Uso empresarial %
                    <input type="number" min={0} max={100} value={it.business_use_pct || ''} onChange={(e) => updateItem(idx, { business_use_pct: Number(e.target.value) })} className={inputCls} /></label>
                  <label className="text-xs text-slate-500">Beneficiário
                    <select value={it.beneficiario} onChange={(e) => updateItem(idx, { beneficiario: e.target.value as any })} className={inputCls}><option value="empresa">Empresa</option><option value="empregado">Empregado</option><option value="socio">Sócio</option><option value="familiar">Familiar</option><option value="misto">Misto</option></select></label>
                  <label className="text-xs text-slate-500">Doc. em nome da PJ
                    <select value={it.documento_pj} onChange={(e) => updateItem(idx, { documento_pj: e.target.value as any })} className={inputCls}><option value="sim">Sim</option><option value="parcial">Parcial</option><option value="nao">Não</option></select></label>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={it.possui_evidencia} onChange={(e) => updateItem(idx, { possui_evidencia: e.target.checked })} /> Possui contrato/evidência</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={it.is_tributo_ou_principal} onChange={(e) => updateItem(idx, { is_tributo_ou_principal: e.target.checked })} /> É tributo/parcela de principal (ex.: IPVA)</label>
                  <button onClick={() => removeItem(idx)} className="ml-auto text-red-600">Remover</button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addItem}>+ Adicionar despesa</Button>
          </div>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(1)}>← Contexto</Button>
            <Button size="sm" onClick={runPreview}>Gerar diagnóstico →</Button>
          </div>
        </Card>
      )}

      {step === 4 && preview && (
        <div className="space-y-4">
          <ResultView result={preview} />
          <div className="flex justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(3)}>← Ajustar</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar diagnóstico'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Result view (shared) ----------------
function ResultView({ result }: { result: ExpenseMappingResult }) {
  const t = result.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox label="Total analisado (ano)" value={brl(t.total_analisado_anual)} />
        <KpiBox label="Potencial" value={brl(t.potencial_anual)} tone="pos" />
        <KpiBox label="Condicionado / rateio" value={brl(t.condicionado_anual + t.rateio_anual)} tone="warn" />
        <KpiBox label="Não recomendado" value={brl(t.nao_recomendado_anual)} />
      </div>
      {result.alertas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ul className="list-disc pl-5 space-y-1">{result.alertas.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
      <Card title="Despesas classificadas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 text-xs uppercase"><th className="py-2">Despesa</th><th>Anual</th><th>Uso %</th><th>Classificação</th><th>Motivo / pendências</th></tr></thead>
            <tbody>
              {result.items.map((it: ClassifiedExpenseItem, i: number) => (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="py-2 font-medium">{it.label}</td>
                  <td>{brl(it.annual_amount)}</td>
                  <td>{it.business_use_pct}%</td>
                  <td><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${CLASS_BADGE[it.classification]}`}>{CLASS_LABEL[it.classification]}</span></td>
                  <td className="text-xs text-slate-500">{it.motivo}{it.pendencias.length > 0 && <ul className="list-disc pl-4 mt-1">{it.pendencias.map((p, k) => <li key={k}>{p}</li>)}</ul>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Matriz: migrar PF→PJ × crédito IBS/CBS">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <MatrixCell title="Priorizar" tone="pos" items={result.matriz.priorizar} />
          <MatrixCell title="Organizar" tone="warn" items={result.matriz.organizar} />
          <MatrixCell title="Corrigir antes" tone="warn" items={result.matriz.corrigir_antes} />
          <MatrixCell title="Evitar" tone="neg" items={result.matriz.evitar} />
        </div>
      </Card>
      <p className="text-[11px] leading-relaxed text-slate-400">{result.disclaimer}</p>
    </div>
  );
}

function MatrixCell({ title, items, tone }: { title: string; items: string[]; tone: 'pos' | 'warn' | 'neg' }) {
  const cls = tone === 'pos' ? 'bg-emerald-50 border-emerald-200' : tone === 'neg' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs font-bold uppercase mb-1">{title}</div>
      {items.length === 0 ? <span className="text-xs text-slate-400">—</span> : <ul className="text-xs list-disc pl-4">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>}
    </div>
  );
}

// ---------------- Detail ----------------
function DetailView({ id, onError, onSuccess, onBack }: { id: string; onError: (m: string) => void; onSuccess: (m: string) => void; onBack: () => void }) {
  const [full, setFull] = useState<DiagnosisFull | null>(null);
  const isAdmin = useMemo(() => { try { return ['admin', 'super_admin'].includes(JSON.parse(localStorage.getItem('user') || '{}')?.role); } catch { return false; } }, []);

  const reload = () => svc.getById(id).then(setFull).catch(() => onError('Falha ao carregar diagnóstico'));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (!full) return <Card>Carregando…</Card>;
  const d = full.diagnosis;

  const asResult: ExpenseMappingResult = {
    reference_year: d.reference_year, rules_version: d.rules_version, tax_regime: d.tax_regime,
    ibs_cbs_treatment: d.ibs_cbs_treatment, totals: (d.totals as any) ?? {},
    matriz: {
      priorizar: full.items.filter((i) => i.pf_pj_lens === 'migrate' && i.credit_lens === 'potential').map((i) => i.label),
      organizar: full.items.filter((i) => i.pf_pj_lens === 'migrate' && i.credit_lens !== 'potential').map((i) => i.label),
      corrigir_antes: full.items.filter((i) => i.pf_pj_lens === 'organize' || i.pf_pj_lens === 'defer').map((i) => i.label),
      evitar: full.items.filter((i) => i.pf_pj_lens === 'avoid').map((i) => i.label),
    },
    items: full.items, alertas: [],
    disclaimer: 'Diagnóstico orientativo. Não é parecer; não autoriza crédito automático.',
  };

  const complete = async () => { try { setFull(await svc.complete(id)); onSuccess('Diagnóstico concluído'); } catch (e) { onError(String(e)); } };
  const reopen = async () => { try { setFull(await svc.reopen(id)); onSuccess('Diagnóstico reaberto'); } catch (e) { onError(String(e)); } };
  const remove = async () => { if (!confirm('Excluir diagnóstico?')) return; try { await svc.remove(id); onSuccess('Excluído'); onBack(); } catch (e) { onError(String(e)); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-bold">{d.client_name ?? 'Cliente'} · {d.reference_year}</div>
          <div className="text-xs text-slate-500">Regras {d.rules_version} · <StatusBadge status={d.status} /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.print()}>Imprimir / PDF</Button>
          {d.status !== 'completed' && <Button size="sm" onClick={complete}>Concluir</Button>}
          {d.status === 'completed' && isAdmin && <Button size="sm" variant="secondary" onClick={reopen}>Reabrir</Button>}
          {isAdmin && <Button size="sm" variant="secondary" onClick={remove}>Excluir</Button>}
        </div>
      </div>
      <div className="report-print-wrapper"><ResultView result={asResult} /></div>
      <PendenciesPanel id={id} pendencies={full.pendencies} onChanged={reload} onError={onError} onSuccess={onSuccess} />
    </div>
  );
}

function PendenciesPanel({ id, pendencies, onChanged, onError, onSuccess }: { id: string; pendencies: any[]; onChanged: () => void; onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [titulo, setTitulo] = useState('');
  const add = async () => { if (!titulo.trim()) return; try { await svc.createPendency(id, { titulo }); setTitulo(''); onSuccess('Pendência criada'); onChanged(); } catch (e) { onError(String(e)); } };
  const toggle = async (p: any) => { try { await svc.updatePendency(p.id, { status: p.status === 'resolvida' ? 'pendente' : 'resolvida' }); onChanged(); } catch (e) { onError(String(e)); } };
  return (
    <Card title="Pendências e plano de ação">
      <div className="flex gap-2 mb-3">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nova pendência (ex.: solicitar NF-e para a PJ)" className={inputCls} />
        <Button size="sm" onClick={add}>Adicionar</Button>
      </div>
      <ul className="text-sm space-y-1">
        {pendencies.map((p) => (
          <li key={p.id} className="flex items-center justify-between border-t border-slate-100 py-1">
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.status === 'resolvida'} onChange={() => toggle(p)} /><span className={p.status === 'resolvida' ? 'line-through text-slate-400' : ''}>{p.titulo}</span></label>
          </li>
        ))}
        {pendencies.length === 0 && <li className="text-slate-400">Nenhuma pendência.</li>}
      </ul>
    </Card>
  );
}

export default MapeamentoDespesasPj;
