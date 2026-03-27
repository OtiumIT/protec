-- Migration: 050_properties_defaults
-- Campos opcionais de pré-cadastro para auto-preenchimento da simulação
-- Esta migration roda em schemas de tenant (tenant_{company_id})

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS matricula_imovel VARCHAR(100),
  ADD COLUMN IF NOT EXISTS inscricao_iptu VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cartorio_registro VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
  ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(30),
  ADD COLUMN IF NOT EXISTS complemento VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(120),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(120),
  ADD COLUMN IF NOT EXISTS uf VARCHAR(2),
  ADD COLUMN IF NOT EXISTS iptu_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS condominio_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS seguro_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS camareira_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS seguranca_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS material_limpeza_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS lavanderia_enxoval_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS checkin_checkout_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS taxas_pagamento_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS tarifas_bancarias_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS vacancia_mensal_padrao DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS inadimplencia_mensal_padrao DECIMAL(15,2);
