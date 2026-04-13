import apiRequest from '../../../shared/services/api';

const BASE = '/api/v1/feedback';

function getAuthHeaders(): { token: string; tenantId: string | undefined } {
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('tenantId');
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  if (user?.role === 'super_admin') return { token, tenantId: undefined };
  if (!tenantId) throw new Error('Sessão inválida. Faça login novamente.');
  return { token, tenantId };
}

export type FeedbackCategory = 'suggestion' | 'problem' | 'other';

/** Mesmo contrato da API: open | answered | resolved */
export type FeedbackWorkflowStatus = 'open' | 'answered' | 'resolved';

export const FEEDBACK_WORKFLOW_LABEL: Record<FeedbackWorkflowStatus, string> = {
  open: 'Em análise',
  answered: 'Em andamento',
  resolved: 'Resolvido',
};

export interface UserFeedback {
  id: string;
  tenant_id: string | null;
  user_id: string;
  category: string;
  message: string;
  page_path: string | null;
  consent_privacy_policy?: boolean;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  responded_by_user_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UserFeedbackAdmin extends UserFeedback {
  user_name: string;
  user_email: string;
  company_name: string | null;
}

export interface FeedbackReply {
  id: string;
  feedback_id: string;
  author_user_id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
  author_name: string;
}

export interface FeedbackThread {
  feedback: UserFeedbackAdmin;
  replies: FeedbackReply[];
}

/** Corpo `{ data: { feedback, replies } }` ou aninhamento acidental `data.data`. */
function parseFeedbackThreadBody(raw: unknown): FeedbackThread {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta inválida do servidor.');
  }
  let cur: unknown = (raw as { data?: unknown }).data;
  while (
    cur &&
    typeof cur === 'object' &&
    'data' in (cur as object) &&
    !('feedback' in (cur as object))
  ) {
    cur = (cur as { data: unknown }).data;
  }
  if (!cur || typeof cur !== 'object' || !('feedback' in cur) || !('replies' in cur)) {
    throw new Error('Resposta inválida do servidor.');
  }
  const t = cur as FeedbackThread;
  if (!Array.isArray(t.replies)) {
    throw new Error('Resposta inválida do servidor.');
  }
  return t;
}

function isNotFoundMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('route not found') || m.includes('not_found') || m.includes('404');
}

export const feedbackService = {
  async create(payload: {
    category: FeedbackCategory;
    message: string;
    page_path?: string;
    consent_privacy_policy: true;
  }): Promise<{ data: { feedback: UserFeedback } }> {
    const { token, tenantId } = getAuthHeaders();
    return apiRequest(`${BASE}`, {
      method: 'POST',
      token,
      tenantId,
      body: JSON.stringify(payload),
    });
  },

  async listMine(page = 1, limit = 20): Promise<{ data: { items: UserFeedback[]; total: number } }> {
    const { token, tenantId } = getAuthHeaders();
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    return apiRequest(`${BASE}/mine?${qs}`, { token, tenantId });
  },

  async listAdmin(params: {
    status?: FeedbackWorkflowStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: { items: UserFeedbackAdmin[]; total: number } }> {
    const { token } = getAuthHeaders();
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest(`${BASE}/admin${suffix}`, { token });
  },

  async respond(
    id: string,
    admin_response: string
  ): Promise<{ data: { feedback: UserFeedback } }> {
    const { token } = getAuthHeaders();
    return apiRequest(`${BASE}/admin/${id}/respond`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ admin_response }),
    });
  },

  async setWorkflowStatus(
    id: string,
    status: FeedbackWorkflowStatus
  ): Promise<{ data: { feedback: UserFeedback } }> {
    const { token } = getAuthHeaders();
    return apiRequest(`${BASE}/admin/${id}/status`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status }),
    });
  },

  async getThread(id: string): Promise<{ data: FeedbackThread }> {
    const { token, tenantId } = getAuthHeaders();
    const opts = { token, tenantId };
    // Preferir rota do sub-app (a mesma montagem que /mine); /thread/:id é alias no router raiz.
    const candidates = [`${BASE}/${id}`, `${BASE}/thread/${id}`];
    let lastError: Error | null = null;
    for (const url of candidates) {
      try {
        const raw = await apiRequest<unknown>(url, opts);
        return { data: parseFeedbackThreadBody(raw) };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (isNotFoundMessage(msg)) {
          lastError = e instanceof Error ? e : new Error(msg);
          continue;
        }
        throw e;
      }
    }
    throw lastError ?? new Error('Não foi possível carregar a conversa.');
  },

  async postUserReply(feedbackId: string, message: string): Promise<{ data: { reply: FeedbackReply } }> {
    const { token, tenantId } = getAuthHeaders();
    return apiRequest(`${BASE}/${feedbackId}/replies`, {
      method: 'POST',
      token,
      tenantId,
      body: JSON.stringify({ message }),
    });
  },

  async postAdminReply(feedbackId: string, message: string): Promise<{ data: { reply: FeedbackReply } }> {
    const { token } = getAuthHeaders();
    return apiRequest(`${BASE}/admin/${feedbackId}/replies`, {
      method: 'POST',
      token,
      body: JSON.stringify({ message }),
    });
  },
};
