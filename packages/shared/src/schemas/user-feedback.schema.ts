import { z } from 'zod';

export const UserFeedbackCategorySchema = z.enum(['suggestion', 'problem', 'other']);

export const CreateUserFeedbackSchema = z.object({
  category: UserFeedbackCategorySchema,
  message: z.string().trim().min(10, 'Mensagem muito curta').max(8000),
  page_path: z.string().trim().max(600).optional(),
  /** Obrigatório true no servidor — confirmação de base legal (LGPD). */
  consent_privacy_policy: z.literal(true),
});

export const RespondUserFeedbackSchema = z.object({
  admin_response: z.string().trim().min(1).max(8000),
});

/** Resposta do usuário à equipe ou nova mensagem da equipe no mesmo fio. */
export const AppendFeedbackReplySchema = z.object({
  message: z.string().trim().min(1, 'Mensagem obrigatória').max(8000),
});

/** Fluxo operacional (admin): em análise, em andamento ou resolvido. */
export const UserFeedbackWorkflowStatusSchema = z.enum(['open', 'answered', 'resolved']);

export const SetUserFeedbackStatusSchema = z.object({
  status: UserFeedbackWorkflowStatusSchema,
});

export type CreateUserFeedbackInput = z.infer<typeof CreateUserFeedbackSchema>;
export type RespondUserFeedbackInput = z.infer<typeof RespondUserFeedbackSchema>;
export type AppendFeedbackReplyInput = z.infer<typeof AppendFeedbackReplySchema>;
export type UserFeedbackWorkflowStatus = z.infer<typeof UserFeedbackWorkflowStatusSchema>;
export type SetUserFeedbackStatusInput = z.infer<typeof SetUserFeedbackStatusSchema>;
