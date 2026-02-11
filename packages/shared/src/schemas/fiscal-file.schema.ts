import { z } from 'zod';

export const UploadFiscalFileSchema = z.object({
  client_id: z.string().uuid(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM'),
  file_type: z.enum(['sped', 'ecd', 'pgdas', 'xml', 'pdf', 'txt', 'outros']),
});

export const UpdateFiscalFileStatusSchema = z.object({
  status: z.enum(['uploaded', 'processing', 'processed', 'error']).optional(),
  processing_error: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

// Schema para query params de listagem
export const ListFiscalFilesQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, 'Competence must be in format YYYY-MM').optional(),
  status: z.enum(['uploaded', 'processing', 'processed', 'error']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Schema para route params (IDs)
export const FiscalFileIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ClientIdParamSchema = z.object({
  client_id: z.string().uuid(),
});

// Schema para query params de download
export const DownloadFiscalFileQuerySchema = z.object({
  expires_in: z.coerce.number().int().positive().max(86400).default(3600), // Máximo 24 horas
});
