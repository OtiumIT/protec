# ⚙️ Configuração do Template no GitHub

Este arquivo explica como marcar este repositório como **template** no GitHub.

## 📋 Passos para Tornar o Repositório um Template

### 1. Via Interface Web do GitHub

1. Acesse o repositório no GitHub
2. Vá em **Settings** (Configurações)
3. Role até a seção **Template repository**
4. Marque a opção **"Template repository"**
5. Clique em **Save**

### 2. Verificar se Está Funcionando

Após marcar como template, você verá:
- Botão **"Use this template"** verde no topo do repositório
- Badge "Template" ao lado do nome do repositório

## 🎯 Boas Práticas para Templates

### ✅ O que Incluir no Template

- [x] `.env.example` com todas as variáveis necessárias
- [x] `README.md` claro e completo
- [x] `TEMPLATE.md` com instruções de uso
- [x] `.gitignore` adequado
- [x] Scripts de setup (opcional)
- [x] Documentação de cada módulo
- [x] Exemplos de configuração

### ❌ O que NÃO Incluir no Template

- [ ] Arquivos `.env` com valores reais
- [ ] Secrets ou chaves de API
- [ ] Dados sensíveis
- [ ] Configurações específicas de um projeto
- [ ] `node_modules/` ou builds

### 📝 Checklist Antes de Publicar como Template

- [ ] Remover todos os secrets do código
- [ ] Verificar que `.env.example` está completo
- [ ] README.md atualizado e claro
- [ ] TEMPLATE.md com instruções detalhadas
- [ ] `.gitignore` configurado corretamente
- [ ] Documentação dos módulos completa
- [ ] Código limpo e comentado onde necessário
- [ ] Licença definida (MIT recomendado)

## 🔄 Manter o Template Atualizado

### Quando Atualizar o Template

- Correções de bugs críticos
- Melhorias de segurança
- Novas features genéricas úteis
- Atualizações de dependências importantes
- Melhorias na estrutura/base

### Como Atualizar Projetos Filhos

Projetos criados a partir do template podem sincronizar atualizações:

```bash
# No projeto filho
git remote add upstream https://github.com/SEU_USUARIO/ProjetoBase.git
git fetch upstream
git merge upstream/main
# Resolver conflitos se houver
```

## 📚 Recursos Adicionais

- [GitHub Docs: Creating a template repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository)
- [GitHub Docs: Creating a repository from a template](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template)

## 🎨 Personalização do Template

Após criar um projeto a partir do template, personalize:

1. **README.md**: Atualize com informações do seu projeto
2. **package.json**: Altere nome, descrição, autor
3. **Branding**: Logo, cores, nome da aplicação
4. **Módulos**: Adicione/remova conforme necessário
5. **Configurações**: Ajuste para seu caso de uso

## ⚠️ Importante

- **Nunca** commite secrets no template
- **Sempre** use `.env.example` para documentar variáveis
- **Sempre** gere novas chaves JWT para cada projeto
- **Sempre** teste o template antes de marcar como público
