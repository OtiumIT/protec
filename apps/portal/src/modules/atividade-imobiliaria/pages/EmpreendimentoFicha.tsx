import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { atividadeImobiliariaService as svc } from '../services/atividade-imobiliaria.service';
import type {
  RealEstateDevelopment, RealEstateUnit,
  DevelopmentIntegrity, CreateUnitInput, SituacaoUnidade, NaturezaDominio,
} from '@shared/core';

const NATUREZA_LABELS: Record<NaturezaDominio, string> = {
  '01': 'Consórcio',
  '02': 'SCP',
  '03': 'Incorporação em condomínio',
  '04': 'Outras',
};

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const TABS = [
  { key: 'dados', label: 'Dados' },
  { key: 'unidades', label: 'Unidades' },
  { key: 'integridade', label: 'Integridade' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function emptyUnit(): CreateUnitInput {
  return { codigo: '', descricao: '', matricula: '', tipo_unidade: '', area_m2: null, custo: null, valor_atribuido: null, situacao: 'disponivel' };
}

export function EmpreendimentoFicha() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError, ToastContainer } = useToast();

  const [dev, setDev] = useState<RealEstateDevelopment | null>(null);
  const [units, setUnits] = useState<RealEstateUnit[]>([]);
  const [integrity, setIntegrity] = useState<DevelopmentIntegrity | null>(null);
  const [tab, setTab] = useState<TabKey>('dados');
  const [unitForm, setUnitForm] = useState<CreateUnitInput>(emptyUnit());
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<RealEstateUnit | null>(null);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<RealEstateUnit | null>(null);

  const loadDev = useCallback(() => {
    if (!id) return;
    svc.getDevelopment(id).then(setDev).catch(() => showError('Empreendimento não encontrado'));
  }, [id]);

  const loadUnits = useCallback(() => {
    if (!id) return;
    svc.listUnits(id).then(setUnits).catch(() => setUnits([]));
  }, [id]);

  const loadIntegrity = useCallback(() => {
    if (!id) return;
    svc.getIntegrity(id).then(setIntegrity).catch(() => setIntegrity(null));
  }, [id]);

  useEffect(() => { loadDev(); loadUnits(); loadIntegrity(); }, [loadDev, loadUnits, loadIntegrity]);

  const openNewUnit = () => { setEditingUnit(null); setUnitForm(emptyUnit()); setShowUnitForm(true); };
  const openEditUnit = (u: RealEstateUnit) => {
    setEditingUnit(u);
    setUnitForm({
      codigo: u.codigo, descricao: u.descricao, matricula: u.matricula ?? '',
      tipo_unidade: u.tipo_unidade ?? '', area_m2: u.area_m2, custo: u.custo,
      valor_atribuido: u.valor_atribuido, situacao: u.situacao,
    });
    setShowUnitForm(true);
  };

  const saveUnit = async () => {
    if (!unitForm.codigo.trim() || !unitForm.descricao.trim()) return showError('Código e descrição obrigatórios');
    try {
      const payload = {
        ...unitForm,
        area_m2: unitForm.area_m2 != null ? Number(unitForm.area_m2) : null,
        custo: unitForm.custo != null ? Number(unitForm.custo) : null,
        valor_atribuido: unitForm.valor_atribuido != null ? Number(unitForm.valor_atribuido) : null,
        matricula: unitForm.matricula || null,
        tipo_unidade: unitForm.tipo_unidade || null,
      };
      if (editingUnit) {
        await svc.updateUnit(editingUnit.id, payload);
        success('Unidade atualizada');
      } else {
        await svc.createUnit(id!, payload as CreateUnitInput);
        success('Unidade criada');
      }
      setShowUnitForm(false);
      loadUnits();
      loadIntegrity();
    } catch (e) { showError(e instanceof Error ? e.message : 'Erro ao salvar unidade'); }
  };

  const doDeleteUnit = async () => {
    if (!confirmDeleteUnit) return;
    try {
      await svc.deleteUnit(confirmDeleteUnit.id);
      success('Unidade excluída');
      setConfirmDeleteUnit(null);
      loadUnits();
      loadIntegrity();
    } catch (e) { showError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  if (!dev) {
    return <div className="text-center py-12 text-slate-400">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <ToastContainer />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/atividade-imobiliaria/empreendimentos')} className="text-indigo-700 text-xs font-semibold mb-1 hover:underline">&larr; Voltar</button>
          <h1 className="text-xl font-bold text-slate-900">{dev.nome}</h1>
          <p className="text-xs text-slate-500">Código: {dev.codigo} {dev.natureza ? `| ${NATUREZA_LABELS[dev.natureza as NaturezaDominio]}` : ''}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${dev.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : dev.status === 'encerrado' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'}`}>
          {dev.status}
        </span>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold rounded-t-lg -mb-px border-b-2 whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >{t.label}{t.key === 'integridade' && integrity && !integrity.area_ok ? ' !' : ''}</button>
        ))}
      </nav>

      {/* ---- Dados ---- */}
      {tab === 'dados' && (
        <Card title="Dados do empreendimento">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Dl label="Tipo" value={dev.tipo} />
            <Dl label="Natureza" value={dev.natureza ? NATUREZA_LABELS[dev.natureza as NaturezaDominio] : null} />
            <Dl label="Data início" value={dev.data_inicio ? String(dev.data_inicio).slice(0, 10) : null} />
            <Dl label="CNO" value={dev.cno} />
            <Dl label="Data CNO" value={dev.cno_data ? String(dev.cno_data).slice(0, 10) : null} />
            <Dl label="Métrica de área" value={dev.metrica_area} />
            <Dl label="Área total" value={dev.area_total_m2 != null ? `${Number(dev.area_total_m2).toLocaleString('pt-BR')} m²` : null} />
            <Dl label="Área com crédito" value={dev.area_credito_m2 != null ? `${Number(dev.area_credito_m2).toLocaleString('pt-BR')} m²` : null} />
            <Dl label="Endereço" value={[dev.logradouro, dev.numero, dev.complemento, dev.bairro, dev.cidade, dev.uf].filter(Boolean).join(', ') || null} />
            <Dl label="Processo" value={dev.processo_numero} />
            <Dl label="Descrição" value={dev.descricao} />
          </div>
        </Card>
      )}

      {/* ---- Unidades ---- */}
      {tab === 'unidades' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{units.length} unidade(s)</p>
            <Button size="sm" onClick={openNewUnit}>+ Nova unidade</Button>
          </div>

          {showUnitForm && (
            <Card title={editingUnit ? 'Editar unidade' : 'Nova unidade'}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Código *">
                  <input value={unitForm.codigo} onChange={(e) => setUnitForm({ ...unitForm, codigo: e.target.value })} className={inputCls} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Descrição *">
                    <input value={unitForm.descricao} onChange={(e) => setUnitForm({ ...unitForm, descricao: e.target.value })} className={inputCls} />
                  </Field>
                </div>
                <Field label="Tipo unidade">
                  <input value={unitForm.tipo_unidade ?? ''} onChange={(e) => setUnitForm({ ...unitForm, tipo_unidade: e.target.value })} className={inputCls} placeholder="Apto, vaga, lote..." />
                </Field>
                <Field label="Matrícula">
                  <input value={unitForm.matricula ?? ''} onChange={(e) => setUnitForm({ ...unitForm, matricula: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Área (m²)">
                  <input type="number" step="0.01" value={unitForm.area_m2 ?? ''} onChange={(e) => setUnitForm({ ...unitForm, area_m2: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                </Field>
                <Field label="Custo (R$)">
                  <input type="number" step="0.01" value={unitForm.custo ?? ''} onChange={(e) => setUnitForm({ ...unitForm, custo: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                </Field>
                <Field label="Valor atribuído (R$)">
                  <input type="number" step="0.01" value={unitForm.valor_atribuido ?? ''} onChange={(e) => setUnitForm({ ...unitForm, valor_atribuido: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
                </Field>
                <Field label="Situação">
                  <select value={unitForm.situacao} onChange={(e) => setUnitForm({ ...unitForm, situacao: e.target.value as SituacaoUnidade })} className={inputCls}>
                    <option value="disponivel">Disponível</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                    <option value="permuta">Permuta</option>
                  </select>
                </Field>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowUnitForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={saveUnit}>{editingUnit ? 'Salvar' : 'Criar'}</Button>
              </div>
            </Card>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase">
                    <th className="py-2">Código</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Matrícula</th>
                    <th className="text-right">Área (m²)</th>
                    <th className="text-right">Valor</th>
                    <th>Situação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="py-2 font-mono text-xs">{u.codigo}</td>
                      <td className="font-medium">{u.descricao}</td>
                      <td className="text-slate-500">{u.tipo_unidade ?? '—'}</td>
                      <td className="text-slate-500 text-xs">{u.matricula ?? '—'}</td>
                      <td className="text-right">{u.area_m2 != null ? Number(u.area_m2).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}</td>
                      <td className="text-right">{u.valor_atribuido != null ? brl(Number(u.valor_atribuido)) : '—'}</td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${u.situacao === 'vendida' ? 'bg-emerald-100 text-emerald-800' : u.situacao === 'reservada' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {u.situacao}
                        </span>
                      </td>
                      <td className="text-right">
                        <button type="button" onClick={() => openEditUnit(u)} className="text-indigo-700 text-xs font-semibold mr-2">Editar</button>
                        <button type="button" onClick={() => setConfirmDeleteUnit(u)} className="text-red-600 text-xs">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {units.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400">Nenhuma unidade cadastrada.</td></tr>
                  )}
                </tbody>
                {units.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold text-sm">
                      <td className="py-2" colSpan={4}>TOTAL</td>
                      <td className="text-right">{units.reduce((s, u) => s + (Number(u.area_m2) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</td>
                      <td className="text-right">{brl(units.reduce((s, u) => s + (Number(u.valor_atribuido) || 0), 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ---- Integridade ---- */}
      {tab === 'integridade' && integrity && (
        <Card title="Fechamentos de integridade (Domínio)">
          <div className="space-y-4">
            <IntegrityRow
              label="Área total do empreendimento"
              expected={integrity.area_total != null ? `${integrity.area_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : 'Não informada'}
              actual={`${integrity.area_sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²`}
              diff={integrity.area_total != null ? `${integrity.area_diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²` : '—'}
              ok={integrity.area_ok}
            />
            <IntegrityRow
              label="Quantidade de unidades"
              expected="—"
              actual={String(integrity.unit_count)}
              diff="—"
              ok={integrity.unit_count > 0}
            />
            <IntegrityRow
              label="Valor total das unidades"
              expected="—"
              actual={brl(integrity.valor_total)}
              diff="—"
              ok={true}
            />

            {!integrity.area_ok && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                A soma das áreas das unidades ({integrity.area_sum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²) difere da área total do empreendimento ({integrity.area_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²).
                Diferença: <strong>{integrity.area_diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong>.
                O empreendimento não pode ser ativado até a diferença ser 0,00 m².
              </div>
            )}

            {integrity.area_ok && integrity.area_total != null && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Fechamento de áreas OK. O empreendimento pode ser ativado.
              </div>
            )}
          </div>
        </Card>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteUnit}
        onClose={() => setConfirmDeleteUnit(null)}
        onConfirm={doDeleteUnit}
        title="Excluir unidade"
        message={`Tem certeza que deseja excluir a unidade "${confirmDeleteUnit?.codigo} — ${confirmDeleteUnit?.descricao}"?`}
      />
    </div>
  );
}

function Dl({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || '—'}</dd>
    </div>
  );
}

function IntegrityRow({ label, expected, actual, diff, ok }: { label: string; expected: string; actual: string; diff: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 flex flex-wrap justify-between items-center gap-2 ${ok ? 'border-slate-200' : 'border-red-300 bg-red-50/50'}`}>
      <span className="font-medium text-sm text-slate-800">{label}</span>
      <div className="flex gap-6 text-sm">
        <span className="text-slate-500">Esperado: <strong>{expected}</strong></span>
        <span className="text-slate-500">Realizado: <strong>{actual}</strong></span>
        <span className={ok ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
          {ok ? 'OK' : `Diferença: ${diff}`}
        </span>
      </div>
    </div>
  );
}
