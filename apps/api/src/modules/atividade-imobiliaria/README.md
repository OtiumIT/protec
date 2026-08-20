# Módulo Atividade Imobiliária (Venda / Incorporação)

## Descrição
Cadastro de empreendimentos, unidades, contratos de venda, parcelas, baixas e
exportação no leiaute Domínio Sistemas com Separador (`|`). Domínio distinto da
**locação** (`gestao-imobiliaria` / `properties`).

Chave do módulo: `GESTAO_IMOVEIS`.
Base: `/api/v1/atividade-imobiliaria`.

## Regras de Negócio

### Empreendimento e unidades (Fase A)
- Código único no tenant; unidades com código único por empreendimento.
- Naturezas Domínio: `01` Consórcio, `02` SCP, `03` Incorporação em condomínio, `04` Outras.
- Uma métrica de área para todas as unidades.
- Ativar empreendimento só se `área total − soma das unidades = 0,00 m²`.
- Campos sem documento-fonte ficam vazios — não presumir valores.

### Contrato de venda (Fase B)
- Compradores são `clients` do tenant; participações devem somar **100%**.
- Valor do contrato = soma dos valores das unidades do contrato.
- Parcelas = obrigações **perante o vendedor** (não as 360/420 do banco).
- Operação `01` (à vista): sem parcelas. Operação `02` (a prazo): soma do principal = valor da venda.
- Status `rascunho` permite divergência. Ativar só com fechamentos zerados.
- Unidade não pode estar em dois contratos `ativo`. Ao ativar, unidades passam a `vendida`; ao cancelar/voltar a rascunho, voltam a `disponivel`.

### Baixas (Fase C)
- Baixa exige `documento_ref` (comprovante). Sem evidência não grava.
- Correção, juros e multa entram na baixa, não no preço da unidade.
- Principal da baixa não pode exceder o saldo da parcela.
- `total_recebido = principal + correção + juros + multa − desconto`.
- Parcela fica `pago` quando a soma do principal baixado fecha com a parcela.

### Exportação Domínio
- Arquivo texto, separador `|`, datas `DD/MM/AAAA`, decimais com vírgula.
- Registros: `0500` empreendimento, `0510` unidades, `7100` contrato, `7110` compradores, `7120` unidades vendidas, `7150` parcelas.
- Mapa operacional — conferir leiaute oficial vigente antes de importar no Domínio.

## Dependências
- `feature-toggles` (`GESTAO_IMOVEIS`), `clients` (compradores).
- Tabelas tenant:
  - `091_atividade_imobiliaria_empreendimentos.sql`: `real_estate_developments`, `real_estate_units`
  - `092_atividade_imobiliaria_contratos.sql`: `real_estate_sale_contracts`, `_parties`, `_units`, `_installments`, `_receipts`

## Endpoints
- Empreendimento/unidades: `GET/POST /developments`, `GET/PATCH/DELETE /developments/:id`, `.../units`, `PATCH/DELETE /units/:unitId`, `GET /developments/:id/integrity`
- Contratos: `GET/POST /developments/:id/contracts`, `GET/PATCH/DELETE /contracts/:contractId`, `GET /contracts/:contractId/integrity`
- Baixas: `POST /installments/:installmentId/receipts`, `DELETE /receipts/:receiptId`
- Exportação: `GET /developments/:id/export-dominio`

## Fora de escopo
- Parametrização tributária Domínio (PIS/COFINS/IRPJ/CSLL/RET/POC).
- DIMOB oficial.
- Misturar com tabelas de locação.
