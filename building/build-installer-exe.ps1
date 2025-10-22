# Build Connections Monitor Installer EXE
# This script converts the PowerShell installer to a standalone EXE

$ErrorActionPreference = "Stop"

Write-Host "Installer EXE Building" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Checking for PS2EXE module..." -ForegroundColor Cyan
$ps2exe = Get-Module -ListAvailable -Name PS2EXE

if (-not $ps2exe) {
    Write-Host "  PS2EXE module not found. Installing..." -ForegroundColor Yellow
    try {
        Install-Module -Name PS2EXE -Scope CurrentUser -Force -AllowClobber
        Write-Host "  [OK] PS2EXE installed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERROR] Failed to install PS2EXE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install manually:" -ForegroundColor Yellow
        Write-Host "  Install-Module -Name PS2EXE -Scope CurrentUser" -ForegroundColor White
        Write-Host ""
        exit 1
    }
}
else {
    Write-Host "  [OK] PS2EXE module found" -ForegroundColor Green
}

Import-Module PS2EXE

Write-Host ""
Write-Host "[2/3] Building installer EXE..." -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "install.ps1"
$exePath = Join-Path $PSScriptRoot "ConnectionsMonitor-Installer.exe"

if (-not (Test-Path $scriptPath)) {
    Write-Host "  [ERROR] install.ps1 not found!" -ForegroundColor Red
    exit 1
}

try {
    Invoke-PS2EXE -inputFile $scriptPath `
        -outputFile $exePath `
        -title "Connections Monitor Installer" `
        -description "Connections Monitor Installation Wizard" `
        -company "Connections Monitor" `
        -product "Connections Monitor" `
        -version "1.0.0.0" `
        -noConsole:$false `
        -noError `
        -noOutput `
        -requireAdmin:$false
    
    Write-Host "  [OK] EXE built successfully!" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Failed to build EXE: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/3] Verifying output..." -ForegroundColor Cyan

if (Test-Path $exePath) {
    $fileInfo = Get-Item $exePath
    $sizeInMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host "  [OK] Installer created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  File: $exePath" -ForegroundColor White
    Write-Host "  Size: $sizeInMB MB" -ForegroundColor White
    Write-Host ""
    Write-Host "  Build Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now distribute:" -ForegroundColor Cyan
    Write-Host "  ConnectionsMonitor-Installer.exe" -ForegroundColor White
    Write-Host ""
    Write-Host "Users just double-click it to install!" -ForegroundColor Cyan
}
else {
    Write-Host "  [ERROR] EXE file not found after build" -ForegroundColor Red
    exit 1
}