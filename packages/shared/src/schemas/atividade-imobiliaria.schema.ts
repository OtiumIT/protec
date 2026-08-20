import { z } from 'zod';

const uuid = z.string().uuid();
const money = z.number().min(0);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');

// ==========================================================================
// Enums Domínio
// ==========================================================================

export const NaturezaDominioEnum = z.enum(['01', '02', '03', '04']);
export type NaturezaDominio = z.infer<typeof NaturezaDominioEnum>;
export const NATUREZA_LABELS: Record<NaturezaDominio, string> = {
  '01': 'Consórcio',
  '02': 'SCP',
  '03': 'Incorporação em condomínio',
  '04': 'Outras',
};

export const MetricaAreaEnum = z.enum([
  'area_real_total',
  'area_privativa',
  'area_construida',
  'area_terreno',
]);
export type MetricaArea = z.infer<typeof MetricaAreaEnum>;

export const DevelopmentStatusEnum = z.enum(['rascunho', 'ativo', 'encerrado']);
export type DevelopmentStatus = z.infer<typeof DevelopmentStatusEnum>;

export const SituacaoUnidadeEnum = z.enum(['disponivel', 'reservada', 'vendida', 'permuta']);
export type SituacaoUnidade = z.infer<typeof SituacaoUnidadeEnum>;

// ==========================================================================
// Empreendimento
// ==========================================================================

export const CreateDevelopmentSchema = z.object({
  codigo: z.string().min(1).max(30),
  nome: z.string().min(1).max(255),
  tipo: z.string().max(60).optional().nullable(),
  natureza: NaturezaDominioEnum.optional().nullable(),
  descricao: z.string().max(500).optional().nullable(),
  data_inicio: isoDate.optional().nullable(),
  cno: z.string().max(30).optional().nullable(),
  cno_data: isoDate.optional().nullable(),
  area_total_m2: z.number().min(0).optional().nullable(),
  area_credito_m2: z.number().min(0).optional().nullable(),
  metrica_area: MetricaAreaEnum.optional().nullable(),
  cep: z.string().max(10).optional().nullable(),
  logradouro: z.string().max(255).optional().nullable(),
  numero: z.string().max(30).optional().nullable(),
  complemento: z.string().max(120).optional().nullable(),
  bairro: z.string().max(120).optional().nullable(),
  cidade: z.string().max(120).optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  processo_numero: z.string().max(60).optional().nullable(),
  processo_obs: z.string().max(500).optional().nullable(),
  status: DevelopmentStatusEnum.default('rascunho'),
});
export type CreateDevelopmentInput = z.infer<typeof CreateDevelopmentSchema>;

export const UpdateDevelopmentSchema = CreateDevelopmentSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Informe ao menos um campo para atualizar' },
);
export type UpdateDevelopmentInput = z.infer<typeof UpdateDevelopmentSchema>;

// ==========================================================================
// Unidades
// ==========================================================================

export const CreateUnitSchema = z.object({
  codigo: z.string().min(1).max(30),
  descricao: z.string().min(1).max(255),
  matricula: z.string().max(100).optional().nullable(),
  tipo_unidade: z.string().max(60).optional().nullable(),
  area_m2: z.number().min(0).optional().nullable(),
  custo: money.optional().nullable(),
  valor_atribuido: money.optional().nullable(),
  situacao: SituacaoUnidadeEnum.default('disponivel'),
});
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;

export const UpdateUnitSchema = CreateUnitSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Informe ao menos um campo para atualizar' },
);
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;

export const CreateUnitBatchSchema = z.object({
  units: z.array(CreateUnitSchema).min(1).max(200),
});
export type CreateUnitBatchInput = z.infer<typeof CreateUnitBatchSchema>;

// ==========================================================================
// Integridade
// ==========================================================================

export interface DevelopmentIntegrity {
  area_total: number | null;
  area_sum: number;
  area_diff: number;
  area_ok: boolean;
  valor_total: number;
  unit_count: number;
}

// ==========================================================================
// Params e queries
// ==========================================================================

export const DevelopmentIdParamSchema = z.object({ id: uuid });
export const UnitIdParamSchema = z.object({ unitId: uuid });

export const ListDevelopmentsQuerySchema = z.object({
  status: DevelopmentStatusEnum.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type ListDevelopmentsQuery = z.infer<typeof ListDevelopmentsQuerySchema>;

// ==========================================================================
// Row types (retornados pela API)
// ==========================================================================

export interface RealEstateDevelopment {
  id: string;
  codigo: string;
  nome: string;
  tipo: string | null;
  natureza: NaturezaDominio | null;
  descricao: string | null;
  data_inicio: string | null;
  cno: string | null;
  cno_data: string | null;
  area_total_m2: number | null;
  area_credito_m2: number | null;
  metrica_area: MetricaArea | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  processo_numero: string | null;
  processo_obs: string | null;
  status: DevelopmentStatus;
  created_at: string;
  updated_at: string;
  unit_count?: number;
  integrity?: DevelopmentIntegrity;
}

export interface RealEstateUnit {
  id: string;
  development_id: string;
  codigo: string;
  descricao: string;
  matricula: string | null;
  tipo_unidade: string | null;
  area_m2: number | null;
  custo: number | null;
  valor_atribuido: number | null;
  situacao: SituacaoUnidade;
  created_at: string;
  updated_at: string;
}
