# Script de Deploy: CRM Secretária → Coolify
# Execute este script no PowerShell como Administrador

$COOLIFY_URL = "https://painel.appsbrasil.store"
$EMAIL = "ivonei.energia@gmail.com"
$PASSWORD = "Miguel15123000@#@#@"
$APP_NAME = "crm-secretaria"
$DOMAIN = "crm.appsbrasil.store"
$CRM_DIR = "C:\Users\User\.gemini\antigravity\scratch\crm-secretaria"

Write-Host "=== Deploy CRM Secretária no Coolify ===" -ForegroundColor Cyan

# 1. Obter token da API
Write-Host "`n[1/4] Autenticando no Coolify..." -ForegroundColor Yellow
try {
    $authBody = @{ email = $EMAIL; password = $PASSWORD } | ConvertTo-Json
    $authResponse = Invoke-RestMethod -Uri "$COOLIFY_URL/api/v1/security/api/token" `
        -Method POST `
        -ContentType "application/json" `
        -Body $authBody
    $TOKEN = $authResponse.token
    Write-Host "     ✓ Autenticado! Token obtido." -ForegroundColor Green
} catch {
    Write-Host "     ✗ Erro na autenticação: $_" -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $TOKEN" }

# 2. Listar servidores disponíveis
Write-Host "`n[2/4] Verificando servidores..." -ForegroundColor Yellow
try {
    $servers = Invoke-RestMethod -Uri "$COOLIFY_URL/api/v1/servers" -Headers $headers
    $serverId = $servers[0].uuid
    Write-Host "     ✓ Servidor encontrado: $serverId" -ForegroundColor Green
} catch {
    Write-Host "     ✗ Erro ao listar servidores: $_" -ForegroundColor Red
    exit 1
}

# 3. Listar projetos
Write-Host "`n[3/4] Verificando projetos..." -ForegroundColor Yellow
try {
    $projects = Invoke-RestMethod -Uri "$COOLIFY_URL/api/v1/projects" -Headers $headers
    if ($projects.Count -gt 0) {
        $projectId = $projects[0].uuid
        Write-Host "     ✓ Projeto encontrado: $projectId" -ForegroundColor Green
    }
} catch {
    Write-Host "     ✗ Erro ao listar projetos: $_" -ForegroundColor Red
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMO PASSO: Configure manualmente" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Acesse: $COOLIFY_URL" -ForegroundColor White
Write-Host "Siga o GUIA DE DEPLOY em: $CRM_DIR\DEPLOY.md" -ForegroundColor White
