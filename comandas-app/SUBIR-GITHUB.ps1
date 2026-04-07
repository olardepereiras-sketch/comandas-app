# ============================================================
#  SUBIR-GITHUB.ps1  - Sube comandas-app a GitHub
#  Ejecutar desde la carpeta donde esta este script:
#  powershell -ExecutionPolicy Bypass -File SUBIR-GITHUB.ps1
# ============================================================

$ErrorActionPreference = "Stop"
Write-Host "=== SUBIR COMANDAS-APP A GITHUB ===" -ForegroundColor Yellow

# ---- CONFIGURACION ----
$GITHUB_USER = "quieromesa"
$GITHUB_REPO = "comandas-app"
$BRANCH      = "main"

# Pedir token si no esta en el entorno
$TOKEN = $env:GITHUB_TOKEN_PUSH
if (-not $TOKEN) {
    Write-Host ""
    Write-Host "Introduce tu GitHub Personal Access Token (ghp_...):" -ForegroundColor Cyan
    $TOKEN = Read-Host "Token"
}

if (-not $TOKEN) {
    Write-Host "ERROR: Token no proporcionado." -ForegroundColor Red
    exit 1
}

# ---- VERIFICAR GIT ----
try {
    git --version | Out-Null
} catch {
    Write-Host "ERROR: Git no esta instalado. Descargalo de https://git-scm.com" -ForegroundColor Red
    exit 1
}

# ---- DIRECTORIO ----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Write-Host "Directorio: $ScriptDir" -ForegroundColor Gray

# ---- INIT GIT SI NO EXISTE ----
if (-not (Test-Path ".git")) {
    Write-Host "`nInicializando repositorio git..." -ForegroundColor Cyan
    git init
    git branch -M $BRANCH
}

# ---- CREAR .gitignore ----
$gitignore = @"
node_modules/
android/
ios/
.expo/
dist/
build.log
*.apk
*.aab
local.properties
"@
[System.IO.File]::WriteAllText("$ScriptDir\.gitignore", $gitignore, [System.Text.UTF8Encoding]::new($false))
Write-Host ".gitignore creado" -ForegroundColor Gray

# ---- CONFIGURAR REMOTE ----
$remoteUrl = "https://${TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
git remote remove origin 2>$null
git remote add origin $remoteUrl
Write-Host "Remote configurado: github.com/$GITHUB_USER/$GITHUB_REPO" -ForegroundColor Gray

# ---- VERIFICAR QUE EL REPO EXISTE ----
Write-Host "`nVerificando acceso al repositorio..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Accept"        = "application/vnd.github+json"
}
try {
    $repoInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPO" -Headers $headers
    Write-Host "Repositorio encontrado: $($repoInfo.full_name)" -ForegroundColor Green
} catch {
    Write-Host "El repositorio no existe o no tienes acceso. Intentando crear..." -ForegroundColor Yellow
    try {
        $body = @{ name = $GITHUB_REPO; private = $false; description = "App de comandas para restaurantes" } | ConvertTo-Json
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json" | Out-Null
        Write-Host "Repositorio creado OK" -ForegroundColor Green
    } catch {
        Write-Host "No se pudo crear el repositorio. Verifica permisos del token (scope 'repo' requerido)." -ForegroundColor Red
        exit 1
    }
}

# ---- COMMIT Y PUSH ----
Write-Host "`nPreparando commit..." -ForegroundColor Cyan
git config user.email "deploy@quieromesa.com"
git config user.name "Quieromesa Deploy"

git add -A
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Update comandas-app - $timestamp" 2>&1 | Out-Null

Write-Host "Subiendo a GitHub..." -ForegroundColor Cyan
git push -u origin $BRANCH --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  SUBIDO CORRECTAMENTE A GITHUB!" -ForegroundColor Green
    Write-Host "  https://github.com/$GITHUB_USER/$GITHUB_REPO" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR al subir a GitHub. Verifica el token y los permisos." -ForegroundColor Red
    exit 1
}
