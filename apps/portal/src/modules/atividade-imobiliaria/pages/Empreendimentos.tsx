import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useToast } from '../../../shared/components/ui/Toast';
import { atividadeImobiliariaService as svc } from '../services/atividade-imobiliaria.service';
import type { RealEstateDevelopment, CreateDevelopmentInput, DevelopmentStatus } from '@shared/core';

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  ativo: 'bg-emerald-100 text-emerald-800',
  encerrado: 'bg-slate-100 text-slate-500',
};

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function emptyForm(): CreateDevelopmentInput {
  return {
    codigo: '', nome: '', tipo: '', natureza: null, descricao: '',
    data_inicio: null, cno: '', cno_data: null,
    area_total_m2: null, area_credito_m2: null, metrica_area: null,
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    processo_numero: '', processo_obs: '',
    status: 'rascunho',
  };
}

export function Empreendimentos() {
  const { success, error: showError, ToastContainer } = useToast();
  const navigate = useNavigate();
  const [developments, setDevelopments] = useState<RealEstateDevelopment[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DevelopmentStatus | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RealEstateDevelopment | null>(null);
  const [form, setForm] = useState<CreateDevelopmentInput>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<RealEstateDevelopment | null>(null);

  const reload = useCallback(() => {
    svc.listDevelopments({
      search: search || undefined,
      status: (statusFilter as DevelopmentStatus) || undefined,
      limit: 100,
    })
      .then((r) => { setDevelopments(r.developments); setTotal(r.total); })
      .catch(() => showError('Falha ao listar empreendimentos'));
  }, [search, statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  const openNew = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (d: RealEstateDevelopment) => {
    setEditing(d);
    setForm({
      codigo: d.codigo, nome: d.nome, tipo: d.tipo ?? '', natureza: d.natureza ?? null,
      descricao: d.descricao ?? '', data_inicio: d.data_inicio ? String(d.data_inicio).slice(0, 10) : null,
      cno: d.cno ?? '', cno_data: d.cno_data ? String(d.cno_data).slice(0, 10) : null,
      area_total_m2: d.area_total_m2, area_credito_m2: d.area_credito_m2, metrica_area: d.metrica_area,
      cep: d.cep ?? '', logradouro: d.logradouro ?? '', numero: d.numero ?? '',
      complemento: d.complemento ?? '', bairro: d.bairro ?? '', cidade: d.cidade ?? '', uf: d.uf ?? '',
      processo_numero: d.processo_numero ?? '', processo_obs: d.processo_obs ?? '',
      status: d.status,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) return showError('Código e nome são obrigatórios');
    try {
      const payload = {
        ...form,
        area_total_m2: form.area_total_m2 != null ? Number(form.area_total_m2) : null,
        area_credito_m2: form.area_credito_m2 != null ? Number(form.area_credito_m2) : null,
        tipo: form.tipo || null,
        descricao: form.descricao || null,
        cno: form.cno || null,
        data_inicio: form.data_inicio || null,
        cno_data: form.cno_data || null,
        cep: form.cep || null, logradouro: form.logradouro || null, numero: form.numero || null,
        complemento: form.complemento || null, bairro: form.bairro || null,
        cidade: form.cidade || null, uf: form.uf || null,
        processo_numero: form.processo_numero || null, processo_obs: form.processo_obs || null,
      };
      if (editing) {
        await svc.updateDevelopment(editing.id, payload);
        success('Empreendimento atualizado');
      } else {
        await svc.createDevelopment(payload as CreateDevelopmentInput);
        success('Empreendimento criado');
      }
      setModalOpen(false);
      reload();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await svc.deleteDevelopment(confirmDelete.id);
      success('Empreendimento excluído');
      setConfirmDelete(null);
      reload();
    } catch (e) { showError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return developments;
    const q = search.trim().toLowerCase();
    return developments.filter(
      (d) => d.nome.toLowerCase().includes(q) || d.codigo.toLowerCase().includes(q) || d.cidade?.toLowerCase().includes(q),
    );
  }, [developments, search]);

  return (
    <div className="space-y-6">
      <ToastContainer />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Empreendimentos Imobiliários</h1>
          <p className="text-xs text-slate-500">Cadastro de empreendimentos e unidades para venda/incorporação.</p>
        </div>
        <Button size="sm" onClick={openNew}>+ Novo empreendimento</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DevelopmentStatus | '')} className={`${inputCls} w-40`}>
          <option value="">Todos</option>
          <option value="rascunho">Rascunho</option>
          <option value="ativo">Ativo</option>
          <option value="encerrado">Encerrado</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2">Código</th>
                <th>Nome</th>
                <th>Cidade/UF</th>
                <th>Área total</th>
                <th>Unidades</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => navigate(`/atividade-imobiliaria/empreendimentos/${d.id}`)}>
                  <td className="py-2.5 font-mono text-xs">{d.codigo}</td>
                  <td className="font-medium">{d.nome}</td>
                  <td className="text-slate-500">{d.cidade ? `${d.cidade}${d.uf ? `/${d.uf}` : ''}` : '—'}</td>
                  <td>{d.area_total_m2 != null ? `${Number(d.area_total_m2).toLocaleString('pt-BR')} m²` : '—'}</td>
                  <td className="text-center">{d.unit_count ?? 0}</td>
                  <td>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[d.status] ?? ''}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="text-indigo-700 text-xs font-semibold mr-2">Editar</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDelete(d); }} className="text-red-600 text-xs">Excluir</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Nenhum empreendimento cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {total > 0 && <p className="mt-3 text-xs text-slate-400 text-right">{total} empreendimento(s)</p>}
      </Card>

      {/* Modal criar/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar empreendimento' : 'Novo empreendimento'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Código *">
              <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className={inputCls} placeholder="Ex: EMP001" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Nome *">
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Tipo">
              <input value={form.tipo ?? ''} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls} placeholder="Residencial, comercial..." />
            </Field>
            <Field label="Natureza Domínio">
              <select value={form.natureza ?? ''} onChange={(e) => setForm({ ...form, natureza: (e.target.value || null) as any })} className={inputCls}>
                <option value="">—</option>
                <option value="01">01 — Consórcio</option>
                <option value="02">02 — SCP</option>
                <option value="03">03 — Incorporação em condomínio</option>
                <option value="04">04 — Outras</option>
              </select>
            </Field>
            <Field label="Data início">
              <input type="date" value={form.data_inicio ?? ''} onChange={(e) => setForm({ ...form, data_inicio: e.target.value || null })} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="CNO">
              <input value={form.cno ?? ''} onChange={(e) => setForm({ ...form, cno: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Data CNO">
              <input type="date" value={form.cno_data ?? ''} onChange={(e) => setForm({ ...form, cno_data: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DevelopmentStatus })} className={inputCls}>
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Área total (m²)">
              <input type="number" step="0.01" value={form.area_total_m2 ?? ''} onChange={(e) => setForm({ ...form, area_total_m2: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </Field>
            <Field label="Área com crédito (m²)">
              <input type="number" step="0.01" value={form.area_credito_m2 ?? ''} onChange={(e) => setForm({ ...form, area_credito_m2: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </Field>
            <Field label="Métrica de área">
              <select value={form.metrica_area ?? ''} onChange={(e) => setForm({ ...form, metrica_area: (e.target.value || null) as any })} className={inputCls}>
                <option value="">—</option>
                <option value="area_real_total">Área real total</option>
                <option value="area_privativa">Área privativa</option>
                <option value="area_construida">Área construída</option>
                <option value="area_terreno">Área terreno</option>
              </select>
            </Field>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Endereço</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="CEP">
                <input value={form.cep ?? ''} onChange={(e) => setForm({ ...form, cep: e.target.value })} className={inputCls} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Logradouro">
                  <input value={form.logradouro ?? ''} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Número">
                <input value={form.numero ?? ''} onChange={(e) => setForm({ ...form, numero: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Complemento">
                <input value={form.complemento ?? ''} onChange={(e) => setForm({ ...form, complemento: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Bairro">
                <input value={form.bairro ?? ''} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Cidade">
                <input value={form.cidade ?? ''} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={inputCls} />
              </Field>
              <Field label="UF">
                <input value={form.uf ?? ''} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} className={inputCls} />
              </Field>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Processo</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Número do processo">
                <input value={form.processo_numero ?? ''} onChange={(e) => setForm({ ...form, processo_numero: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Observação">
                <input value={form.processo_obs ?? ''} onChange={(e) => setForm({ ...form, processo_obs: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </div>

          <Field label="Descrição">
            <textarea value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={`${inputCls} min-h-[60px]`} rows={2} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={save}>{editing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Excluir empreendimento"
        message={`Tem certeza que deseja excluir "${confirmDelete?.nome}"? Todas as unidades vinculadas serão removidas.`}
      />
    </div>
  );
}
