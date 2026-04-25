import { useState, useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  feedbackService,
  FEEDBACK_WORKFLOW_LABEL,
  type FeedbackCategory,
  type FeedbackReply,
  type FeedbackThread,
  type FeedbackWorkflowStatus,
  type UserFeedback,
  type UserFeedbackAdmin,
} from '../../../modules/feedback/services/feedback.service';

function normalizeWorkflowStatus(s: string | undefined): FeedbackWorkflowStatus {
  if (s === 'answered' || s === 'resolved' || s === 'open') return s;
  return 'open';
}

function mergeThreadWithListRow(thread: FeedbackThread, row?: UserFeedback): FeedbackThread {
  const f = thread.feedback as UserFeedbackAdmin & { adminResponse?: string | null };
  const r = row as (UserFeedback & { adminResponse?: string | null }) | undefined;
  return {
    ...thread,
    feedback: {
      ...thread.feedback,
      admin_response:
        f.admin_response ??
        f.adminResponse ??
        r?.admin_response ??
        r?.adminResponse ??
        null,
    },
  };
}

function isStaffReply(r: FeedbackReply): boolean {
  const v = r.is_staff as boolean | string | undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

function mainAdminText(fb: UserFeedback): string | null {
  const x = fb as UserFeedback & { adminResponse?: string | null };
  const t = x.admin_response ?? x.adminResponse ?? null;
  const s = t != null ? String(t).trim() : '';
  return s.length > 0 ? s : null;
}

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'suggestion', label: 'Sugestão' },
  { value: 'problem', label: 'Problema / dificuldade' },
  { value: 'other', label: 'Outro' },
];

type FeedbackTriggerVariant = 'fab' | 'header' | 'inline';

interface FeedbackTriggerProps {
  variant?: FeedbackTriggerVariant;
  className?: string;
}

/**
 * Gatilho de feedback + painel lateral (header) ou FAB (telas sem barra do Layout).
 * Inclui confirmação explícita de tratamento de dados (base LGPD).
 */
export function FeedbackTrigger({ variant = 'fab', className = '' }: FeedbackTriggerProps) {
  const location = useLocation();
  const panelId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeAnimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const [panel, setPanel] = useState<'send' | 'history'>('send');
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<UserFeedback[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, FeedbackThread>>({});
  const [threadLoadingId, setThreadLoadingId] = useState<string | null>(null);
  const [userReplyText, setUserReplyText] = useState<Record<string, string>>({});
  const [userReplySending, setUserReplySending] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await feedbackService.listMine(1, 30);
      setHistory(res.data.items);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : 'Não foi possível carregar.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPanel('send');
    setCategory('suggestion');
    setMessage('');
    setConsent(false);
    setError('');
    setDone(false);
    setLoading(false);
    setHistory([]);
    setHistoryError('');
    setOpenThreadId(null);
    setThreads({});
    setThreadLoadingId(null);
    setUserReplyText({});
    setUserReplySending(null);
  }, []);

  const finalizeClose = useCallback(() => {
    isClosingRef.current = false;
    setOpen(false);
    reset();
    setSlideIn(false);
  }, [reset]);

  const handleClose = useCallback(() => {
    if (!open || isClosingRef.current) return;
    isClosingRef.current = true;
    setSlideIn(false);
    if (closeAnimTimeoutRef.current) {
      window.clearTimeout(closeAnimTimeoutRef.current);
    }
    closeAnimTimeoutRef.current = window.setTimeout(() => {
      closeAnimTimeoutRef.current = null;
      finalizeClose();
    }, 550);
  }, [open, finalizeClose]);

  useEffect(() => {
    return () => {
      if (closeAnimTimeoutRef.current) {
        window.clearTimeout(closeAnimTimeoutRef.current);
        closeAnimTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setSlideIn(false);
      return;
    }
    document.body.style.overflow = 'hidden';
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setSlideIn(true));
    });
    const focusT = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = '';
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
      window.clearTimeout(focusT);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  const handleOpen = () => {
    if (closeAnimTimeoutRef.current) {
      window.clearTimeout(closeAnimTimeoutRef.current);
      closeAnimTimeoutRef.current = null;
    }
    isClosingRef.current = false;
    if (open) {
      setSlideIn(true);
      return;
    }
    setOpen(true);
    setPanel('send');
    setDone(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError('Marque a caixa para confirmar que leu a Política de Privacidade.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Escreva uma mensagem com pelo menos 10 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const path = `${location.pathname}${location.search}${location.hash}`;
      await feedbackService.create({
        category,
        message: message.trim(),
        page_path: path.slice(0, 600) || undefined,
        consent_privacy_policy: true,
      });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível enviar.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleThread = async (row: UserFeedback) => {
    const id = row.id;
    if (openThreadId === id) {
      setOpenThreadId(null);
      return;
    }
    setOpenThreadId(id);
    setHistoryError('');
    setThreadLoadingId(id);
    try {
      const res = await feedbackService.getThread(id);
      setThreads((m) => ({ ...m, [id]: mergeThreadWithListRow(res.data, row) }));
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : 'Não foi possível carregar a conversa.');
      setOpenThreadId(null);
    } finally {
      setThreadLoadingId(null);
    }
  };

  const canUserReply = (t: FeedbackThread) => {
    if (normalizeWorkflowStatus(t.feedback.status) === 'resolved') return false;
    return !!mainAdminText(t.feedback) || (t.replies ?? []).some(isStaffReply);
  };

  const sendUserReply = async (id: string) => {
    const text = (userReplyText[id] || '').trim();
    if (!text) return;
    setUserReplySending(id);
    try {
      await feedbackService.postUserReply(id, text);
      setUserReplyText((m) => ({ ...m, [id]: '' }));
      const res = await feedbackService.getThread(id);
      const listRow = history.find((x) => x.id === id);
      setThreads((m) => ({ ...m, [id]: mergeThreadWithListRow(res.data, listRow) }));
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setUserReplySending(null);
    }
  };

  const isHeaderTrigger = variant === 'header' || variant === 'inline';
  const triggerClassName = isHeaderTrigger
    ? `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300/60 ${className}`
    : `fixed bottom-20 right-4 z-40 flex h-12 items-center gap-2 rounded-full border border-brand/30 bg-white px-4 text-sm font-medium text-brand shadow-lg transition hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand/30 sm:bottom-6 sm:right-6 ${className}`;

  const titleId = `${panelId}-title`;

  const panelInner = (
    <>
      <div className="flex shrink-0 gap-2 border-b border-slate-200 px-4 pb-3 pt-1 sm:px-5">
        <button
          type="button"
          onClick={() => setPanel('send')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            panel === 'send' ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Novo envio
        </button>
        <button
          type="button"
          onClick={() => {
            setPanel('history');
            void loadHistory();
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            panel === 'history' ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Meus envios
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-3 sm:px-5">
        {panel === 'history' ? (
          <div className="space-y-3">
            {historyLoading && <p className="text-sm text-slate-500">Carregando…</p>}
            {historyError && <p className="text-sm text-red-600">{historyError}</p>}
            {!historyLoading && history.length === 0 && !historyError && (
              <p className="text-sm text-slate-600">Você ainda não enviou feedback por aqui.</p>
            )}
            {history.map((h) => {
              const expanded = openThreadId === h.id;
              const thread = threads[h.id];
              const loadingTh = threadLoadingId === h.id;
              const adminShown = thread ? mainAdminText(thread.feedback) : null;
              return (
                <div key={h.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between gap-2 text-xs text-slate-500 mb-1">
                    <span>{new Date(h.created_at).toLocaleString('pt-BR')}</span>
                    <span
                      className={
                        normalizeWorkflowStatus(h.status) === 'resolved'
                          ? 'text-slate-600 font-medium'
                          : normalizeWorkflowStatus(h.status) === 'answered'
                            ? 'text-sky-800 font-medium'
                            : 'text-amber-700'
                      }
                    >
                      {FEEDBACK_WORKFLOW_LABEL[normalizeWorkflowStatus(h.status)]}
                    </span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap line-clamp-4">{h.message}</p>
                  <button
                    type="button"
                    onClick={() => void toggleThread(h)}
                    className="mt-2 text-xs font-medium text-brand hover:underline"
                  >
                    {expanded ? 'Ocultar conversa' : 'Ver conversa'}
                  </button>
                  {expanded && (
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {loadingTh && <p className="text-xs text-slate-500">Carregando conversa…</p>}
                      {!loadingTh && thread && (
                        <>
                          <div className="rounded-md bg-slate-50 p-2">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Você</p>
                            <p className="text-slate-800 whitespace-pre-wrap">{thread.feedback.message}</p>
                          </div>
                          {adminShown && (
                            <div className="rounded-md bg-emerald-50/80 border border-emerald-100 p-2">
                              <p className="text-xs font-semibold text-emerald-800 mb-1">Equipe</p>
                              <p className="text-slate-800 whitespace-pre-wrap">{adminShown}</p>
                            </div>
                          )}
                          {(thread.replies ?? []).map((r) => (
                            <div
                              key={r.id}
                              className={`rounded-md p-2 ${isStaffReply(r) ? 'bg-emerald-50/80 border border-emerald-100' : 'bg-slate-50'}`}
                            >
                              <p className="text-xs font-semibold text-slate-600 mb-1">
                                {isStaffReply(r) ? 'Equipe' : 'Você'} · {new Date(r.created_at).toLocaleString('pt-BR')}
                              </p>
                              <p className="text-slate-800 whitespace-pre-wrap">{r.body}</p>
                            </div>
                          ))}
                          {normalizeWorkflowStatus(thread.feedback.status) === 'resolved' && (
                            <p className="text-xs text-slate-600 bg-slate-100 rounded-md px-2 py-2 border border-slate-200">
                              Este assunto foi encerrado como resolvido. Para tratar de outro ponto, use a aba
                              &quot;Novo envio&quot;.
                            </p>
                          )}
                          {canUserReply(thread) && (
                            <div className="pt-1">
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Sua resposta à equipe
                              </label>
                              <textarea
                                value={userReplyText[h.id] || ''}
                                onChange={(e) => setUserReplyText((m) => ({ ...m, [h.id]: e.target.value }))}
                                rows={3}
                                maxLength={8000}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                placeholder="Dúvida ou complemento sobre a resposta recebida…"
                              />
                              <div className="flex justify-end mt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={userReplySending === h.id || !(userReplyText[h.id] || '').trim()}
                                  onClick={() => void sendUserReply(h.id)}
                                >
                                  {userReplySending === h.id ? 'Enviando…' : 'Enviar resposta'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : done ? (
          <div className="space-y-4 text-center py-2">
            <p className="text-slate-700">Obrigado. Sua mensagem foi registrada e será analisada pela equipe.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDone(false);
                  setMessage('');
                  setConsent(false);
                }}
              >
                Enviar outro
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPanel('history');
                  void loadHistory();
                }}
              >
                Ver meus envios
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Use este canal para sugestões ou para relatar dificuldades no sistema. Não envie dados bancários, senhas ou
              informações fiscais completas de terceiros.
            </p>

            <div>
              <label htmlFor="fb-cat" className="block text-sm font-medium text-slate-700 mb-1">
                Tipo
              </label>
              <select
                id="fb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fb-msg" className="block text-sm font-medium text-slate-700 mb-1">
                Mensagem
              </label>
              <textarea
                id="fb-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={8000}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="Descreva sua sugestão ou o que aconteceu (tela, passos, se possível)."
              />
              <p className="mt-1 text-xs text-slate-500">{message.length} / 8000</p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span>
                Li e concordo com o tratamento dos dados deste envio conforme a{' '}
                <Link to="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-brand underline">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="tertiary" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );

  const drawer =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div className="fixed inset-0 z-[120]">
        <div
          className="absolute inset-0 bg-transparent"
          onClick={handleClose}
          role="presentation"
          aria-hidden
        />
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`absolute inset-y-0 right-0 z-[121] flex h-full min-h-0 max-h-[100dvh] w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-500 ease-in-out ${
            slideIn ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-brand/5 px-4 py-3 sm:px-5">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                Feedback
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {panelInner}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={triggerClassName}
        aria-label="Enviar feedback"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-analytics-event="feedback_open"
        data-analytics-label={isHeaderTrigger ? 'Feedback Header' : 'Feedback FAB'}
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        {variant === 'fab' && <span className="hidden sm:inline">Feedback</span>}
      </button>
      {drawer}
    </>
  );
}

export function FeedbackFab() {
  return <FeedbackTrigger variant="fab" />;
}
