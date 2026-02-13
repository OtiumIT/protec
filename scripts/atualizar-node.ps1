# Script para atualizar Node.js no Windows
# Execute como Administrador: clique direito > "Executar como administrador"

Write-Host "=== Atualizador de Node.js ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se está rodando como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "AVISO: Execute este script como Administrador para instalar o Node.js." -ForegroundColor Yellow
    Write-Host "Clique direito no script > 'Executar como administrador'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternativa: Execute no PowerShell como admin:" -ForegroundColor Yellow
    Write-Host "  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "Instalando Node.js LTS..." -ForegroundColor Green
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Node.js instalado com sucesso!" -ForegroundColor Green
    Write-Host "IMPORTANTE: Feche e abra um novo terminal para usar a nova versao." -ForegroundColor Yellow
    Write-Host "Depois execute: node -v" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Algo deu errado. Tente instalar manualmente:" -ForegroundColor Red
    Write-Host "1. Acesse https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Baixe a versao LTS" -ForegroundColor White
    Write-Host "3. Execute o instalador" -ForegroundColor White
}
Write-Host ""
pause
