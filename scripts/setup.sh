#!/bin/bash

# Script de setup inicial para novos projetos criados a partir do template
# Uso: ./scripts/setup.sh

set -e

echo "🚀 Configurando projeto SaaS Multitenant..."

# Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm não encontrado. Instale com: npm install -g pnpm"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
pnpm install

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações!"
    echo "   - Gere novas chaves JWT_SECRET e REFRESH_TOKEN_SECRET"
    echo "   - Configure DATABASE_URL"
    echo "   - Configure CORS_ORIGIN"
else
    echo "✅ Arquivo .env já existe"
fi

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ Erro: node_modules não encontrado após instalação"
    exit 1
fi

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "1. Edite o arquivo .env com suas configurações"
echo "2. Execute: cd apps/api && pnpm migrate"
echo "3. Execute: pnpm dev (na raiz)"
echo ""
echo "📖 Veja TEMPLATE.md para mais informações"
