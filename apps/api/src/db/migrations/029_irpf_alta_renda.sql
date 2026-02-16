-- Migration: 029_irpf_alta_renda
-- Tabela de simulações IRPF Alta Renda (Lei 15.270/2025)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS irpf_alta_renda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  ano INTEGER NOT NULL,
  contribuinte_nome VARCHAR(255) NOT NULL,
  contribuinte_cpf VARCHAR(14) NOT NULL,
  rendimentos_tributaveis NUMERIC(18, 2) NOT NULL DEFAULT 0,
  dados_dividendos JSONB NOT NULL DEFAULT '[]',
  base_calculo_combinada NUMERIC(18, 2) NOT NULL,
  resultado_simulacao JSONB NOT NULL,

  title VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT check_irpf_alta_renda_ano CHECK (ano >= 2020 AND ano <= 2035)
);

CREATE INDEX IF NOT EXISTS idx_irpf_alta_renda_client_id ON irpf_alta_renda(client_id);
CREATE INDEX IF NOT EXISTS idx_irpf_alta_renda_ano ON irpf_alta_renda(ano);
CREATE INDEX IF NOT EXISTS idx_irpf_alta_renda_created_at ON irpf_alta_renda(created_at DESC);

CREATE TRIGGER update_irpf_alta_renda_updated_at
  BEFORE UPDATE ON irpf_alta_renda
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE irpf_alta_renda IS 'Simulações IRPF Alta Renda - Lei 15.270/2025';
COMMENT ON COLUMN irpf_alta_renda.dados_dividendos IS 'Array de fontes de rendimentos isentos (códigos 09 e 13)';
COMMENT ON COLUMN irpf_alta_renda.resultado_simulacao IS 'Resultado da simulação: faixa, alíquota, imposto, risco de retenção';
