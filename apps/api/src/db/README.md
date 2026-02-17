# Banco de Dados – Estrutura e Multitenancy

Este documento descreve a estrutura de **tenants**, **companies** e **users** e como todo **novo módulo** deve usar tabelas e colunas corretas.

---

## 1. Visão geral

O isolamento de dados é feito em **dois níveis**:

| Nível | Onde | Como |
|-------|------|------|
| **Schema public** | Tabelas globais do sistema | `companies`, `users`, `plans`, `subscriptions`, `modules`, `tenant_modules`, etc. |
| **Schema por tenant** | Um schema por empresa | `tenant_{company_id}` contém as tabelas de dados daquela empresa (ex.: `clients`, `irpf_alta_renda`). |

- **Companies** = tenants. Uma linha em `companies` representa uma empresa (contabilidade/cliente do sistema).
- Cada company tem um **schema próprio** `tenant_<uuid_sem_hifen>` (ex.: `tenant_abc123_def456`).
- **Users** ficam no schema `public` e têm `company_id` (ou `NULL` para super_admin); o tenant em que o usuário atua é definido por esse `company_id` (e pelo `search_path` na requisição).

---

## 2. Companies (tenants)

- **Tabela:** `public.companies`
- **Papel:** Cada linha é uma empresa (tenant). O `id` (UUID) identifica o tenant.
- **Schema do tenant:** Para cada company é criado o schema `tenant_<id_normalizado>` (hífens do UUID viram `_`).
- **Uso:** Login e middleware definem o `companyId` (tenant) da requisição; o `search_path` do PostgreSQL é setado para `tenant_xxx`, `public` para que as queries do módulo vejam as tabelas daquele tenant.

**Não confundir:** Em outros sistemas “client” pode ser o cliente da contabilidade. Aqui, **company** é a contabilidade/tenant. Dados que precisam “pertencer a uma empresa” no schema tenant usam **`company_id UUID REFERENCES public.companies(id)`** (ex.: `irpf_alta_renda.company_id`), **não** uma tabela `clients` (que existe apenas em alguns tenants e é “cliente da contabilidade”).

---

## 3. Users

- **Tabela:** `public.users`
- **Colunas relevantes:** `id`, `email`, `name`, `password_hash`, **`company_id`** (UUID, FK para `companies.id`), `role`, etc.
- **Regras:**
  - Usuário normal: `company_id` = empresa à qual pertence (e em cujo tenant atua).
  - **Super admin:** `company_id` pode ser `NULL`; pode trocar de tenant (company) pela UI.
- **Isolamento:** Queries em tabelas do **public** que são por empresa (ex.: listar users de uma company) **devem** filtrar por `company_id`. Tabelas que estão no **schema do tenant** já estão isoladas pelo schema (não precisam de coluna `company_id` na tabela para isolamento).

---

## 4. Onde cada tipo de tabela fica

### 4.1 Schema `public` (migrations que **não** estão em `tenant-migrations.ts`)

- **companies** – tenants (empresas).
- **users** – usuários do sistema (`company_id` indica a empresa do usuário).
- **plans**, **subscriptions** – planos e assinaturas por company.
- **modules** – definição dos módulos do sistema.
- **tenant_modules** – quais módulos estão ativos por tenant (`tenant_id` = `companies.id`).
- **refresh_tokens** – tokens de refresh (vinculados ao fluxo de auth).

Tabelas em `public` que são “por empresa” usam **`company_id`** (ou `tenant_id`) e as queries **devem** filtrar por esse campo.

### 4.2 Schema do tenant `tenant_{company_id}` (migrations listadas em `tenant-migrations.ts`)

Cada tenant tem seu próprio schema com as mesmas tabelas (estrutura), mas dados isolados. Exemplos:

- **clients** – clientes da contabilidade (opcional; não existe em todos os ambientes).
- **fiscal_files**, **extracted_fiscal_data** – arquivos fiscais e dados extraídos.
- **rating_validations** – validações de rating.
- **in_2306_simulations** – simulações IN 2306.
- **irpf_alta_renda** – simulações IRPF alta renda.
- **judicial_processes** – processos judiciais.
- Outras tabelas de domínio do produto.

**Regras importantes:**

- Tabelas no schema tenant **não** precisam de coluna `company_id` para **isolamento** (o schema já isola).
- Se a tabela precisar “apontar para a empresa” (ex.: “esta simulação é da empresa X”), use **`company_id UUID REFERENCES public.companies(id)`** (referência ao `public`).
- **Não** assuma que existe tabela `clients` no tenant; se o módulo precisar de “a quem pertence”, prefira **`company_id` → `public.companies`**.

---

## 5. Como as requisições enxergam o banco

1. **Middleware** obtém `companyId` (JWT, header `X-Tenant-ID`, etc.) e chama `setTenantSchema(companyId)`.
2. **`setTenantSchema`** executa `SET search_path TO "tenant_xxx", public`.
3. As queries do módulo (repository) rodam nesse contexto: tabelas sem schema explícito são resolvidas primeiro no schema do tenant e depois em `public`.
4. Assim, `SELECT * FROM irpf_alta_renda` vai para `tenant_xxx.irpf_alta_renda`; `SELECT * FROM companies` continua em `public.companies`.

---

## 6. Checklist para um novo módulo (tabelas e colunas corretas)

Use isto ao criar um **novo módulo** que persiste dados.

### 6.1 O dado é global ou por tenant?

- **Global (ex.: definição de módulos, listagem de companies):** tabela no schema **public**. Use `company_id`/`tenant_id` onde fizer sentido e **sempre** filtre por eles nas queries.
- **Por tenant (ex.: simulações, arquivos, clientes da contabilidade):** tabela no **schema do tenant**. Crie uma migration de tenant (veja abaixo).

### 6.2 Se for tabela no schema do tenant

1. **Criar a migration** em `apps/api/src/db/migrations/NNN_nome_descritivo.sql`.
2. **Escrever o SQL** considerando:
   - A migration roda com `search_path = tenant_xxx, public`.
   - Não use **`REFERENCES clients(id)`** a menos que a tabela `clients` exista em **todo** tenant (e esteja garantida antes). Prefira **`company_id UUID REFERENCES public.companies(id)`** para vincular à empresa.
   - Triggers que usam `update_updated_at_column()` funcionam porque a função está em `public`.
3. **Registrar a migration de tenant** em `apps/api/src/db/tenant-migrations.ts`: adicione o nome do arquivo em **`TENANT_MIGRATION_FILES`** na ordem numérica (ex.: `'030_meu_modulo.sql'`).
4. **Repositories:** use `BaseRepository`; para tabelas que estão em **tenant**, não é necessário (e não se deve) passar `company_id` nas queries de isolamento – o schema já isola. O `BaseRepository` mantém a lista de tabelas de tenant em `tenantTables`; se criar uma nova tabela de tenant, **adicione o nome da tabela** nessa lista para que a validação de segurança não exija `company_id` nas queries dessa tabela.
5. **Services:** o `companyId` (tenant) já vem do middleware; o repository de tabelas de tenant não precisa receber `companyId` para filtrar linha (só se a regra de negócio exigir filtrar por `company_id` quando a tabela tiver essa coluna como dado de negócio).

### 6.3 Se for tabela no schema public (por empresa)

- Inclua **`company_id`** (ou `tenant_id`) e **sempre** filtre por ele em SELECT/UPDATE/DELETE (exceto super_admin com regras específicas).
- Não adicione o arquivo em `TENANT_MIGRATION_FILES`; a migration roda só no `public` pelo `migrate.ts`.

### 6.4 Resumo rápido

| Situação | Onde criar tabela | Coluna de vínculo | Registrar em |
|----------|-------------------|-------------------|--------------|
| Dado por tenant (ex.: simulação, arquivo) | Migration de tenant | Opcional: `company_id REFERENCES public.companies(id)` se precisar “dono empresa” | `tenant-migrations.ts` + nome da tabela em `tenantTables` do BaseRepository |
| Dado global por empresa (ex.: user, subscription) | Migration pública | `company_id` ou `tenant_id` | Só em migrations (não em tenant-migrations) |
| Referência a “empresa” dentro do tenant | Schema tenant | `company_id UUID REFERENCES public.companies(id)` | - |

Seguindo essa estrutura, todo novo módulo usa as tabelas e colunas corretas (tenants, companies, users) e mantém o isolamento e a consistência do banco.
