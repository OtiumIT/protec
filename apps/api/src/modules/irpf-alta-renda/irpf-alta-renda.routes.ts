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
  UpdateIrpfAltaRendaInputSchema,
  ListIrpfAltaRendaQuerySchema,
  IrpfAltaRendaIdParamSchema,
  ReportSummaryIrpfAltaRendaInputSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';
import { extractIrpfFromPdf } from './extract-from-pdf';
import { parseDecDbk } from './parse-dec-dbk';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const irpfAltaRendaRoutes = new Hono();

irpfAltaRendaRoutes.use('/*', tenantMiddleware);
irpfAltaRendaRoutes.use('/*', authMiddleware);
irpfAltaRendaRoutes.use('/*', requireModule('IRPF_ALTA_RENDA'));

const repo = new IrpfAltaRendaRepository();
const companyRepo = new CompanyRepository();
const service = new IrpfAltaRendaService(repo, companyRepo);

/**
 * POST /irpf-alta-renda/upload-url
 * Gera signed URL para upload direto ao Supabase Storage (para arquivos > 5MB que excedem o limite do Lambda).
 * Body JSON: { filename: string, content_type: string }
 * Retorna: { upload_url, storage_path, expires_in }
 */
const UPLOAD_BUCKET = 'fiscal-files';

irpfAltaRendaRoutes.post('/upload-url', async (c) => {
  try {
    const body = await c.req.json();
    const filename = body.filename as string;
    if (!filename) {
      return c.json({ error: { message: 'Campo filename obrigatório.', code: 'FILENAME_REQUIRED' } }, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return c.json({ error: { message: 'Storage não configurado.', code: 'STORAGE_NOT_CONFIGURED' } }, 500);
    }

    const companyId = c.get('companyId') as string;
    const uid = randomBytes(8).toString('hex');
    const storagePath = `${companyId}/irpf-temp/${uid}-${filename}`;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.storage
      .from(UPLOAD_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('[upload-url] Supabase error:', error);
      return c.json({ error: { message: 'Falha ao gerar URL de upload.', code: 'UPLOAD_URL_ERROR' } }, 500);
    }

    return c.json({
      data: {
        upload_url: data.signedUrl,
        storage_path: storagePath,
        token: data.token,
        expires_in: 600,
      },
    }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * POST /irpf-alta-renda/extract-from-pdf
 * Extrai dados de IRPF de um PDF (ex.: DAA) via OpenAI.
 * Para arquivos grandes (via storage_path), usa padrão async:
 *   retorna { job_id } e processa em background; frontend faz polling em GET /extract-job/:job_id.
 * Para arquivos pequenos (< 5MB via multipart), tenta síncrono.
 */
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export async function processExtractionJobHandler(jobId: string, storagePath: string, fileName: string) {
  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('[processExtractionJobHandler] Supabase not configured');
    return;
  }

  async function saveJobResult(result: Record<string, unknown>) {
    await supabase.storage.from(UPLOAD_BUCKET).upload(
      `jobs/${jobId}.json`,
      JSON.stringify(result),
      { contentType: 'text/plain', upsert: true }
    );
  }

  // Safety timeout: save error 10s before Lambda hard-kill (use AWS_LAMBDA_FUNCTION_TIMEOUT or fallback to 280s)
  const safetyMs = 280_000;
  const safetyTimer = setTimeout(async () => {
    console.error(`[extraction-job:${jobId}] Safety timeout reached, saving error`);
    await saveJobResult({ status: 'error', error: 'Tempo limite excedido na extração. O PDF pode ser muito grande ou complexo.' }).catch(() => {});
  }, safetyMs);

  try {
    console.log(`[extraction-job:${jobId}] Downloading from storage: ${storagePath}`);
    const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).download(storagePath);
    if (error || !data) {
      console.error(`[extraction-job:${jobId}] Download error:`, error);
      clearTimeout(safetyTimer);
      await saveJobResult({ status: 'error', error: 'Falha ao baixar arquivo do storage.' });
      return;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    console.log(`[extraction-job:${jobId}] Downloaded ${buffer.length} bytes, starting extraction...`);
    supabase.storage.from(UPLOAD_BUCKET).remove([storagePath]).catch(() => {});

    const result = await extractIrpfFromPdf(buffer);
    clearTimeout(safetyTimer);
    console.log(`[extraction-job:${jobId}] Extraction completed, saving result...`);
    await saveJobResult({ status: 'completed', data: { ...result, arquivo_nome: fileName } });
    console.log(`[extraction-job:${jobId}] Done.`);
  } catch (err: any) {
    clearTimeout(safetyTimer);
    console.error(`[extraction-job:${jobId}] Error:`, err?.message);
    await saveJobResult({ status: 'error', error: err?.message || 'Erro desconhecido na extração.' }).catch(() => {});
  }
}

async function invokeSelfAsync(payload: Record<string, unknown>) {
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (!functionName) {
    console.error('[invokeSelfAsync] AWS_LAMBDA_FUNCTION_NAME not set');
    return;
  }
  const client = new LambdaClient({});
  await client.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));
}

irpfAltaRendaRoutes.post('/extract-from-pdf', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      const storagePath = body.storage_path as string;
      const fileName = body.filename || storagePath?.split('/').pop() || 'upload.pdf';

      if (!storagePath) {
        return c.json({ error: { message: 'Campo storage_path obrigatório.', code: 'STORAGE_PATH_REQUIRED' } }, 400);
      }

      const jobId = randomBytes(16).toString('hex');

      // Invoke a separate Lambda execution for the heavy PDF extraction
      await invokeSelfAsync({
        __extractionJob: { jobId, storagePath, fileName },
      });

      return c.json({ data: { job_id: jobId, status: 'processing' } }, 202);
    }

    // Upload direto via multipart (arquivos pequenos — fallback)
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: 'Envie um arquivo PDF (campo file).', code: 'FILE_REQUIRED' } }, 400);
    }
    if (!file.type?.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
      return c.json({ error: { message: 'O arquivo deve ser um PDF.', code: 'INVALID_FILE_TYPE' } }, 400);
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      return c.json({ error: { message: 'O arquivo PDF deve ter no máximo 10MB.', code: 'FILE_TOO_LARGE' } }, 400);
    }
    const fileName = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractIrpfFromPdf(buffer);
    return c.json({ data: { ...result, arquivo_nome: fileName } }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * GET /irpf-alta-renda/extract-job/:jobId
 * Polling para verificar status de extração assíncrona.
 * Retorna: { status: 'processing' } ou { status: 'completed', data: ... } ou { status: 'error', error: ... }
 */
irpfAltaRendaRoutes.get('/extract-job/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    if (!jobId || !/^[a-f0-9]{32}$/.test(jobId)) {
      return c.json({ error: { message: 'Job ID inválido.', code: 'INVALID_JOB_ID' } }, 400);
    }

    const supabase = createSupabaseClient();
    if (!supabase) {
      return c.json({ error: { message: 'Storage não configurado.', code: 'STORAGE_NOT_CONFIGURED' } }, 500);
    }

    const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).download(`jobs/${jobId}.json`);
    if (error || !data) {
      return c.json({ data: { status: 'processing' } }, 200);
    }

    const result = JSON.parse(await data.text());

    // Limpar arquivo de resultado após leitura bem-sucedida
    supabase.storage.from(UPLOAD_BUCKET).remove([`jobs/${jobId}.json`]).catch(() => {});

    if (result.status === 'error') {
      return c.json({ error: { message: result.error, code: 'EXTRACTION_ERROR' } }, 500);
    }

    return c.json({ data: result.data }, 200);
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
    return c.json({ data: { ...result, arquivo_nome: file.name } }, 200);
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
 * PATCH /irpf-alta-renda/:id
 * Atualiza simulação existente. Re-simula com os dados enviados.
 */
irpfAltaRendaRoutes.patch(
  '/:id',
  zValidator('param', IrpfAltaRendaIdParamSchema),
  zValidator('json', UpdateIrpfAltaRendaInputSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const input = c.req.valid('json');
      const userId = c.get('user')?.id;
      const { registro, resultado } = await service.update(id, input, userId);
      return c.json({ data: { registro, resultado } }, 200);
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
