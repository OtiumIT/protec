"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.irpfAltaRendaRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const irpf_alta_renda_service_1 = require("./irpf-alta-renda.service");
const irpf_alta_renda_repository_1 = require("./irpf-alta-renda.repository");
const company_repository_1 = require("../companies/company.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const tenant_middleware_1 = require("../../middleware/tenant.middleware");
const module_middleware_1 = require("../../middleware/module.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const extract_from_pdf_1 = require("./extract-from-pdf");
const parse_dec_dbk_1 = require("./parse-dec-dbk");
const irpfAltaRendaRoutes = new hono_1.Hono();
exports.irpfAltaRendaRoutes = irpfAltaRendaRoutes;
irpfAltaRendaRoutes.use('/*', tenant_middleware_1.tenantMiddleware);
irpfAltaRendaRoutes.use('/*', auth_middleware_1.authMiddleware);
irpfAltaRendaRoutes.use('/*', (0, module_middleware_1.requireModule)('IRPF_ALTA_RENDA'));
const repo = new irpf_alta_renda_repository_1.IrpfAltaRendaRepository();
const companyRepo = new company_repository_1.CompanyRepository();
const service = new irpf_alta_renda_service_1.IrpfAltaRendaService(repo, companyRepo);
/**
 * POST /irpf-alta-renda/extract-from-pdf
 * Extrai dados de IRPF de um PDF (ex.: DAA) via OpenAI e retorna ano + dados para preencher o formulário.
 * Body: multipart/form-data com campo "file" (arquivo PDF).
 */
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
irpfAltaRendaRoutes.post('/extract-from-pdf', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return c.json({ error: { message: 'Envie um arquivo PDF (campo file).', code: 'FILE_REQUIRED' } }, 400);
        }
        if (!file.type?.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
            return c.json({ error: { message: 'O arquivo deve ser um PDF.', code: 'INVALID_FILE_TYPE' } }, 400);
        }
        if (file.size > MAX_PDF_SIZE_BYTES) {
            return c.json({ error: { message: 'O arquivo PDF deve ter no máximo 10MB.', code: 'FILE_TOO_LARGE' } }, 400);
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await (0, extract_from_pdf_1.extractIrpfFromPdf)(buffer);
        return c.json({ data: { ...result, arquivo_nome: file.name } }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /irpf-alta-renda/import-declaration → 405 (evita que GET caia em /:id)
 */
irpfAltaRendaRoutes.get('/import-declaration', (c) => c.json({ error: { message: 'Use POST para importar arquivo .dec/.dbk.', code: 'METHOD_NOT_ALLOWED' } }, 405));
/**
 * POST /irpf-alta-renda/import-declaration
 * Importa arquivo .dec ou .dbk (PGD IRPF / e-CAC) e retorna ano + dados para preencher o formulário.
 * Body: multipart/form-data com campo "file" (arquivo .dec ou .dbk).
 */
irpfAltaRendaRoutes.post('/import-declaration', async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file');
        if (!file || !(file instanceof File)) {
            return c.json({ error: { message: 'Envie um arquivo .dec ou .dbk (campo file).', code: 'FILE_REQUIRED' } }, 400);
        }
        const name = (file.name ?? '').toLowerCase();
        if (!name.endsWith('.dec') && !name.endsWith('.dbk')) {
            return c.json({ error: { message: 'O arquivo deve ser .dec ou .dbk.', code: 'INVALID_FILE_TYPE' } }, 400);
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = (0, parse_dec_dbk_1.parseDecDbk)(buffer, file.name);
        return c.json({ data: { ...result, arquivo_nome: file.name } }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * POST /irpf-alta-renda/simulate
 * Simula impacto tributário Lei 15.270/2025 (não persiste).
 */
irpfAltaRendaRoutes.post('/simulate', (0, zod_validator_1.zValidator)('json', core_1.SimulateIrpfAltaRendaInputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const result = await service.simulate(input);
        return c.json({ data: result }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * POST /irpf-alta-renda/simulate-and-save
 * Simula e salva no tenant (client_id e title opcionais).
 */
irpfAltaRendaRoutes.post('/simulate-and-save', (0, zod_validator_1.zValidator)('json', core_1.SimulateAndSaveIrpfAltaRendaInputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const userId = c.get('user')?.id;
        const { registro, resultado } = await service.simulateAndSave(input, userId);
        return c.json({ data: { registro, resultado } }, 201);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * POST /irpf-alta-renda/report-summary
 * Retorna resumo estruturado para renderização de relatório (futuro PDF).
 */
irpfAltaRendaRoutes.post('/report-summary', (0, zod_validator_1.zValidator)('json', core_1.ReportSummaryIrpfAltaRendaInputSchema), async (c) => {
    try {
        const input = c.req.valid('json');
        const summary = await service.buildReportSummary(input);
        return c.json({ data: summary }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /irpf-alta-renda
 * Lista simulações salvas (filtros: client_id, ano, page, limit).
 */
irpfAltaRendaRoutes.get('/', (0, zod_validator_1.zValidator)('query', core_1.ListIrpfAltaRendaQuerySchema), async (c) => {
    try {
        const query = c.req.valid('query');
        const { items, total } = await service.list({
            company_id: query.company_id,
            ano: query.ano,
            page: query.page,
            limit: query.limit,
        });
        return c.json({
            data: { items, total, page: query.page, limit: query.limit },
        });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * GET /irpf-alta-renda/:id
 * Busca simulação por ID.
 */
irpfAltaRendaRoutes.get('/:id', (0, zod_validator_1.zValidator)('param', core_1.IrpfAltaRendaIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const registro = await service.getById(id);
        return c.json({ data: { registro } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * PATCH /irpf-alta-renda/:id
 * Atualiza simulação existente. Re-simula com os dados enviados.
 */
irpfAltaRendaRoutes.patch('/:id', (0, zod_validator_1.zValidator)('param', core_1.IrpfAltaRendaIdParamSchema), (0, zod_validator_1.zValidator)('json', core_1.UpdateIrpfAltaRendaInputSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        const input = c.req.valid('json');
        const userId = c.get('user')?.id;
        const { registro, resultado } = await service.update(id, input, userId);
        return c.json({ data: { registro, resultado } }, 200);
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
/**
 * DELETE /irpf-alta-renda/:id
 * Exclui simulação.
 */
irpfAltaRendaRoutes.delete('/:id', (0, zod_validator_1.zValidator)('param', core_1.IrpfAltaRendaIdParamSchema), async (c) => {
    try {
        const { id } = c.req.valid('param');
        await service.delete(id);
        return c.json({ data: { success: true } });
    }
    catch (err) {
        return (0, error_handler_1.errorHandler)(err, c);
    }
});
