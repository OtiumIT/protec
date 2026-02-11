# Módulo Fiscal Files

## Descrição
Gerencia upload, armazenamento e processamento de arquivos fiscais dos clientes (SPED, ECD, PGDAS, XML, PDF, etc). Cada arquivo está associado a um cliente e uma competência específica.

## Regras de Negócio

### Regra 1: Isolamento Multitenant
- **Quando aplicar**: Todas as operações
- **Validação**: Schema-per-tenant (`tenant_{company_id}`)
- **Processo**: Todas as queries são executadas no schema do tenant (isolamento automático via `search_path`)
- **Nota**: Tabelas de tenant NÃO requerem `company_id` nas queries (isoladas por schema)

### Regra 2: Upload de Arquivo
- **Quando aplicar**: Endpoint `POST /fiscal-files/upload`
- **Validação**:
  - Arquivo obrigatório (multipart/form-data)
  - Tipos permitidos: `.txt`, `.xml`, `.pdf`
  - Tamanho máximo: 50MB
  - MIME types validados
  - Cliente deve existir no tenant
  - Competência no formato YYYY-MM
- **Processo**:
  1. Validar dados de entrada (Zod)
  2. Validar tipo e tamanho do arquivo
  3. Verificar se cliente existe
  4. Upload para Supabase Storage (estrutura: `{company_id}/{client_id}/{competence}/{filename}`)
  5. Criar registro no banco com status `uploaded`
  6. Retornar arquivo criado

### Regra 3: Status do Arquivo
- **Estados possíveis**:
  - `uploaded`: Arquivo enviado, aguardando processamento
  - `processing`: Sendo processado pelos workers
  - `processed`: Processado com sucesso
  - `error`: Erro no processamento (com `processing_error`)
- **Transições**: Apenas workers podem atualizar status (via `PUT /fiscal-files/:id/status`)

### Regra 4: Download de Arquivo
- **Quando aplicar**: Endpoint `GET /fiscal-files/:id/download`
- **Processo**:
  1. Verificar se arquivo existe e pertence ao tenant
  2. Gerar URL assinada do Supabase Storage (expiração configurável)
  3. Retornar URL temporária

### Regra 5: Deleção de Arquivo
- **Quando aplicar**: Endpoint `DELETE /fiscal-files/:id`
- **Processo**:
  1. Verificar se arquivo existe
  2. Deletar do Supabase Storage
  3. Deletar registro do banco
  4. Log de erro se falhar storage (mas continua com deleção do registro)

## Dependências
- **Módulos**: 
  - `clients` (validação de cliente antes de upload)
- **Services compartilhados**: 
  - `StorageService` (upload/download/delete no Supabase)
- **Tabelas**: 
  - `fiscal_files` (schema do tenant)
  - `clients` (schema do tenant)
- **Storage**: 
  - Supabase Storage bucket `fiscal-files`

## Endpoints

### POST /fiscal-files/upload
- **Descrição**: Upload de arquivo fiscal via multipart/form-data
- **Body (form-data)**: `file`, `client_id`, `competence`, `file_type`
- **Validação**: 
  - Arquivo obrigatório
  - Tipos: `.txt`, `.xml`, `.pdf` (máx. 50MB)
  - `client_id`: UUID válido
  - `competence`: Formato YYYY-MM
  - `file_type`: `sped`, `ecd`, `pgdas`, `xml`, `pdf`, `txt`, `outros`
- **Resposta**: `{ data: { fiscal_file } }` (201)
- **Autenticação**: Requerida
- **Módulo**: Requer módulo `FISCAL_FILES` ativo

### GET /fiscal-files
- **Descrição**: Listar arquivos fiscais com filtros e paginação
- **Query params**: 
  - `client_id?`: UUID do cliente
  - `competence?`: YYYY-MM
  - `status?`: `uploaded`, `processing`, `processed`, `error`
  - `page?`: Número da página (padrão: 1)
  - `limit?`: Itens por página (padrão: 20)
- **Resposta**: `{ data: { files: [], total: number, page: number, limit: number } }`
- **Autenticação**: Requerida
- **Validação**: Query params validados com Zod

### GET /fiscal-files/:id
- **Descrição**: Buscar arquivo fiscal por ID
- **Resposta**: `{ data: { fiscal_file } }`
- **Autenticação**: Requerida
- **Validação**: ID deve ser UUID válido

### GET /fiscal-files/:id/download
- **Descrição**: Obter URL assinada para download
- **Query params**: `expires_in?`: Segundos até expiração (padrão: 3600)
- **Resposta**: `{ data: { download_url: string, expires_in: number } }`
- **Autenticação**: Requerida
- **Validação**: ID deve ser UUID válido

### PUT /fiscal-files/:id/status
- **Descrição**: Atualizar status do arquivo (usado pelos workers)
- **Body**: `{ status?, processing_error?, metadata? }`
- **Resposta**: `{ data: { fiscal_file } }`
- **Autenticação**: Requerida (ou API key para workers)
- **Validação**: Body validado com Zod

### DELETE /fiscal-files/:id
- **Descrição**: Deletar arquivo fiscal
- **Resposta**: `{ data: { success: true } }`
- **Autenticação**: Requerida
- **Validação**: ID deve ser UUID válido
- **Processo**: Deleta do storage e do banco

### GET /fiscal-files/client/:client_id
- **Descrição**: Listar arquivos de um cliente específico
- **Resposta**: `{ data: { files: [] } }`
- **Autenticação**: Requerida
- **Validação**: `client_id` deve ser UUID válido

## Fluxos Importantes

### Fluxo de Upload
1. Receber multipart/form-data
2. Validar dados (Zod)
3. Validar tipo e tamanho do arquivo
4. Verificar se cliente existe no tenant
5. Upload para Supabase Storage
6. Criar registro no banco (status: `uploaded`)
7. Retornar arquivo criado

### Fluxo de Processamento (Workers)
1. Worker busca arquivos com status `uploaded`
2. Worker atualiza status para `processing`
3. Worker processa arquivo (extração de dados)
4. Worker atualiza status para `processed` (ou `error` com `processing_error`)
5. Worker salva dados extraídos em `extracted_fiscal_data`

## Casos Especiais
- **Arquivo duplicado**: Supabase Storage não sobrescreve (config: `upsert: false`)
- **Erro no storage**: Log de erro mas continua com deleção do registro
- **Competência inválida**: Validação regex `^\d{4}-\d{2}$`
- **Módulo desativado**: Retorna `402 Payment Required`

## Estrutura de Storage
```
fiscal-files/
  {company_id}/
    {client_id}/
      {competence}/
        {filename}
```

## Exemplos de Uso

### Upload via FormData
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('client_id', clientId);
formData.append('competence', '2024-01');
formData.append('file_type', 'sped');

await fetch('/api/v1/fiscal-files/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': tenantId,
  },
});
```

### Listar com Filtros
```typescript
const response = await fetch(
  '/api/v1/fiscal-files?client_id=xxx&competence=2024-01&status=processed&page=1&limit=20',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
    },
  }
);
```
