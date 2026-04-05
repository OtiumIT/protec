// Tipos compartilhados entre apps
import type { LegalThesis } from '../schemas/judicial-process.schema.js';

export type User = {
  id: string;
  email: string;
  name: string;
  tenant_id: string | null; // null para super_admin; id do escritório/tenant
  role: string;
  status?: 'active' | 'inactive';
  must_change_password?: boolean;
  created_at: Date;
  updated_at: Date;
};

export type Company = {
  id: string;
  name: string;
  domain?: string;
  person_type?: 'pf' | 'pj';
  cnpj?: string;
  cpf?: string;
  legal_name?: string;
  trade_name?: string;
  email?: string;
  phone?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
  state_registration?: string;
  municipal_registration?: string;
  cnae?: string;
  zip_code?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
};

export type Module = {
  id: string;
  name: string;
  key: string;
  description?: string;
  created_at: Date;
};

export type TenantModule = {
  id: string;
  tenant_id: string;
  module_id: string;
  enabled_until?: Date;
  created_at: Date;
};

export type Plan = {
  id: string;
  name: string;
  max_users: number;
  max_clients?: number;
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: string[] | Record<string, any>;
  is_custom?: boolean;
  is_managed?: boolean;
  status?: 'active' | 'inactive';
  created_at: Date | string;
  updated_at: Date | string;
};

export type Subscription = {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start?: Date;
  current_period_end?: Date;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  canceled_at?: Date;
  /** Data em que entrou no plano Free pela primeira vez; após 7 dias perde acesso às funcionalidades */
  free_plan_started_at?: Date;
  created_at: Date;
  updated_at: Date;
};

export type RefreshToken = {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
};

export type Client = {
  id: string;
  name: string;
  person_type?: 'pf' | 'pj';
  cnpj?: string;
  cpf?: string;
  email?: string;
  status: 'active' | 'inactive';
  tax_regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'outros';
  cnae?: string;
  state_registration?: string;
  municipal_registration?: string;
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type RatingValidation = {
  id: string;
  client_id: string;
  competence: string; // YYYY-MM
  fiscal_file_id?: string | null;
  fiscal_file_name?: string | null;
  is_simulation: boolean;
  input_data: Record<string, any>; // JSONB com dados granulares
  calculated_values?: Record<string, any> | null; // JSONB com valores agregados
  liquidez_corrente?: number | null;
  liquidez_geral?: number | null;
  solvencia?: number | null;
  rating_estimado: 'A' | 'B' | 'C' | 'D';
  rating_real?: 'A' | 'B' | 'C' | 'D' | null;
  has_discrepancy: boolean;
  discrepancy_details?: Record<string, any> | null;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type IN2306Simulation = {
  id: string;
  client_id: string | null;
  competence: string;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  title: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

// Re-exportar LegalThesis para manter compatibilidade
export type { LegalThesis };

export type JudicialProcess = {
  id: string;
  client_id: string;
  process_number: string;
  court?: string;
  legal_thesis: LegalThesis;
  case_value?: number;
  start_date?: string; // YYYY-MM-DD
  status: 'active' | 'suspended' | 'closed';
  notes?: string;
  created_at: Date | string;
  updated_at: Date | string;
};

// Interfaces para dados extraídos de ECD
export interface ECDBalanceSheet {
  // Balanço Patrimonial - valores agregados
  ativo_circulante: number;
  ativo_nao_circulante: number;
  realizavel_longo_prazo: number;
  passivo_circulante: number;
  passivo_nao_circulante: number;
  patrimonio_liquido: number;
  ativo_total: number;
  passivo_total: number;
  
  // Campos granulares (quando disponíveis)
  ativo_circulante_detalhado?: {
    caixa_equivalentes?: number;
    aplicacoes_financeiras?: number;
    contas_receber?: number;
    estoques?: number;
    tributos_recuperar?: number;
    despesas_antecipadas?: number;
    outros_ativos_circulantes?: number;
  };
  passivo_circulante_detalhado?: {
    fornecedores?: number;
    emprestimos_financiamentos?: number;
    obrigacoes_trabalhistas?: number;
    tributos_pagar?: number;
    contas_pagar?: number;
    provisoes?: number;
    outros_passivos_circulantes?: number;
  };
  // Outros campos detalhados conforme necessário
}

export interface ECDDRE {
  receita_bruta: number;
  deducoes_vendas?: number;
  receita_liquida: number;
  custos_vendas?: number;
  despesas_operacionais?: number;
  resultado_financeiro?: number;
  outros_resultados?: number;
  lucro_liquido?: number;
  // Outros campos conforme necessário
}

// Interface para dados extraídos completos
export interface ExtractedECDData {
  balance_sheet?: ECDBalanceSheet;
  dre?: ECDDRE;
  metadata?: {
    fiscal_file_id?: string;
    competence?: string;
    extracted_at?: string;
    [key: string]: any;
  };
}

// Tipos de resposta da API
export type ApiResponse<T = any> = {
  data: T;
};

export type ApiError = {
  error: {
    message: string;
    code: string;
    details?: any;
  };
};

export type AccessListEntry = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  company_name?: string;
  user_id?: string;
  tenant_id?: string;
  status: 'pending' | 'active' | 'inactive';
  activated_at?: Date | string;
  deactivated_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type Property = {
  id: string;
  client_id: string;
  tipo_locacao: 'fixa' | 'flexivel';
  natureza_locacao?: 'residencial' | 'nao_residencial';
  identificador: string;
  valor_aluguel_mensal?: number;
  modo_entrada: 'detalhado' | 'reduzido';
  matricula_imovel?: string;
  inscricao_iptu?: string;
  cartorio_registro?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  iptu_mensal_padrao?: number;
  condominio_mensal_padrao?: number;
  seguro_mensal_padrao?: number;
  camareira_mensal_padrao?: number;
  seguranca_mensal_padrao?: number;
  material_limpeza_mensal_padrao?: number;
  lavanderia_enxoval_mensal_padrao?: number;
  checkin_checkout_mensal_padrao?: number;
  taxas_pagamento_mensal_padrao?: number;
  tarifas_bancarias_mensal_padrao?: number;
  vacancia_mensal_padrao?: number;
  inadimplencia_mensal_padrao?: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type PropertyMonthlyTotal = {
  id: string;
  property_id: string;
  mes_referencia: string;
  receita_longa: number;
  receita_short: number;
  despesas_dedutiveis: number;
  custos_operacionais: number;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type PropertyTransaction = {
  id: string;
  property_id: string;
  mes_referencia: string;
  tipo: 'receita' | 'despesa_dedutivel' | 'custo_operacional';
  categoria: string;
  valor: number;
  observacao?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
};
