import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PropertyService } from './property.service';
import { PropertyRepository } from './property.repository';
import { PropertySimulationRepository } from './property-simulation.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import { query, runWithTenantClient } from '../../db/client';
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
  SaveGanhoCapitalSimulationInputSchema,
  UpdateGanhoCapitalSimulationInputSchema,
  PropertyIdParamSchema,
  PropertySimulationIdParamSchema,
  TransactionIdParamSchema,
  PropertyTaxSimulationResponseSchema,
  FiscalIndicesIpcaQuerySchema,
  FiscalIndicesIpcaSeriesQuerySchema,
  FiscalIndicesIpcaSeriesResponseSchema,
  IndicesLc214Schema,
} from '@shared/core';
import {
  getIpcaContextoLc214ParaAno,
  getIpcaSerieDetalhadaParaAno,
} from '../fiscal-indices/bcb-ipca.service';
import { errorHandler } from '../../shared/utils/error-handler';
import {
  extractPropertiesFromDecDbk,
  extractPropertiesFromPdfResult,
  type IrpfPropertyImportResult,
} from './import-irpf-properties';

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

    let text = '';
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText().catch(() => ({ text: '' }));
      text = typeof result?.text === 'string' ? result.text : '';
    } catch (pdfErr: any) {
      console.warn('[property-routes] pdf-parse falhou:', pdfErr?.message);
    }

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

const PROPERTY_UPLOAD_BUCKET = 'fiscal-files';

function createPropertySupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
}

/** POST /properties/upload-url — Signed URL for large file upload to Storage */
propertyRoutes.post('/upload-url', async (c) => {
  try {
    const body = await c.req.json();
    const filename = body.filename as string;
    if (!filename) {
      return c.json({ error: { message: 'Campo filename obrigatório.', code: 'FILENAME_REQUIRED' } }, 400);
    }
    const supabase = createPropertySupabaseClient();
    if (!supabase) {
      return c.json({ error: { message: 'Storage não configurado.', code: 'STORAGE_NOT_CONFIGURED' } }, 500);
    }
    const companyId = c.get('companyId') as string;
    const uid = randomBytes(8).toString('hex');
    const storagePath = `${companyId}/property-temp/${uid}-${sanitizeFilename(filename)}`;
    const { data, error } = await supabase.storage.from(PROPERTY_UPLOAD_BUCKET).createSignedUploadUrl(storagePath);
    if (error) {
      return c.json({ error: { message: 'Falha ao gerar URL de upload.', code: 'UPLOAD_URL_ERROR' } }, 500);
    }
    return c.json({ data: { upload_url: data.signedUrl, storage_path: storagePath, token: data.token, expires_in: 600 } }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/** Background handler for property PDF import (called via Lambda self-invocation) */
export async function processPropertyImportJobHandler(jobId: string, storagePath: string, fileName: string) {
  const supabase = createPropertySupabaseClient();
  if (!supabase) return;

  async function saveResult(result: Record<string, unknown>) {
    await supabase.storage.from(PROPERTY_UPLOAD_BUCKET).upload(
      `jobs/${jobId}.json`,
      JSON.stringify(result),
      { contentType: 'text/plain', upsert: true }
    );
  }

  const safetyTimer = setTimeout(async () => {
    await saveResult({ status: 'error', error: 'Tempo limite excedido na importação.' }).catch(() => {});
  }, 280_000);

  try {
    const { data, error } = await supabase.storage.from(PROPERTY_UPLOAD_BUCKET).download(storagePath);
    if (error || !data) {
      clearTimeout(safetyTimer);
      await saveResult({ status: 'error', error: 'Falha ao baixar arquivo do storage.' });
      return;
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    supabase.storage.from(PROPERTY_UPLOAD_BUCKET).remove([storagePath]).catch(() => {});

    const { extractIrpfFromPdf } = await import('../irpf-alta-renda/extract-from-pdf');
    const pdfResult = await extractIrpfFromPdf(buffer);
    const bensCount = pdfResult.declaracao_completa?.bens_direitos?.itens?.length ?? 0;
    const patrimonioCount = pdfResult.dados?.patrimonio_imobiliario?.length ?? 0;
    console.log(`[processPropertyImportJob] extractIrpfFromPdf done. bens_direitos.itens: ${bensCount}, patrimonio_imobiliario: ${patrimonioCount}`);
    if (bensCount > 0) {
      console.log('[processPropertyImportJob] bens sample:', JSON.stringify(
        (pdfResult.declaracao_completa?.bens_direitos?.itens ?? []).slice(0, 3).map((b: any) => ({
          codigo: b.codigo, descricao: String(b.descricao ?? '').substring(0, 80), valor_atual: b.valor_atual,
        }))
      ));
    }
    const result = extractPropertiesFromPdfResult(pdfResult);
    console.log(`[processPropertyImportJob] extractPropertiesFromPdfResult: ${result.candidates.length} candidates, avisos: ${result.avisos}`);
    clearTimeout(safetyTimer);
    await saveResult({ status: 'completed', data: result });
  } catch (err: any) {
    clearTimeout(safetyTimer);
    await saveResult({ status: 'error', error: err?.message || 'Erro desconhecido.' }).catch(() => {});
  }
}

/** GET /properties/import-job/:jobId — Poll async import result */
propertyRoutes.get('/import-job/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    if (!jobId || !/^[a-f0-9]{32}$/.test(jobId)) {
      return c.json({ error: { message: 'Job ID inválido.', code: 'INVALID_JOB_ID' } }, 400);
    }
    const supabase = createPropertySupabaseClient();
    if (!supabase) {
      return c.json({ error: { message: 'Storage não configurado.', code: 'STORAGE_NOT_CONFIGURED' } }, 500);
    }
    const { data, error } = await supabase.storage.from(PROPERTY_UPLOAD_BUCKET).download(`jobs/${jobId}.json`);
    if (error || !data) {
      return c.json({ data: { status: 'processing' } }, 200);
    }
    const result = JSON.parse(await data.text());
    supabase.storage.from(PROPERTY_UPLOAD_BUCKET).remove([`jobs/${jobId}.json`]).catch(() => {});
    if (result.status === 'error') {
      return c.json({ error: { message: result.error, code: 'IMPORT_ERROR' } }, 500);
    }
    return c.json({ data: result.data }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/** POST /properties/import-from-irpf — Extrai candidatos de imóveis de PDF/.dec/.dbk para preview */
propertyRoutes.post('/import-from-irpf', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';

    // Async path: PDF already uploaded to Storage
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      const storagePath = body.storage_path as string;
      const fileName = body.filename || storagePath?.split('/').pop() || 'upload.pdf';

      if (!storagePath) {
        return c.json({ error: { message: 'Campo storage_path obrigatório.', code: 'STORAGE_PATH_REQUIRED' } }, 400);
      }

      const jobId = randomBytes(16).toString('hex');
      const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
      if (functionName) {
        const client = new LambdaClient({});
        await client.send(new InvokeCommand({
          FunctionName: functionName,
          InvocationType: 'Event',
          Payload: Buffer.from(JSON.stringify({ __propertyImportJob: { jobId, storagePath, fileName } })),
        }));
      }
      return c.json({ data: { job_id: jobId, status: 'processing' } }, 202);
    }

    // Direct path: small files / .dec / .dbk
    const formData = await c.req.formData();
    const file = formData.get('file');
    const clientId = (formData.get('client_id') as string | null)?.trim();

    if (!(file instanceof File)) {
      return c.json({ error: { message: 'Arquivo é obrigatório', code: 'FILE_REQUIRED' } }, 400);
    }
    if (!clientId) {
      return c.json({ error: { message: 'client_id é obrigatório', code: 'CLIENT_REQUIRED' } }, 400);
    }

    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!['pdf', 'dec', 'dbk'].includes(ext)) {
      return c.json({ error: { message: 'Extensão inválida. Aceito: .pdf, .dec, .dbk', code: 'INVALID_FILE_TYPE' } }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const maxBytes = 15 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return c.json({ error: { message: 'Arquivo acima de 15MB.', code: 'FILE_TOO_LARGE' } }, 400);
    }

    let result: IrpfPropertyImportResult;

    if (ext === 'dec' || ext === 'dbk') {
      const content = buffer.toString('latin1');
      result = extractPropertiesFromDecDbk(content, file.name);
    } else {
      const { extractIrpfFromPdf } = await import('../irpf-alta-renda/extract-from-pdf');
      const pdfResult = await extractIrpfFromPdf(buffer);
      result = extractPropertiesFromPdfResult(pdfResult);
    }

    return c.json({ data: result });
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

/** GET /properties/fiscal-indices/ipca/series — série detalhada (mensal, ano, 12m) para auditoria */
propertyRoutes.get(
  '/fiscal-indices/ipca/series',
  zValidator('query', FiscalIndicesIpcaSeriesQuerySchema),
  async (c) => {
    try {
      const { ano, janela } = c.req.valid('query');
      const data = await getIpcaSerieDetalhadaParaAno(ano, janela);
      const payload = FiscalIndicesIpcaSeriesResponseSchema.parse(data);
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
        simulation_kind: query.simulation_kind,
        page: query.page,
        limit: query.limit,
      });
      return c.json({ data: { simulations, total, page: query.page, limit: query.limit } });
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** POST /properties/simulations/ganho-capital — persistir simulação Ganho de Capital (cálculo no cliente) */
propertyRoutes.post(
  '/simulations/ganho-capital',
  zValidator('json', SaveGanhoCapitalSimulationInputSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { simulation } = await propertyService.createGanhoCapitalSimulation(input, userId);
      return c.json({ data: { simulation } }, 201);
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

/** PATCH /properties/simulations/:id/ganho-capital — atualizar simulação Ganho de Capital */
propertyRoutes.patch(
  '/simulations/:id/ganho-capital',
  zValidator('param', PropertySimulationIdParamSchema),
  zValidator('json', UpdateGanhoCapitalSimulationInputSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');
      const { simulation } = await propertyService.updateGanhoCapitalSimulation(id, input);
      return c.json({ data: { simulation } }, 200);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

/** PATCH /properties/simulations/:id - Atualizar simulação (locação PF×PJ) */
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

// Share simulation link
const CreateSimulationShareSchema = z.object({
  title: z.string().max(255).optional(),
  expires_in_days: z.number().int().min(1).max(365).default(30),
});

propertyRoutes.post(
  '/simulations/:id/share',
  zValidator('param', PropertySimulationIdParamSchema),
  zValidator('json', CreateSimulationShareSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const companyId = c.get('companyId');
      const userId = c.get('user')?.id;
      const result = await propertyService.createSimulationShare(id, companyId, data, userId);
      return c.json({ data: result }, 201);
    } catch (err) {
      return errorHandler(err, c);
    }
  }
);

// ==========================================================================
// Rota PÚBLICA (read-only) — sem auth/tenant middleware
// ==========================================================================
const propertyPublicRoutes = new Hono();

propertyPublicRoutes.get('/simulation/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const reg = await query<{ company_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT company_id, expires_at, revoked_at FROM public.simulation_share_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = reg.rows[0];
    if (!row) return c.json({ error: { message: 'Link inválido', code: 'SHARE_NOT_FOUND' } }, 404);
    if (row.revoked_at) return c.json({ error: { message: 'Este link foi revogado', code: 'SHARE_REVOKED' } }, 403);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return c.json({ error: { message: 'Este link expirou', code: 'SHARE_EXPIRED' } }, 403);
    }

    const data = await runWithTenantClient(row.company_id, () =>
      propertyService.getPublicSimulation(tokenHash)
    );

    // Add branding from company
    const companyResult = await query<{ report_brand_name: string | null }>(
      `SELECT report_brand_name FROM public.companies WHERE id = $1`,
      [row.company_id]
    );
    if (companyResult.rows[0]) {
      data.branding = { report_brand_name: companyResult.rows[0].report_brand_name };
    }

    return c.json({ data });
  } catch (err) {
    return errorHandler(err, c);
  }
});

export { propertyRoutes, propertyPublicRoutes };
