import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { FiscalFileService } from './fiscal-file.service';
import { FiscalFileRepository } from './fiscal-file.repository';
import { ClientRepository } from '../clients/client.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  UploadFiscalFileSchema,
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
    const competence = formData.get('competence') as string;
    const fileType = formData.get('file_type') as string;

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

    if (!clientId || !competence || !fileType) {
      return c.json(
        {
          error: {
            message: 'client_id, competence and file_type are required',
            code: 'MISSING_FIELDS',
          },
        },
        400
      );
    }

    // Validar schema
    const validation = UploadFiscalFileSchema.safeParse({
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
      validation.data.competence,
      validation.data.file_type,
      buffer,
      file.name,
      file.type,
      userId
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
