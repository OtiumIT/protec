import type { User } from '@shared/core';
import { FeedbackRepository } from './feedback.repository';
import { AppError } from '../../shared/utils/error-handler';
import { emailService } from '../../shared/services/email.service';

export class FeedbackService {
  private repo = new FeedbackRepository();

  async create(
    user: User,
    input: {
      category: string;
      message: string;
      page_path?: string;
      consent_privacy_policy: true;
    }
  ) {
    if (!input.consent_privacy_policy) {
      throw new AppError('É necessário aceitar a Política de Privacidade para enviar feedback.', 'CONSENT_REQUIRED', 400);
    }

    const tenantId = user.tenant_id ?? null;

    const row = await this.repo.insert({
      tenantId,
      userId: user.id,
      category: input.category,
      message: input.message.trim(),
      pagePath: input.page_path?.trim() || null,
      consentPrivacyPolicy: true,
    });

    const companyName = tenantId ? await this.repo.findCompanyName(tenantId).catch(() => null) : null;

    emailService
      .sendFeedbackReceivedNotification({
        userName: user.name,
        userEmail: user.email,
        message: input.message.trim(),
        companyName,
      })
      .catch((err) => console.error('[email] Erro ao notificar equipe sobre novo feedback:', err));

    return row;
  }

  async listMine(user: User, page?: number, limit?: number) {
    const tenantId = user.tenant_id ?? null;
    return this.repo.listForUser({ tenantId, userId: user.id, page, limit });
  }

  async listAdmin(
    actor: User,
    filters: { status?: 'open' | 'answered' | 'resolved'; search?: string; page?: number; limit?: number }
  ) {
    if (actor.role !== 'super_admin') {
      throw new AppError('Acesso restrito a super administradores', 'FORBIDDEN', 403);
    }
    return this.repo.listAllAdmin(filters);
  }

  async respond(actor: User, feedbackId: string, adminResponse: string) {
    if (actor.role !== 'super_admin') {
      throw new AppError('Acesso restrito a super administradores', 'FORBIDDEN', 403);
    }

    const existing = await this.repo.findById(feedbackId);
    if (!existing) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }

    const updated = await this.repo.setAdminResponse(feedbackId, adminResponse.trim(), actor.id);
    if (!updated) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }

    console.log(
      JSON.stringify({
        event: 'AUDIT_USER_FEEDBACK_RESPONSE',
        timestamp: new Date().toISOString(),
        actor_user_id: actor.id,
        feedback_id: feedbackId,
        feedback_tenant_id: existing.tenant_id,
        feedback_author_user_id: existing.user_id,
      })
    );

    emailService
      .sendFeedbackResponseNotification({
        toEmail: existing.user_email,
        userName: existing.user_name,
        adminResponse: adminResponse.trim(),
      })
      .catch((err) => console.error('[email] Erro ao notificar usuário sobre resposta ao feedback:', err));

    return updated;
  }

  async setWorkflowStatus(actor: User, feedbackId: string, status: 'open' | 'answered' | 'resolved') {
    if (actor.role !== 'super_admin') {
      throw new AppError('Acesso restrito a super administradores', 'FORBIDDEN', 403);
    }
    const existing = await this.repo.findById(feedbackId);
    if (!existing) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }
    const updated = await this.repo.setWorkflowStatus(feedbackId, status);
    if (!updated) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }
    console.log(
      JSON.stringify({
        event: 'AUDIT_USER_FEEDBACK_STATUS',
        timestamp: new Date().toISOString(),
        actor_user_id: actor.id,
        feedback_id: feedbackId,
        new_status: status,
        feedback_tenant_id: existing.tenant_id,
      })
    );
    return updated;
  }

  async getThread(actor: User, feedbackId: string) {
    const row = await this.repo.findById(feedbackId);
    if (!row) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }
    const isSuper = actor.role?.toLowerCase() === 'super_admin';
    const tenantId = actor.tenant_id ?? null;
    const isOwner =
      row.user_id === actor.id &&
      (tenantId === null ? row.tenant_id === null : row.tenant_id === tenantId);
    if (!isSuper && !isOwner) {
      throw new AppError('Acesso negado', 'FORBIDDEN', 403);
    }
    const replies = await this.repo.listReplies(feedbackId);
    return { feedback: row, replies };
  }

  async addUserReply(actor: User, feedbackId: string, message: string) {
    const row = await this.repo.findById(feedbackId);
    if (!row) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }
    const tenantId = actor.tenant_id ?? null;
    const isOwner =
      row.user_id === actor.id &&
      (tenantId === null ? row.tenant_id === null : row.tenant_id === tenantId);
    if (!isOwner) {
      throw new AppError('Acesso negado', 'FORBIDDEN', 403);
    }
    if (row.status === 'resolved') {
      throw new AppError(
        'Este feedback foi encerrado como resolvido. Abra um novo envio para continuar o assunto.',
        'FEEDBACK_RESOLVED',
        400
      );
    }
    const canReply = await this.repo.hasStaffContact(feedbackId);
    if (!canReply) {
      throw new AppError(
        'Só é possível responder após a equipe enviar uma resposta.',
        'FEEDBACK_NO_STAFF_REPLY_YET',
        400
      );
    }
    const reply = await this.repo.insertReply({
      feedbackId,
      authorUserId: actor.id,
      isStaff: false,
      body: message.trim(),
    });

    emailService
      .sendFeedbackUserReplyNotification({
        userName: row.user_name,
        userEmail: row.user_email,
        companyName: row.company_name ?? null,
        message: message.trim(),
      })
      .catch((err) => console.error('[email] Erro ao notificar equipe sobre reply do usuário:', err));

    return reply;
  }

  async addAdminThreadReply(actor: User, feedbackId: string, message: string) {
    if (actor.role?.toLowerCase() !== 'super_admin') {
      throw new AppError('Acesso restrito a super administradores', 'FORBIDDEN', 403);
    }
    const row = await this.repo.findById(feedbackId);
    if (!row) {
      throw new AppError('Feedback não encontrado', 'NOT_FOUND', 404);
    }
    const reply = await this.repo.insertReply({
      feedbackId,
      authorUserId: actor.id,
      isStaff: true,
      body: message.trim(),
    });
    await this.repo.markAnsweredIfNeeded(feedbackId);
    console.log(
      JSON.stringify({
        event: 'AUDIT_USER_FEEDBACK_THREAD_REPLY',
        timestamp: new Date().toISOString(),
        actor_user_id: actor.id,
        feedback_id: feedbackId,
        reply_id: reply.id,
      })
    );

    emailService
      .sendFeedbackResponseNotification({
        toEmail: row.user_email,
        userName: row.user_name,
        adminResponse: message.trim(),
      })
      .catch((err) => console.error('[email] Erro ao notificar usuário sobre reply da equipe:', err));

    return reply;
  }
}
