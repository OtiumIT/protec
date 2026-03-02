"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingValidatorRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const rating_validator_service_1 = require("./rating-validator.service");
const rating_validator_repository_1 = require("./rating-validator.repository");
const client_repository_1 = require("../clients/client.repository");
const fiscal_file_repository_1 = require("../fiscal-files/fiscal-file.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const module_middleware_1 = require("../../middleware/module.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const extract_from_ecd_pdf_1 = require("./extract-from-ecd-pdf");
/** Arredonda número para 2 casas decimais (evita resíduos de float que quebram multipleOf(0.01)) */
function round2(value) {
    return Math.round(value * 100) / 100;
}
/** Recursivamente arredonda todo número do body para 2 decimais (objetos e arrays; preserva strings, boolean, null). */
function deepRoundNumbers(value) {
    if (value === null)
        return null;
    if (typeof value === 'number')
        return round2(value);
    if (typeof value === 'boolean' || typeof value === 'string')
        return value;
    if (Array.isArray(value))
        return value.map(deepRoundNumbers);
    if (typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value)) {
            out[key] = deepRoundNumbers(value[key]);
        }
        return out;
    }
    return value;
}
const ratingValidatorRoutes = new hono_1.Hono();
exports.ratingValidatorRoutes = ratingValidatorRoutes;
// Aplicar middlewares globais
ratingValidatorRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
ratingValidatorRoutes.use('/*', auth_middleware_1.authMiddleware);
ratingValidatorRoutes.use('/*', (0, module_middleware_1.requireModule)('RATING_VALIDATOR'));
// Instanciar services
const ratingValidatorRepo = new rating_validator_repository_1.RatingValidatorRepository();
const clientRepo = new client_repository_1.ClientRepository();
const fiscalFileRepo = new fiscal_file_repository_1.FiscalFileRepository();
const ratingValidatorService = new rating_validator_service_1.RatingValidatorService(ratingValidatorRepo, clientRepo, fiscalFileRepo);
/**
 * POST /rating-validator/simulate
 * Simular validação de rating com dados inputados manualmente
 * Sanitiza o body (arredonda valores monetários para 2 decimais) antes da validação para evitar 400 por resíduos de float.
 */
ratingValidatorRoutes.post('/simulate', async (c) => {
    try {
        const body = await c.req.json().catch(() => null);
        if (body == null) {
            return c.json({ error: { message: 'Body JSON inválido.', code: 'INVALID_JSON' } }, 400);
        }
        const sanitized = deepRoundNumbers(body);
        const parsed = core_1.SimulateRatingSchema.safeParse(sanitized);
        if (!parsed.success) {
            return c.json({ error: { message: 'Dados inválidos.', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } }, 400);
        }
        const input = parsed.data;
        const userId = c.get('user')?.id;
        const result = await ratingValidatorService.simulate(input, userId);
        return c.json({
            data: {
                calculated_values: result.calculated_values,
                indicators: result.indicators,
                indicator_analysis: result.indicator_analysis,
                rating_estimado: result.rating_estimado,
                rating_real: result.rating_real,
                has_discrepancy: result.has_discrepancy,
                discrepancy_details: result.discrepancy_details,
                validation_id: result.validation_id,
                is_simulation: true,
            },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /rating-validator/extract-from-ecd-pdf
 * Extrai dados do PDF da ECD (SPED Contábil) via OCR e retorna JSON estruturado + dados para preencher a simulação.
 * Body: multipart/form-data com campo "file" (arquivo PDF).
 */
ratingValidatorRoutes.post('/extract-from-ecd-pdf', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return c.json({ error: { message: 'Envie um arquivo PDF (campo file).', code: 'FILE_REQUIRED' } }, 400);
        }
        if (!file.type?.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
            return c.json({ error: { message: 'O arquivo deve ser um PDF.', code: 'INVALID_FILE_TYPE' } }, 400);
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await (0, extract_from_ecd_pdf_1.extractEcdFromPdf)(buffer);
        return c.json({ data: result }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /rating-validator
 * Listar validações com filtros
 */
ratingValidatorRoutes.get('/', (0, zod_validator_1.zValidator)('query', core_1.ListRatingValidationsQuerySchema), async (c) => {
    try {
        const query = c.req.valid('query');
        const result = await ratingValidatorService.list({
            client_id: query.client_id,
            competence: query.competence,
            is_simulation: query.is_simulation,
            rating_estimado: query.rating_estimado,
            page: query.page,
            limit: query.limit,
        });
        return c.json({
            data: {
                validations: result.validations,
                total: result.total,
                page: query.page,
                limit: query.limit,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /rating-validator/:id
 * Buscar validação por ID
 */
ratingValidatorRoutes.get('/:id', (0, zod_validator_1.zValidator)('param', core_1.RatingValidationIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const validation = await ratingValidatorService.getById(id);
        return c.json({
            data: {
                validation,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * DELETE /rating-validator/:id
 * Deletar validação
 */
ratingValidatorRoutes.delete('/:id', (0, zod_validator_1.zValidator)('param', core_1.RatingValidationIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const userId = c.get('user')?.id;
        await ratingValidatorService.delete(id, userId);
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
/**
 * POST /rating-validator/validate/:fiscal_file_id
 * Validar rating a partir de arquivo ECD processado
 * NOTA: Implementação preparada, aguarda exemplos de dados ECD
 */
ratingValidatorRoutes.post('/validate/:fiscal_file_id', (0, zod_validator_1.zValidator)('param', core_1.RatingValidatorFiscalFileIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.ValidateFromDataSchema.partial()), async (c) => {
    try {
        const { fiscal_file_id } = c.req.valid('param');
        const body = c.req.valid('json');
        const userId = c.get('user')?.id;
        const result = await ratingValidatorService.validateFromFiscalFile(fiscal_file_id, body.rating_real, userId);
        return c.json({
            data: {
                calculated_values: result.calculated_values,
                indicators: result.indicators,
                rating_estimado: result.rating_estimado,
                rating_real: result.rating_real,
                has_discrepancy: result.has_discrepancy,
                discrepancy_details: result.discrepancy_details,
                validation_id: result.validation_id,
                is_simulation: false,
            },
        }, 200);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
