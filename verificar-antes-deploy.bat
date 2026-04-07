@echo off
REM ===========================================
REM Script de verificación pre-despliegue
REM ===========================================

echo.
echo ===============================================
echo   VERIFICACION PRE-DESPLIEGUE
echo   Proyecto: ReservaMesa
echo ===============================================
echo.

REM Verificar que existe .env
echo [1/6] Verificando archivo .env...
if not exist ".env" (
    echo   ❌ ERROR: No se encuentra el archivo .env
    echo   📝 Solucion: Copia env.example a .env y configura tus credenciales
    echo      copy env.example .env
    pause
    exit /b 1
)
echo   ✅ Archivo .env encontrado

REM Verificar contenido de .env
echo.
echo [2/6] Verificando configuracion de Turso...
findstr /C:"tu_token_de_autenticacion" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo   ❌ ERROR: El token de Turso no esta configurado
    echo   📝 El archivo .env contiene "tu_token_de_autenticacion"
    echo      Debes reemplazarlo con tu token real de Turso
    echo      Token formato: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
    pause
    exit /b 1
)
echo   ✅ Token de Turso parece configurado

REM Verificar conectividad SSH
echo.
echo [3/6] Verificando conectividad SSH al VPS...
ssh -o ConnectTimeout=5 -o BatchMode=yes root@200.234.236.133 "echo OK" >nul 2>&1
if %errorlevel% neq 0 (
    echo   ⚠️  ADVERTENCIA: No se puede conectar al VPS via SSH
    echo   📝 Verifica que:
    echo      - Tu clave SSH este configurada
    echo      - El VPS este accesible
    echo      - El firewall permita conexiones SSH
    echo.
    echo   ¿Deseas continuar de todos modos? (S/N)
    set /p continue=
    if /i not "%continue%"=="S" exit /b 1
) else (
    echo   ✅ Conectividad SSH OK
)

REM Verificar que rsync o scp esten disponibles
echo.
echo [4/6] Verificando herramientas de transferencia...
where rsync >nul 2>&1
if %errorlevel% equ 0 (
    echo   ✅ rsync disponible (recomendado)
) else (
    where scp >nul 2>&1
    if %errorlevel% equ 0 (
        echo   ⚠️  rsync no disponible, se usara scp (mas lento)
        echo   💡 Recomendacion: Instala rsync para despliegues mas rapidos
    ) else (
        echo   ❌ ERROR: No se encuentra rsync ni scp
        echo   📝 Instala Git Bash o WSL para tener estas herramientas
        pause
        exit /b 1
    )
)

REM Verificar estructura de archivos
echo.
echo [5/6] Verificando estructura del proyecto...
if not exist "backend\db\migrations.ts" (
    echo   ❌ ERROR: No se encuentra backend\db\migrations.ts
    pause
    exit /b 1
)
if not exist "backend\db\seed.ts" (
    echo   ❌ ERROR: No se encuentra backend\db\seed.ts
    pause
    exit /b 1
)
if not exist "backend\test-turso.ts" (
    echo   ❌ ERROR: No se encuentra backend\test-turso.ts
    pause
    exit /b 1
)
if not exist "deploy.ps1" (
    echo   ❌ ERROR: No se encuentra deploy.ps1
    pause
    exit /b 1
)
echo   ✅ Estructura del proyecto OK

REM Verificar PowerShell
echo.
echo [6/6] Verificando PowerShell...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo   ❌ ERROR: PowerShell no esta disponible
    pause
    exit /b 1
)
echo   ✅ PowerShell disponible

echo.
echo ===============================================
echo   ✅ VERIFICACION COMPLETA
echo ===============================================
echo.
echo   Todas las verificaciones pasaron exitosamente
echo   El proyecto esta listo para desplegarse
echo.
echo   Para iniciar el despliegue ejecuta:
echo     powershell -ExecutionPolicy Bypass -File deploy.ps1
echo.
echo   O si estas en PowerShell directamente:
echo     .\deploy.ps1
echo.
pause
