import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  AppendFeedbackReplySchema,
  CreateUserFeedbackSchema,
  RespondUserFeedbackSchema,
  SetUserFeedbackStatusSchema,
} from '@shared/core';
import { authMiddleware } from '../../middleware/auth.middleware';
import { errorHandler } from '../../shared/utils/error-handler';
import { FeedbackService } from './feedback.service';

const FeedbackIdParamSchema = z.object({ id: z.string().uuid() });

const feedbackRoutes = new Hono();
const service = new FeedbackService();

feedbackRoutes.use('/*', authMiddleware);

feedbackRoutes.post('/', zValidator('json', CreateUserFeedbackSchema), async (c) => {
  try {
    const user = c.get('user');
    const body = c.req.valid('json');
    const row = await service.create(user, body);
    return c.json({ data: { feedback: row } }, 201);
  } catch (error) {
    return errorHandler(error, c);
  }
});

feedbackRoutes.get('/mine', async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const result = await service.listMine(user, page, limit);
    return c.json({ data: result });
  } catch (error) {
    return errorHandler(error, c);
  }
});

feedbackRoutes.get('/admin', async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status') as 'open' | 'answered' | 'resolved' | undefined;
    const search = c.req.query('search') || undefined;
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const result = await service.listAdmin(user, {
      status:
        status === 'open' || status === 'answered' || status === 'resolved' ? status : undefined,
      search,
      page,
      limit,
    });
    return c.json({ data: result });
  } catch (error) {
    return errorHandler(error, c);
  }
});

feedbackRoutes.patch(
  '/admin/:id/respond',
  zValidator('param', FeedbackIdParamSchema),
  zValidator('json', RespondUserFeedbackSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.valid('param');
      const { admin_response } = c.req.valid('json');
      const row = await service.respond(user, id, admin_response);
      return c.json({ data: { feedback: row } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

feedbackRoutes.patch(
  '/admin/:id/status',
  zValidator('param', FeedbackIdParamSchema),
  zValidator('json', SetUserFeedbackStatusSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.valid('param');
      const { status } = c.req.valid('json');
      const row = await service.setWorkflowStatus(user, id, status);
      return c.json({ data: { feedback: row } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

feedbackRoutes.post(
  '/admin/:id/replies',
  zValidator('param', FeedbackIdParamSchema),
  zValidator('json', AppendFeedbackReplySchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.valid('param');
      const { message } = c.req.valid('json');
      const reply = await service.addAdminThreadReply(user, id, message);
      return c.json({ data: { reply } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/** GET /thread/:id fica no router raiz (`modules/index.ts`). Aqui mantém-se só o alias curto. */
feedbackRoutes.get('/:id', zValidator('param', FeedbackIdParamSchema), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const data = await service.getThread(user, id);
    return c.json({ data });
  } catch (error) {
    return errorHandler(error, c);
  }
});

feedbackRoutes.post(
  '/:id/replies',
  zValidator('param', FeedbackIdParamSchema),
  zValidator('json', AppendFeedbackReplySchema),
  async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.valid('param');
      const { message } = c.req.valid('json');
      const reply = await service.addUserReply(user, id, message);
      return c.json({ data: { reply } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { feedbackRoutes };
