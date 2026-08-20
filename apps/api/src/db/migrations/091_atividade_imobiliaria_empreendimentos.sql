-- Migration: 091_atividade_imobiliaria_empreendimentos
-- Domínio: cadastro de empreendimentos imobiliários e unidades (venda/incorporação).

CREATE TABLE IF NOT EXISTS real_estate_developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(60),
  natureza VARCHAR(2) CHECK (natureza IN ('01','02','03','04')),
  descricao VARCHAR(500),
  data_inicio DATE,
  cno VARCHAR(30),
  cno_data DATE,
  area_total_m2 DECIMAL(15,2),
  area_credito_m2 DECIMAL(15,2),
  metrica_area VARCHAR(30) CHECK (metrica_area IN ('area_real_total','area_privativa','area_construida','area_terreno')),
  cep VARCHAR(10),
  logradouro VARCHAR(255),
  numero VARCHAR(30),
  complemento VARCHAR(120),
  bairro VARCHAR(120),
  cidade VARCHAR(120),
  uf VARCHAR(2),
  processo_numero VARCHAR(60),
  processo_obs VARCHAR(500),
  status VARCHAR(12) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','ativo','encerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS real_estate_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES real_estate_developments(id) ON DELETE CASCADE,
  codigo VARCHAR(30) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  matricula VARCHAR(100),
  tipo_unidade VARCHAR(60),
  area_m2 DECIMAL(15,2),
  custo DECIMAL(15,2),
  valor_atribuido DECIMAL(15,2),
  situacao VARCHAR(12) NOT NULL DEFAULT 'disponivel' CHECK (situacao IN ('disponivel','reservada','vendida','permuta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (development_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_real_estate_units_development ON real_estate_units(development_id);
