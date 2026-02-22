import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { IrpfAltaRendaService } from './irpf-alta-renda.service';
import { IrpfAltaRendaRepository } from './irpf-alta-renda.repository';
import { CompanyRepository } from '../companies/company.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  SimulateIrpfAltaRendaInputSchema,
  SimulateAndSaveIrpfAltaRendaInputSchema,
  ListIrpfAltaRendaQuerySchema,
  IrpfAltaRendaIdParamSchema,
  ReportSummaryIrpfAltaRendaInputSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';
import { extractIrpfFromPdf } from './extract-from-pdf';
import { parseDecDbk } from './parse-dec-dbk';

const irpfAltaRendaRoutes = new Hono();

irpfAltaRendaRoutes.use('/*', tenantMiddleware);
irpfAltaRendaRoutes.use('/*', authMiddleware);
irpfAltaRendaRoutes.use('/*', requireModule('IRPF_ALTA_RENDA'));

const repo = new IrpfAltaRendaRepository();
const companyRepo = new CompanyRepository();
const service = new IrpfAltaRendaService(repo, companyRepo);

/**
 * POST /irpf-alta-renda/extract-from-pdf
 * Extrai dados de IRPF de um PDF (ex.: DAA) via OpenAI e retorna ano + dados para preencher o formulário.
 * Body: multipart/form-data com campo "file" (arquivo PDF).
 */
irpfAltaRendaRoutes.post('/extract-from-pdf', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: 'Envie um arquivo PDF (campo file).', code: 'FILE_REQUIRED' } }, 400);
    }
    if (!file.type?.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
      return c.json({ error: { message: 'O arquivo deve ser um PDF.', code: 'INVALID_FILE_TYPE' } }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractIrpfFromPdf(buffer);
    return c.json({ data: result }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * GET /irpf-alta-renda/import-declaration → 405 (evita que GET caia em /:id)
 */
irpfAltaRendaRoutes.get('/import-declaration', (c) =>
  c.json({ error: { message: 'Use POST para importar arquivo .dec/.dbk.', code: 'METHOD_NOT_ALLOWED' } }, 405)
);

/**
 * POST /irpf-alta-renda/import-declaration
 * Importa arquivo .dec ou .dbk (PGD IRPF / e-CAC) e retorna ano + dados para preencher o formulário.
 * Body: multipart/form-data com campo "file" (arquivo .dec ou .dbk).
 */
irpfAltaRendaRoutes.post('/import-declaration', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: 'Envie um arquivo .dec ou .dbk (campo file).', code: 'FILE_REQUIRED' } }, 400);
    }
    const name = (file.name ?? '').toLowerCase();
    if (!name.endsWith('.dec') && !name.endsWith('.dbk')) {
      return c.json({ error: { message: 'O arquivo deve ser .dec ou .dbk.', code: 'INVALID_FILE_TYPE' } }, 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = parseDecDbk(buffer, file.name);
    return c.json({ data: result }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * POST /irpf-alta-renda/simulate
 * Simula impacto tributário Lei 15.270/2025 (não persiste).
 */
irpfAltaRendaRoutes.post(
  '/simulate',
  zValidator('json', SimulateIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const result = await service.simulate(input);
      return c.json({ data: result }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * POST /irpf-alta-renda/simulate-and-save
 * Simula e salva no tenant (client_id e title opcionais).
 */
irpfAltaRendaRoutes.post(
  '/simulate-and-save',
  zValidator('json', SimulateAndSaveIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { registro, resultado } = await service.simulateAndSave(input, userId);
      return c.json({ data: { registro, resultado } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * POST /irpf-alta-renda/report-summary
 * Retorna resumo estruturado para renderização de relatório (futuro PDF).
 */
irpfAltaRendaRoutes.post(
  '/report-summary',
  zValidator('json', ReportSummaryIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const summary = await service.buildReportSummary(input);
      return c.json({ data: summary }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * GET /irpf-alta-renda
 * Lista simulações salvas (filtros: client_id, ano, page, limit).
 */
irpfAltaRendaRoutes.get(
  '/',
  zValidator('query', ListIrpfAltaRendaQuerySchema),
  async (c) => {
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
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * GET /irpf-alta-renda/:id
 * Busca simulação por ID.
 */
irpfAltaRendaRoutes.get(
  '/:id',
  zValidator('param', IrpfAltaRendaIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const registro = await service.getById(id);
      return c.json({ data: { registro } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/**
 * DELETE /irpf-alta-renda/:id
 * Exclui simulação.
 */
irpfAltaRendaRoutes.delete(
  '/:id',
  zValidator('param', IrpfAltaRendaIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await service.delete(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

export { irpfAltaRendaRoutes };
