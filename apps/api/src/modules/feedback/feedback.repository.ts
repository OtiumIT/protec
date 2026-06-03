import { query } from '../../db/client';

export type UserFeedbackRow = {
  id: string;
  tenant_id: string | null;
  user_id: string;
  category: string;
  message: string;
  page_path: string | null;
  consent_privacy_policy: boolean;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  responded_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UserFeedbackWithUser = UserFeedbackRow & {
  user_name: string;
  user_email: string;
  company_name: string | null;
};

export type FeedbackReplyRow = {
  id: string;
  feedback_id: string;
  author_user_id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
  author_name: string;
};

export class FeedbackRepository {
  async insert(data: {
    tenantId: string | null;
    userId: string;
    category: string;
    message: string;
    pagePath: string | null;
    consentPrivacyPolicy: boolean;
  }): Promise<UserFeedbackRow> {
    const result = await query<UserFeedbackRow>(
      `INSERT INTO public.user_feedback
        (tenant_id, user_id, category, message, page_path, consent_privacy_policy)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, user_id, category, message, page_path, consent_privacy_policy,
                 status, admin_response, responded_at, responded_by_user_id, created_at, updated_at`,
      [
        data.tenantId,
        data.userId,
        data.category,
        data.message,
        data.pagePath,
        data.consentPrivacyPolicy,
      ]
    );
    return result.rows[0];
  }

  /**
   * Listagem do próprio usuário: isolamento por tenant_id + user_id.
   */
  async listForUser(params: {
    tenantId: string | null;
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: UserFeedbackRow[]; total: number }> {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const tenantClause =
      params.tenantId === null
        ? 'f.tenant_id IS NULL AND f.user_id = $1'
        : 'f.tenant_id = $1 AND f.user_id = $2';

    const countParams = params.tenantId === null ? [params.userId] : [params.tenantId, params.userId];
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public.user_feedback f WHERE ${tenantClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const listSql =
      params.tenantId === null
        ? `SELECT f.id, f.tenant_id, f.user_id, f.category, f.message, f.page_path, f.consent_privacy_policy,
                  f.status, f.admin_response, f.responded_at, f.responded_by_user_id, f.created_at, f.updated_at
           FROM public.user_feedback f
           WHERE f.tenant_id IS NULL AND f.user_id = $1
           ORDER BY f.created_at DESC
           LIMIT $2 OFFSET $3`
        : `SELECT f.id, f.tenant_id, f.user_id, f.category, f.message, f.page_path, f.consent_privacy_policy,
                  f.status, f.admin_response, f.responded_at, f.responded_by_user_id, f.created_at, f.updated_at
           FROM public.user_feedback f
           WHERE f.tenant_id = $1 AND f.user_id = $2
           ORDER BY f.created_at DESC
           LIMIT $3 OFFSET $4`;

    const listParams =
      params.tenantId === null
        ? [params.userId, limit, offset]
        : [params.tenantId, params.userId, limit, offset];

    const result = await query<UserFeedbackRow>(listSql, listParams);

    return { items: result.rows, total };
  }

  /**
   * Lista global para super_admin (sem filtro de tenant na query).
   */
  async listAllAdmin(filters: {
    status?: 'open' | 'answered' | 'resolved';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: UserFeedbackWithUser[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.status) {
      conditions.push(`f.status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.search?.trim()) {
      conditions.push(
        `(f.message ILIKE $${i} OR u.name ILIKE $${i} OR u.email ILIKE $${i} OR c.name ILIKE $${i})`
      );
      params.push(`%${filters.search.trim()}%`);
      i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM public.user_feedback f
       JOIN public.users u ON u.id = f.user_id
       LEFT JOIN public.companies c ON c.id = f.tenant_id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query<UserFeedbackWithUser>(
      `SELECT f.id, f.tenant_id, f.user_id, f.category, f.message, f.page_path, f.consent_privacy_policy,
              f.status, f.admin_response, f.responded_at, f.responded_by_user_id, f.created_at, f.updated_at,
              u.name AS user_name, u.email AS user_email, c.name AS company_name
       FROM public.user_feedback f
       JOIN public.users u ON u.id = f.user_id
       LEFT JOIN public.companies c ON c.id = f.tenant_id
       ${where}
       ORDER BY f.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    return { items: result.rows, total };
  }

  async findById(id: string): Promise<UserFeedbackWithUser | null> {
    const result = await query<UserFeedbackWithUser>(
      `SELECT f.id, f.tenant_id, f.user_id, f.category, f.message, f.page_path, f.consent_privacy_policy,
              f.status, f.admin_response, f.responded_at, f.responded_by_user_id, f.created_at, f.updated_at,
              u.name AS user_name, u.email AS user_email, c.name AS company_name
       FROM public.user_feedback f
       JOIN public.users u ON u.id = f.user_id
       LEFT JOIN public.companies c ON c.id = f.tenant_id
       WHERE f.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async setAdminResponse(
    id: string,
    adminResponse: string,
    respondedByUserId: string
  ): Promise<UserFeedbackRow | null> {
    const result = await query<UserFeedbackRow>(
      `UPDATE public.user_feedback
       SET admin_response = $2,
           status = CASE WHEN status = 'resolved' THEN 'resolved' ELSE 'answered' END,
           responded_at = NOW(),
           responded_by_user_id = $3
       WHERE id = $1
       RETURNING id, tenant_id, user_id, category, message, page_path, consent_privacy_policy,
                 status, admin_response, responded_at, responded_by_user_id, created_at, updated_at`,
      [id, adminResponse, respondedByUserId]
    );
    return result.rows[0] ?? null;
  }

  async setWorkflowStatus(
    id: string,
    status: 'open' | 'answered' | 'resolved'
  ): Promise<UserFeedbackRow | null> {
    const result = await query<UserFeedbackRow>(
      `UPDATE public.user_feedback
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, tenant_id, user_id, category, message, page_path, consent_privacy_policy,
                 status, admin_response, responded_at, responded_by_user_id, created_at, updated_at`,
      [id, status]
    );
    return result.rows[0] ?? null;
  }

  async listReplies(feedbackId: string): Promise<FeedbackReplyRow[]> {
    const result = await query<FeedbackReplyRow>(
      `SELECT r.id, r.feedback_id, r.author_user_id, r.is_staff, r.body, r.created_at,
              u.name AS author_name
       FROM public.user_feedback_replies r
       JOIN public.users u ON u.id = r.author_user_id
       WHERE r.feedback_id = $1
       ORDER BY r.created_at ASC`,
      [feedbackId]
    );
    return result.rows;
  }

  async insertReply(data: {
    feedbackId: string;
    authorUserId: string;
    isStaff: boolean;
    body: string;
  }): Promise<FeedbackReplyRow> {
    const ins = await query<{ id: string }>(
      `INSERT INTO public.user_feedback_replies (feedback_id, author_user_id, is_staff, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.feedbackId, data.authorUserId, data.isStaff, data.body]
    );
    const id = ins.rows[0].id;
    const row = await query<FeedbackReplyRow>(
      `SELECT r.id, r.feedback_id, r.author_user_id, r.is_staff, r.body, r.created_at,
              u.name AS author_name
       FROM public.user_feedback_replies r
       JOIN public.users u ON u.id = r.author_user_id
       WHERE r.id = $1`,
      [id]
    );
    return row.rows[0];
  }

  /** Já existe resposta da equipe (campo principal ou mensagem staff na tabela de replies). */
  async hasStaffContact(feedbackId: string): Promise<boolean> {
    const result = await query<{ ok: boolean }>(
      `SELECT (
         (f.admin_response IS NOT NULL AND trim(f.admin_response) <> '')
         OR EXISTS (
           SELECT 1 FROM public.user_feedback_replies r
           WHERE r.feedback_id = f.id AND r.is_staff = true
         )
       ) AS ok
       FROM public.user_feedback f
       WHERE f.id = $1`,
      [feedbackId]
    );
    return result.rows[0]?.ok === true;
  }

  async markAnsweredIfNeeded(feedbackId: string): Promise<void> {
    await query(
      `UPDATE public.user_feedback
       SET status = 'answered', updated_at = NOW()
       WHERE id = $1 AND status = 'open'`,
      [feedbackId]
    );
  }

  async findCompanyName(tenantId: string): Promise<string | null> {
    const result = await query<{ name: string }>(
      `SELECT name FROM public.companies WHERE id = $1`,
      [tenantId]
    );
    return result.rows[0]?.name ?? null;
  }
}
