"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const company_service_1 = require("./company.service");
const company_repository_1 = require("./company.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const companyRoutes = new hono_1.Hono();
exports.companyRoutes = companyRoutes;
// Instanciar services
const companyRepo = new company_repository_1.CompanyRepository();
const companyService = new company_service_1.CompanyService(companyRepo);
/**
 * GET /companies
 * Listar todas as empresas (apenas super_admin)
 * Não requer tenantMiddleware
 */
companyRoutes.get('/', auth_middleware_1.authMiddleware, async (c) => {
    try {
        const currentUser = c.get('user');
        // Apenas super_admin pode listar todas as empresas
        if (currentUser.role !== 'super_admin') {
            return c.json({
                error: {
                    message: 'Only super admin can list all companies',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const companies = await companyRepo.findAll();
        return c.json({
            data: {
                companies,
                total: companies.length,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /companies
 * Criar nova empresa (sem tenantMiddleware - permite criar primeira empresa)
 * Requer autenticação
 * Apenas super_admin pode criar empresas
 */
companyRoutes.post('/', auth_middleware_1.authMiddleware, (0, zod_validator_1.zValidator)('json', core_1.CreateCompanySchema), async (c) => {
    try {
        const currentUser = c.get('user');
        // Apenas super_admin pode criar empresas
        if (currentUser.role !== 'super_admin') {
            return c.json({
                error: {
                    message: 'Only super admin can create companies',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const data = c.req.valid('json');
        // Criar empresa (schema será criado automaticamente pelo CompanyService)
        const company = await companyService.create(data);
        return c.json({
            data: {
                company,
            },
        }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
// Aplicar middlewares globais para outras rotas
companyRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
companyRoutes.use('/*', auth_middleware_1.authMiddleware);
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
            return c.json({
                error: {
                    message: 'Cannot access other companies',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const company = await companyService.getById(id);
        return c.json({
            data: {
                company,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /companies/:id
 * Atualizar empresa
 */
companyRoutes.put('/:id', (0, zod_validator_1.zValidator)('json', core_1.UpdateCompanySchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        const id = c.req.param('id');
        const currentUser = c.get('user');
        // Validar que usuário está acessando sua própria empresa
        if (id !== companyId) {
            return c.json({
                error: {
                    message: 'Cannot access other companies',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        // Apenas admin pode atualizar
        if (currentUser.role !== 'admin') {
            return c.json({
                error: {
                    message: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                },
            }, 403);
        }
        const data = c.req.valid('json');
        const company = await companyService.update(id, data);
        return c.json({
            data: {
                company,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
