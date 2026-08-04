-- Migration: 069_gestao_imobiliaria_contabil
-- Camada contábil-operacional da Gestão Imobiliária (contratos, ledger, extratos, operação).
-- Roda em schemas de tenant (tenant_{company_id}). Convive com as tabelas tributárias
-- existentes (properties / property_transactions / property_simulations) sem alterá-las.
--
-- Princípio: property_transactions continua sendo o diário TRIBUTÁRIO (competência p/ IR);
-- property_ledger_entries é o livro OPERACIONAL de caixa/competência com vencimento e status.

-- ==========================================================================
-- 1) Inquilinos
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(20),
  tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'pf' CHECK (tipo_pessoa IN ('pf', 'pj')),
  email VARCHAR(255),
  telefone VARCHAR(30),
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_tenants_client_id ON property_tenants(client_id);
CREATE INDEX IF NOT EXISTS idx_property_tenants_nome ON property_tenants(nome);

-- ==========================================================================
-- 2) Contratos de locação
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES property_tenants(id) ON DELETE SET NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_aluguel DECIMAL(15, 2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  indice_reajuste VARCHAR(20) NOT NULL DEFAULT 'IPCA' CHECK (indice_reajuste IN ('IPCA', 'IGPM', 'INPC', 'OUTRO', 'NENHUM')),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'rascunho', 'inadimplente')),
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_leases_property_id ON property_leases(property_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_tenant_id ON property_leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_leases_status ON property_leases(status);
CREATE INDEX IF NOT EXISTS idx_property_leases_data_fim ON property_leases(data_fim);

-- Reajustes e aditivos contratuais
CREATE TABLE IF NOT EXISTS property_lease_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES property_leases(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'reajuste' CHECK (tipo IN ('reajuste', 'aditivo', 'renovacao')),
  data_evento DATE NOT NULL,
  indice_aplicado VARCHAR(20),
  percentual DECIMAL(8, 4),
  valor_anterior DECIMAL(15, 2),
  valor_novo DECIMAL(15, 2),
  descricao TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_lease_amendments_lease_id ON property_lease_amendments(lease_id);

-- Garantias e depósitos
CREATE TABLE IF NOT EXISTS property_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES property_leases(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('caucao', 'fiador', 'seguro_fianca', 'titulo_capitalizacao', 'outro')),
  valor DECIMAL(15, 2),
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'devolvida', 'executada', 'encerrada')),
  data_devolucao DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_guarantees_lease_id ON property_guarantees(lease_id);

-- ==========================================================================
-- 3) Livro financeiro operacional (contas a receber / pagar por imóvel)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES property_leases(id) ON DELETE SET NULL,
  competencia VARCHAR(7) NOT NULL CHECK (competencia ~ '^\d{4}-\d{2}$'),
  vencimento DATE NOT NULL,
  natureza VARCHAR(10) NOT NULL CHECK (natureza IN ('receita', 'despesa')),
  categoria VARCHAR(60) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'confirmado', 'pago', 'atrasado', 'cancelado')),
  paid_at DATE,
  recurring_rule_id UUID,
  charge_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_ledger_property_id ON property_ledger_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ledger_lease_id ON property_ledger_entries(lease_id);
CREATE INDEX IF NOT EXISTS idx_property_ledger_competencia ON property_ledger_entries(competencia);
CREATE INDEX IF NOT EXISTS idx_property_ledger_status ON property_ledger_entries(status);
CREATE INDEX IF NOT EXISTS idx_property_ledger_vencimento ON property_ledger_entries(vencimento);

-- Regras de recorrência (geram lançamentos por competência)
CREATE TABLE IF NOT EXISTS property_recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES property_leases(id) ON DELETE SET NULL,
  natureza VARCHAR(10) NOT NULL CHECK (natureza IN ('receita', 'despesa')),
  categoria VARCHAR(60) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  ativo BOOLEAN NOT NULL DEFAULT true,
  inicio_competencia VARCHAR(7) CHECK (inicio_competencia ~ '^\d{4}-\d{2}$'),
  fim_competencia VARCHAR(7) CHECK (fim_competencia ~ '^\d{4}-\d{2}$'),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_recurring_property_id ON property_recurring_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_property_recurring_ativo ON property_recurring_rules(ativo);

-- ==========================================================================
-- 4) Documentos e anexos por imóvel/contrato
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES property_leases(id) ON DELETE CASCADE,
  categoria VARCHAR(40) NOT NULL DEFAULT 'outro',
  nome_arquivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120),
  tamanho_bytes BIGINT,
  storage_key VARCHAR(500),
  storage_status VARCHAR(20) NOT NULL DEFAULT 'em_criacao' CHECK (storage_status IN ('em_criacao', 'armazenado', 'erro')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_lease_id ON property_documents(lease_id);

-- ==========================================================================
-- 5) Prestação de contas: links read-only por token
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_statement_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  property_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_from VARCHAR(7) NOT NULL CHECK (period_from ~ '^\d{4}-\d{2}$'),
  period_to VARCHAR(7) NOT NULL CHECK (period_to ~ '^\d{4}-\d{2}$'),
  title VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  last_accessed_at TIMESTAMP,
  access_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_statement_shares_client_id ON property_statement_shares(client_id);
CREATE INDEX IF NOT EXISTS idx_property_statement_shares_token ON property_statement_shares(token_hash);

-- ==========================================================================
-- 6) Propriedade fracionada (multi-proprietário)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_ownership_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  nome_proprietario VARCHAR(255) NOT NULL,
  documento VARCHAR(20),
  percentual DECIMAL(7, 4) NOT NULL DEFAULT 100 CHECK (percentual >= 0 AND percentual <= 100),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_ownership_shares_property_id ON property_ownership_shares(property_id);

-- ==========================================================================
-- 7) Operação interna: fornecedores, manutenções, vistorias, inventário
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(20),
  categoria VARCHAR(60),
  email VARCHAR(255),
  telefone VARCHAR(30),
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_vendors_nome ON property_vendors(nome);

CREATE TABLE IF NOT EXISTS property_maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES property_vendors(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'aguardando_aprovacao', 'concluido', 'cancelado')),
  prioridade VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  valor_orcado DECIMAL(15, 2),
  valor_final DECIMAL(15, 2),
  aberto_em DATE NOT NULL DEFAULT CURRENT_DATE,
  concluido_em DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_maintenance_property_id ON property_maintenance_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_property_maintenance_status ON property_maintenance_tickets(status);

CREATE TABLE IF NOT EXISTS property_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES property_leases(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'entrada' CHECK (tipo IN ('entrada', 'saida', 'periodica')),
  data_vistoria DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel VARCHAR(255),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluida', 'assinada')),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_inspections_property_id ON property_inspections(property_id);

CREATE TABLE IF NOT EXISTS property_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  estado_conservacao VARCHAR(20) NOT NULL DEFAULT 'bom' CHECK (estado_conservacao IN ('novo', 'bom', 'regular', 'ruim', 'inservivel')),
  valor_estimado DECIMAL(15, 2),
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_inventory_property_id ON property_inventory_items(property_id);

-- ==========================================================================
-- 8) Integrações externas (estrutura pronta, status "em_criacao")
-- ==========================================================================
CREATE TABLE IF NOT EXISTS property_payment_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_entry_id UUID REFERENCES property_ledger_entries(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  metodo VARCHAR(20) NOT NULL DEFAULT 'boleto' CHECK (metodo IN ('boleto', 'pix')),
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  descricao TEXT,
  -- provider_status permanece 'em_criacao' até integrar provedor externo real
  provider_status VARCHAR(20) NOT NULL DEFAULT 'em_criacao' CHECK (provider_status IN ('em_criacao', 'emitido', 'pago', 'cancelado', 'erro')),
  provider_reference VARCHAR(255),
  linha_digitavel VARCHAR(120),
  pix_copia_cola TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_payment_charges_property_id ON property_payment_charges(property_id);
CREATE INDEX IF NOT EXISTS idx_property_payment_charges_status ON property_payment_charges(provider_status);

CREATE TABLE IF NOT EXISTS property_bank_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'em_criacao' CHECK (status IN ('em_criacao', 'processado', 'conciliado', 'erro')),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_conciliado INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS property_bank_import_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES property_bank_import_batches(id) ON DELETE CASCADE,
  data_movimento DATE,
  descricao TEXT,
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ledger_entry_id UUID REFERENCES property_ledger_entries(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'conciliado', 'ignorado')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_bank_import_lines_batch_id ON property_bank_import_lines(batch_id);

-- Comunicação (outbox): avisos/extratos por e-mail/WhatsApp (envio real = "em_criacao")
CREATE TABLE IF NOT EXISTS property_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  canal VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (canal IN ('email', 'whatsapp')),
  assunto VARCHAR(255),
  mensagem TEXT,
  destinatario VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'em_criacao' CHECK (status IN ('em_criacao', 'agendado', 'enviado', 'erro')),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_communications_client_id ON property_communications(client_id);

-- ==========================================================================
-- Triggers de updated_at
-- ==========================================================================
CREATE TRIGGER update_property_tenants_updated_at BEFORE UPDATE ON property_tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_leases_updated_at BEFORE UPDATE ON property_leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_lease_amendments_updated_at BEFORE UPDATE ON property_lease_amendments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_guarantees_updated_at BEFORE UPDATE ON property_guarantees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_ledger_entries_updated_at BEFORE UPDATE ON property_ledger_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_recurring_rules_updated_at BEFORE UPDATE ON property_recurring_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_documents_updated_at BEFORE UPDATE ON property_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_statement_shares_updated_at BEFORE UPDATE ON property_statement_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_ownership_shares_updated_at BEFORE UPDATE ON property_ownership_shares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_vendors_updated_at BEFORE UPDATE ON property_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_maintenance_tickets_updated_at BEFORE UPDATE ON property_maintenance_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_inspections_updated_at BEFORE UPDATE ON property_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_inventory_items_updated_at BEFORE UPDATE ON property_inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_payment_charges_updated_at BEFORE UPDATE ON property_payment_charges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_bank_import_batches_updated_at BEFORE UPDATE ON property_bank_import_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_bank_import_lines_updated_at BEFORE UPDATE ON property_bank_import_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_communications_updated_at BEFORE UPDATE ON property_communications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE property_ledger_entries IS 'Livro financeiro operacional (AR/AP) por imóvel: competência, vencimento e ciclo de pagamento';
COMMENT ON TABLE property_statement_shares IS 'Links read-only de prestação de contas, com escopo, expiração e revogação';
COMMENT ON TABLE property_payment_charges IS 'Cobranças boleto/PIX. provider_status=em_criacao até integrar provedor externo real';
