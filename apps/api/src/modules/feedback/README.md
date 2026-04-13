# Módulo Feedback

## Descrição
Canal para usuários autenticados enviarem sugestões ou relatos sobre o produto, com registro de consentimento (LGPD) e resposta por super administrador.

## Regras de Negócio
- Envio: apenas usuário logado; `tenant_id` vem de `users.tenant_id` (NULL para super_admin).
- Consentimento: `consent_privacy_policy` deve ser `true`; caso contrário, erro 400.
- Isolamento: listagem “meus feedbacks” filtra por `tenant_id` + `user_id` do token (via usuário carregado no auth).
- Admin: listagem global e resposta apenas com `role === 'super_admin'`.
- **Status (`user_feedback.status`)**: `open` (em análise), `answered` (em andamento — conversa aberta), `resolved` (resolvido). Admin altera com `PATCH /feedback/admin/:id/status` (`SetUserFeedbackStatusSchema`). Em `resolved`, o dono **não** pode mais `POST /feedback/:id/replies` (erro `FEEDBACK_RESOLVED`); deve abrir novo feedback.
- Resposta principal: atualiza `status` para `answered` (exceto se já estiver `resolved` — mantém `resolved`), preenche `admin_response`, `responded_at`, `responded_by_user_id`. Evento `AUDIT_USER_FEEDBACK_RESPONSE`. Mudança só de status: log `AUDIT_USER_FEEDBACK_STATUS`.
- Conversa: mensagens extra em `user_feedback_replies` (`is_staff` = equipe). O usuário só pode responder no fio se `status !== 'resolved'` e já existir contato da equipe (`admin_response` ou reply `is_staff`). Follow-ups de equipe marcam `status=answered` se ainda estiver `open`.

## Dependências
- Tabelas: `public.user_feedback`, `public.user_feedback_replies`, `public.users`, `public.companies`.
- Auth: `authMiddleware` (sem `tenantMiddleware` — tenant vem do registro do usuário).

## Fluxos e Endpoints
- `POST /feedback` — corpo validado por `CreateUserFeedbackSchema`; cria linha com consentimento.
- `GET /feedback/mine?page&limit` — feedbacks do usuário atual.
- `GET /feedback/admin?status&search&page&limit` — super_admin, todos os tenants.
- `PATCH /feedback/admin/:id/respond` — super_admin; corpo `RespondUserFeedbackSchema`.
- `PATCH /feedback/admin/:id/status` — super_admin; corpo `SetUserFeedbackStatusSchema` (`open` | `answered` | `resolved`).
- `GET /feedback/thread/:id` — dono do feedback ou super_admin; retorna `feedback` + `replies[]` (preferido no portal).
- `GET /feedback/:id` — mesmo comportamento (alias).
- `POST /feedback/:id/replies` — dono; corpo `AppendFeedbackReplySchema` (resposta à equipe).
- `POST /feedback/admin/:id/replies` — super_admin; nova mensagem da equipe no mesmo fio.
