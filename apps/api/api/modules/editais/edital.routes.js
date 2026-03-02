"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editalRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const edital_repository_1 = require("./edital.repository");
const edital_service_1 = require("./edital.service");
const error_handler_1 = require("../../shared/utils/error-handler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const core_1 = require("@shared/core");
const editalRoutes = new hono_1.Hono();
exports.editalRoutes = editalRoutes;
// Rotas de escrita (POST, PUT, DELETE) requerem autenticação
const protectedRoutes = new hono_1.Hono();
protectedRoutes.use('/*', auth_middleware_1.authMiddleware);
// Instanciar services
const editalRepo = new edital_repository_1.EditalRepository();
const editalService = new edital_service_1.EditalService(editalRepo);
/**
 * GET /editais
 * Listar editais com filtros
 */
editalRoutes.get('/', (0, zod_validator_1.zValidator)('query', core_1.ListEditaisQuerySchema), async (c) => {
    try {
        const query = c.req.valid('query');
        const result = await editalService.list(query);
        return c.json({
            data: {
                editais: result.editais,
                total: result.total,
                page: query.page,
                limit: query.limit,
            },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /editais/active
 * Buscar editais ativos (dentro do prazo)
 */
editalRoutes.get('/active', async (c) => {
    try {
        const date = c.req.query('date'); // Opcional: YYYY-MM-DD
        const editais = await editalService.findActive(date);
        return c.json({
            data: { editais },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /editais/:id
 * Buscar edital por ID
 */
editalRoutes.get('/:id', (0, zod_validator_1.zValidator)('param', core_1.EditalIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const edital = await editalService.findById(id);
        return c.json({
            data: { edital },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /editais
 * Criar novo edital (requer autenticação)
 */
protectedRoutes.post('/', (0, zod_validator_1.zValidator)('json', core_1.CreateEditalSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const userId = c.get('user')?.id;
        const edital = await editalService.create(data, userId);
        return c.json({
            data: { edital },
        }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * PUT /editais/:id
 * Atualizar edital (requer autenticação)
 */
protectedRoutes.put('/:id', (0, zod_validator_1.zValidator)('param', core_1.EditalIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.UpdateEditalSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const data = c.req.valid('json');
        const edital = await editalService.update(id, data);
        return c.json({
            data: { edital },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * DELETE /editais/:id
 * Deletar edital (requer autenticação)
 */
protectedRoutes.delete('/:id', (0, zod_validator_1.zValidator)('param', core_1.EditalIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        await editalService.delete(id);
        return c.json({
            data: { success: true },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
// Aplicar rotas protegidas
editalRoutes.route('/', protectedRoutes);
