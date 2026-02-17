# SELECTs para debugar módulos ativos (Supabase)

Rode estes SELECTs no **SQL Editor** do Supabase para entender o estado de `modules`, `tenant_modules` e `companies`. A tela usa `GET /api/v1/modules/active` (tenant_id = companyId do contexto) e verifica por `m.key` (ex.: `SIMULADOR_IN_2306`).

---

## 1. Módulos cadastrados (e a key exata do Simulador)a[-]= q

```sql
SELECT id, name, key, description
FROM modules
ORDER BY name;
```

Confira se existe uma linha com `key = 'SIMULADOR_IN_2306'` (exatamente assim, sem espaço, maiúsculas).

---

## 2. Companies (tenants) – IDs que podem ser usados como tenant_id

```sql
SELECT id, name, domain
FROM companies
ORDER BY name;
```

O `id` aqui é o que deve estar em `tenant_modules.tenant_id` e é o mesmo que o front envia em `X-Tenant-ID` ou que vem no JWT como `companyId`.

---

## 3. tenant_modules – quais módulos estão ativos para cada tenant

```sql
SELECT tm.tenant_id, tm.module_id, tm.enabled_until, m.key AS module_key, m.name AS module_name
FROM tenant_modules tm
JOIN modules m ON m.id = tm.module_id
ORDER BY tm.tenant_id, m.key;
```

- Se **SIMULADOR_IN_2306** está ativo para um tenant, deve existir uma linha com `module_key = 'SIMULADOR_IN_2306'` e esse `tenant_id` deve ser igual ao `id` de uma company (select 2).
- Se `enabled_until` estiver preenchido e no passado, o módulo é considerado inativo pela query da API (`tm.enabled_until > NOW()`).

---

## 4. Simulador IN 2306 ativo para quais tenants?

```sql
SELECT tm.tenant_id, c.name AS company_name, tm.enabled_until
FROM tenant_modules tm
JOIN modules m ON m.id = tm.module_id
LEFT JOIN companies c ON c.id = tm.tenant_id
WHERE m.key = 'SIMULADOR_IN_2306'
ORDER BY tm.tenant_id;
```

- Se não retornar linhas: nenhum tenant tem o módulo ativo.
- Se retornar: o `tenant_id` deve ser exatamente o UUID que o front envia (mesmo formato que `companies.id`).

---

## 5. Conferir formato do tenant_id (UUID)

O PostgreSQL guarda UUID com hífens (ex.: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`). O front pode enviar o mesmo valor no header. Se no banco ou no JWT estiver em outro formato, a comparação pode falhar.

```sql
SELECT id, name, id::text AS id_text
FROM companies
LIMIT 3;
```

Use o mesmo `id` (ou `id_text`) que o usuário usa ao logar / que está no localStorage como `tenantId` e compare com as linhas do select 4.
