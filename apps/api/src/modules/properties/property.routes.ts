import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';
import { PropertySimulationRepository } from './property-simulation.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  CreatePropertySchema,
  CreatePropertiesBatchSchema,
  UpdatePropertySchema,
  PropertyTransactionSchema,
  SimulatePropertyTaxInputSchema,
  SimulatePropertyTaxAndSaveInputSchema,
  SimulateStandaloneInputSchema,
  SimulateStandaloneAndSaveInputSchema,
  UpdatePropertySimulationInputSchema,
  UpsertMonthlyTotalsSchema,
  ListPropertiesQuerySchema,
  ListTransactionsQuerySchema,
  ListPropertySimulationsQuerySchema,
  PropertyIdParamSchema,
  PropertySimulationIdParamSchema,
  TransactionIdParamSchema,
  PropertyTaxSimulationResponseSchema,
  FiscalIndicesIpcaQuerySchema,
  IndicesLc214Schema,
} from '@shared/core';
import { getIpcaContextoLc214ParaAno } from '../fiscal-indices/bcb-ipca.service';
import { errorHandler } from '../../shared/utils/error-handler';

const propertyRoutes = new Hono();

propertyRoutes.use('/*', tenantMiddleware);
propertyRoutes.use('/*', authMiddleware);
propertyRoutes.use('/*', requireModule('GESTAO_IMOVEIS'));

const propertyRepo = new PropertyRepository();
const clientRepo = new ClientRepository();
const simulationRepo = new PropertySimulationRepository();
const propertyService = new PropertyService(propertyRepo, clientRepo, simulationRepo);

function estimatePdfPages(buffer: Buffer): number {
  const text = buffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}

function extractSuggestedFieldsFromText(text: string, documentType: 'matricula' | 'iptu') {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const warnings: string[] = [];
  const suggested: Record<string, string | number> = {};

  if (documentType === 'matricula') {
    const matriculaMatch = normalized.match(/matr[íi]cula\s*(n[oº°]\s*)?[:\-]?\s*([a-z0-9\-\/\.]+)/i);
    const cartorioMatch = normalized.match(/cart[óo]rio\s*(de)?\s*registro[^:]*[:\-]?\s*([^,.;]+)/i);
    if (matriculaMatch?.[2]) suggested.matricula_imovel = matriculaMatch[2].trim();
    if (cartorioMatch?.[2]) suggested.cartorio_registro = cartorioMatch[2].trim();
  }

  if (documentType === 'iptu') {
    const inscricaoMatch = normalized.match(/inscri[cç][aã]o\s*(imobili[áa]ria|iptu)?\s*[:\-]?\s*([a-z0-9\-\/\.]+)/i);
    if (inscricaoMatch?.[2]) suggested.inscricao_iptu = inscricaoMatch[2].trim();
    const valorMatch = normalized.match(/(valor\s*(venal|total|iptu)?|iptu)\s*[:\-]?\s*r?\$?\s*([\d\.\,]+)/i);
    if (valorMatch?.[3]) {
      const parsed = Number(valorMatch[3].replace(/\./g, '').replace(',', '.'));
      if (!Number.isNaN(parsed)) suggested.iptu_mensal_padrao = parsed;
    }
  }

  if (Object.keys(suggested).length === 0) {
    warnings.push('Não foi possível extrair campos com confiança. Revise manualmente.');
  }

  return { suggested, warnings };
}

propertyRoutes.post('/extract-property-doc', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const documentType = formData.get('document_type');

    if (!(file instanceof File)) {
      return c.json({ error: { message: 'Arquivo é obrigatório', code: 'FILE_REQUIRED' } }, 400);
    }
    if (documentType !== 'matricula' && documentType !== 'iptu') {
      return c.json({ error: { message: 'document_type inválido', code: 'INVALID_DOCUMENT_TYPE' } }, 400);
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return c.json({ error: { message: 'Apenas PDF é suportado', code: 'INVALID_FILE_TYPE' } }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const maxBytes = 10 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return c.json({ error: { message: 'Arquivo acima de 10MB. Envie arquivo menor.', code: 'FILE_TOO_LARGE' } }, 400);
    }

    const pages = estimatePdfPages(buffer);
    if (pages > 10) {
      return c.json({ error: { message: 'Documento com mais de 10 páginas. Envie versão resumida.', code: 'TOO_MANY_PAGES' } }, 400);
    }

    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText().catch(() => ({ text: '' }));
    const text = typeof result?.text === 'string' ? result.text : '';

    const { suggested, warnings } = extractSuggestedFieldsFromText(text, documentType);

    return c.json({
      data: {
        document_type: documentType,
        pages_estimated: pages,
        suggested_fields: suggested,
        warnings,
      },
    });
  } catch (err) {
    return errorHandler(err, c);
  }
});

/** GET /properties/fiscal-indices/ipca — IPCA acumulado LC 214 (preview; mesma série do cálculo) */
propertyRoutes.get(
  '/fiscal-indices/ipca',
  zValidator('query', FiscalIndicesIpcaQuerySchema),
  async (c) => {
    try {
      const { ano } = c.req.valid('query');
      const ctx = await getIpcaContextoLc214ParaAno(ano);
      const payload = IndicesLc214Schema.parse({
        ...ctx,
        parametros_origem: 'calculado',
      });
      return c.json({ data: payload }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/simulate - Simular carga tributária PF vs PJ vs Reforma (deve vir antes de /:id) */
propertyRoutes.post(
  '/simulate',
  zValidator('json', SimulatePropertyTaxInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const result = await propertyService.simulate(input);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/simulate-and-save - Simular por property_ids e salvar no histórico (ex.: detalhe do imóvel) */
propertyRoutes.post(
  '/simulate-and-save',
  zValidator('json', SimulatePropertyTaxAndSaveInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { simulation, result } = await propertyService.simulateAndSaveFromProperties(input, userId);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data: { simulation, result: data } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/simulate-standalone-and-save - Simular e salvar (persistir) */
propertyRoutes.post(
  '/simulate-standalone-and-save',
  zValidator('json', SimulateStandaloneAndSaveInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      if (!input.save_simulation || !input.client_id) {
        return c.json({ error: { message: 'save_simulation e client_id são obrigatórios', code: 'VALIDATION_ERROR' } }, 400);
      }
      const userId = c.get('user')?.id;
      const { simulation, result } = await propertyService.simulateStandaloneAndSave(input, userId);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data: { simulation, result: data } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/simulations - Listar simulações salvas (deve vir antes de /:id) */
propertyRoutes.get(
  '/simulations',
  zValidator('query', ListPropertySimulationsQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const { simulations, total } = await propertyService.listSimulations({
        client_id: query.client_id,
        ano: query.ano,
        page: query.page,
        limit: query.limit,
      });
      return c.json({ data: { simulations, total, page: query.page, limit: query.limit } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/simulations/:id - Buscar simulação por ID */
propertyRoutes.get(
  '/simulations/:id',
  zValidator('param', PropertySimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const simulation = await propertyService.getSimulationById(id);
      return c.json({ data: { simulation } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** PATCH /properties/simulations/:id - Atualizar simulação */
propertyRoutes.patch(
  '/simulations/:id',
  zValidator('param', PropertySimulationIdParamSchema),
  zValidator('json', UpdatePropertySimulationInputSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');
      const { simulation, result } = await propertyService.updateSimulation(id, input);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data: { simulation, result: data } }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** DELETE /properties/simulations/:id - Excluir simulação */
propertyRoutes.delete(
  '/simulations/:id',
  zValidator('param', PropertySimulationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await propertyService.deleteSimulation(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/simulate-standalone - Simular sem cadastro (12 meses, dados diretos) */
propertyRoutes.post(
  '/simulate-standalone',
  zValidator('json', SimulateStandaloneInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const result = await propertyService.simulateStandalone(input);
      const data = PropertyTaxSimulationResponseSchema.parse(result);
      return c.json({ data }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/check-exists - Verificar se imóvel já existe (client_id + identificador) */
propertyRoutes.get(
  '/check-exists',
  zValidator(
    'query',
    z.object({
      client_id: z.string().uuid(),
      identificador: z.string().min(1),
    })
  ),
  async (c) => {
    try {
      const { client_id, identificador } = c.req.valid('query');
      const result = await propertyService.checkExists(client_id, identificador);
      return c.json({ data: result });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/aggregate-preview - Preview de dados agregados para a grid (deve vir antes de /:id) */
propertyRoutes.get(
  '/aggregate-preview',
  zValidator(
    'query',
    z.object({
      property_ids: z.string().optional().default(''),
      ano: z.coerce.number().int().min(2020).max(2030),
    })
  ),
  async (c) => {
    try {
      const { property_ids, ano } = c.req.valid('query');
      const ids = (property_ids || '').split(',').map((s) => s.trim()).filter(Boolean);
      const result = await propertyService.aggregatePreview(ids, ano);
      return c.json({ data: result });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties - Listar imóveis */
propertyRoutes.get(
  '/',
  zValidator('query', ListPropertiesQuerySchema),
  async (c) => {
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
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/:id - Buscar imóvel por ID */
propertyRoutes.get(
  '/:id',
  zValidator('param', PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const property = await propertyService.getById(id);
      return c.json({ data: { property } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties - Criar imóvel */
propertyRoutes.post(
  '/',
  zValidator('json', CreatePropertySchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const property = await propertyService.create(data);
      return c.json({ data: { property } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/batch - Criar imóveis em lote */
propertyRoutes.post(
  '/batch',
  zValidator('json', CreatePropertiesBatchSchema),
  async (c) => {
    try {
      const data = c.req.valid('json');
      const result = await propertyService.createBatch(data);
      return c.json({ data: result }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** PATCH /properties/:id - Atualizar imóvel */
propertyRoutes.patch(
  '/:id',
  zValidator('param', PropertyIdParamSchema),
  zValidator('json', UpdatePropertySchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const property = await propertyService.update(id, data);
      return c.json({ data: { property } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** DELETE /properties/:id - Excluir imóvel */
propertyRoutes.delete(
  '/:id',
  zValidator('param', PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await propertyService.delete(id);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** PUT /properties/:id/monthly-totals - Salvar totais mensais (modo reduzido) */
propertyRoutes.put(
  '/:id/monthly-totals',
  zValidator('param', PropertyIdParamSchema),
  zValidator('json', UpsertMonthlyTotalsSchema.omit({ property_id: true })),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      await propertyService.upsertMonthlyTotals({ ...body, property_id: id });
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/:id/monthly-totals - Buscar totais mensais (modo reduzido) */
propertyRoutes.get(
  '/:id/monthly-totals',
  zValidator('param', PropertyIdParamSchema),
  zValidator('query', z.object({ ano: z.coerce.number().int() })),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const { ano } = c.req.valid('query');
      const totals = await propertyService.getMonthlyTotals(id, ano);
      return c.json({ data: { totals } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** GET /properties/:id/transactions - Listar transações do imóvel */
propertyRoutes.get(
  '/:id/transactions',
  zValidator('param', PropertyIdParamSchema),
  zValidator('query', ListTransactionsQuerySchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const transactions = await propertyService.listTransactions(id, {
        ano: query.ano,
        mes: query.mes,
      });
      return c.json({ data: { transactions } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/:id/transactions - Adicionar transação(ões) */
propertyRoutes.post(
  '/:id/transactions',
  zValidator('param', PropertyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = await c.req.json();

      if (Array.isArray(body)) {
        const validated = body.map((item) =>
          PropertyTransactionSchema.parse(item)
        );
        const transactions = await propertyService.addTransactionsBatch(
          id,
          validated
        );
        return c.json({ data: { transactions } }, 201);
      }

      const data = PropertyTransactionSchema.parse(body);
      const transaction = await propertyService.addTransaction(id, data);
      return c.json({ data: { transaction } }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** DELETE /properties/:id/transactions/:txId - Excluir transação */
propertyRoutes.delete(
  '/:id/transactions/:txId',
  zValidator('param', TransactionIdParamSchema),
  async (c) => {
    try {
      const { id, txId } = c.req.valid('param');
      await propertyService.deleteTransaction(id, txId);
      return c.json({ data: { success: true } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

export { propertyRoutes };
