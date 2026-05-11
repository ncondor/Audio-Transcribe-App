# One-shot setup for the Audio Transcribe App on Windows.
# Run from the repo root:  .\scripts\setup.ps1
#
# This script assumes prerequisites are already installed:
#   - Rust (rustup)
#   - Node.js 20+
#   - Visual Studio Build Tools 2022 with the "Desktop development with C++" workload
#   - CMake
#   - CUDA Toolkit 12.x  (optional; CPU fallback works without it)
#
# Pass -SkipDev to install everything but not launch the dev server.

param(
    [switch]$SkipDev,
    [string[]]$Models = @("base.en")
)

$ErrorActionPreference = "Stop"

function Assert-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$name' not found in PATH." -ForegroundColor Red
        Write-Host "       $hint" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "=== Audio Transcribe App setup ===" -ForegroundColor Cyan

# 1. Sanity-check prerequisites up front so we fail fast.
Assert-Command "node"  "Install Node.js 20+ from https://nodejs.org"
Assert-Command "npm"   "Comes with Node.js"
Assert-Command "rustc" "Install Rust from https://rustup.rs"
Assert-Command "cargo" "Install Rust from https://rustup.rs"
Assert-Command "cmake" "Install CMake from https://cmake.org/download"

$nodeVer = (node --version).TrimStart("v")
$nodeMajor = [int]($nodeVer.Split(".")[0])
if ($nodeMajor -lt 20) {
    Write-Host "ERROR: Node $nodeVer is too old. Need 20+." -ForegroundColor Red
    exit 1
}

if (-not $env:CUDA_PATH) {
    Write-Host "NOTE: CUDA_PATH is not set. Build will use the CPU backend." -ForegroundColor Yellow
    Write-Host "      For GPU acceleration, install CUDA 12.x and set CUDA_PATH." -ForegroundColor Yellow
}

$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root

# 2. Install JS deps.
Write-Host "`n[1/4] Installing npm dependencies..." -ForegroundColor Cyan
npm install

# 3. Download FFmpeg sidecar.
Write-Host "`n[2/4] Downloading FFmpeg..." -ForegroundColor Cyan
& "$PSScriptRoot\download-ffmpeg.ps1"

# 4. Download Whisper model(s).
Write-Host "`n[3/4] Downloading Whisper model(s): $($Models -join ', ')" -ForegroundColor Cyan
& "$PSScriptRoot\download-models.ps1" -Models $Models

# 5. Launch dev server (unless skipped).
if ($SkipDev) {
    Write-Host "`n[4/4] Skipping dev launch (-SkipDev set)." -ForegroundColor DarkGray
    Write-Host "`nDone. Start the app any time with:" -ForegroundColor Green
    Write-Host "    npm run tauri dev" -ForegroundColor Green
} else {
    Write-Host "`n[4/4] Launching 'npm run tauri dev'..." -ForegroundColor Cyan
    Write-Host "      First build compiles whisper.cpp and may take 10-20 minutes." -ForegroundColor Yellow
    npm run tauri dev
}
