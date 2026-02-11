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
