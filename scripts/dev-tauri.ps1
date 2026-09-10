# PowerShell Development Script for Chronicle Tauri Desktop Application
$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Chronicle • Starting Tauri Desktop Dev Server        " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Ensure Cargo / Rust is in PATH
$CargoBin = "$env:USERPROFILE\.cargo\bin"
if (Test-Path $CargoBin) {
    if ($env:PATH -notlike "*$CargoBin*") {
        $env:PATH = "$CargoBin;$env:PATH"
    }
}

npx @tauri-apps/cli dev
