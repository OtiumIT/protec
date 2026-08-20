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

// ==========================================================================
// Fase B — Contrato de venda
// ==========================================================================

export const OperacaoVendaEnum = z.enum(['01', '02']);
export type OperacaoVenda = z.infer<typeof OperacaoVendaEnum>;

export const ContractStatusEnum = z.enum(['rascunho', 'ativo', 'encerrado', 'cancelado']);
export type ContractStatus = z.infer<typeof ContractStatusEnum>;

export const InstallmentStatusEnum = z.enum(['aberto', 'pago']);
export type InstallmentStatus = z.infer<typeof InstallmentStatusEnum>;

export const SalePartySchema = z.object({
  client_id: uuid,
  participacao_pct: z.number().min(0).max(100),
});
export type SalePartyInput = z.infer<typeof SalePartySchema>;

export const SaleContractUnitSchema = z.object({
  unit_id: uuid,
  valor_atribuido_contrato: money,
});
export type SaleContractUnitInput = z.infer<typeof SaleContractUnitSchema>;

export const SaleInstallmentInputSchema = z.object({
  sequencia: z.number().int().min(1),
  vencimento: isoDate,
  principal: money,
  fonte_pagadora: z.string().max(60).optional().nullable(),
});
export type SaleInstallmentInput = z.infer<typeof SaleInstallmentInputSchema>;

export const CreateSaleContractSchema = z.object({
  numero: z.string().min(1).max(60),
  data_contrato: isoDate,
  valor_venda: money,
  operacao: OperacaoVendaEnum.default('02'),
  indice_atualizacao: z.string().max(30).optional().nullable(),
  taxa_juros: z.number().min(0).optional().nullable(),
  informacoes_complementares: z.string().max(2000).optional().nullable(),
  status: ContractStatusEnum.default('rascunho'),
  parties: z.array(SalePartySchema).min(1),
  units: z.array(SaleContractUnitSchema).min(1),
  installments: z.array(SaleInstallmentInputSchema).default([]),
});
export type CreateSaleContractInput = z.infer<typeof CreateSaleContractSchema>;

export const UpdateSaleContractSchema = z.object({
  numero: z.string().min(1).max(60).optional(),
  data_contrato: isoDate.optional(),
  valor_venda: money.optional(),
  operacao: OperacaoVendaEnum.optional(),
  indice_atualizacao: z.string().max(30).optional().nullable(),
  taxa_juros: z.number().min(0).optional().nullable(),
  informacoes_complementares: z.string().max(2000).optional().nullable(),
  status: ContractStatusEnum.optional(),
  parties: z.array(SalePartySchema).min(1).optional(),
  units: z.array(SaleContractUnitSchema).min(1).optional(),
  installments: z.array(SaleInstallmentInputSchema).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });
export type UpdateSaleContractInput = z.infer<typeof UpdateSaleContractSchema>;

export const ContractIdParamSchema = z.object({ contractId: uuid });
export const InstallmentIdParamSchema = z.object({ installmentId: uuid });
export const ReceiptIdParamSchema = z.object({ receiptId: uuid });

export const CreateReceiptSchema = z.object({
  data_pagamento: isoDate,
  principal: money,
  correcao_monetaria: money.default(0),
  juros: money.default(0),
  multa: money.default(0),
  desconto: money.default(0),
  documento_ref: z.string().min(3).max(255),
});
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>;

export interface ContractIntegrity {
  valor_venda: number;
  units_sum: number;
  units_diff: number;
  units_ok: boolean;
  installments_sum: number;
  installments_diff: number;
  installments_ok: boolean;
  parties_sum: number;
  parties_ok: boolean;
  a_vista_ok: boolean;
  ok: boolean;
}

export interface RealEstateSaleContract {
  id: string;
  development_id: string;
  numero: string;
  data_contrato: string;
  valor_venda: number;
  operacao: OperacaoVenda;
  indice_atualizacao: string | null;
  taxa_juros: number | null;
  informacoes_complementares: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  party_names?: string;
  integrity?: ContractIntegrity;
}

export interface RealEstateSaleParty {
  id: string;
  contract_id: string;
  client_id: string;
  participacao_pct: number;
  created_at: string;
  client_name?: string;
  client_documento?: string | null;
}

export interface RealEstateSaleContractUnit {
  id: string;
  contract_id: string;
  unit_id: string;
  valor_atribuido_contrato: number;
  created_at: string;
  unit_codigo?: string;
  unit_descricao?: string;
}

export interface RealEstateSaleInstallment {
  id: string;
  contract_id: string;
  sequencia: number;
  vencimento: string;
  principal: number;
  fonte_pagadora: string | null;
  status: InstallmentStatus;
  created_at: string;
  updated_at: string;
  recebido_principal?: number;
}

export interface RealEstateSaleReceipt {
  id: string;
  installment_id: string;
  data_pagamento: string;
  principal: number;
  correcao_monetaria: number;
  juros: number;
  multa: number;
  desconto: number;
  total_recebido: number;
  documento_ref: string;
  created_at: string;
}

export interface SaleContractDetail {
  contract: RealEstateSaleContract;
  parties: RealEstateSaleParty[];
  units: RealEstateSaleContractUnit[];
  installments: RealEstateSaleInstallment[];
  receipts: RealEstateSaleReceipt[];
  integrity: ContractIntegrity;
}

export interface DominioExportFile {
  filename: string;
  content: string;
}
