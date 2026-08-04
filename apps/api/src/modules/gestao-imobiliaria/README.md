# Módulo Gestão Imobiliária Contábil

## Descrição
Camada contábil-operacional da Gestão Imobiliária: inquilinos, contratos, livro financeiro
(contas a receber/pagar), DRE/prestação de contas, links read-only, alertas e operação
(fornecedores, manutenções, vistorias, inventário, propriedade fracionada). Convive com os
simuladores tributários existentes (`properties`), sem alterá-los.

Chave do módulo: `GESTAO_IMOVEIS` (mesma dos simuladores). Base: `/api/v1/gestao-imobiliaria`.

UI (portal): abas/menu ativos — Portfólio, Imóveis, Contratos, Extratos, Alertas.
Financeiro, Operação e Integrações estão ocultos no menu (código/API mantidos; Categoria do ledger já é combo).

Aba Imóveis: inclui botão **Importar do IRPF** (PDF/.dec/.dbk) que chama `POST /properties/import-from-irpf`,
exibe preview checkável dos bens imóveis e cadastra em lote via `POST /properties/batch`.

## Regras de Negócio
- **Tenant**: todas as tabelas vivem no schema do tenant (`tenant_{company_id}`); nenhuma query
  cruza tenants. O acesso é isolado por schema (queries usam `requireCompanyId=false`).
- **Ledger x Tributário**: `property_ledger_entries` é o livro **operacional** (competência +
  vencimento + status: previsto/confirmado/pago/atrasado/cancelado). NÃO substitui
  `property_transactions` (diário tributário do IR). São camadas distintas por decisão de produto.
- **Inadimplência**: `POST /ledger/mark-overdue` marca como `atrasado` tudo que venceu e não foi
  pago/cancelado. A prestação de contas ignora `cancelado`.
- **Prestação de contas read-only**: `POST /statement-shares` gera um token; o hash é gravado no
  tenant e um registro mínimo em `public.statement_share_tokens` (token_hash → company_id) permite
  resolver o tenant na rota pública **sem autenticação**. Links têm expiração e revogação.
- **Autorização**: exclusões e revogação de links exigem `role` admin/super_admin
  (`requireAdmin`). Demais operações exigem usuário autenticado do tenant + `requireModule`.
- **Integrações externas (em criação)**: boleto/PIX (`property_payment_charges`), conciliação
  (`property_bank_import_batches`), comunicação e-mail/WhatsApp (`property_communications`) são
  **estruturas prontas**. O registro é salvo com `status/provider_status = 'em_criacao'` e a
  resposta inclui `integration_status: 'em_criacao'`. Nenhuma chamada a provedor externo é feita.

## Dependências
- Módulos consumidos: `clients` (validação de cliente), `properties` (imóveis), `feature-toggles`.
- Tabelas principais (migration `069_gestao_imobiliaria_contabil.sql`): `property_tenants`,
  `property_leases`, `property_lease_amendments`, `property_guarantees`, `property_ledger_entries`,
  `property_recurring_rules`, `property_documents`, `property_statement_shares`,
  `property_ownership_shares`, `property_vendors`, `property_maintenance_tickets`,
  `property_inspections`, `property_inventory_items`, `property_payment_charges`,
  `property_bank_import_batches/lines`, `property_communications`.
  Registro público: `public.statement_share_tokens` (migration `072`).

## Fluxos e Endpoints
- Dashboard/alertas: `GET /dashboard`, `GET /alerts`.
- Extrato/DRE: `GET /statement`; compartilhamento: `POST/GET /statement-shares`,
  `POST /statement-shares/:id/revoke`; público: `GET /public/statement/:token`.
- Inquilinos: `POST/GET/PATCH/DELETE /tenants`.
- Contratos: `POST/GET/PATCH/DELETE /leases`, aditivos `.../amendments`, garantias `.../guarantees`.
- Ledger: `POST/GET/PATCH/DELETE /ledger`, `POST /ledger/:id/settle`, `.../cancel`, `.../mark-overdue`.
- Recorrências: `POST/GET/PATCH/DELETE /recurring`, `POST /recurring/generate`.
- Documentos, fracionada, fornecedores, manutenções, vistorias, inventário: CRUD dedicado.
- Integrações (stubs): `POST/GET /payment-charges`, `/communications`, `/bank-imports`.
