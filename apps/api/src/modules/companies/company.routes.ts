import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { UpdateCompanySchema, CreateCompanySchema, UpdateCompanyBrandingSchema } from '@shared/core';
import { errorHandler, AppError } from '../../shared/utils/error-handler';
import { uploadBrandingLogo } from '../../shared/services/storage.service';

const companyRoutes = new Hono();

// Instanciar services
const companyRepo = new CompanyRepository();
const companyService = new CompanyService(companyRepo);

/**
 * GET /companies
 * Listar todas as empresas (apenas super_admin)
 * Não requer tenantMiddleware
 */
companyRoutes.get(
  '/',
  authMiddleware,
  async (c) => {
    try {
      const currentUser = c.get('user');
      
      // Apenas super_admin pode listar todas as empresas
      if (currentUser.role !== 'super_admin') {
        return c.json(
          {
            error: {
              message: 'Only super admin can list all companies',
              code: 'FORBIDDEN',
            },
          },
          403
        );
      }

      const includeSubscription = c.req.query('includeSubscription') === 'true';

      if (includeSubscription) {
        const rows = await companyRepo.findAllWithLatestSubscriptionPlan();
        const companies = rows.map((r) => {
          const {
            latest_subscription_status,
            resolved_plan_id,
            resolved_plan_name,
            resolved_plan_is_custom,
            resolved_plan_is_managed,
            ...company
          } = r;
          const plan =
            resolved_plan_id && resolved_plan_name
              ? {
                  id: resolved_plan_id,
                  name: resolved_plan_name,
                  isCustom: resolved_plan_is_custom ?? undefined,
                  isManaged: resolved_plan_is_managed ?? undefined,
                }
              : null;
          return {
            ...company,
            plan,
            subscriptionStatus: latest_subscription_status,
          };
        });
        return c.json({
          data: {
            companies,
            total: companies.length,
          },
        });
      }

      const companies = await companyRepo.findAll();

      return c.json({
        data: {
          companies,
          total: companies.length,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /companies
 * Criar nova empresa (sem tenantMiddleware - permite criar primeira empresa)
 * Requer autenticação
 * Apenas super_admin pode criar empresas
 */
companyRoutes.post(
  '/',
  authMiddleware,
  zValidator('json', CreateCompanySchema),
  async (c) => {
    try {
      const currentUser = c.get('user');
      
      // Apenas super_admin pode criar empresas
      if (currentUser.role !== 'super_admin') {
        return c.json(
          {
            error: {
              message: 'Only super admin can create companies',
              code: 'FORBIDDEN',
            },
          },
          403
        );
      }

      const data = c.req.valid('json');
      
      // Criar empresa (schema será criado automaticamente pelo CompanyService)
      const company = await companyService.create(data);

      return c.json(
        {
          data: {
            company,
          },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

// Aplicar middlewares globais para outras rotas
companyRoutes.use('/*', tenantMiddleware);
companyRoutes.use('/*', authMiddleware);

/**
 * GET /companies/:id
 * Buscar empresa por ID
 */
companyRoutes.get('/:id', async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    // Validar que usuário está acessando sua própria empresa
    if (id !== companyId) {
      return c.json(
        {
          error: {
            message: 'Cannot access other companies',
            code: 'FORBIDDEN',
          },
        },
        403
      );
    }

    const company = await companyService.getById(id);

    return c.json({
      data: {
        company,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * PUT /companies/:id
 * Atualizar empresa
 */
companyRoutes.put(
  '/:id',
  zValidator('json', UpdateCompanySchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');
      const currentUser = c.get('user');

      // Validar que usuário está acessando sua própria empresa
      if (id !== companyId) {
        return c.json(
          {
            error: {
              message: 'Cannot access other companies',
              code: 'FORBIDDEN',
            },
          },
          403
        );
      }

      // Apenas admin pode atualizar
      if (currentUser.role !== 'admin') {
        return c.json(
          {
            error: {
              message: 'Insufficient permissions',
              code: 'FORBIDDEN',
            },
          },
          403
        );
      }

      const data = c.req.valid('json');
      const company = await companyService.update(id, data);

      return c.json({
        data: {
          company,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PATCH /companies/:id/branding
 * Atualizar logo e marca da empresa para relatórios
 */
companyRoutes.patch(
  '/:id/branding',
  zValidator('json', UpdateCompanyBrandingSchema),
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');
      const currentUser = c.get('user');

      if (id !== companyId) {
        return c.json(
          { error: { message: 'Cannot access other companies', code: 'FORBIDDEN' } },
          403
        );
      }

      if (currentUser.role !== 'admin') {
        return c.json(
          { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
          403
        );
      }

      const data = c.req.valid('json');
      const company = await companyService.update(id, data);

      return c.json({ data: { company } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /companies/:id/branding/logo
 * Upload de logo da empresa (max 2MB, png/jpg/webp/svg)
 */
companyRoutes.post(
  '/:id/branding/logo',
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');
      const currentUser = c.get('user');

      if (id !== companyId) {
        return c.json({ error: { message: 'Cannot access other companies', code: 'FORBIDDEN' } }, 403);
      }
      if (currentUser.role !== 'admin') {
        return c.json({ error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } }, 403);
      }

      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      if (!file || !(file instanceof File)) {
        throw new AppError('File is required', 'VALIDATION_ERROR', 400);
      }

      const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!ALLOWED.includes(file.type)) {
        throw new AppError('Only PNG, JPEG, WebP and SVG are allowed', 'VALIDATION_ERROR', 400);
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new AppError('File too large (max 2MB)', 'VALIDATION_ERROR', 400);
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const publicUrl = await uploadBrandingLogo(companyId, buffer, file.type);
      await companyService.update(companyId, { report_logo_url: publicUrl });

      return c.json({ data: { report_logo_url: publicUrl } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /companies/:id/branding
 * Retornar apenas dados de branding (leve, sem dados sensíveis)
 */
companyRoutes.get(
  '/:id/branding',
  async (c) => {
    try {
      const companyId = c.get('companyId');
      const id = c.req.param('id');

      if (id !== companyId) {
        return c.json(
          { error: { message: 'Cannot access other companies', code: 'FORBIDDEN' } },
          403
        );
      }

      const branding = await companyRepo.findBranding(id);
      if (!branding) {
        return c.json(
          { error: { message: 'Company not found', code: 'COMPANY_NOT_FOUND' } },
          404
        );
      }

      return c.json({ data: { branding } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { companyRoutes };
