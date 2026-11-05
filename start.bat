@echo off
cd /d "%~dp0"
title Legado Roleplay Bot

echo ========================================
echo   Registrando Slash Commands...
echo ========================================
node deploy-commands.js

if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron registrar los comandos.
    echo Revisa el error de arriba antes de cerrar esta ventana.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Iniciando bot...
echo ========================================
node index.js

if errorlevel 1 (
    echo.
    echo [ERROR] El bot se cerro con un error.
    pause
)
