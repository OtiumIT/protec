import { z } from 'zod';

const appKeyEnum = z.enum(['cdb_pre', 'cdb_pos', 'lci_lca', 'fundo_rf', 'poupanca']);

/** Parâmetros da simulação (PJ x retenção PF / Lei 15.270) */
export const DistribuicaoLucrosSimulationParamsSchema = z.object({
  valor: z.number().min(50_000).max(1_000_000),
  meses: z.number().int().min(1).max(60),
  irpjRate: z.number().min(0.2).max(0.45),
  appKey: appKeyEnum,
});

export const CreateDistribuicaoLucrosSimulationSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().max(255).optional().nullable(),
  input: DistribuicaoLucrosSimulationParamsSchema,
});

export const UpdateDistribuicaoLucrosSimulationSchema = z
  .object({
    client_id: z.string().uuid().optional(),
    title: z.string().max(255).optional().nullable(),
    input: DistribuicaoLucrosSimulationParamsSchema.optional(),
  })
  .refine((d) => d.title !== undefined || d.input !== undefined || d.client_id !== undefined, {
    message: 'Informe título, input ou client_id para atualizar',
  });

export const ListDistribuicaoLucrosSimulationsQuerySchema = z.object({
  client_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const DistribuicaoLucrosSimulationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type DistribuicaoLucrosSimulationParams = z.infer<typeof DistribuicaoLucrosSimulationParamsSchema>;
export type CreateDistribuicaoLucrosSimulationInput = z.infer<typeof CreateDistribuicaoLucrosSimulationSchema>;
export type UpdateDistribuicaoLucrosSimulationInput = z.infer<typeof UpdateDistribuicaoLucrosSimulationSchema>;
