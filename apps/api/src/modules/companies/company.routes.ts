import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CompanyService } from './company.service';
import { CompanyRepository } from './company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { UpdateCompanySchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const companyRoutes = new Hono();

// Aplicar middlewares globais
companyRoutes.use('/*', tenantMiddleware);
companyRoutes.use('/*', authMiddleware);

// Instanciar services
const companyRepo = new CompanyRepository();
const companyService = new CompanyService(companyRepo);

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
