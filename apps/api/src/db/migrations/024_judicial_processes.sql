-- Migration: 024_judicial_processes
-- Tabela de processos judiciais dos clientes (para validação de elegibilidade em editais de contencioso)
-- Esta migration roda em schemas de tenant (tenant_{company_id})

CREATE TABLE IF NOT EXISTS judicial_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  process_number VARCHAR(50) NOT NULL, -- Número do processo (ex: 1234567-89.2023.4.03.0001)
  court VARCHAR(255), -- Tribunal/Órgão (ex: TRF4, STJ, etc)
  legal_thesis VARCHAR(100) NOT NULL, -- Tese jurídica: IPI_PRACA, PRL, IRPJ_CSLL_DESMUTUALIZACAO
  case_value NUMERIC(15, 2), -- Valor da causa (em reais)
  start_date DATE, -- Data de início do processo
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, closed
  notes TEXT, -- Observações adicionais
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Validação de tese jurídica
  CONSTRAINT check_legal_thesis CHECK (legal_thesis IN ('IPI_PRACA', 'PRL', 'IRPJ_CSLL_DESMUTUALIZACAO'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_judicial_processes_client_id ON judicial_processes(client_id);
CREATE INDEX IF NOT EXISTS idx_judicial_processes_legal_thesis ON judicial_processes(legal_thesis);
CREATE INDEX IF NOT EXISTS idx_judicial_processes_status ON judicial_processes(status);
CREATE INDEX IF NOT EXISTS idx_judicial_processes_client_thesis ON judicial_processes(client_id, legal_thesis);

-- Trigger para updated_at
CREATE TRIGGER update_judicial_processes_updated_at 
  BEFORE UPDATE ON judicial_processes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE judicial_processes IS 'Processos judiciais dos clientes relacionados a teses tributárias específicas';
COMMENT ON COLUMN judicial_processes.legal_thesis IS 'Tese jurídica: IPI_PRACA (IPI - Conceito de Praça), PRL (Preço de Transferência), IRPJ_CSLL_DESMUTUALIZACAO (IRPJ/CSLL sobre desmutualização)';
COMMENT ON COLUMN judicial_processes.status IS 'Status: active (ativo), suspended (suspenso), closed (encerrado)';
COMMENT ON COLUMN judicial_processes.process_number IS 'Número do processo judicial (formato livre)';
