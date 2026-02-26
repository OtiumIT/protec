-- Migration: 040_irpf_alta_renda_payload_json
-- Adiciona coluna payload_json para armazenar simulação completa (dados de entrada + resultado).
-- Estrutura: tipo_importacao, arquivo_nome, ano, dados, resultado_simulacao, declaracao_completa, diagnostico.
-- Mantém colunas existentes por compatibilidade (preenchidas a partir de payload_json ou vice-versa).

ALTER TABLE irpf_alta_renda
ADD COLUMN IF NOT EXISTS payload_json JSONB;

COMMENT ON COLUMN irpf_alta_renda.payload_json IS 'Payload completo: tipo_importacao, arquivo_nome, dados, resultado_simulacao, declaracao_completa, diagnostico';
