CREATE TABLE IF NOT EXISTS precificador_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  title VARCHAR(255),
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
