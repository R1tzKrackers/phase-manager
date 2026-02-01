# Phase Manager Setup Script (Windows PowerShell)
# Usage: Invoke-WebRequest -Uri "https://raw.githubusercontent.com/R1tzKrackers/phase-manager/main/setup.ps1" -OutFile setup.ps1; .\setup.ps1

$ErrorActionPreference = "Stop"
$PM_URL = "https://github.com/R1tzKrackers/phase-manager/archive/refs/heads/main.zip"

Write-Host ""
Write-Host "========================================"
Write-Host "  Phase Manager Setup"
Write-Host "========================================"
Write-Host ""

# Check if already setup
if (Test-Path ".phase-manager") {
    Write-Host "[!] .phase-manager already exists. Aborting." -ForegroundColor Yellow
    exit 1
}

# Download and extract Phase Manager
Write-Host "[1/4] Downloading Phase Manager..."
$ZipFile = Join-Path $env:TEMP "phase-manager-$(Get-Random).zip"
Invoke-WebRequest -Uri $PM_URL -OutFile $ZipFile

Write-Host "[2/4] Extracting..."
$ExtractDir = Join-Path $env:TEMP "phase-manager-extract-$(Get-Random)"
Expand-Archive -Path $ZipFile -DestinationPath $ExtractDir

Write-Host "[3/4] Installing..."
Move-Item -Path "$ExtractDir\phase-manager-main" -Destination ".phase-manager"

# Cleanup
Remove-Item -Path $ZipFile -Force
Remove-Item -Path $ExtractDir -Recurse -Force
Remove-Item -Path ".phase-manager\setup.ps1", ".phase-manager\setup.sh", ".phase-manager\README.md" -Force -ErrorAction SilentlyContinue

# Create project-config.yml template
Write-Host "[4/4] Creating configuration files..."
@"
# Project Configuration
# This file is used by Phase Manager to configure your project

project:
  name: ""
  description: ""

directories:
  ux_spec: docs/ux
  detail_spec: docs/detail
  impl: src
  test: tests

roles:
  design: Designer
  impl: Developer
  setup: SetupAgent

# Framework configuration (set by AI during Framework Initialize phase)
framework:
  id: ""
  repo_url: ""
  version: ""
"@ | Out-File -FilePath "project-config.yml" -Encoding utf8

# Create empty history file
"" | Out-File -FilePath ".phase-manager-history.yml" -Encoding utf8

# Create startup script
@'
# Phase Manager Startup Script
$ErrorActionPreference = "Stop"
$PMRoot = Join-Path $PSScriptRoot ".phase-manager"
$ToolsDir = Join-Path $PMRoot "tools"

Write-Host ""
Write-Host "========================================"
Write-Host "  Phase Manager - Starting..."
Write-Host "========================================"
Write-Host ""

if (-not (Test-Path $PMRoot)) {
    Write-Host "[!] .phase-manager not found. Run setup first." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Node.js is required." -ForegroundColor Red
    exit 1
}

$NodeModules = Join-Path $ToolsDir "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "[*] Installing dependencies..."
    Push-Location $ToolsDir
    npm install
    Pop-Location
}

Write-Host "[*] Starting server..."
Push-Location $ToolsDir
node server.js
Pop-Location
'@ | Out-File -FilePath "phase-manager.ps1" -Encoding utf8

Write-Host ""
Write-Host "========================================"
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: .\phase-manager.ps1"
Write-Host "  2. Follow the Framework Initialize phase"
Write-Host ""
