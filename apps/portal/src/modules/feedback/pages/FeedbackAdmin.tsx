import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../../../shared/components/layout/Layout';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  feedbackService,
  FEEDBACK_WORKFLOW_LABEL,
  type FeedbackThread,
  type FeedbackWorkflowStatus,
  type UserFeedbackAdmin,
} from '../services/feedback.service';

type StatusFilter = '' | FeedbackWorkflowStatus;

function normalizeWorkflowStatus(s: string | undefined): FeedbackWorkflowStatus {
  if (s === 'open' || s === 'answered' || s === 'resolved') return s;
  return 'open';
}

function workflowBadgeClass(s: string | undefined): string {
  const w = normalizeWorkflowStatus(s);
  if (w === 'resolved') return 'bg-slate-200 text-slate-800';
  if (w === 'answered') return 'bg-sky-100 text-sky-900';
  return 'bg-amber-100 text-amber-900';
}

const CATEGORY_LABEL: Record<string, string> = {
  suggestion: 'Sugestão',
  problem: 'Problema',
  other: 'Outro',
};

export function FeedbackAdmin() {
  const { user } = useAuth();
  const [items, setItems] = useState<UserFeedbackAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [respondId, setRespondId] = useState<string | null>(null);
  const [respondText, setRespondText] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [thread, setThread] = useState<FeedbackThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [extraMsg, setExtraMsg] = useState('');
  const [extraLoading, setExtraLoading] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<FeedbackWorkflowStatus>('open');
  const [statusLoading, setStatusLoading] = useState(false);

  const LIMIT = 30;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await feedbackService.listAdmin({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao carregar', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    if (thread?.feedback?.status) {
      setWorkflowStatus(normalizeWorkflowStatus(thread.feedback.status));
    }
  }, [thread]);

  useEffect(() => {
    if (!respondId) {
      setThread(null);
      setExtraMsg('');
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    feedbackService
      .getThread(respondId)
      .then((res) => {
        if (!cancelled) setThread(res.data);
      })
      .catch(() => {
        if (!cancelled) setThread(null);
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [respondId]);

  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const openRespond = (row: UserFeedbackAdmin) => {
    setRespondId(row.id);
    setRespondText(row.admin_response || '');
    setWorkflowStatus(normalizeWorkflowStatus(row.status));
  };

  const submitWorkflowStatus = async () => {
    if (!respondId || !thread) return;
    if (workflowStatus === normalizeWorkflowStatus(thread.feedback.status)) return;
    setStatusLoading(true);
    try {
      await feedbackService.setWorkflowStatus(respondId, workflowStatus);
      showToast('Situação atualizada.');
      const tr = await feedbackService.getThread(respondId);
      setThread(tr.data);
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao atualizar situação', 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const submitRespond = async () => {
    if (!respondId) return;
    const t = respondText.trim();
    if (!t) {
      showToast('Preencha a resposta.', 'error');
      return;
    }
    setRespondLoading(true);
    try {
      await feedbackService.respond(respondId, t);
      showToast('Resposta registrada.');
      const tr = await feedbackService.getThread(respondId);
      setThread(tr.data);
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setRespondLoading(false);
    }
  };

  const submitExtraReply = async () => {
    if (!respondId) return;
    const t = extraMsg.trim();
    if (!t) {
      showToast('Escreva a mensagem.', 'error');
      return;
    }
    setExtraLoading(true);
    try {
      await feedbackService.postAdminReply(respondId, t);
      setExtraMsg('');
      const tr = await feedbackService.getThread(respondId);
      setThread(tr.data);
      showToast('Mensagem adicionada à conversa.');
      await load();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erro ao enviar', 'error');
    } finally {
      setExtraLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feedbacks dos usuários</h1>
          <p className="text-slate-600 text-sm mt-1">
            Mensagens enviadas pelo botão &quot;Feedback&quot; no portal. Defina a situação: em andamento o usuário pode
            responder no fio; em resolvido o fio fica encerrado para ele (novo assunto = novo envio). Use &quot;Nova
            mensagem&quot; para mensagens extras da equipe.
          </p>
        </div>

        {toast && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-slate-200 p-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="open">Em análise</option>
              <option value="answered">Em andamento</option>
              <option value="resolved">Resolvido</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mensagem, e-mail ou escritório"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Atualizar
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum feedback encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Usuário / Escritório</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Mensagem</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.user_name}</div>
                        <div className="text-xs text-slate-500">{row.user_email}</div>
                        {row.company_name && <div className="text-xs text-slate-500 mt-0.5">{row.company_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{CATEGORY_LABEL[row.category] || row.category}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-md">
                        <div className="line-clamp-3">{row.message}</div>
                        {row.page_path && (
                          <div className="text-xs text-slate-400 mt-1 truncate" title={row.page_path}>
                            {row.page_path}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${workflowBadgeClass(row.status)}`}
                        >
                          {FEEDBACK_WORKFLOW_LABEL[normalizeWorkflowStatus(row.status)]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" variant="tertiary" size="sm" onClick={() => openRespond(row)}>
                          Gerenciar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="self-center text-sm text-slate-600">
              Página {page} de {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!respondId}
        onClose={() => {
          setRespondId(null);
          setRespondText('');
          setThread(null);
          setExtraMsg('');
        }}
        title="Resposta ao usuário"
        size="lg"
      >
        {threadLoading && <p className="text-sm text-slate-500 mb-3">Carregando conversa…</p>}
        {!threadLoading && thread && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Situação do chamado</label>
            <p className="text-xs text-slate-500 mb-2">
              Resolvido: o usuário deixa de poder responder neste fio (somente leitura + novo feedback para outro
              assunto).
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={workflowStatus}
                onChange={(e) => setWorkflowStatus(e.target.value as FeedbackWorkflowStatus)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="open">Em análise</option>
                <option value="answered">Em andamento</option>
                <option value="resolved">Resolvido</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={
                  statusLoading || workflowStatus === normalizeWorkflowStatus(thread.feedback.status)
                }
                onClick={() => void submitWorkflowStatus()}
              >
                {statusLoading ? 'Salvando…' : 'Atualizar situação'}
              </Button>
            </div>
          </div>
        )}

        {!threadLoading && thread && (
          <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-600">Usuário</p>
              <p className="text-slate-800 whitespace-pre-wrap">{thread.feedback.message}</p>
            </div>
            {thread.feedback.admin_response && (
              <div>
                <p className="text-xs font-semibold text-emerald-800">Equipe (resposta principal)</p>
                <p className="text-slate-800 whitespace-pre-wrap">{thread.feedback.admin_response}</p>
              </div>
            )}
            {thread.replies.map((r) => (
              <div key={r.id} className={r.is_staff ? 'border-l-2 border-emerald-400 pl-2' : 'border-l-2 border-slate-300 pl-2'}>
                <p className="text-xs font-semibold text-slate-600">
                  {r.is_staff ? 'Equipe' : 'Usuário'} · {r.author_name} · {new Date(r.created_at).toLocaleString('pt-BR')}
                </p>
                <p className="text-slate-800 whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-slate-600 mb-2">
          Resposta principal (editável): aparece como &quot;Equipe&quot; no portal do usuário.
        </p>
        <textarea
          value={respondText}
          onChange={(e) => setRespondText(e.target.value)}
          rows={5}
          maxLength={8000}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          placeholder="Escreva a resposta que o usuário poderá consultar…"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button type="button" onClick={() => void submitRespond()} disabled={respondLoading}>
            {respondLoading ? 'Salvando…' : 'Salvar resposta principal'}
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-800 mb-2">Nova mensagem na conversa</p>
          <p className="text-xs text-slate-500 mb-2">
            Use para continuar o diálogo sem alterar o bloco principal acima (o usuário vê no mesmo fio).
          </p>
          <textarea
            value={extraMsg}
            onChange={(e) => setExtraMsg(e.target.value)}
            rows={3}
            maxLength={8000}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="Mensagem adicional da equipe…"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void submitExtraReply()} disabled={extraLoading}>
              {extraLoading ? 'Enviando…' : 'Enviar mensagem extra'}
            </Button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            type="button"
            variant="tertiary"
            onClick={() => {
              setRespondId(null);
              setRespondText('');
              setThread(null);
              setExtraMsg('');
            }}
            disabled={respondLoading || extraLoading}
          >
            Fechar
          </Button>
        </div>
      </Modal>
    </Layout>
  );
}
