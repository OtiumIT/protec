import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { FiscalFileService } from './fiscal-file.service';
import { FiscalFileRepository } from './fiscal-file.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  UpdateFiscalFileStatusSchema,
  ListFiscalFilesQuerySchema,
  FiscalFileIdParamSchema,
  ClientIdParamSchema,
  DownloadFiscalFileQuerySchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

const fiscalFileRoutes = new Hono();

// Aplicar middlewares globais
fiscalFileRoutes.use('/*', tenantMiddleware);
fiscalFileRoutes.use('/*', authMiddleware);
fiscalFileRoutes.use('/*', requireModule('FISCAL_FILES'));

// Instanciar services
const fiscalFileRepo = new FiscalFileRepository();
const clientRepo = new ClientRepository();
const fiscalFileService = new FiscalFileService(fiscalFileRepo, clientRepo);
const UploadFiscalFilePayloadSchema = z.object({
  client_id: z.string().uuid(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM').optional(),
  file_type: z.enum(['sped', 'ecd', 'pgdas', 'xml', 'pdf', 'txt', 'outros']).optional(),
});
const CalibratorRuleSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  pattern: z.string().min(2).max(255),
  target_kind: z.enum(['receita', 'deducao', 'retencao']),
  target_field: z.string().min(2).max(100),
  confidence_override: z.number().min(0).max(1).optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});
const UpdateCalibratorRuleSchema = CalibratorRuleSchema.partial();
const CalibratorRuleIdParamSchema = z.object({ id: z.string().uuid() });
const ListCalibratorRulesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
});

/**
 * POST /fiscal-files/upload
 * Upload de arquivo fiscal via multipart/form-data
 */
fiscalFileRoutes.post('/upload', async (c) => {
  try {
    const companyId = c.get('companyId');
    const formData = await c.req.formData();

    // Extrair dados do form
    const file = formData.get('file') as File;
    const clientId = formData.get('client_id') as string;
    const competenceValue = formData.get('competence');
    const fileTypeValue = formData.get('file_type');
    const competence = typeof competenceValue === 'string' && competenceValue.trim() ? competenceValue.trim() : undefined;
    const fileType = typeof fileTypeValue === 'string' && fileTypeValue.trim() ? fileTypeValue.trim() : undefined;

    // Validações básicas
    if (!file) {
      return c.json(
        {
          error: {
            message: 'File is required',
            code: 'FILE_REQUIRED',
          },
        },
        400
      );
    }

    if (!clientId) {
      return c.json(
        {
          error: {
            message: 'client_id is required',
            code: 'MISSING_FIELDS',
          },
        },
        400
      );
    }

    // Validar schema
    const validation = UploadFiscalFilePayloadSchema.safeParse({
      client_id: clientId,
      competence,
      file_type: fileType,
    });

    if (!validation.success) {
      return c.json(
        {
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: validation.error.errors,
          },
        },
        400
      );
    }

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Obter userId do JWT
    const userId = c.get('user')?.id;

    // Upload
    if (!companyId) {
      return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
    }
    const fiscalFile = await fiscalFileService.upload(
      companyId,
      validation.data.client_id,
      buffer,
      file.name,
      file.type,
      userId,
      {
        competence: validation.data.competence,
        file_type: validation.data.file_type,
      }
    );

    return c.json(
      {
        data: {
          fiscal_file: {
            id: fiscalFile.id,
            client_id: fiscalFile.client_id,
            file_type: fiscalFile.file_type,
            competence: fiscalFile.competence,
            file_name: fiscalFile.file_name,
            file_size: fiscalFile.file_size,
            status: fiscalFile.status,
            created_at: fiscalFile.created_at,
          },
        },
      },
      201
    );
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /fiscal-files/inspect
 * Inspecionar arquivo SPED (ECD/ECF) para sugerir cliente automaticamente
 */
fiscalFileRoutes.post('/inspect', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json(
        {
          error: {
            message: 'File is required',
            code: 'FILE_REQUIRED',
          },
        },
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const clientIdValue = formData.get('client_id');
    const hintedClientId =
      typeof clientIdValue === 'string' && clientIdValue.trim() ? clientIdValue.trim() : undefined;
    const result = await fiscalFileService.inspectSpedCandidate(buffer, file.name, hintedClientId);

    return c.json({
      data: result,
    });
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * GET /fiscal-files/calibrator/rules
 * Listar regras de calibracao (globais do tenant + opcionais por cliente)
 */
fiscalFileRoutes.get(
  '/calibrator/rules',
  zValidator('query', ListCalibratorRulesQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const rules = await fiscalFileService.listCalibratorRules(query.client_id);
      return c.json({ data: { rules } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /fiscal-files/calibrator/rules
 * Criar regra de calibracao.
 */
fiscalFileRoutes.post(
  '/calibrator/rules',
  zValidator('json', CalibratorRuleSchema),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const rule = await fiscalFileService.createCalibratorRule(body);
      return c.json({ data: { rule } }, 201);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /fiscal-files/calibrator/rules/:id
 * Atualizar regra de calibracao.
 */
fiscalFileRoutes.put(
  '/calibrator/rules/:id',
  zValidator('param', CalibratorRuleIdParamSchema),
  zValidator('json', UpdateCalibratorRuleSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');
      const rule = await fiscalFileService.updateCalibratorRule(id, body);
      return c.json({ data: { rule } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /fiscal-files/calibrator/rules/:id
 * Excluir regra de calibracao.
 */
fiscalFileRoutes.delete(
  '/calibrator/rules/:id',
  zValidator('param', CalibratorRuleIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      await fiscalFileService.deleteCalibratorRule(id);
      return c.json({ data: { success: true } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files
 * Listar arquivos fiscais com filtros
 */
fiscalFileRoutes.get(
  '/',
  zValidator('query', ListFiscalFilesQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');

      const result = await fiscalFileService.list({
        client_id: query.client_id,
        competence: query.competence,
        status: query.status,
        page: query.page,
        limit: query.limit,
      });

      return c.json({
        data: result,
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files/summary/:id
 * Alias para resumo consolidado da extração.
 */
fiscalFileRoutes.get(
  '/summary/:id',
  zValidator('param', FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const summary = await fiscalFileService.getExtractionSummary(id);
      return c.json({ data: summary });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files/:id/summary
 * Resumo consolidado de extração para visualização no frontend
 */
fiscalFileRoutes.get(
  '/:id/summary',
  zValidator('param', FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const summary = await fiscalFileService.getExtractionSummary(id);
      return c.json({ data: summary });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files/:id
 * Buscar arquivo fiscal por ID
 */
fiscalFileRoutes.get(
  '/:id',
  zValidator('param', FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');

      const file = await fiscalFileService.getById(id);

      return c.json({
        data: {
          fiscal_file: {
            id: file.id,
            client_id: file.client_id,
            file_type: file.file_type,
            competence: file.competence,
            file_name: file.file_name,
            file_size: file.file_size,
            mime_type: file.mime_type,
            status: file.status,
            processing_error: file.processing_error,
            metadata: file.metadata,
            created_at: file.created_at,
            updated_at: file.updated_at,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files/:id/download
 * Obter URL de download do arquivo
 */
fiscalFileRoutes.get(
  '/:id/download',
  zValidator('param', FiscalFileIdParamSchema),
  zValidator('query', DownloadFiscalFileQuerySchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const { expires_in } = c.req.valid('query');

      const downloadUrl = await fiscalFileService.getDownloadUrl(id, expires_in);

      return c.json({
        data: {
          download_url: downloadUrl,
          expires_in,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PUT /fiscal-files/:id/status
 * Atualizar status do arquivo (usado pelos workers)
 */
fiscalFileRoutes.put(
  '/:id/status',
  zValidator('param', FiscalFileIdParamSchema),
  zValidator('json', UpdateFiscalFileStatusSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const file = await fiscalFileService.updateStatus(id, data);

      return c.json({
        data: {
          fiscal_file: {
            id: file.id,
            status: file.status,
            processing_error: file.processing_error,
            metadata: file.metadata,
            updated_at: file.updated_at,
          },
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * DELETE /fiscal-files/:id
 * Deletar arquivo fiscal
 */
fiscalFileRoutes.delete(
  '/:id',
  zValidator('param', FiscalFileIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const companyId = c.get('companyId');
      if (!companyId) {
        return c.json({ error: { message: 'Tenant required', code: 'TENANT_REQUIRED' } }, 400);
      }
      const userId = c.get('user')?.id;

      await fiscalFileService.delete(id, companyId, userId);

      return c.json({
        data: {
          success: true,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /fiscal-files/client/:client_id
 * Listar arquivos de um cliente específico
 */
fiscalFileRoutes.get(
  '/client/:client_id',
  zValidator('param', ClientIdParamSchema),
  async (c) => {
    try {
      const { client_id } = c.req.valid('param');

      const files = await fiscalFileService.listByClient(client_id);

      return c.json({
        data: {
          files: files.map((file) => ({
            id: file.id,
            file_type: file.file_type,
            competence: file.competence,
            file_name: file.file_name,
            file_size: file.file_size,
            status: file.status,
            created_at: file.created_at,
          })),
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { fiscalFileRoutes };
