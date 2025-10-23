@echo off
SETLOCAL EnableDelayedExpansion

echo.
echo =========================================
echo   Connections Monitor - Setup Check
echo =========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    echo.
    call npm install --silent
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed
    echo.
) else (
    echo [OK] Dependencies installed
    echo.
)

REM Check if config.yml exists
if not exist "config.yml" (
    echo [ERROR] config.yml not found!
    echo Please make sure config.yml exists in this directory.
    pause
    exit /b 1
)

echo =========================================
echo   Starting Application
echo =========================================
echo.

REM Check if dashboard is enabled
findstr /C:"enabled: true" config.yml | findstr /C:"dashboard:" >nul 2>&1
set DASHBOARD_ENABLED=%ERRORLEVEL%

if %DASHBOARD_ENABLED%==0 (
    echo [MODE] Dashboard mode enabled
    echo [INFO] Starting dashboard server, scanner, and Electron...
    echo.
    echo Dashboard will be available at: http://localhost:3000
    echo.
    
    REM Use npm script which handles concurrently
    npm run dashboard
) else (
    echo [MODE] Terminal mode (Dashboard disabled)
    echo [INFO] Starting connection scanner...
    echo.
    node src/scanner.js
)

REM Handle errors
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application exited with an error.
    pause
)