# Módulo Access List

## Descrição
Gerenciamento administrativo de lista de acessos. Permite importar usuários via CSV, 
liberar/revogar acessos individualmente ou em lote, enviar credenciais por e-mail, 
e copiar dados de primeiro acesso para envio manual (WhatsApp).

## Regras de Negócio
- **Importação CSV**: Colunas obrigatórias são `nome` e `email`. Demais opcionais: `telefone`, `cpf`, `empresa`.
- **Duplicatas**: E-mails já existentes na access_list são ignorados na importação.
- **Ativação**: Cria company/tenant, schema, ativa `PABLO_MODULE_KEYS` (imóveis, LC 224, IRPF, mapeamento PF→PJ, comparativo de regimes), cria usuário admin com senha provisória.
- **Senha provisória**: Gerada com 12 chars legíveis, armazenada cifrada (AES-256-GCM) no banco.
- **must_change_password**: Flag ativado na criação; usuário deve trocar senha no primeiro login.
- **Desativação**: Seta status do user para `inactive`, revoga refresh tokens, atualiza access_list.
- **Reativação**: Apenas reativa user existente sem recriar tenant.
- **Remoção**: Só é possível remover registros com status `pending`.

## Dependências
- Módulos: `companies` (criação de tenant), `users` (criação de usuário), `feature-toggles` (ativação de módulo)
- Tabelas: `access_list` (public), `users` (public), `companies` (public), `tenant_modules` (public), `modules` (public)

## Endpoints (todos requerem super_admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/import` | Upload CSV (multipart ou JSON) |
| GET | `/` | Listar com filtros e paginação |
| GET | `/stats` | Contadores por status |
| POST | `/activate` | Ativar em lote |
| POST | `/deactivate` | Desativar em lote |
| POST | `/:id/activate` | Ativar individual |
| POST | `/:id/deactivate` | Desativar individual |
| POST | `/:id/regenerate-password` | Regenerar senha provisória |
| GET | `/:id/credentials` | Obter credenciais para cópia |
| DELETE | `/:id` | Remover (somente pending) |
