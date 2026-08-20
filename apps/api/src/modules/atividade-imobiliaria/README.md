# Módulo Atividade Imobiliária (Venda / Incorporação)

## Descrição
Cadastro de empreendimentos imobiliários e suas unidades, alinhado ao modelo do
Sistema Domínio (Thomson Reuters). Domínio distinto da **locação** (`gestao-imobiliaria` /
`properties`): não compartilha tabelas nem estende `property_leases`.

Chave do módulo: `GESTAO_IMOVEIS` (mesmo pacote comercial).
Base: `/api/v1/atividade-imobiliaria`.

## Regras de Negócio

### Empreendimento
- Código único no tenant.
- Naturezas Domínio: `01` Consórcio, `02` SCP, `03` Incorporação em condomínio, `04` Outras.
- `metrica_area`: uma única grandeza por empreendimento (área real total, privativa, construída ou terreno).
- `status`: `rascunho` → `ativo` → `encerrado`. Transição rascunho→ativo bloqueada se a integridade de área não fechar.

### Unidades
- Código único por empreendimento.
- Cada unidade autônoma (apto, vaga, depósito, lote) é uma linha separada.
- Área: mesma métrica do empreendimento — não misturar privativa de uma com real total de outra.
- Soma `area_m2` de todas as unidades deve fechar com `area_total_m2` (diferença = 0,00 m²) antes de ativar.

### Integridade (Domínio)
1. `area_total = sum(units.area_m2)` — tolerância 0,00 m².
2. Campos sem documento-fonte devem ficar vazios — não presumir valores.

## Dependências
- Módulo: `feature-toggles` (`GESTAO_IMOVEIS`).
- Tabelas (migration `091_atividade_imobiliaria_empreendimentos.sql`):
  `real_estate_developments`, `real_estate_units`.

## Endpoints (Fase A — implementada)
- `GET/POST /developments`
- `GET/PATCH/DELETE /developments/:id`
- `GET/POST /developments/:id/units`
- `POST /developments/:id/units/batch`
- `PATCH/DELETE /units/:unitId`
- `GET /developments/:id/integrity`

## Mapa de fases

### Fase A (atual): Empreendimento + Unidades
Cadastro, CRUD, fechamento de áreas, integridade.

### Fase B (planejada): Contrato de venda + Parcelas

Tabelas previstas:
```sql
CREATE TABLE real_estate_sale_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES real_estate_developments(id),
  numero VARCHAR(60) NOT NULL,
  data_contrato DATE NOT NULL,
  valor_venda DECIMAL(15,2) NOT NULL,
  operacao VARCHAR(60),
  indice_atualizacao VARCHAR(30),
  taxa_juros DECIMAL(8,4),
  informacoes_complementares TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE real_estate_sale_contract_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  participacao_pct DECIMAL(6,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE real_estate_sale_contract_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES real_estate_units(id),
  valor_atribuido_contrato DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE real_estate_sale_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES real_estate_sale_contracts(id) ON DELETE CASCADE,
  sequencia INT NOT NULL,
  vencimento DATE NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  fonte_pagadora VARCHAR(60),
  status VARCHAR(12) NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Regras:
- Valor contrato = soma unidades do contrato = soma principal das parcelas.
- Participações dos compradores = 100%.
- Parcelas = obrigações perante o vendedor (não financiamento bancário).
- Operação "à vista" (01) não permite parcelas.

### Fase C (planejada): Baixas + Exportação Domínio

Tabela prevista:
```sql
CREATE TABLE real_estate_sale_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id UUID NOT NULL REFERENCES real_estate_sale_installments(id),
  data_pagamento DATE NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  correcao_monetaria DECIMAL(15,2) DEFAULT 0,
  juros DECIMAL(15,2) DEFAULT 0,
  multa DECIMAL(15,2) DEFAULT 0,
  desconto DECIMAL(15,2) DEFAULT 0,
  total_recebido DECIMAL(15,2) NOT NULL,
  documento_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Regras:
- Baixa só com evidência (comprovante ou flag pendência).
- Correção/juros/multa na baixa, não no preço da unidade.

Exportação leiaute Domínio Sistemas com Separador (`|`):
- Registros: 0500 (empreendimento), 0510 (unidades), 7100 (contrato), 7110 (clientes), 7120 (unidades vendidas), 7150 (parcelas).

### Fora de escopo
- Parametrização tributária Domínio (PIS/COFINS/IRPJ/CSLL/RET/POC).
- DIMOB oficial.
- Misturar com tabelas de locação (`properties`, `property_leases`).
