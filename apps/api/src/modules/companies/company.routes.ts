import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { UpdateCompanySchema, CreateCompanySchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

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

export { companyRoutes };
