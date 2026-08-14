import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { useToast } from '../../../shared/components/ui/Toast';
import { useClients } from '../../../shared/hooks/useClients';
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

const PRESET_EXPENSE_CATALOG = [
  {
    id: 'ocupacao',
    nome: 'Ocupação e Infraestrutura',
    defaultCategoryKey: 'imovel' as const,
    presets: [
      { label: 'Aluguel do escritório/sala comercial', category_key: 'imovel' as const },
      { label: 'Condomínio', category_key: 'imovel' as const },
      { label: 'IPTU', category_key: 'imovel' as const },
      { label: 'Energia elétrica', category_key: 'imovel' as const },
      { label: 'Água', category_key: 'imovel' as const },
      { label: 'Internet', category_key: 'tecnologia' as const },
      { label: 'Telefone fixo/celular corporativo', category_key: 'tecnologia' as const },
      { label: 'Seguro do imóvel', category_key: 'imovel' as const },
      { label: 'Manutenção e reformas', category_key: 'imovel' as const },
    ],
  },
  {
    id: 'pessoal',
    nome: 'Pessoal e Benefícios',
    defaultCategoryKey: 'saude_beneficios' as const,
    presets: [
      { label: 'Folha de pagamento (CLT)', category_key: 'saude_beneficios' as const },
      { label: 'Pró-labore', category_key: 'saude_beneficios' as const },
      { label: 'INSS patronal', category_key: 'saude_beneficios' as const },
      { label: 'FGTS', category_key: 'saude_beneficios' as const },
      { label: 'Plano de saúde', category_key: 'saude_beneficios' as const },
      { label: 'Plano odontológico', category_key: 'saude_beneficios' as const },
      { label: 'Vale refeição/alimentação', category_key: 'saude_beneficios' as const },
      { label: 'Vale transporte', category_key: 'saude_beneficios' as const },
      { label: 'Seguro de vida em grupo', category_key: 'saude_beneficios' as const },
    ],
  },
  {
    id: 'servicos_prof',
    nome: 'Serviços Profissionais',
    defaultCategoryKey: 'servicos' as const,
    presets: [
      { label: 'Contabilidade', category_key: 'servicos' as const },
      { label: 'Advocacia/jurídico', category_key: 'servicos' as const },
      { label: 'Consultoria especializada', category_key: 'servicos' as const },
      { label: 'Marketing e publicidade', category_key: 'servicos' as const },
      { label: 'TI / suporte técnico', category_key: 'servicos' as const },
      { label: 'Limpeza e conservação', category_key: 'servicos' as const },
      { label: 'Segurança patrimonial', category_key: 'servicos' as const },
    ],
  },
  {
    id: 'tecnologia_sw',
    nome: 'Tecnologia e Software',
    defaultCategoryKey: 'tecnologia' as const,
    presets: [
      { label: 'Licenças de software (ERP, CRM, etc.)', category_key: 'tecnologia' as const },
      { label: 'Hospedagem de site/servidores', category_key: 'tecnologia' as const },
      { label: 'E-mail corporativo / Google Workspace / Microsoft 365', category_key: 'tecnologia' as const },
      { label: 'Sistemas de gestão', category_key: 'tecnologia' as const },
      { label: 'Certificado digital', category_key: 'tecnologia' as const },
    ],
  },
  {
    id: 'veiculos_transp',
    nome: 'Veículos e Transporte',
    defaultCategoryKey: 'veiculos' as const,
    presets: [
      { label: 'Combustível', category_key: 'veiculos' as const },
      { label: 'Manutenção de veículos', category_key: 'veiculos' as const },
      { label: 'Seguro de veículos', category_key: 'veiculos' as const },
      { label: 'IPVA', category_key: 'veiculos' as const },
      { label: 'Estacionamento', category_key: 'veiculos' as const },
      { label: 'Uber/99/táxi corporativo', category_key: 'veiculos' as const },
      { label: 'Pedágios', category_key: 'veiculos' as const },
    ],
  },
  {
    id: 'material',
    nome: 'Material e Suprimentos',
    defaultCategoryKey: 'outras' as const,
    presets: [
      { label: 'Material de escritório', category_key: 'outras' as const },
      { label: 'Material de limpeza', category_key: 'outras' as const },
      { label: 'Impressão e cópias', category_key: 'outras' as const },
      { label: 'Café, água e copa', category_key: 'outras' as const },
    ],
  },
  {
    id: 'financeiro',
    nome: 'Financeiro e Bancário',
    defaultCategoryKey: 'outras' as const,
    presets: [
      { label: 'Tarifas bancárias', category_key: 'outras' as const },
      { label: 'Taxas de cartão de crédito/maquininha', category_key: 'outras' as const },
      { label: 'Juros de empréstimos', category_key: 'outras' as const },
      { label: 'Seguros empresariais', category_key: 'outras' as const },
    ],
  },
  {
    id: 'tributos',
    nome: 'Tributos e Taxas',
    defaultCategoryKey: 'outras' as const,
    presets: [
      { label: 'Alvará de funcionamento', category_key: 'outras' as const },
      { label: 'Taxa de licenciamento', category_key: 'outras' as const },
      { label: 'Taxas de conselho de classe (CRC, OAB, CREA, etc.)', category_key: 'outras' as const },
    ],
  },
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

type WizardItem = ExpenseItemAnswer & { _sectionId?: string };

function newItem(): ExpenseItemAnswer {
  return {
    category_key: 'veiculos', label: '', monthly_amount: 0, current_payer: 'pf',
    vinculo_atividade: 'sim', business_use_pct: 100, beneficiario: 'empresa',
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
          <p className="text-sm text-slate-500">Mostra quanto o sócio gasta do bolso e qual a vantagem de a empresa assumir. Não é parecer nem promessa de crédito.</p>
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
  const { clients } = useClients();
  const [ctx, setCtx] = useState({
    client_id: '', title: '', reference_year: new Date().getFullYear(), activity: '',
    tax_regime: 'simples_nacional', ibs_cbs_treatment: 'avaliar_por_fora', objective: '',
  });
  const [items, setItems] = useState<WizardItem[]>([]);
  const [preview, setPreview] = useState<ExpenseMappingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState<Record<string, string>>({});

  const updateItem = (idx: number, patch: Partial<WizardItem>) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const toggleSection = (id: string) =>
    setOpenSections((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const findItemIdx = (label: string, catKey: string) =>
    items.findIndex((it) => it.label === label && it.category_key === catKey);
  const isChecked = (label: string, catKey: string) => findItemIdx(label, catKey) >= 0;
  const togglePreset = (label: string, catKey: string, sectionId: string) => {
    const idx = findItemIdx(label, catKey);
    if (idx >= 0) removeItem(idx);
    else setItems((prev) => [...prev, { ...newItem(), label, category_key: catKey as any, _sectionId: sectionId }]);
  };
  const getAmount = (label: string, catKey: string) => { const idx = findItemIdx(label, catKey); return idx >= 0 ? items[idx].monthly_amount : 0; };
  const setAmount = (label: string, catKey: string, amount: number) => { const idx = findItemIdx(label, catKey); if (idx >= 0) updateItem(idx, { monthly_amount: amount }); };
  const addCustomExpense = (sectionId: string, catKey: string) => {
    const label = (customInput[sectionId] || '').trim();
    if (!label) return;
    setItems((prev) => [...prev, { ...newItem(), label, category_key: catKey as any, _sectionId: sectionId }]);
    setCustomInput((prev) => ({ ...prev, [sectionId]: '' }));
  };
  const customItemsForSection = (sectionId: string) => {
    const cat = PRESET_EXPENSE_CATALOG.find((c) => c.id === sectionId);
    const presetLabels = new Set(cat?.presets.map((p) => p.label) ?? []);
    return items.filter((it) => it._sectionId === sectionId && !presetLabels.has(it.label));
  };
  const monthlyTotal = items.reduce((sum, it) => sum + (Number(it.monthly_amount) || 0), 0);

  const buildInput = () => ({
    context: {
      client_id: ctx.client_id, title: ctx.title || null, reference_year: Number(ctx.reference_year),
      activity: ctx.activity || null, tax_regime: ctx.tax_regime as any, ibs_cbs_treatment: ctx.ibs_cbs_treatment as any,
      objective: ctx.objective || null,
    },
    items: items.filter((i) => i.label.trim()).map(({ _sectionId: _, ...i }) => ({ ...i, monthly_amount: Number(i.monthly_amount) || 0, business_use_pct: Number(i.business_use_pct) || 0 })),
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
        {['Contexto', 'Despesas', 'Perguntas', 'Diagnóstico'].map((s, i) => (
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
            Migrar despesa para a PJ não reduz a alíquota do Simples nem do Presumido. Crédito de CBS/IBS só existe com NF no CNPJ e apuração no regime regular (ou Simples por fora).
          </div>
          <div className="mt-4 flex justify-end"><Button size="sm" onClick={() => setStep(2)}>Continuar</Button></div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Despesas mantidas na pessoa física">
          <p className="text-sm text-slate-500 mb-4">Marque as despesas que o cliente paga como pessoa física e informe o valor mensal aproximado.</p>
          <div className="space-y-2">
            {PRESET_EXPENSE_CATALOG.map((section) => {
              const isOpen = openSections.has(section.id);
              const presetChecked = section.presets.filter((p) => isChecked(p.label, p.category_key));
              const customs = customItemsForSection(section.id);
              const totalSelected = presetChecked.length + customs.length;
              const sectionSum = [
                ...presetChecked.map((p) => getAmount(p.label, p.category_key)),
                ...customs.map((c) => Number(c.monthly_amount) || 0),
              ].reduce((a, b) => a + b, 0);

              return (
                <div key={section.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <button type="button" onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <svg className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      <span className="font-semibold text-sm text-slate-800">{section.nome}</span>
                      {totalSelected > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{totalSelected}</span>}
                    </div>
                    {sectionSum > 0 && <span className="text-xs font-semibold text-emerald-600">{brl(sectionSum)}/mês</span>}
                  </button>
                  {isOpen && (
                    <div className="px-4 py-2 space-y-0.5 border-t border-slate-100">
                      {section.presets.map((preset) => {
                        const checked = isChecked(preset.label, preset.category_key);
                        return (
                          <div key={preset.label} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${checked ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}>
                            <input type="checkbox" checked={checked} onChange={() => togglePreset(preset.label, preset.category_key, section.id)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 shrink-0" />
                            <span className={`flex-1 text-sm ${checked ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{preset.label}</span>
                            {checked && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400">R$</span>
                                <input type="number" min={0} placeholder="0,00" value={getAmount(preset.label, preset.category_key) || ''} onChange={(e) => setAmount(preset.label, preset.category_key, Number(e.target.value))} className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                <span className="text-xs text-slate-400">/mês</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {customs.map((cItem) => {
                        const idx = items.indexOf(cItem);
                        return (
                          <div key={`c-${idx}`} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-indigo-50/70">
                            <span className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-sm text-slate-900 font-medium">{cItem.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">R$</span>
                              <input type="number" min={0} placeholder="0,00" value={cItem.monthly_amount || ''} onChange={(e) => updateItem(idx, { monthly_amount: Number(e.target.value) })} className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                              <span className="text-xs text-slate-400">/mês</span>
                            </div>
                            <button type="button" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors text-sm">✕</button>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-2 pt-2 pb-1 pl-7">
                        <input placeholder="Adicionar item personalizado…" value={customInput[section.id] || ''} onChange={(e) => setCustomInput((prev) => ({ ...prev, [section.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') addCustomExpense(section.id, section.defaultCategoryKey); }} className="flex-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        <button type="button" onClick={() => addCustomExpense(section.id, section.defaultCategoryKey)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">+ Adicionar</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-700">Total mensal estimado</span>
              <span className="text-xs text-slate-400 ml-2">({items.filter((i) => i.label.trim()).length} despesa{items.filter((i) => i.label.trim()).length !== 1 ? 's' : ''})</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">{brl(monthlyTotal)}</div>
              <div className="text-xs text-slate-400">{brl(monthlyTotal * 12)}/ano</div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(1)}>← Contexto</Button>
            <Button size="sm" onClick={() => { if (items.filter((i) => i.label.trim()).length === 0) { onError('Selecione ao menos uma despesa'); return; } setStep(3); }}>Continuar →</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card title="Qualificação das despesas">
          <p className="text-sm text-slate-500 mb-3">Itens do checklist já vêm como uso empresarial 100%. Ajuste só o que for misto, pessoal ou sem vínculo com a atividade.</p>
          <div className="space-y-3">
            {items.filter((i) => i.label.trim()).map((it, idx) => {
              const realIdx = items.indexOf(it);
              return (
                <div key={realIdx} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2">{it.label || `Despesa ${idx + 1}`} <span className="font-normal text-slate-400">({CATEGORIES.find((c) => c.key === it.category_key)?.nome})</span></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="text-xs text-slate-500">Vínculo com atividade
                      <select value={it.vinculo_atividade} onChange={(e) => updateItem(realIdx, { vinculo_atividade: e.target.value as any })} className={inputCls}><option value="sim">Sim</option><option value="parcial">Parcial</option><option value="nao">Não</option></select></label>
                    <label className="text-xs text-slate-500">Uso empresarial %
                      <input type="number" min={0} max={100} value={it.business_use_pct || ''} onChange={(e) => updateItem(realIdx, { business_use_pct: Number(e.target.value) })} className={inputCls} /></label>
                    <label className="text-xs text-slate-500">Beneficiário
                      <select value={it.beneficiario} onChange={(e) => updateItem(realIdx, { beneficiario: e.target.value as any })} className={inputCls}><option value="empresa">Empresa</option><option value="empregado">Empregado</option><option value="socio">Sócio</option><option value="familiar">Familiar</option><option value="misto">Misto</option></select></label>
                    <label className="text-xs text-slate-500">Doc. em nome da PJ
                      <select value={it.documento_pj} onChange={(e) => updateItem(realIdx, { documento_pj: e.target.value as any })} className={inputCls}><option value="sim">Sim</option><option value="parcial">Parcial</option><option value="nao">Não</option></select></label>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={it.possui_evidencia} onChange={(e) => updateItem(realIdx, { possui_evidencia: e.target.checked })} /> Possui contrato/evidência</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={it.is_tributo_ou_principal} onChange={(e) => updateItem(realIdx, { is_tributo_ou_principal: e.target.checked })} /> É tributo/parcela de principal (ex.: IPVA)</label>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between">
            <Button size="sm" variant="secondary" onClick={() => setStep(2)}>← Despesas</Button>
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

// ---------------- Tax savings helpers ----------------
/** IRPF evitado se o sócio precisasse retirar o valor como renda tributada para pagar na PF. */
const IRPF_RETIRADA_RATE = 0.275;

function getDeductionRate(regime: string): { rate: number; label: string } {
  if (regime === 'lucro_real') {
    return { rate: 0.34, label: 'IRPJ + CSLL sobre o lucro (despesa reduz a base)' };
  }
  return { rate: 0, label: '' };
}

/** CBS teste 2026 (0,9%) e CBS de referência no regime pleno (~8,8%). Não é alíquota da empresa. */
const CBS_TESTE_2026 = 0.009;
const CBS_PLENA_REF = 0.088;

function creditRegimeEnabled(regime: string, treatment: string): boolean {
  if (treatment === 'nao_avaliar' || treatment === 'simples_por_dentro') return false;
  if (regime === 'mei') return false;
  if (regime === 'simples_nacional' && treatment !== 'regime_regular' && treatment !== 'avaliar_por_fora') return false;
  return true;
}

function getRegimeLabel(regime: string): string {
  const map: Record<string, string> = {
    simples_nacional: 'Simples Nacional',
    lucro_presumido: 'Lucro Presumido',
    lucro_real: 'Lucro Real',
    mei: 'MEI',
    outro: 'Outro',
  };
  return map[regime] ?? regime;
}

// ---------------- Result view (shared) ----------------
function ResultView({ result }: { result: ExpenseMappingResult }) {
  const t = result.totals;
  const { rate: deductionRate, label: deductionLabel } = getDeductionRate(result.tax_regime);
  const baseMigravel = t.potencial_anual + t.condicionado_anual;
  const irpfEvitado = Math.round(baseMigravel * IRPF_RETIRADA_RATE * 100) / 100;
  const economiaDedutivel = Math.round(baseMigravel * deductionRate * 100) / 100;
  const vantagemTotal = irpfEvitado + economiaDedutivel;
  const rendaBrutaEquivalente = baseMigravel > 0
    ? Math.round((baseMigravel / (1 - IRPF_RETIRADA_RATE)) * 100) / 100
    : 0;

  const migrateItems = result.items.filter((i) => i.classification === 'potencial');
  const organizeItems = result.items.filter((i) => i.classification === 'condicionado' || i.classification === 'rateio');
  const avoidItems = result.items.filter((i) => i.classification === 'nao_recomendado');
  const cbsEnabled = creditRegimeEnabled(result.tax_regime, result.ibs_cbs_treatment);
  const baseCreditoCbs = result.items
    .filter((i) => i.credit_lens === 'potential' || i.credit_lens === 'conditioned')
    .reduce((s, i) => s + i.annual_amount, 0);
  const cbsTeste = Math.round(baseCreditoCbs * CBS_TESTE_2026 * 100) / 100;
  const cbsPlena = Math.round(baseCreditoCbs * CBS_PLENA_REF * 100) / 100;
  const isLucroReal = result.tax_regime === 'lucro_real';
  const isSimples = result.tax_regime === 'simples_nacional' || result.tax_regime === 'mei';

  return (
    <div className="space-y-5">
      <Card title="A vantagem fiscal, sem rodeio">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">A alíquota cai?</p>
            <p className="mt-1 text-lg font-bold text-slate-900">Não</p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {isSimples
                ? 'No Simples/MEI o DAS continua sobre o faturamento. Colocar despesa na PJ não reduz a alíquota.'
                : isLucroReal
                  ? 'A alíquota de IRPJ/CSLL não muda. O que muda é a base: a despesa operacional reduz o lucro tributável.'
                  : 'No Lucro Presumido a alíquota também não cai. A base é presumida sobre a receita — despesa não reduz IRPJ/CSLL.'}
            </p>
          </div>
          <div className={`rounded-xl border p-4 ${cbsEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="text-xs font-semibold uppercase text-slate-500">Gera crédito de CBS?</p>
            <p className={`mt-1 text-lg font-bold ${cbsEnabled ? 'text-emerald-800' : 'text-amber-800'}`}>
              {cbsEnabled ? 'Só com NF no CNPJ' : 'Não neste regime'}
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {cbsEnabled
                ? `Pago na PF = zero crédito. Pago na PJ com documento eletrônico em nome da empresa, a base de ${brl(baseCreditoCbs)}/ano pode gerar cerca de ${brl(cbsTeste)} de CBS em 2026 (0,9%) e ~${brl(cbsPlena)} no regime pleno (~8,8%). Não é crédito automático.`
                : isSimples
                  ? 'Simples “por dentro” e MEI não apropriam crédito de CBS/IBS. Só entra crédito se a PJ apurar o IVA no regime regular (por fora).'
                  : 'A avaliação de crédito está desligada neste diagnóstico. Para estimar CBS, escolha “avaliar por fora” ou regime regular no contexto.'}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Então qual é a vantagem?</p>
            <p className="mt-1 text-lg font-bold text-emerald-800">
              {isLucroReal ? 'Caixa + base menor + CBS' : cbsEnabled ? 'Caixa + crédito de CBS' : 'Caixa e organização'}
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              A PJ passa a pagar o custo da atividade. O sócio deixa de usar renda pessoal já tributada
              {isLucroReal ? ', o lucro tributável cai' : ''}
              {cbsEnabled ? ' e a NF no CNPJ abre a porta do crédito de CBS/IBS.' : '.'}
            </p>
          </div>
        </div>
      </Card>

      <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
        <div className="text-center mb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Números deste diagnóstico</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">
            {brl(baseMigravel)}/ano hoje saem do bolso do sócio
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Regime {getRegimeLabel(result.tax_regime)} · {result.reference_year}
          </p>
        </div>

        {baseMigravel > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <div className="text-center p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">IRPF evitado na retirada</div>
                <div className="text-xl font-bold text-slate-800">{brl(irpfEvitado)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">se o sócio retirasse renda tributada (27,5%) só para pagar a despesa</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
                  {isLucroReal ? 'IRPJ/CSLL a menos' : 'Alíquota da PJ'}
                </div>
                <div className="text-xl font-bold text-slate-800">
                  {isLucroReal ? brl(economiaDedutivel) : 'não muda'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {isLucroReal ? deductionLabel : 'despesa não reduz DAS nem base presumida'}
                </div>
              </div>
              <div className={`text-center p-3 rounded-xl bg-white border ${cbsEnabled ? 'border-emerald-200' : 'border-slate-200'}`}>
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Crédito CBS (estimativa)</div>
                <div className={`text-xl font-bold ${cbsEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {cbsEnabled ? brl(cbsPlena) : '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {cbsEnabled
                    ? `${brl(cbsTeste)} em 2026 (0,9%) · ~${brl(cbsPlena)} no regime pleno (8,8%)`
                    : 'sem NF no CNPJ e regime regular, crédito = zero'}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600 text-center mt-4 leading-relaxed">
              Para pagar {brl(baseMigravel)}/ano na PF, o sócio precisa de cerca de{' '}
              <span className="font-semibold text-slate-800">{brl(rendaBrutaEquivalente)}</span> de renda
              tributada. Na PJ a empresa paga o valor — isso não é desconto de alíquota
              {cbsEnabled ? '; o ganho fiscal da reforma é o crédito de CBS/IBS sobre a NF da empresa.' : '.'}
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 text-center">
            Nenhuma despesa com vínculo empresarial suficiente para estimar vantagem.
            Volte em Qualificação e marque o que de fato é custo da atividade.
          </div>
        )}
      </div>

      {/* Priority action list */}
      <Card title="Plano de ação por prioridade">
        {migrateItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">🟢</span>
              <h4 className="text-sm font-bold text-emerald-800">Migrar Imediatamente</h4>
              <span className="text-xs text-slate-400">— Documentação adequada, 100% uso empresarial</span>
            </div>
            <div className="rounded-lg border border-emerald-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {migrateItems.map((it, i) => (
                    <tr key={i} className={i > 0 ? 'border-t border-emerald-50' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-800">{it.label}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">{brl(it.annual_amount)}/ano</td>
                      <td className="py-2 px-3 text-right text-xs text-slate-400">{it.business_use_pct}% empresarial</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-emerald-50 px-3 py-2 text-right text-xs font-semibold text-emerald-700">
                Subtotal: {brl(migrateItems.reduce((s, it) => s + it.annual_amount, 0))}/ano · Vantagem: {brl(migrateItems.reduce((s, it) => s + it.annual_amount, 0) * (IRPF_RETIRADA_RATE + deductionRate))}/ano
              </div>
            </div>
          </div>
        )}
        {organizeItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs">🟡</span>
              <h4 className="text-sm font-bold text-amber-800">Organizar Documentação</h4>
              <span className="text-xs text-slate-400">— Ajustar contratos, obter NFs em nome da PJ</span>
            </div>
            <div className="rounded-lg border border-amber-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {organizeItems.map((it, i) => (
                    <tr key={i} className={i > 0 ? 'border-t border-amber-50' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-800">{it.label}</td>
                      <td className="py-2 px-3 text-right text-amber-700 font-semibold">{brl(it.annual_amount)}/ano</td>
                      <td className="py-2 px-3 text-right text-xs text-slate-500 max-w-[200px] truncate">{it.pendencias[0] ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-amber-50 px-3 py-2 text-right text-xs font-semibold text-amber-700">
                Subtotal: {brl(organizeItems.reduce((s, it) => s + it.annual_amount, 0))}/ano · Vantagem após regularizar: {brl(organizeItems.reduce((s, it) => s + it.annual_amount, 0) * (IRPF_RETIRADA_RATE + deductionRate))}/ano
              </div>
            </div>
          </div>
        )}
        {avoidItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs">🔴</span>
              <h4 className="text-sm font-bold text-red-800">Não Recomendado</h4>
              <span className="text-xs text-slate-400">— Despesas pessoais que não devem ser misturadas</span>
            </div>
            <div className="rounded-lg border border-red-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {avoidItems.map((it, i) => (
                    <tr key={i} className={i > 0 ? 'border-t border-red-50' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-800">{it.label}</td>
                      <td className="py-2 px-3 text-right text-red-600 font-semibold">{brl(it.annual_amount)}/ano</td>
                      <td className="py-2 px-3 text-right text-xs text-slate-500 max-w-[200px] truncate">{it.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {result.alertas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ul className="list-disc pl-5 space-y-1">{result.alertas.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}

      <Card title="Detalhamento completo">
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

      {/* Next steps card */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h4 className="text-sm font-bold text-indigo-900 mb-3">Próximos passos recomendados</h4>
        <ol className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
            <div>
              <p className="text-sm font-medium text-slate-800">Transfira os contratos marcados em verde para o CNPJ</p>
              <p className="text-xs text-slate-500">Altere a titularidade de serviços como internet, aluguel e softwares.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">2</span>
            <div>
              <p className="text-sm font-medium text-slate-800">Solicite notas fiscais em nome da empresa</p>
              <p className="text-xs text-slate-500">Sem NF no CNPJ não existe crédito de CBS/IBS. Pago no CPF do sócio = crédito zero.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold">3</span>
            <div>
              <p className="text-sm font-medium text-slate-800">Consulte seu contador para ajustes no regime tributário</p>
              <p className="text-xs text-slate-500">Valide se o regime atual ({getRegimeLabel(result.tax_regime)}) é o mais vantajoso considerando as despesas migradas.</p>
            </div>
          </li>
        </ol>
        {baseMigravel > 0 && (
          <div className="mt-4 pt-3 border-t border-indigo-200 text-center">
            <p className="text-xs text-indigo-700">
              {brl(baseMigravel)}/ano podem sair do bolso do sócio e entrar no caixa da PJ · vantagem estimada de {brl(vantagemTotal)}/ano
            </p>
          </div>
        )}
      </div>

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
