# Template Setup Guide

Este arquivo é exibido quando alguém cria um novo repositório a partir deste template.

## 🎉 Bem-vindo ao Template SaaS Multitenant!

Você acabou de criar um novo projeto baseado no template. Siga os passos abaixo para configurar:

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Configurar Ambiente

```bash
cp .env.example .env
# Edite .env com suas configurações
```

### 3. Configurar Banco de Dados

```bash
cd apps/api
pnpm migrate
```

### 4. Iniciar Desenvolvimento

```bash
# Na raiz do projeto
pnpm dev
```

## 📖 Documentação Completa

Veja `TEMPLATE.md` para instruções detalhadas.
