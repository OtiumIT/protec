# Módulo Auth

## Descrição
Gerencia autenticação e autorização do sistema, incluindo registro de empresas, login, refresh tokens e validação de JWT.

## Regras de Negócio

### Regra 1: Registro de Empresa e Primeiro Usuário
- **Quando aplicar**: Endpoint `POST /auth/register`
- **Validação**: 
  - Nome da empresa: mínimo 3 caracteres
  - Email do usuário: formato válido e único por empresa
  - Senha: mínimo 8 caracteres
- **Processo**:
  1. Criar empresa (company)
  2. Hash da senha com BCrypt (10 rounds)
  3. Criar primeiro usuário com role 'admin'
  4. Gerar tokens (access + refresh)
  5. Retornar tokens e dados do usuário (sem senha)
- **Exceção**: Não requer autenticação (rota pública)

### Regra 2: Login
- **Quando aplicar**: Endpoint `POST /auth/login`
- **Validação**:
  - Email e senha obrigatórios
  - Verificar se usuário existe e senha está correta
- **Processo**:
  1. Buscar usuário por email e company_id
  2. Verificar senha com BCrypt
  3. Gerar novos tokens (access + refresh)
  4. Armazenar refresh token no banco (não invalida tokens anteriores)
  5. Retornar tokens e dados do usuário
- **Múltiplas sessões**: Um mesmo usuário pode estar logado em vários dispositivos ao mesmo tempo; cada login adiciona um novo refresh token, sem invalidar os demais.
- **Erro**: Retorna 401 se credenciais inválidas

### Regra 3: Refresh Token
- **Quando aplicar**: Endpoint `POST /auth/refresh`
- **Validação**:
  - Token deve existir no banco
  - Token não pode estar expirado
- **Processo**:
  1. Verificar refresh token no banco
  2. Validar expiração
  3. Gerar novo access token
  4. Opcionalmente rotacionar refresh token
- **Erro**: Retorna 401 se token inválido ou expirado

### Regra 4: Logout
- **Quando aplicar**: Endpoint `POST /auth/logout`
- **Processo**:
  1. Invalidar refresh token (deletar do banco)
  2. Retornar sucesso
- **Segurança**: Requer autenticação

### Regra 5: Validação de Token
- **Quando aplicar**: Middleware `authMiddleware`
- **Validação**:
  - Token JWT válido e não expirado
  - Usuário existe no banco
  - Usuário pertence ao tenant correto
- **Processo**:
  1. Extrair token do header `Authorization: Bearer <token>`
  2. Verificar assinatura e expiração
  3. Buscar usuário no banco
  4. Adicionar ao context para uso nas rotas

## Dependências
- **Módulos**: `companies` (criação de empresa no registro)
- **Services compartilhados**: `jwt.ts`, `password.ts`
- **Tabelas**: `users`, `companies`, `refresh_tokens`

## Endpoints

### POST /auth/register
- **Descrição**: Registrar nova empresa e primeiro usuário
- **Body**: `{ company: { name, domain? }, user: { name, email, password } }`
- **Resposta**: `{ data: { user, tokens: { access, refresh } } }`
- **Validação**: Zod schema `RegisterSchema`

### POST /auth/login
- **Descrição**: Autenticar usuário
- **Body**: `{ email, password }`
- **Resposta**: `{ data: { user, tokens: { access, refresh } } }`
- **Validação**: Zod schema `LoginSchema`

### POST /auth/refresh
- **Descrição**: Renovar access token
- **Body**: `{ token }`
- **Resposta**: `{ data: { accessToken } }`
- **Validação**: Zod schema `RefreshTokenSchema`

### POST /auth/logout
- **Descrição**: Invalidar refresh token
- **Body**: `{ token }`
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida

### GET /auth/me
- **Descrição**: Obter dados do usuário atual
- **Resposta**: `{ data: { user } }`
- **Autenticação**: Requerida

## Fluxos Importantes

### Fluxo de Registro
1. Validar dados de entrada (Zod)
2. Criar empresa no banco
3. Hash da senha (BCrypt)
4. Criar usuário com role 'admin'
5. Gerar tokens (JWT)
6. Armazenar refresh token
7. Retornar dados (sem senha)

### Fluxo de Login
1. Validar email e senha
2. Buscar usuário por email e company_id
3. Verificar senha
4. Gerar tokens
5. Armazenar refresh token
6. Retornar dados

## Casos Especiais
- **Super Admin**: Role especial que pode acessar qualquer tenant (implementar se necessário)
- **Token Rotation**: Opcionalmente rotacionar refresh token a cada uso
- **Rate Limiting**: Aplicar rate limiting em rotas de autenticação

## Exemplos de Uso
```typescript
// Registrar empresa
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    company: { name: 'Minha Empresa' },
    user: { name: 'Admin', email: 'admin@empresa.com', password: 'senha123' }
  })
});

// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'admin@empresa.com',
    password: 'senha123'
  })
});
```
