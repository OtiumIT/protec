# Módulo Users

## Descrição
Gerencia usuários do sistema, incluindo criação, edição, exclusão e validação de limites (seats).

## Modelo de domínio (tenant × company × users)

- **1 tenant** (ex.: Protec) = um escritório/contabilidade.
- **1 tenant** tem **N usuários** (usuários do escritório).
- **1 tenant** tem **N companies** (clientes do escritório — empresas que o tenant atende).
- **Company** (cliente) **não tem usuários** (ainda); usuários pertencem ao **tenant**.

Na API, o identificador do escritório é exposto como **tenant_id** (no banco a coluna em `users` segue como `company_id` = id do tenant). O termo **company_id** fica reservado para o cliente (company) do tenant, quando houver uso futuro.

## Regras de Negócio

### Regra 1: Validação de Seats
- **Quando aplicar**: Sempre ao criar um novo usuário
- **Validação**: `count(users) < plan.max_users`
- **Exceção**: Super admin pode criar além do limite
- **Erro**: Retorna `409 CONFLICT` se limite atingido
- **Processo**:
  1. Buscar assinatura da empresa
  2. Contar usuários ativos da empresa
  3. Comparar com `plan.max_users`
  4. Bloquear criação se limite atingido

### Regra 2: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: `company_id` obrigatório em todas as queries
- **Exceção**: Super admin pode acessar qualquer tenant (com auditoria)
- **Processo**:
  - Todas as queries devem incluir `WHERE company_id = $X`
  - Repository valida automaticamente via BaseRepository

### Regra 3: Permissões de Edição
- **Quando aplicar**: Ao atualizar ou deletar usuário
- **Validação**:
  - Usuário só pode editar/deletar outros usuários se tiver role 'admin'
  - Não pode deletar a si mesmo
  - Não pode alterar role para 'super_admin' (apenas sistema)
- **Processo**:
  1. Verificar role do usuário autenticado
  2. Validar permissões
  3. Executar operação

### Regra 4: E-mail único (login)
- **Quando aplicar**: Criação ou alteração de e-mail (`POST /users`, `PUT /users/:id`, criação de super_admin)
- **Validação**: O e-mail não pode existir noutra linha de `public.users` (inclui outro tenant e super_admin). Comparação após normalização (`trim` + minúsculas).
- **Erro**: `409` com código `EMAIL_ALREADY_EXISTS` quando o e-mail já está em uso
- **Nota**: Isto é distinto do isolamento por tenant nas queries: o e-mail identifica **uma** conta na plataforma.

### Regra 5: Hash de Senha
- **Quando aplicar**: Ao criar ou atualizar senha
- **Validação**: Senha mínimo 8 caracteres
- **Processo**: Sempre usar BCrypt com 10 rounds
- **NUNCA**: Armazenar senha em plain text

## Dependências
- **Módulos**: `subscriptions` (para verificar plan.max_users)
- **Services compartilhados**: `password.ts` (hash de senha)
- **Tabelas**: `users`, `companies`, `plans`, `subscriptions`

## Endpoints

### GET /users
- **Descrição**: Lista usuários do tenant atual
- **Query params**: `?page=1&limit=20&role=admin`
- **Resposta**: `{ data: { users: [], total: number, page: number, limit: number } }`
- **Autenticação**: Requerida
- **Multitenant**: Filtro automático por tenant (resposta com `tenant_id`)

### GET /users/:id
- **Descrição**: Buscar usuário por ID
- **Resposta**: `{ data: { user } }`
- **Autenticação**: Requerida
- **Validação**: Usuário deve pertencer ao mesmo tenant

### POST /users
- **Descrição**: Criar novo usuário
- **Body**: `{ name, email, password, role? }`
- **Resposta**: `{ data: { user } }`
- **Autenticação**: Requerida
- **Validação**: 
  - Validação de seats (limite de usuários)
  - E-mail único na plataforma (ver Regra 4)
  - Senha mínimo 8 caracteres

### PUT /users/:id
- **Descrição**: Atualizar usuário
- **Body**: `{ name?, email?, role? }`
- **Resposta**: `{ data: { user } }`
- **Autenticação**: Requerida
- **Validação**: Permissões de edição; se `email` for enviado, não pode coincidir com outro utilizador (Regra 4)

### DELETE /users/:id
- **Descrição**: Deletar usuário
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida
- **Validação**: 
  - Não pode deletar a si mesmo
  - Requer role 'admin'

## Fluxos Importantes

### Fluxo de Criação de Usuário
1. Validar dados de entrada (Zod)
2. Verificar limite de seats (SubscriptionService)
3. Verificar se email já existe na empresa
4. Hash da senha (BCrypt)
5. Criar usuário no banco
6. Retornar usuário criado (sem senha)
7. Log da operação

### Fluxo de Atualização
1. Validar dados de entrada
2. Verificar permissões (role admin)
3. Verificar se usuário pertence ao tenant
4. Atualizar no banco
5. Retornar usuário atualizado
6. Log da operação

## Casos Especiais
- **Super Admin**: Role especial que pode acessar qualquer tenant (implementar se necessário)
- **Self Update**: Usuário pode atualizar seus próprios dados (exceto role)
- **Soft Delete**: Considerar soft delete ao invés de hard delete (manter histórico)

## Exemplos de Uso
```typescript
// Criar usuário
const response = await fetch('/api/v1/users', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<tenantId>' },
  body: JSON.stringify({
    name: 'Novo Usuário',
    email: 'usuario@empresa.com',
    password: 'senha123',
    role: 'user'
  })
});

// Listar usuários
const response = await fetch('/api/v1/users?page=1&limit=20', {
  headers: { 'Authorization': 'Bearer <token>', 'X-Tenant-ID': '<tenantId>' }
});
```
