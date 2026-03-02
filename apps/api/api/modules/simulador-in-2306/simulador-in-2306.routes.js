"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simuladorIN2306Routes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const simulador_in_2306_service_1 = require("./simulador-in-2306.service");
const simulador_in_2306_repository_1 = require("./simulador-in-2306.repository");
const client_repository_1 = require("../clients/client.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const module_middleware_1 = require("../../middleware/module.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const simuladorIN2306Routes = new hono_1.Hono();
exports.simuladorIN2306Routes = simuladorIN2306Routes;
simuladorIN2306Routes.use('/*', tenant_middleware_1.tenantMiddleware);
simuladorIN2306Routes.use('/*', auth_middleware_1.authMiddleware);
simuladorIN2306Routes.use('/*', (0, module_middleware_1.requireModule)('SIMULADOR_IN_2306'));
const simuladorRepo = new simulador_in_2306_repository_1.SimuladorIN2306Repository();
const clientRepo = new client_repository_1.ClientRepository();
const simuladorService = new simulador_in_2306_service_1.SimuladorIN2306Service(simuladorRepo, clientRepo);
/**
 * POST /simulador-in-2306/simulate-tributario
 * Simulação tributária comparativa: 2025 x 2026 (IN 2.306) x Equiparação Hospitalar
 */
simuladorIN2306Routes.post('/simulate-tributario', (0, zod_validator_1.zValidator)('json', core_1.SimulateTributarioIN2306InputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const userId = c.get('user')?.id;
        const result = await simuladorService.simulateTributario(input, userId);
        return c.json({ data: result }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * POST /simulador-in-2306/simulate
 * Executar simulação IN 2.306/2026 (legado - parcelamento simples)
 */
simuladorIN2306Routes.post('/simulate', (0, zod_validator_1.zValidator)('json', core_1.SimulateIN2306InputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const userId = c.get('user')?.id;
        const result = await simuladorService.simulate(input, userId);
        return c.json({ data: result }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /simulador-in-2306
 * Listar simulações salvas
 */
simuladorIN2306Routes.get('/', (0, zod_validator_1.zValidator)('query', core_1.ListIN2306SimulationsQuerySchema), async (c) => {
    try {
        const query = c.req.valid('query');
        const result = await simuladorService.list({
            client_id: query.client_id,
            competence: query.competence,
            page: query.page,
            limit: query.limit,
        });
        return c.json({
            data: {
                simulations: result.simulations,
                total: result.total,
                page: query.page,
                limit: query.limit,
            },
        });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /simulador-in-2306/:id
 * Buscar simulação por ID
 */
simuladorIN2306Routes.get('/:id', (0, zod_validator_1.zValidator)('param', core_1.IN2306SimulationIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const simulation = await simuladorService.getById(id);
        return c.json({ data: { simulation } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * DELETE /simulador-in-2306/:id
 * Excluir simulação
 */
simuladorIN2306Routes.delete('/:id', (0, zod_validator_1.zValidator)('param', core_1.IN2306SimulationIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const userId = c.get('user')?.id;
        await simuladorService.delete(id, userId);
        return c.json({ data: { success: true } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
