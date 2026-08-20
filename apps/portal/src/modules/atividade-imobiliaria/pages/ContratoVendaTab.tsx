import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { ConfirmModal } from '../../../shared/components/ui/ConfirmModal';
import { useClients } from '../../../shared/hooks/useClients';
import { atividadeImobiliariaService as svc } from '../services/atividade-imobiliaria.service';
import type {
  RealEstateUnit, RealEstateSaleContract, SaleContractDetail,
  CreateSaleContractInput, ContractStatus, OperacaoVenda,
} from '@shared/core';

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const brl = (n: number) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

type PartyRow = { client_id: string; participacao_pct: number };
type UnitRow = { unit_id: string; valor_atribuido_contrato: number };
type InstRow = { sequencia: number; vencimento: string; principal: number; fonte_pagadora: string };

function emptyForm(units: RealEstateUnit[]): CreateSaleContractInput {
  const valor = units.reduce((s, u) => s + (Number(u.valor_atribuido) || 0), 0);
  return {
    numero: '',
    data_contrato: today(),
    valor_venda: valor,
    operacao: '02',
    indice_atualizacao: '',
    taxa_juros: null,
    informacoes_complementares: '',
    status: 'rascunho',
    parties: [{ client_id: '', participacao_pct: 100 }],
    units: units.filter((u) => u.situacao !== 'vendida').map((u) => ({
      unit_id: u.id,
      valor_atribuido_contrato: Number(u.valor_atribuido) || 0,
    })),
    installments: [{ sequencia: 1, vencimento: today(), principal: valor, fonte_pagadora: '' }],
  };
}

export function ContratoVendaTab({
  developmentId, units, onChanged, onError, onSuccess,
}: {
  developmentId: string;
  units: RealEstateUnit[];
  onChanged: () => void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
}) {
  const { clients } = useClients();
  const [contracts, setContracts] = useState<RealEstateSaleContract[]>([]);
  const [detail, setDetail] = useState<SaleContractDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateSaleContractInput>(emptyForm(units));
  const [confirmDelete, setConfirmDelete] = useState<RealEstateSaleContract | null>(null);
  const [receiptInstId, setReceiptInstId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState({ data_pagamento: today(), principal: '', correcao_monetaria: '0', juros: '0', multa: '0', desconto: '0', documento_ref: '' });

  const reload = useCallback(() => {
    svc.listContracts(developmentId).then(setContracts).catch(() => setContracts([]));
  }, [developmentId]);

  useEffect(() => { reload(); }, [reload]);

  const openNew = () => {
    setDetail(null);
    setForm(emptyForm(units));
    setShowForm(true);
  };

  const openDetail = async (id: string) => {
    try {
      const d = await svc.getContract(id);
      setDetail(d);
      setShowForm(false);
    } catch (e) { onError(e instanceof Error ? e.message : 'Falha ao abrir contrato'); }
  };

  const partiesSum = useMemo(() => form.parties.reduce((s, p) => s + Number(p.participacao_pct || 0), 0), [form.parties]);
  const unitsSum = useMemo(() => form.units.reduce((s, u) => s + Number(u.valor_atribuido_contrato || 0), 0), [form.units]);
  const instSum = useMemo(() => form.installments.reduce((s, i) => s + Number(i.principal || 0), 0), [form.installments]);

  const save = async () => {
    if (!form.numero.trim()) return onError('Número do contrato é obrigatório');
    if (form.parties.some((p) => !p.client_id)) return onError('Selecione todos os compradores');
    if (form.units.length === 0) return onError('Inclua ao menos uma unidade');
    try {
      const payload: CreateSaleContractInput = {
        ...form,
        valor_venda: Number(form.valor_venda) || 0,
        indice_atualizacao: form.indice_atualizacao || null,
        taxa_juros: form.taxa_juros != null && form.taxa_juros !== ('' as unknown as number) ? Number(form.taxa_juros) : null,
        informacoes_complementares: form.informacoes_complementares || null,
        installments: form.operacao === '01' ? [] : form.installments.map((i, idx) => ({
          sequencia: i.sequencia || idx + 1,
          vencimento: i.vencimento,
          principal: Number(i.principal) || 0,
          fonte_pagadora: i.fonte_pagadora || null,
        })),
      };
      await svc.createContract(developmentId, payload);
      onSuccess('Contrato salvo');
      setShowForm(false);
      reload();
      onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao salvar contrato'); }
  };

  const setStatus = async (status: ContractStatus) => {
    if (!detail) return;
    try {
      const d = await svc.updateContract(detail.contract.id, { status });
      setDetail(d);
      onSuccess(status === 'ativo' ? 'Contrato ativado' : 'Status atualizado');
      reload();
      onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao atualizar status'); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await svc.deleteContract(confirmDelete.id);
      onSuccess('Contrato excluído');
      setConfirmDelete(null);
      if (detail?.contract.id === confirmDelete.id) setDetail(null);
      reload();
      onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao excluir'); }
  };

  const saveReceipt = async () => {
    if (!receiptInstId) return;
    if (!receipt.documento_ref.trim()) return onError('Informe o comprovante (documento-fonte da baixa)');
    try {
      await svc.createReceipt(receiptInstId, {
        data_pagamento: receipt.data_pagamento,
        principal: Number(receipt.principal) || 0,
        correcao_monetaria: Number(receipt.correcao_monetaria) || 0,
        juros: Number(receipt.juros) || 0,
        multa: Number(receipt.multa) || 0,
        desconto: Number(receipt.desconto) || 0,
        documento_ref: receipt.documento_ref.trim(),
      });
      onSuccess('Baixa registrada');
      setReceiptInstId(null);
      if (detail) setDetail(await svc.getContract(detail.contract.id));
      reload();
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao baixar'); }
  };

  const removeReceipt = async (id: string) => {
    try {
      await svc.deleteReceipt(id);
      onSuccess('Baixa excluída');
      if (detail) setDetail(await svc.getContract(detail.contract.id));
    } catch (e) { onError(e instanceof Error ? e.message : 'Erro ao excluir baixa'); }
  };

  const setParty = (idx: number, patch: Partial<PartyRow>) => {
    const parties = form.parties.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setForm({ ...form, parties });
  };
  const setUnit = (idx: number, patch: Partial<UnitRow>) => {
    const next = form.units.map((u, i) => (i === idx ? { ...u, ...patch } : u));
    setForm({ ...form, units: next });
  };
  const setInst = (idx: number, patch: Partial<InstRow>) => {
    const next = form.installments.map((u, i) => (i === idx ? { ...u, ...patch } : u));
    setForm({ ...form, installments: next });
  };

  const availableUnits = units.filter((u) => u.situacao !== 'vendida' || form.units.some((x) => x.unit_id === u.id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{contracts.length} contrato(s)</p>
        <Button size="sm" onClick={openNew}>+ Novo contrato</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2">Número</th>
                <th>Data</th>
                <th>Compradores</th>
                <th className="text-right">Valor</th>
                <th>Operação</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="py-2 font-mono text-xs">{c.numero}</td>
                  <td>{String(c.data_contrato).slice(0, 10)}</td>
                  <td>{c.party_names ?? '—'}</td>
                  <td className="text-right">{brl(Number(c.valor_venda))}</td>
                  <td>{c.operacao === '01' ? 'À vista' : 'A prazo'}</td>
                  <td>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <button type="button" onClick={() => openDetail(c.id)} className="text-indigo-700 text-xs font-semibold mr-2">Abrir</button>
                    <button type="button" onClick={() => setConfirmDelete(c)} className="text-red-600 text-xs">Excluir</button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Nenhum contrato de venda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <Card title="Novo contrato de venda">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Número *">
              <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Data *">
              <input type="date" value={form.data_contrato} onChange={(e) => setForm({ ...form, data_contrato: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Valor da venda *">
              <input type="number" step="0.01" value={form.valor_venda} onChange={(e) => setForm({ ...form, valor_venda: Number(e.target.value) || 0 })} className={inputCls} />
            </Field>
            <Field label="Operação">
              <select value={form.operacao} onChange={(e) => setForm({ ...form, operacao: e.target.value as OperacaoVenda })} className={inputCls}>
                <option value="02">02 — A prazo</option>
                <option value="01">01 — À vista (sem parcelas)</option>
              </select>
            </Field>
            <Field label="Índice de atualização">
              <input value={form.indice_atualizacao ?? ''} onChange={(e) => setForm({ ...form, indice_atualizacao: e.target.value })} className={inputCls} placeholder="INCC, IPCA..." />
            </Field>
            <Field label="Taxa de juros (%)">
              <input type="number" step="0.0001" value={form.taxa_juros ?? ''} onChange={(e) => setForm({ ...form, taxa_juros: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </Field>
          </div>

          <p className="text-xs font-semibold uppercase text-slate-500 mt-5 mb-2">Compradores (soma = 100%)</p>
          {form.parties.map((p, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
              <div className="md:col-span-4">
                <select value={p.client_id} onChange={(e) => setParty(idx, { client_id: e.target.value })} className={inputCls}>
                  <option value="">Selecione o cliente…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <input type="number" step="0.01" value={p.participacao_pct} onChange={(e) => setParty(idx, { participacao_pct: Number(e.target.value) || 0 })} className={inputCls} />
              <button type="button" className="text-red-600 text-xs" onClick={() => setForm({ ...form, parties: form.parties.filter((_, i) => i !== idx) })}>Remover</button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, parties: [...form.parties, { client_id: '', participacao_pct: 0 }] })}>+ Comprador</Button>
          <p className={`text-xs mt-1 ${Math.abs(partiesSum - 100) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>Participações: {partiesSum.toFixed(2)}%</p>

          <p className="text-xs font-semibold uppercase text-slate-500 mt-5 mb-2">Unidades do contrato (soma = valor da venda)</p>
          {form.units.map((u, idx) => {
            const meta = availableUnits.find((x) => x.id === u.unit_id);
            return (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
                <div className="md:col-span-3">
                  <select value={u.unit_id} onChange={(e) => setUnit(idx, { unit_id: e.target.value })} className={inputCls}>
                    <option value="">Unidade…</option>
                    {availableUnits.map((x) => <option key={x.id} value={x.id}>{x.codigo} — {x.descricao}</option>)}
                  </select>
                </div>
                <input type="number" step="0.01" value={u.valor_atribuido_contrato} onChange={(e) => setUnit(idx, { valor_atribuido_contrato: Number(e.target.value) || 0 })} className={inputCls} />
                <span className="text-xs text-slate-400 self-center">{meta?.codigo ?? ''}</span>
                <button type="button" className="text-red-600 text-xs" onClick={() => setForm({ ...form, units: form.units.filter((_, i) => i !== idx) })}>Remover</button>
              </div>
            );
          })}
          <Button size="sm" variant="secondary" onClick={() => setForm({ ...form, units: [...form.units, { unit_id: '', valor_atribuido_contrato: 0 }] })}>+ Unidade</Button>
          <p className={`text-xs mt-1 ${Math.abs(unitsSum - Number(form.valor_venda)) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
            Unidades {brl(unitsSum)} vs venda {brl(Number(form.valor_venda))}
          </p>

          {form.operacao === '02' && (
            <>
              <p className="text-xs font-semibold uppercase text-slate-500 mt-5 mb-2">Parcelas perante o vendedor (não o financiamento bancário)</p>
              {form.installments.map((i, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
                  <input type="number" value={i.sequencia} onChange={(e) => setInst(idx, { sequencia: Number(e.target.value) || 1 })} className={inputCls} />
                  <input type="date" value={i.vencimento} onChange={(e) => setInst(idx, { vencimento: e.target.value })} className={inputCls} />
                  <input type="number" step="0.01" value={i.principal} onChange={(e) => setInst(idx, { principal: Number(e.target.value) || 0 })} className={inputCls} />
                  <input placeholder="Fonte pagadora" value={i.fonte_pagadora ?? ''} onChange={(e) => setInst(idx, { fonte_pagadora: e.target.value })} className={inputCls} />
                  <button type="button" className="text-red-600 text-xs" onClick={() => setForm({ ...form, installments: form.installments.filter((_, j) => j !== idx) })}>Remover</button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={() => setForm({
                ...form,
                installments: [...form.installments, { sequencia: form.installments.length + 1, vencimento: today(), principal: 0, fonte_pagadora: '' }],
              })}>+ Parcela</Button>
              <p className={`text-xs mt-1 ${Math.abs(instSum - Number(form.valor_venda)) < 0.01 ? 'text-emerald-700' : 'text-red-700'}`}>
                Principal {brl(instSum)} vs venda {brl(Number(form.valor_venda))}
              </p>
            </>
          )}

          <Field label="Informações complementares">
            <textarea value={form.informacoes_complementares ?? ''} onChange={(e) => setForm({ ...form, informacoes_complementares: e.target.value })} className={`${inputCls} min-h-[60px] mt-3`} rows={2} />
          </Field>

          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Salvar rascunho</Button>
          </div>
        </Card>
      )}

      {detail && !showForm && (
        <Card title={`Contrato ${detail.contract.numero}`}>
          <div className="flex flex-wrap justify-between gap-2 mb-4">
            <div className="text-sm text-slate-600">
              {String(detail.contract.data_contrato).slice(0, 10)} · {brl(Number(detail.contract.valor_venda))} · {detail.contract.operacao === '01' ? 'À vista' : 'A prazo'}
            </div>
            <div className="flex gap-2">
              {detail.contract.status !== 'ativo' && (
                <Button size="sm" onClick={() => setStatus('ativo')} disabled={!detail.integrity.ok}>Ativar</Button>
              )}
              {detail.contract.status === 'ativo' && (
                <Button size="sm" variant="secondary" onClick={() => setStatus('encerrado')}>Encerrar</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mb-4">
            <IntegrityChip ok={detail.integrity.parties_ok} label={`Participações ${detail.integrity.parties_sum}%`} />
            <IntegrityChip ok={detail.integrity.units_ok} label={`Unidades ${brl(detail.integrity.units_sum)}`} />
            <IntegrityChip ok={detail.integrity.installments_ok} label={detail.contract.operacao === '01' ? 'À vista (sem parcelas)' : `Parcelas ${brl(detail.integrity.installments_sum)}`} />
          </div>

          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Compradores</p>
          <ul className="text-sm mb-4">{detail.parties.map((p) => (
            <li key={p.id}>{p.client_name} · {p.participacao_pct}% {p.client_documento ? `· ${p.client_documento}` : ''}</li>
          ))}</ul>

          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Unidades</p>
          <ul className="text-sm mb-4">{detail.units.map((u) => (
            <li key={u.id}>{u.unit_codigo} — {u.unit_descricao} · {brl(Number(u.valor_atribuido_contrato))}</li>
          ))}</ul>

          {detail.installments.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Parcelas e baixas</p>
              <table className="w-full text-sm mb-3">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase">
                    <th className="py-1">#</th><th>Venc.</th><th className="text-right">Principal</th><th>Fonte</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.installments.map((i) => (
                    <tr key={i.id} className="border-t border-slate-100">
                      <td className="py-1">{i.sequencia}</td>
                      <td>{String(i.vencimento).slice(0, 10)}</td>
                      <td className="text-right">{brl(Number(i.principal))}</td>
                      <td>{i.fonte_pagadora ?? '—'}</td>
                      <td>{i.status}</td>
                      <td className="text-right">
                        {i.status !== 'pago' && (
                          <button type="button" className="text-indigo-700 text-xs font-semibold" onClick={() => {
                            const restante = Number(i.principal) - Number(i.recebido_principal || 0);
                            setReceiptInstId(i.id);
                            setReceipt({ data_pagamento: today(), principal: String(restante), correcao_monetaria: '0', juros: '0', multa: '0', desconto: '0', documento_ref: '' });
                          }}>Baixar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {receiptInstId && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3 mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
              <Field label="Data"><input type="date" value={receipt.data_pagamento} onChange={(e) => setReceipt({ ...receipt, data_pagamento: e.target.value })} className={inputCls} /></Field>
              <Field label="Principal"><input type="number" step="0.01" value={receipt.principal} onChange={(e) => setReceipt({ ...receipt, principal: e.target.value })} className={inputCls} /></Field>
              <Field label="Correção"><input type="number" step="0.01" value={receipt.correcao_monetaria} onChange={(e) => setReceipt({ ...receipt, correcao_monetaria: e.target.value })} className={inputCls} /></Field>
              <Field label="Juros"><input type="number" step="0.01" value={receipt.juros} onChange={(e) => setReceipt({ ...receipt, juros: e.target.value })} className={inputCls} /></Field>
              <Field label="Multa"><input type="number" step="0.01" value={receipt.multa} onChange={(e) => setReceipt({ ...receipt, multa: e.target.value })} className={inputCls} /></Field>
              <Field label="Desconto"><input type="number" step="0.01" value={receipt.desconto} onChange={(e) => setReceipt({ ...receipt, desconto: e.target.value })} className={inputCls} /></Field>
              <div className="md:col-span-2">
                <Field label="Comprovante *"><input value={receipt.documento_ref} onChange={(e) => setReceipt({ ...receipt, documento_ref: e.target.value })} className={inputCls} placeholder="Nº extrato, TED, arquivo..." /></Field>
              </div>
              <div className="md:col-span-4 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setReceiptInstId(null)}>Cancelar</Button>
                <Button size="sm" onClick={saveReceipt}>Registrar baixa</Button>
              </div>
            </div>
          )}

          {detail.receipts.length > 0 && (
            <ul className="text-sm space-y-1">
              {detail.receipts.map((r) => (
                <li key={r.id} className="flex justify-between border-t border-slate-100 py-1">
                  <span>{String(r.data_pagamento).slice(0, 10)} · princ. {brl(Number(r.principal))} · corr. {brl(Number(r.correcao_monetaria))} · total {brl(Number(r.total_recebido))} · {r.documento_ref}</span>
                  <button type="button" className="text-red-600 text-xs" onClick={() => removeReceipt(r.id)}>Excluir</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Excluir contrato"
        message={`Excluir o contrato ${confirmDelete?.numero}? Unidades voltam a disponível se o contrato estiver ativo.`}
      />
    </div>
  );
}

function IntegrityChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-lg px-3 py-2 font-medium ${ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {ok ? 'OK' : 'Pendente'} · {label}
    </span>
  );
}
