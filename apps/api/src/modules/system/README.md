# Módulo System

## Descrição
Gerencia operações administrativas do sistema, incluindo estatísticas do banco de dados e listagem de tenants. Este módulo é exclusivo para super administradores.

## Regras de Negócio

### Regra 1: Acesso Restrito a Super Admin
- **Quando aplicar**: Todas as rotas do módulo
- **Validação**: 
  - Usuário deve ter `role === 'super_admin'`
  - Verificação feita no middleware `authMiddleware` e validação adicional nas rotas
- **Erro**: Retorna `403 FORBIDDEN` se usuário não for super_admin
- **Exceção**: Nenhuma

### Regra 1.1: Logs de Uso (Auditoria Operacional)
- **Quando aplicar**:
  - `POST /system/usage-log` (eventos do frontend)
  - middleware global da API (eventos automáticos de qualquer endpoint)
- **Validação**:
  - Usuário autenticado obrigatório
  - `company_id` vem do JWT para usuários comuns
  - `super_admin` pode enviar `company_id` explicitamente quando necessário
- **Processo**:
  1. Classificar módulo/funcionalidade (`module_key`, `feature_key`, `action`)
  2. Persistir em `public.module_usage_logs`
  3. Nunca falhar o fluxo principal por erro de auditoria
- **Objetivo**: rastrear uso real de todas as funcionalidades (simulações, cliques, navegação e chamadas de API)

### Regra 2: Estatísticas do Banco de Dados
- **Quando aplicar**: Endpoint `GET /system/stats`
- **Validação**: 
  - Apenas super_admin pode acessar
  - Não requer tenant (operações globais)
- **Processo**:
  1. Verificar se usuário é super_admin
  2. Consultar estatísticas do banco (tamanho, número de tabelas, etc.)
  3. Retornar dados agregados
- **Dados retornados**:
  - Tamanho do banco de dados
  - Número total de tabelas
  - Outras métricas relevantes

### Regra 3: Listagem de Tenants
- **Quando aplicar**: Endpoint `GET /system/tenants`
- **Validação**: 
  - Apenas super_admin pode acessar
  - Não requer tenant (operações globais)
- **Processo**:
  1. Verificar se usuário é super_admin
  2. Listar todas as empresas (tenants) do sistema
  3. Retornar dados básicos de cada tenant
- **Dados retornados**:
  - ID da empresa
  - Nome da empresa
  - Domain
  - Data de criação
  - Status (se aplicável)

## Dependências
- **Módulos**: Nenhum (módulo independente)
- **Services compartilhados**: 
  - `SystemService` (próprio do módulo)
- **Tabelas do banco**: 
  - `companies` (para listar tenants)
  - `module_usage_logs` (auditoria de uso por módulo/funcionalidade)
  - Consultas diretas ao PostgreSQL para estatísticas

## Endpoints

### GET /system/stats
- **Descrição**: Obter estatísticas do banco de dados
- **Autenticação**: Requerida (Bearer token)
- **Permissão**: Apenas `super_admin`
- **Validações**: 
  - Token JWT válido
  - Usuário com role `super_admin`
- **Resposta**: 
  ```json
  {
    "data": {
      "stats": {
        "databaseSize": "123.45 MB",
        "databaseSizeBytes": 129499136,
        "totalTables": 15
      }
    }
  }
  ```
- **Códigos HTTP**:
  - `200`: Sucesso
  - `401`: Não autenticado
  - `403`: Não é super_admin

### GET /system/tenants
- **Descrição**: Listar todos os tenants (empresas) do sistema
- **Autenticação**: Requerida (Bearer token)
- **Permissão**: Apenas `super_admin`
- **Validações**: 
  - Token JWT válido
  - Usuário com role `super_admin`
- **Resposta**: 
  ```json
  {
    "data": {
      "tenants": [
        {
          "id": "uuid",
          "name": "Empresa ABC",
          "domain": "empresa.com",
          "created_at": "2026-01-01T00:00:00Z"
        }
      ]
    }
  }
  ```
- **Códigos HTTP**:
  - `200`: Sucesso
  - `401`: Não autenticado
  - `403`: Não é super_admin

### POST /system/usage-log
- **Descrição**: Persistir eventos de uso enviados pelo frontend (cliques e page views)
- **Autenticação**: Requerida (Bearer token)
- **Permissão**: Qualquer usuário autenticado
- **Validações**:
  - `module_key`, `feature_key` e `action` obrigatórios
  - `company_id` respeita regra de tenant via JWT
- **Resposta**:
  - `204` sempre (fire-and-forget)

### GET /system/module-usage
- **Descrição**: Resumo de uso por módulo, usuários ativos e simulações por usuário
- **Autenticação**: Requerida (Bearer token)
- **Permissão**:
  - `super_admin`: visão global ou filtrada por `companyId`
  - admin comum: apenas seu tenant
- **Query params**:
  - `days` (opcional, default 30, máximo 365)
  - `companyId` (opcional, apenas super_admin)
- **Resposta**:
  - `usage.totalEvents`
  - `usage.uniqueUsers`
  - `usage.totalSimulations`
  - `usage.modules[]`
  - `usage.topSimulationUsers[]`

## Fluxos Importantes

### Fluxo de Acesso a Estatísticas
1. Cliente envia requisição com token JWT
2. `authMiddleware` valida token e adiciona usuário ao context
3. Rota verifica se `user.role === 'super_admin'`
4. Se não for super_admin, retorna `403 FORBIDDEN`
5. Se for super_admin, `SystemService` consulta estatísticas
6. Retorna dados agregados

### Fluxo de Listagem de Tenants
1. Cliente envia requisição com token JWT
2. `authMiddleware` valida token e adiciona usuário ao context
3. Rota verifica se `user.role === 'super_admin'`
4. Se não for super_admin, retorna `403 FORBIDDEN`
5. Se for super_admin, `SystemService` lista todas as empresas
6. Retorna lista de tenants

## Casos Especiais

### Super Admin sem Tenant
- Super admins têm `company_id = NULL`
- Não precisam de tenant para acessar este módulo
- Todas as operações são globais (não filtradas por tenant)

### Isolamento de Dados
- Este módulo **não** aplica isolamento de tenant
- Todas as consultas são globais (acessam todos os tenants)
- Por isso requer super_admin

## Exemplos de Uso

### Obter Estatísticas
```typescript
// Frontend
const response = await apiRequest('/api/v1/system/stats', {
  method: 'GET',
  token: accessToken,
});

const stats = response.data.stats;
console.log(`Database size: ${stats.databaseSize}`);
```

### Listar Tenants
```typescript
// Frontend
const response = await apiRequest('/api/v1/system/tenants', {
  method: 'GET',
  token: accessToken,
});

const tenants = response.data.tenants;
tenants.forEach(tenant => {
  console.log(`${tenant.name} (${tenant.domain})`);
});
```

## Notas de Segurança

- ⚠️ **CRÍTICO**: Este módulo expõe dados de todos os tenants
- ⚠️ Apenas super_admin deve ter acesso
- ⚠️ Não logar dados sensíveis nas estatísticas
- ⚠️ Considerar rate limiting para prevenir abuso

## Logs e Auditoria

- Todas as operações devem ser logadas com `logSensitiveOperation`
- Incluir `user_id` e `action` nos logs
- Exemplo: `logSensitiveOperation('system_stats_accessed', userId, null)`
