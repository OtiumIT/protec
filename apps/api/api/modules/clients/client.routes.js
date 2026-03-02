"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const client_service_1 = require("./client.service");
const client_repository_1 = require("./client.repository");
const company_service_1 = require("../companies/company.service");
const company_repository_1 = require("../companies/company.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const client_1 = require("../../db/client");
const clientRoutes = new hono_1.Hono();
exports.clientRoutes = clientRoutes;
// Aplicar authMiddleware primeiro (para detectar super_admin)
clientRoutes.use('/*', auth_middleware_1.authMiddleware);
// Aplicar tenantMiddleware para extrair e validar companyId
clientRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
// Instanciar services
const clientRepo = new client_repository_1.ClientRepository();
const clientService = new client_service_1.ClientService(clientRepo);
const companyRepo = new company_repository_1.CompanyRepository();
const companyService = new company_service_1.CompanyService(companyRepo);
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
                    cnpj: company.cnpj || null,
                    email: company.email || null,
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
            return c.json({
                error: {
                    message: 'Company ID is required',
                    code: 'COMPANY_ID_REQUIRED',
                },
            }, 400);
        }
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
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
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
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
                    cnpj: client.cnpj,
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
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /clients
 * Criar cliente
 * Se for super_admin, cria também a empresa/tenant e o schema automaticamente
 */
clientRoutes.post('/', async (c) => {
    try {
        const currentUser = c.get('user');
        let companyId = c.get('companyId');
        // Se for super_admin criando empresa, usar CreateCompanySchema
        // Senão, usar CreateClientSchema
        let data;
        const body = await c.req.json();
        if (currentUser.role === 'super_admin' && !companyId) {
            // Validar com CreateCompanySchema
            const result = core_1.CreateCompanySchema.safeParse(body);
            if (!result.success) {
                return c.json({
                    error: {
                        message: 'Validation error',
                        code: 'VALIDATION_ERROR',
                        details: result.error.errors,
                    },
                }, 400);
            }
            data = result.data;
        }
        else {
            // Validar com CreateClientSchema
            const result = core_1.CreateClientSchema.safeParse(body);
            if (!result.success) {
                return c.json({
                    error: {
                        message: 'Validation error',
                        code: 'VALIDATION_ERROR',
                        details: result.error.errors,
                    },
                }, 400);
            }
            data = result.data;
            // Validar CNPJ para admin normal
            if (!data.cnpj) {
                return c.json({
                    error: {
                        message: 'CNPJ is required',
                        code: 'VALIDATION_ERROR',
                    },
                }, 400);
            }
        }
        // Se for super_admin e não tiver companyId, criar empresa/tenant automaticamente
        if (currentUser.role === 'super_admin' && !companyId) {
            try {
                // Criar empresa com todos os dados fornecidos
                // O CompanyService já tem proteção contra race conditions com SELECT FOR UPDATE
                const company = await companyService.create({
                    ...data,
                    domain: data.email ? data.email.split('@')[1] : data.domain,
                });
                companyId = company.id;
                // Setar companyId no context para que o tenantMiddleware funcione
                c.set('companyId', companyId);
                // Retornar apenas a empresa criada (não criar cliente dentro do tenant)
                return c.json({
                    data: {
                        client: {
                            id: company.id,
                            name: company.name,
                            domain: company.domain,
                            cnpj: company.cnpj,
                            status: 'active',
                            createdAt: company.created_at,
                        },
                        message: 'Empresa e schema criados automaticamente',
                    },
                }, 201);
            }
            catch (error) {
                // Se for erro de duplicata, retornar erro amigável
                if (error.code === 'CNPJ_ALREADY_EXISTS' || error.code === 'DOMAIN_ALREADY_EXISTS') {
                    return c.json({
                        error: {
                            message: error.message || 'Empresa já existe',
                            code: error.code,
                        },
                    }, 409);
                }
                throw error;
            }
        }
        // Setar search_path para o schema do tenant
        if (!companyId) {
            return c.json({
                error: {
                    message: 'Company ID is required',
                    code: 'COMPANY_ID_REQUIRED',
                },
            }, 400);
        }
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        // Criar cliente no schema do tenant (apenas para admin normal)
        const client = await clientService.create({
            name: data.name,
            cnpj: data.cnpj,
            email: data.email,
            tax_regime: data.tax_regime,
            cnae: data.cnae,
            state_registration: data.state_registration,
            municipal_registration: data.municipal_registration,
            notes: data.notes,
        });
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
                },
            },
        }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /clients/:id
 * Atualizar cliente
 */
clientRoutes.put('/:id', (0, zod_validator_1.zValidator)('json', core_1.UpdateClientSchema), async (c) => {
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
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
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
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
