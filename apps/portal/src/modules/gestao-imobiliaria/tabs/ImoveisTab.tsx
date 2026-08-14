import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Modal } from '../../../shared/components/ui/Modal';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { ClientFormModal } from '../../clients/components/ClientFormModal';
import type { ClientWithCreatedAt } from '../../clients/services/client.service';
import { propertyService, type PropertyWithClient } from '../../properties/services/property.service';
import type { IrpfPropertyCandidate, IrpfPropertyImportResult } from '../../properties/services/property.service';
import { gestaoImobiliariaService as svc } from '../services/gestao-imobiliaria.service';
import type { PropertyLease } from '@shared/core';
import { Field, inputCls, sectionTitle } from '../ui';

type PropertyForm = {
  client_id: string;
  identificador: string;
  tipo_locacao: 'fixa' | 'flexivel';
  natureza_locacao: 'residencial' | 'nao_residencial';
  modo_entrada: 'detalhado' | 'reduzido';
  cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  matricula_imovel: string; inscricao_iptu: string; cartorio_registro: string;
};

function emptyPropertyForm(clientId = ''): PropertyForm {
  return {
    client_id: clientId, identificador: '', tipo_locacao: 'fixa', natureza_locacao: 'residencial',
    modo_entrada: 'reduzido',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    matricula_imovel: '', inscricao_iptu: '', cartorio_registro: '',
  };
}

export function ImoveisTab({
  clients, clientId, properties, onChanged, onClientsChanged, onError, onSuccess, isAdmin,
}: {
  clients: ClientWithCreatedAt[];
  clientId: string;
  properties: PropertyWithClient[];
  onChanged: () => void;
  onClientsChanged: () => void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PropertyWithClient | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PropertyWithClient | null>(null);
  const [showImportIrpf, setShowImportIrpf] = useState(false);
  const [leases, setLeases] = useState<PropertyLease[]>([]);

  useEffect(() => {
    svc.listLeases(clientId ? { client_id: clientId } : undefined).then(setLeases).catch(() => setLeases([]));
  }, [clientId, properties]);

  const activeByProp = useMemo(() => {
    const map = new Map<string, PropertyLease>();
    for (const l of leases) {
      if (l.status === 'ativo' || l.status === 'inadimplente') {
        if (!map.has(l.property_id)) map.set(l.property_id, l);
      }
    }
    return map;
  }, [leases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) =>
      p.identificador?.toLowerCase().includes(q) ||
      p.client_name?.toLowerCase().includes(q) ||
      (p as { cidade?: string }).cidade?.toLowerCase?.().includes(q));
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
            const cidade = (p as { cidade?: string }).cidade;
            const uf = (p as { uf?: string }).uf;
            const natureza = (p as { natureza_locacao?: string }).natureza_locacao === 'nao_residencial' ? 'Não residencial' : 'Residencial';
            const lease = activeByProp.get(p.id);
            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{p.identificador}</div>
                    <div className="text-xs text-slate-500 truncate">{p.client_name ?? '—'}{cidade ? ` · ${cidade}${uf ? `/${uf}` : ''}` : ''}</div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.tipo_locacao === 'flexivel' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                    {p.tipo_locacao === 'flexivel' ? 'Airbnb' : 'Fixa'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{natureza}</span>
                  {lease
                    ? <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Ocupado</span>
                    : <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">Vago</span>}
                </div>
                <div className="mt-auto flex items-center gap-3 pt-2 text-xs">
                  <button type="button" onClick={() => openEdit(p)} className="text-indigo-700 font-semibold">Editar</button>
                  {lease
                    ? <button type="button" onClick={() => navigate(`/gestao-imobiliaria/contratos/${lease.id}`)} className="text-indigo-700 font-semibold">Ver contrato</button>
                    : <button type="button" onClick={() => navigate(`/gestao-imobiliaria/contratos/novo?property_id=${p.id}`)} className="text-indigo-700 font-semibold">Novo contrato</button>}
                  {isAdmin && <button type="button" onClick={() => setConfirmDelete(p)} className="text-red-600 font-semibold">Excluir</button>}
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
    const e = editing as PropertyWithClient & Record<string, string>;
    return {
      client_id: editing.client_id, identificador: editing.identificador,
      tipo_locacao: editing.tipo_locacao as 'fixa' | 'flexivel',
      natureza_locacao: e.natureza_locacao === 'nao_residencial' ? 'nao_residencial' : 'residencial',
      modo_entrada: (e.modo_entrada as PropertyForm['modo_entrada']) ?? 'reduzido',
      cep: e.cep ?? '', logradouro: e.logradouro ?? '', numero: e.numero ?? '', complemento: e.complemento ?? '',
      bairro: e.bairro ?? '', cidade: e.cidade ?? '', uf: e.uf ?? '',
      matricula_imovel: e.matricula_imovel ?? '', inscricao_iptu: e.inscricao_iptu ?? '', cartorio_registro: e.cartorio_registro ?? '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const set = (patch: Partial<PropertyForm>) => setForm((f) => ({ ...f, ...patch }));

  const lookupCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) set({ logradouro: data.logradouro || form.logradouro, bairro: data.bairro || form.bairro, cidade: data.localidade || form.cidade, uf: data.uf || form.uf });
    } catch { /* preenchimento manual */ }
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
      modo_entrada: form.modo_entrada,
      cep: form.cep || undefined, logradouro: form.logradouro || undefined, numero: form.numero || undefined,
      complemento: form.complemento || undefined, bairro: form.bairro || undefined, cidade: form.cidade || undefined, uf: form.uf || undefined,
      matricula_imovel: form.matricula_imovel || undefined, inscricao_iptu: form.inscricao_iptu || undefined, cartorio_registro: form.cartorio_registro || undefined,
    };
    try {
      if (editing) await propertyService.update(editing.id, payload);
      else await propertyService.create(payload);
      onSuccess(editing ? 'Imóvel atualizado' : 'Imóvel cadastrado');
      onSaved();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar imóvel'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Editar imóvel' : 'Cadastrar imóvel'} size="xl">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div className={sectionTitle}>Identificação</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Cliente"><select value={form.client_id} onChange={(e) => set({ client_id: e.target.value })} className={inputCls}><option value="">Selecione…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Identificador (nome ou apelido)"><input value={form.identificador} onChange={(e) => set({ identificador: e.target.value })} className={inputCls} /></Field>
          <Field label="Tipo de locação"><select value={form.tipo_locacao} onChange={(e) => set({ tipo_locacao: e.target.value as 'fixa' | 'flexivel' })} className={inputCls}><option value="fixa">Fixa (mensal)</option><option value="flexivel">Flexível (Airbnb)</option></select></Field>
          <Field label="Natureza"><select value={form.natureza_locacao} onChange={(e) => set({ natureza_locacao: e.target.value as 'residencial' | 'nao_residencial' })} className={inputCls}><option value="residencial">Residencial</option><option value="nao_residencial">Não residencial</option></select></Field>
          <Field label="Modo de cadastro"><select value={form.modo_entrada} onChange={(e) => set({ modo_entrada: e.target.value as 'detalhado' | 'reduzido' })} className={inputCls}><option value="reduzido">Reduzido (totais mensais)</option><option value="detalhado">Detalhado (lançamentos)</option></select></Field>
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
        <p className="text-xs text-slate-400">Encargos mensais (IPTU, condomínio, seguro e demais custos) ficam na aba Custos.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
        <Button size="sm" variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={submit} disabled={saving}>{saving ? 'Salvando…' : (editing ? 'Salvar' : 'Cadastrar')}</Button>
      </div>
    </Modal>
  );
}

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
