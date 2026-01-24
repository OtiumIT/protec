// Tipos compartilhados entre apps

export type User = {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};

export type Company = {
  id: string;
  name: string;
  domain?: string;
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
  price: number;
  billing_cycle: 'monthly' | 'yearly';
  features: string[] | Record<string, any>;
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
  cnpj: string;
  email?: string;
  company_id: string;
  status: 'active' | 'inactive';
  created_at: Date | string;
  updated_at: Date | string;
};

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
