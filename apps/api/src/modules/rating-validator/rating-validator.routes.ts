import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RatingValidatorService } from './rating-validator.service';
import { RatingValidatorRepository } from './rating-validator.repository';
import { ClientRepository } from '../clients/client.repository';
import { FiscalFileRepository } from '../fiscal-files/fiscal-file.repository';
import { authMiddleware } from '../../middleware/auth.middleware';
import { tenantMiddleware } from '../../middleware/tenant.middleware';
import { requireModule } from '../../middleware/module.middleware';
import {
  SimulateRatingSchema,
  ListRatingValidationsQuerySchema,
  ListProcessedEcdFilesQuerySchema,
  ProcessedEcdCompetencesQuerySchema,
  PrefillByCompetenceQuerySchema,
  ValidateByCompetenceBodySchema,
  RatingValidationIdParamSchema,
  RatingValidatorFiscalFileIdParamSchema,
  ValidateFromDataSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';
import { extractEcdFromPdf } from './extract-from-ecd-pdf';
import { extractPgfnFromPdf } from './extract-from-pgfn-pdf';

/** Arredonda número para 2 casas decimais (evita resíduos de float que quebram multipleOf(0.01)) */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Recursivamente arredonda todo número do body para 2 decimais (objetos e arrays; preserva strings, boolean, null). */
function deepRoundNumbers(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === 'number') return round2(value);
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(deepRoundNumbers);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = deepRoundNumbers((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

const ratingValidatorRoutes = new Hono();

// Aplicar middlewares globais
ratingValidatorRoutes.use('/*', tenantMiddleware);
ratingValidatorRoutes.use('/*', authMiddleware);
ratingValidatorRoutes.use('/*', requireModule('RATING_VALIDATOR'));

// Instanciar services
const ratingValidatorRepo = new RatingValidatorRepository();
const clientRepo = new ClientRepository();
const fiscalFileRepo = new FiscalFileRepository();
const ratingValidatorService = new RatingValidatorService(
  ratingValidatorRepo,
  clientRepo,
  fiscalFileRepo
);

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
    const sanitized = deepRoundNumbers(body) as Record<string, unknown>;
    const parsed = SimulateRatingSchema.safeParse(sanitized);
    if (!parsed.success) {
      return c.json(
        { error: { message: 'Dados inválidos.', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        400
      );
    }
    const input = parsed.data;
    const userId = c.get('user')?.id;

    const result = await ratingValidatorService.simulate(input, userId);

    return c.json(
        {
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
            comparativo_parcelamento: result.comparativo_parcelamento,
          },
        },
        200
      );
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * POST /rating-validator/extract-from-ecd-pdf
 * Extrai dados do PDF da ECD (SPED Contábil) via OCR e retorna JSON estruturado + dados para preencher a simulação.
 * Body: multipart/form-data com campo "file" (arquivo PDF).
 */
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

ratingValidatorRoutes.post('/extract-from-ecd-pdf', async (c) => {
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
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return c.json(
        { error: { message: 'O arquivo é muito grande. O limite é 15 MB.', code: 'FILE_TOO_LARGE' } },
        400
      );
    }
    const result = await extractEcdFromPdf(buffer);
    return c.json({ data: result }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * POST /rating-validator/extract-from-pgfn-pdf
 * Extrai dados do PDF do Recibo de Adesão PGFN via OCR e retorna JSON estruturado.
 * Body: multipart/form-data com campo "file" (arquivo PDF).
 */
ratingValidatorRoutes.post('/extract-from-pgfn-pdf', async (c) => {
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
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return c.json(
        { error: { message: 'O arquivo é muito grande. O limite é 15 MB.', code: 'FILE_TOO_LARGE' } },
        400
      );
    }
    const result = await extractPgfnFromPdf(buffer);
    return c.json({ data: result }, 200);
  } catch (err) {
    return errorHandler(err, c);
  }
});

/**
 * GET /rating-validator
 * Listar validações com filtros
 */
ratingValidatorRoutes.get(
  '/',
  zValidator('query', ListRatingValidationsQuerySchema),
  async (c) => {
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
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /rating-validator/processed-ecd-competences
 * Lista competências (YYYY-MM) distintas com ECD processado para o cliente (sem viés de LIMIT nos arquivos).
 */
ratingValidatorRoutes.get(
  '/processed-ecd-competences',
  zValidator('query', ProcessedEcdCompetencesQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const competences = await ratingValidatorService.listDistinctProcessedEcdCompetences(
        query.client_id
      );
      return c.json({ data: { competences } });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /rating-validator/processed-ecd-files
 * Lista arquivos ECD processados elegíveis para validação real.
 */
ratingValidatorRoutes.get(
  '/processed-ecd-files',
  zValidator('query', ListProcessedEcdFilesQuerySchema),
  async (c) => {
    try {
      const query = c.req.valid('query');
      const files = await ratingValidatorService.listProcessedEcdFiscalFiles({
        client_id: query.client_id,
        competence: query.competence,
        limit: query.limit,
      });

      return c.json({
        data: {
          files,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /rating-validator/prefill/:fiscal_file_id
 * Retorna resumo dos campos pre-preenchidos da validacao real.
 */
ratingValidatorRoutes.get(
  '/prefill/:fiscal_file_id',
  zValidator('param', RatingValidatorFiscalFileIdParamSchema),
  async (c) => {
    try {
      const { fiscal_file_id } = c.req.valid('param');
      const data = await ratingValidatorService.getRealValidationPrefill(fiscal_file_id);
      return c.json({ data }, 200);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /rating-validator/prefill-by-competence
 * Pré-preenchimento consolidado por cliente + competência (vários ECD).
 */
ratingValidatorRoutes.get(
  '/prefill-by-competence',
  zValidator('query', PrefillByCompetenceQuerySchema),
  async (c) => {
    try {
      const q = c.req.valid('query');
      const data = await ratingValidatorService.getRealValidationPrefillByCompetence(
        q.client_id,
        q.competence
      );
      return c.json({ data }, 200);
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * GET /rating-validator/:id
 * Buscar validação por ID
 */
ratingValidatorRoutes.get(
  '/:id',
  zValidator('param', RatingValidationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');

      const validation = await ratingValidatorService.getById(id);

      return c.json({
        data: {
          validation,
        },
      });
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * PATCH /rating-validator/:id
 * Atualizar validação existente (re-simula com novos dados)
 */
ratingValidatorRoutes.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: { message: 'ID é obrigatório.', code: 'ID_REQUIRED' } }, 400);
    }
    const body = await c.req.json().catch(() => null);
    if (body == null) {
      return c.json({ error: { message: 'Body JSON inválido.', code: 'INVALID_JSON' } }, 400);
    }
    const sanitized = deepRoundNumbers(body) as Record<string, unknown>;
    const parsed = SimulateRatingSchema.safeParse(sanitized);
    if (!parsed.success) {
      return c.json(
        { error: { message: 'Dados inválidos.', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
        400
      );
    }
    const input = parsed.data;
    const userId = c.get('user')?.id;

    const { validation, result } = await ratingValidatorService.update(id, input, userId);

    return c.json(
      {
        data: {
          validation,
          calculated_values: result.calculated_values,
          indicators: result.indicators,
          indicator_analysis: result.indicator_analysis,
          rating_estimado: result.rating_estimado,
          rating_real: result.rating_real,
          has_discrepancy: result.has_discrepancy,
          discrepancy_details: result.discrepancy_details,
          comparativo_parcelamento: result.comparativo_parcelamento,
        },
      },
      200
    );
  } catch (error) {
    return errorHandler(error, c);
  }
});

/**
 * DELETE /rating-validator/:id
 * Deletar validação
 */
ratingValidatorRoutes.delete(
  '/:id',
  zValidator('param', RatingValidationIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid('param');
      const userId = c.get('user')?.id;

      await ratingValidatorService.delete(id, userId);

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
 * POST /rating-validator/validate-by-competence
 * Validação real consolidada por cliente + competência.
 */
ratingValidatorRoutes.post(
  '/validate-by-competence',
  zValidator('json', ValidateByCompetenceBodySchema),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const userId = c.get('user')?.id;

      const result = await ratingValidatorService.validateFromCompetence(
        body.client_id,
        body.competence,
        body.rating_real,
        body.overrides,
        userId
      );

      return c.json(
        {
          data: {
            calculated_values: result.calculated_values,
            indicators: result.indicators,
            indicator_analysis: result.indicator_analysis,
            rating_estimado: result.rating_estimado,
            rating_real: result.rating_real,
            has_discrepancy: result.has_discrepancy,
            discrepancy_details: result.discrepancy_details,
            validation_id: result.validation_id,
            is_simulation: false,
          },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

/**
 * POST /rating-validator/validate/:fiscal_file_id
 * Validar rating a partir de arquivo ECD processado
 * NOTA: Implementação preparada, aguarda exemplos de dados ECD
 */
ratingValidatorRoutes.post(
  '/validate/:fiscal_file_id',
  zValidator('param', RatingValidatorFiscalFileIdParamSchema),
  zValidator('json', ValidateFromDataSchema.partial()),
  async (c) => {
    try {
      const { fiscal_file_id } = c.req.valid('param');
      const body = c.req.valid('json');
      const userId = c.get('user')?.id;

      const result = await ratingValidatorService.validateFromFiscalFile(
        fiscal_file_id,
        body.rating_real,
        body.overrides,
        userId
      );

      return c.json(
        {
          data: {
            calculated_values: result.calculated_values,
            indicators: result.indicators,
            indicator_analysis: result.indicator_analysis,
            rating_estimado: result.rating_estimado,
            rating_real: result.rating_real,
            has_discrepancy: result.has_discrepancy,
            discrepancy_details: result.discrepancy_details,
            validation_id: result.validation_id,
            is_simulation: false,
          },
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { ratingValidatorRoutes };
