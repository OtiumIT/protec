"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const property_service_1 = require("./property.service");
const property_repository_1 = require("./property.repository");
const client_repository_1 = require("../clients/client.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const module_middleware_1 = require("../../middleware/module.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const propertyRoutes = new hono_1.Hono();
exports.propertyRoutes = propertyRoutes;
// #region agent log
propertyRoutes.use('*', async (c, next) => {
    fetch('http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H2', location: 'property.routes.ts:entry', message: 'Property routes received request', data: { path: c.req.path, method: c.req.method, url: c.req.url }, timestamp: Date.now() }) }).catch(() => { });
    await next();
});
// #endregion
propertyRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
propertyRoutes.use('/*', auth_middleware_1.authMiddleware);
propertyRoutes.use('/*', (0, module_middleware_1.requireModule)('GESTAO_IMOVEIS'));
const propertyRepo = new property_repository_1.PropertyRepository();
const clientRepo = new client_repository_1.ClientRepository();
const propertyService = new property_service_1.PropertyService(propertyRepo, clientRepo);
/** POST /properties/simulate - Simular carga tributária PF vs PJ vs Reforma (deve vir antes de /:id) */
propertyRoutes.post('/simulate', (0, zod_validator_1.zValidator)('json', core_1.SimulatePropertyTaxInputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const result = await propertyService.simulate(input);
        const data = core_1.PropertyTaxSimulationResponseSchema.parse(result);
        return c.json({ data }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** POST /properties/simulate-standalone - Simular sem cadastro (12 meses, dados diretos) */
propertyRoutes.post('/simulate-standalone', (0, zod_validator_1.zValidator)('json', core_1.SimulateStandaloneInputSchema), async (c) => {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/3f8a018c-ca22-4e05-9180-9b386bc4c44a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hypothesisId: 'H2', location: 'property.routes.ts:simulate-standalone-handler', message: 'POST /simulate-standalone handler entered', data: { path: c.req.path, method: c.req.method }, timestamp: Date.now() }) }).catch(() => { });
    // #endregion
    try {
        const input = c.req.valid('json');
        const result = await propertyService.simulateStandalone(input);
        const data = core_1.PropertyTaxSimulationResponseSchema.parse(result);
        return c.json({ data }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** GET /properties - Listar imóveis */
propertyRoutes.get('/', (0, zod_validator_1.zValidator)('query', core_1.ListPropertiesQuerySchema), async (c) => {
    try {
        const query = c.req.valid('query');
        const result = await propertyService.list({
            client_id: query.client_id,
            page: query.page,
            limit: query.limit,
        });
        return c.json({
            data: {
                properties: result.properties,
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
/** GET /properties/:id - Buscar imóvel por ID */
propertyRoutes.get('/:id', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const property = await propertyService.getById(id);
        return c.json({ data: { property } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** POST /properties - Criar imóvel */
propertyRoutes.post('/', (0, zod_validator_1.zValidator)('json', core_1.CreatePropertySchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const property = await propertyService.create(data);
        return c.json({ data: { property } }, 201);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** PATCH /properties/:id - Atualizar imóvel */
propertyRoutes.patch('/:id', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.UpdatePropertySchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const data = c.req.valid('json');
        const property = await propertyService.update(id, data);
        return c.json({ data: { property } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** DELETE /properties/:id - Excluir imóvel */
propertyRoutes.delete('/:id', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        await propertyService.delete(id);
        return c.json({ data: { success: true } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** PUT /properties/:id/monthly-totals - Salvar totais mensais (modo reduzido) */
propertyRoutes.put('/:id/monthly-totals', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.UpsertMonthlyTotalsSchema.omit({ property_id: true })), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const body = c.req.valid('json');
        await propertyService.upsertMonthlyTotals({ ...body, property_id: id });
        return c.json({ data: { success: true } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** GET /properties/:id/monthly-totals - Buscar totais mensais (modo reduzido) */
propertyRoutes.get('/:id/monthly-totals', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), (0, zod_validator_1.zValidator)('query', zod_1.z.object({ ano: zod_1.z.coerce.number().int() })), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const { ano } = c.req.valid('query');
        const totals = await propertyService.getMonthlyTotals(id, ano);
        return c.json({ data: { totals } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** GET /properties/:id/transactions - Listar transações do imóvel */
propertyRoutes.get('/:id/transactions', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), (0, zod_validator_1.zValidator)('query', core_1.ListTransactionsQuerySchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const query = c.req.valid('query');
        const transactions = await propertyService.listTransactions(id, {
            ano: query.ano,
            mes: query.mes,
        });
        return c.json({ data: { transactions } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** POST /properties/:id/transactions - Adicionar transação(ões) */
propertyRoutes.post('/:id/transactions', (0, zod_validator_1.zValidator)('param', core_1.PropertyIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const body = await c.req.json();
        if (Array.isArray(body)) {
            const validated = body.map((item) => core_1.PropertyTransactionSchema.parse(item));
            const transactions = await propertyService.addTransactionsBatch(id, validated);
            return c.json({ data: { transactions } }, 201);
        }
        const data = core_1.PropertyTransactionSchema.parse(body);
        const transaction = await propertyService.addTransaction(id, data);
        return c.json({ data: { transaction } }, 201);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/** DELETE /properties/:id/transactions/:txId - Excluir transação */
propertyRoutes.delete('/:id/transactions/:txId', (0, zod_validator_1.zValidator)('param', core_1.TransactionIdParamSchema), async (c) => {
    try {
        const { id, txId } = c.req.valid('param');
        await propertyService.deleteTransaction(id, txId);
        return c.json({ data: { success: true } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
