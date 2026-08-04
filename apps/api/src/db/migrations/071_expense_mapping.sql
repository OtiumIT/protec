-- Migration: 071_expense_mapping
-- Módulo Mapeamento de Despesas PF -> PJ (pejotização): diagnóstico normalizado.
-- Roda em schemas de tenant (tenant_{company_id}).
--
-- Framing: ferramenta contábil/advocacia. Classificação calculada no servidor a partir
-- das respostas + versão do catálogo. IBS/CBS é apenas critério/alerta (segunda lente),
-- nunca promessa automática de crédito.

-- ==========================================================================
-- 1) Catálogo versionado (categorias, perguntas e regras)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_catalog_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_catalog_active ON expense_mapping_catalog_versions(is_active);

-- ==========================================================================
-- 2) Diagnóstico (cabeçalho)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255),
  reference_year INTEGER NOT NULL,
  activity VARCHAR(255),
  tax_regime VARCHAR(40) NOT NULL DEFAULT 'simples_nacional'
    CHECK (tax_regime IN ('simples_nacional', 'lucro_presumido', 'lucro_real', 'mei', 'outro')),
  ibs_cbs_treatment VARCHAR(40) NOT NULL DEFAULT 'nao_avaliar'
    CHECK (ibs_cbs_treatment IN ('regime_regular', 'simples_por_dentro', 'avaliar_por_fora', 'nao_avaliar')),
  objective TEXT,
  reviewer_user_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'completed', 'archived')),
  rules_version VARCHAR(50) NOT NULL,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_snapshot JSONB,
  completed_at TIMESTAMP,
  completed_by UUID,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_diagnoses_client_id ON expense_mapping_diagnoses(client_id);
CREATE INDEX IF NOT EXISTS idx_expense_diagnoses_status ON expense_mapping_diagnoses(status);
CREATE INDEX IF NOT EXISTS idx_expense_diagnoses_year ON expense_mapping_diagnoses(reference_year);
CREATE INDEX IF NOT EXISTS idx_expense_diagnoses_created_at ON expense_mapping_diagnoses(created_at DESC);

-- ==========================================================================
-- 3) Respostas do questionário
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  category_key VARCHAR(60) NOT NULL,
  question_key VARCHAR(80) NOT NULL,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  catalog_version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_answers_diagnosis_id ON expense_mapping_answers(diagnosis_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_answers_diag_question ON expense_mapping_answers(diagnosis_id, category_key, question_key);

-- ==========================================================================
-- 4) Itens de despesa classificados
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  category_key VARCHAR(60) NOT NULL,
  label VARCHAR(255) NOT NULL,
  monthly_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  annual_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  business_use_pct DECIMAL(5, 2) NOT NULL DEFAULT 0,
  current_payer VARCHAR(20) NOT NULL DEFAULT 'pf' CHECK (current_payer IN ('pf', 'pj', 'misto')),
  pf_pj_lens VARCHAR(20) NOT NULL DEFAULT 'organize' CHECK (pf_pj_lens IN ('migrate', 'organize', 'defer', 'avoid')),
  credit_lens VARCHAR(20) NOT NULL DEFAULT 'na' CHECK (credit_lens IN ('potential', 'conditioned', 'none', 'na')),
  classification VARCHAR(30) NOT NULL DEFAULT 'condicionado'
    CHECK (classification IN ('potencial', 'condicionado', 'rateio', 'nao_recomendado')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  foundation_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_items_diagnosis_id ON expense_mapping_items(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_classification ON expense_mapping_items(classification);

-- ==========================================================================
-- 5) Pendências e plano de ação
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_pendencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES expense_mapping_items(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL DEFAULT 'documento',
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'resolvida', 'descartada')),
  due_at DATE,
  owner_user_id UUID,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_pendencies_diagnosis_id ON expense_mapping_pendencies(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_expense_pendencies_status ON expense_mapping_pendencies(status);

CREATE TABLE IF NOT EXISTS expense_mapping_action_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES expense_mapping_items(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_action_steps_item_id ON expense_mapping_action_steps(item_id);

-- ==========================================================================
-- 6) Evidências (anexos)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES expense_mapping_items(id) ON DELETE CASCADE,
  pendency_id UUID REFERENCES expense_mapping_pendencies(id) ON DELETE SET NULL,
  kind VARCHAR(30) NOT NULL DEFAULT 'outro' CHECK (kind IN ('nfe', 'contrato', 'agenda', 'extrato', 'foto', 'outro')),
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

CREATE INDEX IF NOT EXISTS idx_expense_evidence_diagnosis_id ON expense_mapping_evidence(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_expense_evidence_item_id ON expense_mapping_evidence(item_id);

-- ==========================================================================
-- 7) Auditoria de mutações
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID,
  action VARCHAR(30) NOT NULL,
  actor_user_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_audit_diagnosis_id ON expense_mapping_audit_events(diagnosis_id);

-- ==========================================================================
-- 8) Importação documental (upload + matching manual)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_mapping_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID REFERENCES expense_mapping_diagnoses(id) ON DELETE CASCADE,
  referencia VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'processado', 'concluido', 'erro')),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_vinculado INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_import_diagnosis_id ON expense_mapping_import_batches(diagnosis_id);

-- ==========================================================================
-- Triggers de updated_at
-- ==========================================================================
CREATE TRIGGER update_expense_catalog_versions_updated_at BEFORE UPDATE ON expense_mapping_catalog_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_diagnoses_updated_at BEFORE UPDATE ON expense_mapping_diagnoses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_answers_updated_at BEFORE UPDATE ON expense_mapping_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_items_updated_at BEFORE UPDATE ON expense_mapping_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_pendencies_updated_at BEFORE UPDATE ON expense_mapping_pendencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_action_steps_updated_at BEFORE UPDATE ON expense_mapping_action_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_evidence_updated_at BEFORE UPDATE ON expense_mapping_evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_import_batches_updated_at BEFORE UPDATE ON expense_mapping_import_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE expense_mapping_diagnoses IS 'Diagnóstico PF->PJ por cliente/ano; classificação calculada no servidor';
COMMENT ON TABLE expense_mapping_items IS 'Despesas classificadas (potencial|condicionado|rateio|nao_recomendado) com duas lentes: PF->PJ e IBS/CBS';
COMMENT ON COLUMN expense_mapping_diagnoses.ibs_cbs_treatment IS 'IBS/CBS é segunda lente/alerta; sem promessa automática de crédito';
