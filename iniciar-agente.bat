@echo off
chcp 65001 >nul 2>&1
title QuieroMesa - Agente de Impresion

:: ============================================================
::  QuieroMesa - Agente de Impresion Local
::  Compatible con Windows 7 / 8 / 10 / 11
::  Impresoras USB conectadas al PC y en red (TCP/IP)
:: ============================================================

echo.
echo  ==========================================
echo   QuieroMesa - Agente de Impresion Local
echo  ==========================================
echo.

:: Buscar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js no esta instalado.
    echo.
    echo  Por favor instala Node.js desde:
    echo  https://nodejs.org/  (version 8 o superior)
    echo.
    echo  Para Windows 7 usa Node.js 12 (ultima version compatible):
    echo  https://nodejs.org/dist/v12.22.12/node-v12.22.12-x86.msi
    echo.
    pause
    exit /b 1
)

:: Mostrar version de Node.js
for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo  Node.js encontrado: %NODE_VERSION%

:: Verificar que existe print-agent.js
if not exist "%~dp0print-agent.js" (
    echo.
    echo  ERROR: No se encuentra print-agent.js
    echo  Asegurate de que este archivo esta en la misma carpeta que iniciar-agente.bat
    echo.
    pause
    exit /b 1
)

:: Leer token desde archivo de configuracion si existe
set TOKEN=
if exist "%~dp0print-agent-config.json" (
    echo  Configuracion encontrada: print-agent-config.json
    goto :run_agent
)

:: Pedir token al usuario si no hay configuracion
echo.
echo  Para conectar el agente necesitas el token de tu restaurante.
echo  Lo encuentras en: QuieroMesa ^> Comandas ^> Configuracion ^> Impresoras
echo.
set /p TOKEN="  Introduce tu token (cmd-xxx-xxx): "

if "%TOKEN%"=="" (
    echo.
    echo  ERROR: El token no puede estar vacio.
    pause
    exit /b 1
)

:: Guardar configuracion
echo  Guardando configuracion...
echo {"token":"%TOKEN%","server":"https://quieromesa.com"} > "%~dp0print-agent-config.json"
echo  Configuracion guardada en print-agent-config.json
echo  (La proxima vez no necesitaras introducir el token)

:run_agent
echo.
echo  Iniciando agente de impresion...
echo  Presiona Ctrl+C para detener.
echo.

if "%TOKEN%"=="" (
    node "%~dp0print-agent.js"
) else (
    node "%~dp0print-agent.js" --token %TOKEN%
)

if %errorlevel% neq 0 (
    echo.
    echo  El agente se ha detenido con un error.
    pause
)
