"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judicialProcessRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const judicial_process_service_1 = require("./judicial-process.service");
const judicial_process_repository_1 = require("./judicial-process.repository");
const client_repository_1 = require("../clients/client.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const client_1 = require("../../db/client");
const judicialProcessRoutes = new hono_1.Hono();
exports.judicialProcessRoutes = judicialProcessRoutes;
// Aplicar middlewares
judicialProcessRoutes.use('/*', auth_middleware_1.authMiddleware);
judicialProcessRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
// Instanciar services
const processRepo = new judicial_process_repository_1.JudicialProcessRepository();
const clientRepo = new client_repository_1.ClientRepository();
const processService = new judicial_process_service_1.JudicialProcessService(processRepo, clientRepo);
/**
 * GET /judicial-processes/client/:clientId
 * Listar processos judiciais de um cliente
 */
judicialProcessRoutes.get('/client/:clientId', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const clientId = c.req.param('clientId');
        const processes = await processService.findByClientId(clientId);
        return c.json({ data: { processes } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /judicial-processes/:id
 * Buscar processo por ID
 */
judicialProcessRoutes.get('/:id', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const id = c.req.param('id');
        const process = await processService.findById(id);
        return c.json({ data: { process } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /judicial-processes/client/:clientId/eligible-theses
 * Obter teses elegíveis para um cliente
 */
judicialProcessRoutes.get('/client/:clientId/eligible-theses', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const clientId = c.req.param('clientId');
        const eligibleTheses = await processService.getEligibleTheses(clientId);
        return c.json({ data: { eligible_theses: eligibleTheses } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /judicial-processes
 * Criar processo judicial
 */
judicialProcessRoutes.post('/', (0, zod_validator_1.zValidator)('json', core_1.CreateJudicialProcessSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const data = c.req.valid('json');
        const process = await processService.create(data);
        return c.json({ data: { process } }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /judicial-processes/:id
 * Atualizar processo judicial
 */
judicialProcessRoutes.put('/:id', (0, zod_validator_1.zValidator)('json', core_1.UpdateJudicialProcessSchema), async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const process = await processService.update(id, data);
        return c.json({ data: { process } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * DELETE /judicial-processes/:id
 * Deletar processo judicial
 */
judicialProcessRoutes.delete('/:id', async (c) => {
    try {
        const companyId = c.get('companyId');
        if (!companyId) {
            return c.json({ error: { message: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' } }, 400);
        }
        // Setar search_path para o schema do tenant
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        await (0, client_1.query)(`SET search_path TO "${schemaName}", public`);
        const id = c.req.param('id');
        await processService.delete(id);
        return c.json({ data: { success: true } });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
