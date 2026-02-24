import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateUserSchema, UpdateUserSchema } from '@shared/core';
import type { User } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

/** Formata User para resposta da API (já com tenant_id). */
function toUserResponse(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant_id: user.tenant_id,
    status: user.status || 'active',
    ...(user.created_at != null && { created_at: user.created_at }),
    ...(user.updated_at != null && { updated_at: user.updated_at }),
  };
}

const userRoutes = new Hono();

// Instanciar services
const userRepo = new UserRepository();
const subscriptionRepo = new SubscriptionRepository();
const planRepo = new PlanRepository();
const subscriptionService = new SubscriptionService(subscriptionRepo, planRepo);
const userService = new UserService(userRepo, subscriptionService);

// Aplicar authMiddleware em todas as rotas primeiro
userRoutes.use('/*', authMiddleware);

// Aplicar tenantMiddleware em todas as rotas
// O tenantMiddleware já trata super_admin e rotas admin automaticamente
userRoutes.use('/*', tenantMiddleware);

// IMPORTANTE: Rotas admin devem ser definidas ANTES das rotas dinâmicas (/:id)
// para evitar que "admin" seja capturado como parâmetro dinâmico
// Criar grupo de rotas admin
const adminRoutes = new Hono();
adminRoutes.use('*', authMiddleware);

/**
 * GET /users/admin?companyId=xxx
 * Listar usuários de um tenant específico (apenas super_admin)
 */
adminRoutes.get('/admin', async (c) => {
  try {
    console.log('[GET /users/admin] Rota admin acessada');
    const currentUser = c.get('user');
    const companyIdFromContext = c.get('companyId');
    const companyIdFromQuery = c.req.query('companyId');
    const companyIdFromHeader = c.req.header('X-Tenant-ID');
    
    console.log('[GET /users/admin] Usuário:', currentUser?.role);
    console.log('[GET /users/admin] companyId - Context:', companyIdFromContext);
    console.log('[GET /users/admin] companyId - Query:', companyIdFromQuery);
    console.log('[GET /users/admin] companyId - Header:', companyIdFromHeader);
    
    if (currentUser.role !== 'super_admin') {
      return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
    }
    
    // Usar companyId do contexto (setado pelo middleware), query param ou header
    let companyId = companyIdFromContext || companyIdFromQuery || companyIdFromHeader;
    console.log('[GET /users/admin] companyId final (antes da validação):', companyId);
    
    // Validar que companyId é um UUID válido (não pode ser "admin" ou outro valor inválido)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (companyId && !uuidRegex.test(companyId)) {
      console.error('[GET /users/admin] companyId inválido (não é UUID):', companyId);
      return c.json({ error: { message: 'Invalid companyId format (must be UUID)', code: 'VALIDATION_ERROR' } }, 400);
    }
    
    if (!companyId) {
      return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
    }
    
    console.log('[GET /users/admin] companyId final (validado):', companyId);
    
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const role = c.req.query('role');
    
    const result = await userService.list(companyId, { page, limit, role });
    
    return c.json({
      data: {
        users: result.users.map(toUserResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error('[GET /users/admin] Erro:', error);
    return errorHandler(error, c);
  }
});

/**
 * POST /users/admin?companyId=xxx
 * Criar usuário para um tenant específico (apenas super_admin)
 */
adminRoutes.post(
  '/admin',
  zValidator('json', CreateUserSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }
      
      const companyId = c.req.query('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'companyId is required', code: 'VALIDATION_ERROR' } }, 400);
      }
      
      const data = c.req.valid('json');
      
      const user = await userService.create(companyId, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      
      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /users/admin/super-admin
 * Criar super_admin (sem company_id)
 */
adminRoutes.post(
  '/admin/super-admin',
  zValidator('json', CreateUserSchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      if (currentUser.role !== 'super_admin') {
        return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
      }
      
      const data = c.req.valid('json');
      
      // Criar super_admin sem company_id
      const user = await userService.createSuperAdmin({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      
      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /users/admin/super-admins
 * Listar todos os super_admins (apenas super_admin)
 */
adminRoutes.get('/admin/super-admins', async (c) => {
  try {
    const currentUser = c.get('user');
    if (!currentUser) {
      return c.json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, 401);
    }
    if (currentUser.role !== 'super_admin') {
      return c.json({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }, 403);
    }
    
    const users = await userService.listSuperAdmins();
    console.log('[GET /users/admin/super-admins] Found', users.length, 'super admins');
    
    return c.json({ data: { users: users.map(toUserResponse) } });
  } catch (error) {
    console.error('[GET /users/admin/super-admins] Error:', error);
    console.error('[GET /users/admin/super-admins] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return errorHandler(error, c);
  }
});

// Montar rotas admin ANTES das rotas dinâmicas
userRoutes.route('/', adminRoutes);

/**
 * GET /users
 * Listar usuários com paginação
 */
userRoutes.get('/', async (c) => {
  try {
    const tenantId = c.get('companyId');
    if (!tenantId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const role = c.req.query('role');

    const result = await userService.list(tenantId, { page, limit, role });

    return c.json({
      data: {
        users: result.users.map(toUserResponse),
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

// NOTA: Rotas dinâmicas (/:id) devem ser definidas DEPOIS das rotas admin
// para evitar que "admin" seja capturado como :id

/**
 * GET /users/:id
 * Buscar usuário por ID
 * IMPORTANTE: Esta rota deve vir DEPOIS das rotas admin para evitar conflitos
 */
userRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Evitar que "admin" seja capturado como :id
    // Se for "admin", deixar o Hono processar as rotas admin primeiro
    if (id === 'admin') {
      // Retornar 404 ou deixar passar para as rotas admin
      // Na verdade, se chegou aqui, significa que a rota admin não foi encontrada
      return c.json({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404);
    }
    
    const tenantId = c.get('companyId');
    if (!tenantId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }

    const user = await userService.getById(id, tenantId);

    return c.json({
      data: { user: toUserResponse(user) },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/** Mensagem amigável para erros de validação Zod no cadastro de usuário */
function formatCreateUserValidationMessage(err: { errors: Array<{ path: (string | number)[]; message: string }> }): string {
  const first = err.errors[0];
  if (!first) return 'Dados inválidos. Verifique nome, e-mail e senha.';
  const path = first.path[0];
  if (path === 'name') return 'Nome deve ter no mínimo 3 caracteres.';
  if (path === 'email') return 'Informe um e-mail válido.';
  if (path === 'password') return 'Senha deve ter no mínimo 8 caracteres.';
  if (path === 'role') return 'Perfil (role) inválido.';
  return first.message || 'Dados inválidos. Verifique os campos e tente novamente.';
}

/**
 * POST /users
 * Criar usuário
 */
userRoutes.post(
  '/',
  zValidator('json', CreateUserSchema, (result, c) => {
    if (!result.success) {
      const message = formatCreateUserValidationMessage(result.error);
      return c.json(
        { error: { message, code: 'VALIDATION_ERROR', details: result.error.errors } },
        400
      );
    }
    return;
  }),
  async (c) => {
    try {
      const tenantId = c.get('companyId'); // id do tenant (escritório); company_id no payload seria id do cliente
      if (!tenantId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const data = c.req.valid('json');

      const user = await userService.create(tenantId, {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      return c.json(
        { data: { user: toUserResponse(user) } },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /users/:id
 * Atualizar usuário
 */
userRoutes.put(
  '/:id',
  zValidator('json', UpdateUserSchema),
  async (c) => {
    try {
      const tenantId = c.get('companyId');
      if (!tenantId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const id = c.req.param('id');
      const data = c.req.valid('json');
      const currentUser = c.get('user');

      const user = await userService.update(id, tenantId, data, currentUser);

      return c.json({
        data: { user: toUserResponse(user) },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /users/:id
 * Deletar usuário
 */
userRoutes.delete('/:id', async (c) => {
  try {
    const tenantId = c.get('companyId');
    if (!tenantId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const id = c.req.param('id');
    const currentUser = c.get('user');

    await userService.delete(id, tenantId, currentUser);

    return c.json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { userRoutes };
