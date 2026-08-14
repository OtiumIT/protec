import { z } from 'zod';

const money = z.number().finite().nonnegative();

/** Fato gerador no motor desde a v1. A UI da v1 expõe só integralização. */
export const ItbiFatoGeradorSchema = z.enum(['integralizacao', 'permuta', 'onerosa']);
export type ItbiFatoGerador = z.infer<typeof ItbiFatoGeradorSchema>;

export const ItbiAtividadePjSchema = z.enum(['holding_patrimonial', 'operacional']);
export type ItbiAtividadePj = z.infer<typeof ItbiAtividadePjSchema>;

export const ItbiEnquadramentoSchema = z.enum([
  'incidencia',
  'imunidade_total',
  'imunidade_parcial',
]);
export type ItbiEnquadramento = z.infer<typeof ItbiEnquadramentoSchema>;

/** Critério declarado da base de referência (Tema 796). Ausente = simulação v1 (fallback automático). */
export const ItbiCriterioReferenciaSchema = z.enum(['mercado', 'referencia_itbi', 'iptu']);
export type ItbiCriterioReferencia = z.infer<typeof ItbiCriterioReferenciaSchema>;

export const ITBI_CRITERIO_LABEL: Record<ItbiCriterioReferencia, string> = {
  mercado: 'valor de mercado',
  referencia_itbi: 'valor de referência do ITBI (planta/prefeitura)',
  iptu: 'valor de IPTU (venal)',
};

export const ItbiSimulationInputSchema = z.object({
  snapshot_version: z.literal(1),
  fato_gerador: ItbiFatoGeradorSchema,
  client_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  uf: z.string().length(2),
  municipio: z.string().min(1).max(120),
  /** IPTU / venal municipal */
  valor_venal: money,
  valor_mercado: money,
  /** Planta/referência de ITBI da prefeitura — distinto do venal de IPTU */
  valor_referencia_itbi: money.optional(),
  valor_integralizacao: money,
  percentual_imovel: z.number().positive().max(100),
  atividade_pj: ItbiAtividadePjSchema,
  aliquota_percent: z.number().positive().max(20),
  terreno_marinha: z.boolean(),
  criterio_referencia: ItbiCriterioReferenciaSchema.optional(),
});
export type ItbiSimulationInput = z.infer<typeof ItbiSimulationInputSchema>;

export const ItbiMemoriaItemSchema = z.object({
  ordem: z.number().int(),
  descricao: z.string(),
  valor: z.number().optional(),
});

export const ItbiSimulationResultSchema = z.object({
  enquadramento: ItbiEnquadramentoSchema,
  valor_referencia: z.number(),
  criterio_referencia: ItbiCriterioReferenciaSchema.optional(),
  criterio_referencia_label: z.string().optional(),
  base_cheia: z.number(),
  capital_imune: z.number(),
  base_tributavel: z.number(),
  aliquota_percent: z.number(),
  itbi: z.number(),
  alerta_laudemio: z.boolean(),
  memoria: z.array(ItbiMemoriaItemSchema),
  aviso: z.string(),
});
export type ItbiSimulationResult = z.infer<typeof ItbiSimulationResultSchema>;
