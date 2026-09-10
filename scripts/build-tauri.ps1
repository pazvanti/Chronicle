# PowerShell Build Script for Chronicle Tauri Desktop Application
param (
    [switch]$Debug = $false,
    [switch]$CopyToDocs = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   Chronicle • Building Native Tauri Desktop App        " -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Ensure Cargo / Rust is in PATH
$CargoBin = "$env:USERPROFILE\.cargo\bin"
if (Test-Path $CargoBin) {
    if ($env:PATH -notlike "*$CargoBin*") {
        Write-Host "Adding Cargo to PATH: $CargoBin" -ForegroundColor Gray
        $env:PATH = "$CargoBin;$env:PATH"
    }
}

try {
    $cargoVersion = & cargo --version
    Write-Host "Found Rust/Cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Rust/Cargo was not found in PATH." -ForegroundColor Red
    Write-Host "Please ensure Rust is installed from https://rustup.rs" -ForegroundColor Yellow
    exit 1
}

# 2. Build Tauri Desktop Binary & Bundles (automatically builds frontend via beforeBuildCommand)
Write-Host "`n[1/2] Compiling Tauri Rust Desktop Binary & Packaging..." -ForegroundColor Yellow
if ($Debug) {
    Write-Host "Running in debug mode..." -ForegroundColor Gray
    npx @tauri-apps/cli build --debug
} else {
    npx @tauri-apps/cli build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Tauri desktop build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Success Summary & Copy to docs/downloads
Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   Chronicle Desktop App Build Succeeded!              " -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green

$targetMode = if ($Debug) { "debug" } else { "release" }
$targetDir = Join-Path $PSScriptRoot "..\src-tauri\target\$targetMode"
$bundleDir = Join-Path $targetDir "bundle"

if ($CopyToDocs) {
    $downloadsDir = Join-Path $PSScriptRoot "..\docs\downloads"

    if (-not (Test-Path $downloadsDir)) {
        New-Item -ItemType Directory -Path $downloadsDir -Force | Out-Null
    }

    $copiedFiles = @()

    if (Test-Path $targetDir) {
        if (Test-Path $bundleDir) {
            Write-Host "Gathering bundles from: $bundleDir" -ForegroundColor Gray
            Get-ChildItem -Path $bundleDir -Recurse -Include *.msi, *.exe, *.zip | ForEach-Object {
                $dest = Join-Path $downloadsDir $_.Name
                Copy-Item -Path $_.FullName -Destination $dest -Force
                $bundleSizeMB = [math]::Round($_.Length / 1MB, 2)
                $copiedFiles += @{ Name = $_.Name; SizeMB = $bundleSizeMB; Type = "bundle" }
                Write-Host "  -> Copied: $($_.Name) ($bundleSizeMB MB)" -ForegroundColor Green

                # Convenience Aliases
                if ($_.Name -like "*setup*.exe") {
                    $alias = Join-Path $downloadsDir "Chronicle-Setup.exe"
                    Copy-Item -Path $_.FullName -Destination $alias -Force
                    $copiedFiles += @{ Name = "Chronicle-Setup.exe"; SizeMB = $bundleSizeMB; Type = "alias" }
                    Write-Host "  -> Created Alias: Chronicle-Setup.exe" -ForegroundColor Cyan
                }
                if ($_.Name -like "*.msi") {
                    $alias = Join-Path $downloadsDir "Chronicle-Setup.msi"
                    Copy-Item -Path $_.FullName -Destination $alias -Force
                    $copiedFiles += @{ Name = "Chronicle-Setup.msi"; SizeMB = $bundleSizeMB; Type = "alias" }
                    Write-Host "  -> Created Alias: Chronicle-Setup.msi" -ForegroundColor Cyan
                }
            }
        }

        $standaloneExe = Join-Path $targetDir "Chronicle.exe"
        if (Test-Path $standaloneExe) {
            $dest = Join-Path $downloadsDir "Chronicle-Standalone.exe"
            Copy-Item -Path $standaloneExe -Destination $dest -Force
            $exeItem = Get-Item $standaloneExe
            $sizeMB = [math]::Round($exeItem.Length / 1MB, 2)
            $copiedFiles += @{ Name = "Chronicle-Standalone.exe"; SizeMB = $sizeMB; Type = "standalone" }
            Write-Host "  -> Copied Standalone: Chronicle-Standalone.exe ($sizeMB MB)" -ForegroundColor Green
        }
    }

    Write-Host "`nAll distributables successfully copied to:" -ForegroundColor Cyan
    Write-Host " -> $downloadsDir`n" -ForegroundColor White
} else {
    Write-Host "Target output directory: $targetDir" -ForegroundColor Gray
    if (Test-Path $bundleDir) {
        Write-Host "Bundles directory:       $bundleDir" -ForegroundColor Gray
    }
    Write-Host "`nNote: Distributables were not copied to docs/downloads/." -ForegroundColor Yellow
    Write-Host "Run with -CopyToDocs or use 'npm run build:docs:all' to copy for GitHub Pages.`n" -ForegroundColor Gray
}

