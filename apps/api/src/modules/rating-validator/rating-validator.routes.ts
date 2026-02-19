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
  RatingValidationIdParamSchema,
  RatingValidatorFiscalFileIdParamSchema,
  ValidateFromDataSchema,
} from '@shared/core';
import { errorHandler } from '../../shared/utils/error-handler';

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
 */
ratingValidatorRoutes.post(
  '/simulate',
  zValidator('json', SimulateRatingSchema),
  async (c) => {
    try {
      const input = c.req.valid('json');
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
        userId
      );

      return c.json(
        {
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
        },
        200
      );
    } catch (error) {
      return errorHandler(error, c);
    }
  }
);

export { ratingValidatorRoutes };
