# Módulo Mapeamento de Despesas PF → PJ

## Descrição
Diagnóstico guiado para o contador/advogado identificar despesas mantidas na pessoa física,
avaliar vínculo com a atividade, uso pessoal, documentação e organização para a PJ. Produto de
apoio à decisão profissional — **não** é ferramenta de cálculo de crédito nem de Reforma.

Chave do módulo: `MAPEAMENTO_DESPESAS_PJ`. Base: `/api/v1/mapeamento-despesas-pj`.

## Regras de Negócio
- **Tenant**: tabelas no schema do tenant (`tenant_{company_id}`); isolamento por schema.
- **Classificação no servidor**: a classificação (`potencial | condicionado | rateio |
  nao_recomendado`) e as duas lentes (organização PF→PJ e potencial IBS/CBS) são calculadas em
  `classification-engine.ts`. O cliente **nunca** envia classificação confiável.
- **Catálogo versionado**: `catalog.ts` define categorias/perguntas e `RULES_VERSION`. A versão é
  gravada em cada diagnóstico (`rules_version`) para reprodutibilidade.
- **IBS/CBS é segunda lente/alerta**: só é avaliado quando o regime permite (regime regular ou
  opção de apurar por fora). Para Simples "por dentro" e MEI, a lente de crédito fica `na` e um
  alerta é emitido. Nunca há promessa automática de crédito.
- **Guardrails**: uso pessoal/benefício ao sócio é tratado como risco (classificação
  `rateio`/`nao_recomendado`); tributos e parcela de principal (ex.: IPVA, amortização) nunca
  entram como crédito automático.
- **Ciclo de vida**: `draft → in_review → completed`. `POST /:id/complete` congela um snapshot
  imutável; edição exige reabertura (`POST /:id/reopen`, admin). Exclusão e reabertura exigem
  `role` admin/super_admin. Toda mutação relevante gera evento em `expense_mapping_audit_events`.
- **Integrações (em criação)**: evidências (`expense_mapping_evidence`) e importação documental
  (`expense_mapping_import_batches`) salvam metadados com `status = 'em_criacao'`; o armazenamento
  de arquivo/OCR é stub e a resposta inclui `integration_status: 'em_criacao'`.

## Dependências
- Módulos consumidos: `clients`, `feature-toggles`.
- Tabelas principais (migration `071_expense_mapping.sql`): `expense_mapping_catalog_versions`,
  `expense_mapping_diagnoses`, `expense_mapping_answers`, `expense_mapping_items`,
  `expense_mapping_pendencies`, `expense_mapping_action_steps`, `expense_mapping_evidence`,
  `expense_mapping_audit_events`, `expense_mapping_import_batches`.

## Fluxos e Endpoints
- `GET /catalog` — categorias/perguntas versionadas.
- `GET /dashboard` — KPIs da carteira.
- `POST /analyze` — calcula sem persistir (prévia do diagnóstico).
- `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id` — CRUD de diagnósticos.
- `POST /:id/complete`, `POST /:id/reopen`, `GET /:id/audit`.
- Pendências: `POST/GET /:id/pendencies`, `PATCH/DELETE /pendencies/:id`.
- Evidências (stub): `POST/GET /:id/evidence`, `DELETE /evidence/:id`.
- Importação (stub): `POST/GET /:id/imports`.

## Fluxo POST /  (criar diagnóstico)
Validar Zod → validar cliente → `runExpenseMapping(context, items)` → persistir cabeçalho +
itens classificados + respostas → auditar `create` → retornar diagnóstico completo.
