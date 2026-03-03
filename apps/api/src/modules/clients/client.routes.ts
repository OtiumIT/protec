import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { ClientService } from './client.service';
import { ClientRepository } from './client.repository';
import { CompanyService } from '../companies/company.service';
import { CompanyRepository } from '../companies/company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { CreateClientSchema, UpdateClientSchema, CreateCompanySchema } from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';
import { query } from '../../db/client';

const clientRoutes = new Hono();

// Aplicar authMiddleware primeiro (para detectar super_admin)
clientRoutes.use('/*', authMiddleware);
// Aplicar tenantMiddleware para extrair e validar companyId
clientRoutes.use('/*', tenantMiddleware);

// Instanciar services
const clientRepo = new ClientRepository();
const clientService = new ClientService(clientRepo);
const companyRepo = new CompanyRepository();
const companyService = new CompanyService(companyRepo);

/**
 * GET /clients
 * Listar clientes com paginação
 * Para super_admin sem tenant, listar todas as empresas (tenants)
 */
clientRoutes.get('/', async (c) => {
  try {
    const currentUser = c.get('user');
    const companyId = c.get('companyId');

    // Se for super_admin sem tenant, listar todas as empresas
    if (currentUser.role === 'super_admin' && !companyId) {
      const companies = await companyRepo.findAll();
      console.log('Super admin - Companies found:', companies.length);
      const clientsData = companies.map(company => {
        const created_at = company.created_at 
          ? (typeof company.created_at === 'string' ? company.created_at : new Date(company.created_at).toISOString())
          : new Date().toISOString();
        return {
          id: company.id,
          name: company.name,
          domain: company.domain,
          person_type: company.person_type,
          cnpj: company.cnpj || null,
          cpf: company.cpf || null,
          email: company.email || company.contact_email || null,
          status: 'active', // Todas as empresas são consideradas ativas
          created_at, // Usar snake_case para compatibilidade
        };
      });
      console.log('Super admin - Clients data:', clientsData.length);
      return c.json({
        data: {
          clients: clientsData,
          total: companies.length,
          page: 1,
          limit: companies.length,
        },
      });
    }

    // Setar search_path para o schema do tenant
    if (!companyId) {
      return c.json(
        {
          error: {
            message: 'Company ID is required',
            code: 'COMPANY_ID_REQUIRED',
          },
        },
        400
      );
    }
    const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
    await query(`SET search_path TO "${schemaName}", public`);

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const status = c.req.query('status');

    const result = await clientService.list({ page, limit, status });

    // Garantir que todos os clientes tenham status definido
    const clientsWithStatus = result.clients.map(client => ({
      ...client,
      status: client.status || 'active', // Default para 'active' se não tiver status
    }));

    return c.json({
      data: {
        ...result,
        clients: clientsWithStatus,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /clients/:id
 * Buscar cliente por ID
 */
clientRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Schema já isola por tenant, não precisa companyId
    const client = await clientService.getById(id);

    return c.json({
      data: {
        client: {
          id: client.id,
          name: client.name,
          person_type: client.person_type,
          cnpj: client.cnpj,
          cpf: client.cpf,
          email: client.email,
          status: client.status,
          tax_regime: client.tax_regime,
          cnae: client.cnae,
          state_registration: client.state_registration,
          municipal_registration: client.municipal_registration,
          notes: client.notes,
          created_at: client.created_at,
          updated_at: client.updated_at,
        },
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /clients
 * Criar cliente
 * Se for super_admin, cria também a empresa/tenant e o schema automaticamente
 */
clientRoutes.post(
  '/',
  async (c) => {
    try {
      const currentUser = c.get('user');
      let companyId = c.get('companyId');
      
      // Se for super_admin criando empresa, usar CreateCompanySchema
      // Senão, usar CreateClientSchema
      let data: any;
      const body = await c.req.json();
      
      if (currentUser.role === 'super_admin' && !companyId) {
        // Validar com CreateCompanySchema
        const result = CreateCompanySchema.safeParse(body);
        if (!result.success) {
          return c.json(
            {
              error: {
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: result.error.errors,
              },
            },
            400
          );
        }
        data = result.data;
      } else {
        // Validar com CreateClientSchema
        const result = CreateClientSchema.safeParse(body);
        if (!result.success) {
          return c.json(
            {
              error: {
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: result.error.errors,
              },
            },
            400
          );
        }
        data = result.data;
      }

      // Se for super_admin e não tiver companyId, criar empresa/tenant automaticamente
      if (currentUser.role === 'super_admin' && !companyId) {
        try {
          const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
          const cpfDigits = (data.cpf || '').replace(/\D/g, '');
          const company = await companyService.create({
            ...data,
            person_type: data.person_type || 'pj',
            cnpj: cnpjDigits || undefined,
            cpf: cpfDigits || undefined,
            contact_email: data.contact_email || data.email,
            domain: (data.contact_email || data.email) ? (data.contact_email || data.email).split('@')[1] : data.domain,
          });
          companyId = company.id;
          
          // Setar companyId no context para que o tenantMiddleware funcione
          c.set('companyId', companyId);
          
          // Retornar apenas a empresa criada (não criar cliente dentro do tenant)
          return c.json(
            {
              data: {
                client: {
                  id: company.id,
                  name: company.name,
                  domain: company.domain,
                  person_type: company.person_type,
                  cnpj: company.cnpj,
                  cpf: company.cpf,
                  status: 'active',
                  createdAt: company.created_at,
                },
                message: 'Empresa e schema criados automaticamente',
              },
            },
            201
          );
        } catch (error: any) {
          if (error.code === 'CNPJ_ALREADY_EXISTS' || error.code === 'CPF_ALREADY_EXISTS' || error.code === 'DOMAIN_ALREADY_EXISTS') {
            return c.json(
              {
                error: {
                  message: error.message || 'Empresa já existe',
                  code: error.code,
                },
              },
              409
            );
          }
          throw error;
        }
      }

      // Setar search_path para o schema do tenant
      if (!companyId) {
        return c.json(
          {
            error: {
              message: 'Company ID is required',
              code: 'COMPANY_ID_REQUIRED',
            },
          },
          400
        );
      }
      const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
      await query(`SET search_path TO "${schemaName}", public`);

      const cnpjDigits = (data.cnpj || '').replace(/\D/g, '');
      const cpfDigits = (data.cpf || '').replace(/\D/g, '');
      const client = await clientService.create({
        name: data.name,
        person_type: data.person_type || 'pj',
        cnpj: cnpjDigits || undefined,
        cpf: cpfDigits || undefined,
        email: data.email,
        tax_regime: data.tax_regime,
        cnae: data.cnae,
        state_registration: data.state_registration,
        municipal_registration: data.municipal_registration,
        notes: data.notes,
      });

      return c.json(
        {
          data: {
            client: {
              id: client.id,
              name: client.name,
              cnpj: client.cnpj,
              email: client.email,
              status: client.status,
              tax_regime: client.tax_regime,
              cnae: client.cnae,
              state_registration: client.state_registration,
              municipal_registration: client.municipal_registration,
              notes: client.notes,
            },
          },
        },
        201
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /clients/:id
 * Atualizar cliente
 */
clientRoutes.put(
  '/:id',
  zValidator('json', UpdateClientSchema),
  async (c) => {
    try {
      const id = c.req.param('id');
      const data = c.req.valid('json');

      // Schema já isola por tenant, não precisa companyId
      const client = await clientService.update(id, data);

      return c.json({
        data: {
          client: {
            id: client.id,
            name: client.name,
            cnpj: client.cnpj,
            email: client.email,
            status: client.status,
            tax_regime: client.tax_regime,
            cnae: client.cnae,
            state_registration: client.state_registration,
            municipal_registration: client.municipal_registration,
            notes: client.notes,
            updated_at: client.updated_at,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /clients/:id
 * Deletar cliente
 */
clientRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    // Schema já isola por tenant, não precisa companyId
    await clientService.delete(id);

    return c.json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

export { clientRoutes };
