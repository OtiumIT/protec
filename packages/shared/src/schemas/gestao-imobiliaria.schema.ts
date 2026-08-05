import { z } from 'zod';

/**
 * Contratos (Zod) da camada contábil-operacional da Gestão Imobiliária.
 * Convive com property.schema.ts (simuladores tributários), sem alterá-lo.
 */

const uuid = z.string().uuid();
const money = z.number().min(0);
const competencia = z.string().regex(/^\d{4}-\d{2}$/, 'Formato esperado: YYYY-MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD');

// ==========================================================================
// Inquilinos
// ==========================================================================
export const CreatePropertyTenantSchema = z.object({
  client_id: uuid.optional().nullable(),
  nome: z.string().min(1).max(255),
  documento: z.string().max(20).optional().nullable(),
  tipo_pessoa: z.enum(['pf', 'pj']).default('pf'),
  email: z.string().email().max(255).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  observacao: z.string().optional().nullable(),
});

export const UpdatePropertyTenantSchema = CreatePropertyTenantSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Informe ao menos um campo para atualizar' }
);

// ==========================================================================
// Contratos de locação
// ==========================================================================
export const LeaseStatusEnum = z.enum(['ativo', 'encerrado', 'rascunho', 'inadimplente']);
export const IndiceReajusteEnum = z.enum(['IPCA', 'IGPM', 'INPC', 'OUTRO', 'NENHUM']);

export const ImobiliariaTipoEnum = z.enum(['percentual', 'fixo']);

export const CreatePropertyLeaseSchema = z.object({
  property_id: uuid,
  tenant_id: uuid.optional().nullable(),
  data_inicio: isoDate,
  data_fim: isoDate.optional().nullable(),
  valor_aluguel: money.default(0),
  dia_vencimento: z.number().int().min(1).max(31).default(10),
  indice_reajuste: IndiceReajusteEnum.default('IPCA'),
  status: LeaseStatusEnum.default('ativo'),
  observacao: z.string().optional().nullable(),
  regime_tributario: z.enum(['pf', 'pj']).optional().nullable(),
  tem_imobiliaria: z.boolean().default(false),
  imobiliaria_tipo: ImobiliariaTipoEnum.optional().nullable(),
  imobiliaria_valor: money.default(0),
});

export const UpdatePropertyLeaseSchema = CreatePropertyLeaseSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const CreateLeaseAmendmentSchema = z.object({
  lease_id: uuid,
  tipo: z.enum(['reajuste', 'aditivo', 'renovacao']).default('reajuste'),
  data_evento: isoDate,
  indice_aplicado: z.string().max(20).optional().nullable(),
  percentual: z.number().optional().nullable(),
  valor_anterior: money.optional().nullable(),
  valor_novo: money.optional().nullable(),
  descricao: z.string().optional().nullable(),
});

export const CreateGuaranteeSchema = z.object({
  lease_id: uuid,
  tipo: z.enum(['caucao', 'fiador', 'seguro_fianca', 'titulo_capitalizacao', 'outro']),
  valor: money.optional().nullable(),
  descricao: z.string().optional().nullable(),
  status: z.enum(['ativa', 'devolvida', 'executada', 'encerrada']).default('ativa'),
  data_devolucao: isoDate.optional().nullable(),
});

export const UpdateGuaranteeSchema = CreateGuaranteeSchema.partial()
  .omit({ lease_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

// ==========================================================================
// Livro financeiro operacional
// ==========================================================================
export const LedgerStatusEnum = z.enum(['previsto', 'confirmado', 'pago', 'atrasado', 'cancelado']);
export const LedgerNaturezaEnum = z.enum(['receita', 'despesa']);

export const CreateLedgerEntrySchema = z.object({
  property_id: uuid,
  lease_id: uuid.optional().nullable(),
  competencia,
  vencimento: isoDate,
  natureza: LedgerNaturezaEnum,
  categoria: z.string().min(1).max(60),
  descricao: z.string().optional().nullable(),
  valor: money.default(0),
  status: LedgerStatusEnum.default('previsto'),
  paid_at: isoDate.optional().nullable(),
});

export const UpdateLedgerEntrySchema = CreateLedgerEntrySchema.partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const SettleLedgerEntrySchema = z.object({
  paid_at: isoDate.optional(),
});

export const ListLedgerQuerySchema = z.object({
  property_id: uuid.optional(),
  lease_id: uuid.optional(),
  competencia: competencia.optional(),
  status: LedgerStatusEnum.optional(),
  natureza: LedgerNaturezaEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const CreateRecurringRuleSchema = z.object({
  property_id: uuid,
  lease_id: uuid.optional().nullable(),
  natureza: LedgerNaturezaEnum,
  categoria: z.string().min(1).max(60),
  descricao: z.string().optional().nullable(),
  valor: money.default(0),
  dia_vencimento: z.number().int().min(1).max(31).default(10),
  ativo: z.boolean().default(true),
  inicio_competencia: competencia.optional().nullable(),
  fim_competencia: competencia.optional().nullable(),
});

export const UpdateRecurringRuleSchema = CreateRecurringRuleSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const GenerateRecurringSchema = z.object({
  competencia,
});

// ==========================================================================
// Documentos
// ==========================================================================
export const CreatePropertyDocumentSchema = z.object({
  property_id: uuid.optional().nullable(),
  lease_id: uuid.optional().nullable(),
  categoria: z.string().max(40).default('outro'),
  nome_arquivo: z.string().min(1).max(255),
  mime_type: z.string().max(120).optional().nullable(),
  tamanho_bytes: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).refine((d) => d.property_id || d.lease_id, {
  message: 'Informe property_id ou lease_id',
});

// ==========================================================================
// Prestação de contas (share links read-only)
// ==========================================================================
export const CreateStatementShareSchema = z.object({
  client_id: uuid,
  property_ids: z.array(uuid).default([]),
  period_from: competencia,
  period_to: competencia,
  title: z.string().max(255).optional().nullable(),
  expires_in_days: z.number().int().min(1).max(365).default(30),
});

export const StatementQuerySchema = z.object({
  client_id: uuid,
  property_ids: z.string().optional().default(''),
  period_from: competencia,
  period_to: competencia,
});

export const PublicStatementParamSchema = z.object({
  token: z.string().min(16).max(200),
});

// ==========================================================================
// Propriedade fracionada
// ==========================================================================
export const CreateOwnershipShareSchema = z.object({
  property_id: uuid,
  client_id: uuid.optional().nullable(),
  nome_proprietario: z.string().min(1).max(255),
  documento: z.string().max(20).optional().nullable(),
  percentual: z.number().min(0).max(100).default(100),
});

export const UpdateOwnershipShareSchema = CreateOwnershipShareSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

// ==========================================================================
// Operação interna
// ==========================================================================
export const CreateVendorSchema = z.object({
  nome: z.string().min(1).max(255),
  documento: z.string().max(20).optional().nullable(),
  categoria: z.string().max(60).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  telefone: z.string().max(30).optional().nullable(),
  observacao: z.string().optional().nullable(),
});
export const UpdateVendorSchema = CreateVendorSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Informe ao menos um campo para atualizar' }
);

export const CreateMaintenanceTicketSchema = z.object({
  property_id: uuid,
  vendor_id: uuid.optional().nullable(),
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional().nullable(),
  status: z.enum(['aberto', 'em_andamento', 'aguardando_aprovacao', 'concluido', 'cancelado']).default('aberto'),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  valor_orcado: money.optional().nullable(),
  valor_final: money.optional().nullable(),
  aberto_em: isoDate.optional(),
  concluido_em: isoDate.optional().nullable(),
});
export const UpdateMaintenanceTicketSchema = CreateMaintenanceTicketSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const CreateInspectionSchema = z.object({
  property_id: uuid,
  lease_id: uuid.optional().nullable(),
  tipo: z.enum(['entrada', 'saida', 'periodica']).default('entrada'),
  data_vistoria: isoDate.optional(),
  responsavel: z.string().max(255).optional().nullable(),
  checklist: z.array(z.object({
    item: z.string(),
    estado: z.string().optional(),
    observacao: z.string().optional(),
  })).default([]),
  observacao: z.string().optional().nullable(),
  status: z.enum(['rascunho', 'concluida', 'assinada']).default('rascunho'),
});
export const UpdateInspectionSchema = CreateInspectionSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

export const CreateInventoryItemSchema = z.object({
  property_id: uuid,
  nome: z.string().min(1).max(255),
  quantidade: z.number().int().min(0).default(1),
  estado_conservacao: z.enum(['novo', 'bom', 'regular', 'ruim', 'inservivel']).default('bom'),
  valor_estimado: money.optional().nullable(),
  observacao: z.string().optional().nullable(),
});
export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial()
  .omit({ property_id: true })
  .refine((d) => Object.keys(d).length > 0, { message: 'Informe ao menos um campo para atualizar' });

// ==========================================================================
// Integrações externas (estrutura pronta; execução "em_criacao")
// ==========================================================================
export const CreatePaymentChargeSchema = z.object({
  property_id: uuid,
  ledger_entry_id: uuid.optional().nullable(),
  metodo: z.enum(['boleto', 'pix']).default('boleto'),
  valor: money.default(0),
  vencimento: isoDate,
  descricao: z.string().optional().nullable(),
});

export const CreateCommunicationSchema = z.object({
  client_id: uuid.optional().nullable(),
  property_id: uuid.optional().nullable(),
  canal: z.enum(['email', 'whatsapp']).default('email'),
  assunto: z.string().max(255).optional().nullable(),
  mensagem: z.string().optional().nullable(),
  destinatario: z.string().max(255).optional().nullable(),
});

export const CreateBankImportBatchSchema = z.object({
  referencia: z.string().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ==========================================================================
// Params comuns e dashboard
// ==========================================================================
export const GestaoImobiliariaIdParamSchema = z.object({ id: uuid });
export const PropertyIdParamOnlySchema = z.object({ id: uuid });

export const DashboardQuerySchema = z.object({
  client_id: uuid.optional(),
  competencia: competencia.optional(),
});

export const AlertsQuerySchema = z.object({
  client_id: uuid.optional(),
  dias: z.coerce.number().int().min(1).max(365).default(30),
});

// ==========================================================================
// Types
// ==========================================================================
export type CreatePropertyTenantInput = z.infer<typeof CreatePropertyTenantSchema>;
export type UpdatePropertyTenantInput = z.infer<typeof UpdatePropertyTenantSchema>;
export type CreatePropertyLeaseInput = z.infer<typeof CreatePropertyLeaseSchema>;
export type UpdatePropertyLeaseInput = z.infer<typeof UpdatePropertyLeaseSchema>;
export type CreateLeaseAmendmentInput = z.infer<typeof CreateLeaseAmendmentSchema>;
export type CreateGuaranteeInput = z.infer<typeof CreateGuaranteeSchema>;
export type UpdateGuaranteeInput = z.infer<typeof UpdateGuaranteeSchema>;
export type CreateLedgerEntryInput = z.infer<typeof CreateLedgerEntrySchema>;
export type UpdateLedgerEntryInput = z.infer<typeof UpdateLedgerEntrySchema>;
export type ListLedgerQuery = z.infer<typeof ListLedgerQuerySchema>;
export type CreateRecurringRuleInput = z.infer<typeof CreateRecurringRuleSchema>;
export type UpdateRecurringRuleInput = z.infer<typeof UpdateRecurringRuleSchema>;
export type CreatePropertyDocumentInput = z.infer<typeof CreatePropertyDocumentSchema>;
export type CreateStatementShareInput = z.infer<typeof CreateStatementShareSchema>;
export type StatementQuery = z.infer<typeof StatementQuerySchema>;
export type CreateOwnershipShareInput = z.infer<typeof CreateOwnershipShareSchema>;
export type UpdateOwnershipShareInput = z.infer<typeof UpdateOwnershipShareSchema>;
export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
export type CreateMaintenanceTicketInput = z.infer<typeof CreateMaintenanceTicketSchema>;
export type UpdateMaintenanceTicketInput = z.infer<typeof UpdateMaintenanceTicketSchema>;
export type CreateInspectionInput = z.infer<typeof CreateInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof UpdateInspectionSchema>;
export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;
export type CreatePaymentChargeInput = z.infer<typeof CreatePaymentChargeSchema>;
export type CreateCommunicationInput = z.infer<typeof CreateCommunicationSchema>;
export type CreateBankImportBatchInput = z.infer<typeof CreateBankImportBatchSchema>;
export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;
export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;

// ==========================================================================
// Row types (retornados pela API)
// ==========================================================================
export interface PropertyTenant {
  id: string;
  client_id: string | null;
  nome: string;
  documento: string | null;
  tipo_pessoa: 'pf' | 'pj';
  email: string | null;
  telefone: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyLease {
  id: string;
  property_id: string;
  tenant_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  valor_aluguel: number;
  dia_vencimento: number;
  indice_reajuste: string;
  status: string;
  observacao: string | null;
  regime_tributario: 'pf' | 'pj' | null;
  ultimo_resultado_simulacao: {
    pf: { imposto_anual: number; aliquota_efetiva: number };
    pj: { imposto_anual: number; aliquota_efetiva: number };
    recomendacao: 'pf' | 'pj';
    economia_anual: number;
    receita_anual: number;
    custos_anual: number;
  } | null;
  tem_imobiliaria: boolean;
  imobiliaria_tipo: 'percentual' | 'fixo' | null;
  imobiliaria_valor: number;
  created_at: string;
  updated_at: string;
  tenant_nome?: string;
  property_identificador?: string;
}

export interface PropertyLedgerEntry {
  id: string;
  property_id: string;
  lease_id: string | null;
  competencia: string;
  vencimento: string;
  natureza: 'receita' | 'despesa';
  categoria: string;
  descricao: string | null;
  valor: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  property_identificador?: string;
}

export interface PropertyStatementShare {
  id: string;
  client_id: string;
  property_ids: string[];
  period_from: string;
  period_to: string;
  title: string | null;
  expires_at: string;
  revoked_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
  share_url?: string;
}
