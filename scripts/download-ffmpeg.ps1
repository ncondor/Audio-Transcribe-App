# Downloads a static FFmpeg build and places ffmpeg.exe into src-tauri\binaries
# with the triple-suffixed name Tauri's sidecar mechanism expects.
$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$binDir = Join-Path $root "src-tauri\binaries"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$zipUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$tmpZip = Join-Path $env:TEMP "ffmpeg.zip"
$tmpDir = Join-Path $env:TEMP "ffmpeg-extract"

Write-Host "Downloading FFmpeg..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing

Write-Host "Extracting..." -ForegroundColor Cyan
if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir

$ffmpegExe = Get-ChildItem -Path $tmpDir -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
if (-not $ffmpegExe) { throw "ffmpeg.exe not found inside the archive" }

# Tauri sidecar binaries need the target triple appended.
$triple = (rustc -vV | Select-String -Pattern "host: (.*)").Matches[0].Groups[1].Value
$dest = Join-Path $binDir "ffmpeg-$triple.exe"
Copy-Item $ffmpegExe.FullName $dest -Force
Write-Host "FFmpeg installed at $dest" -ForegroundColor Green

Remove-Item $tmpZip -Force
Remove-Item -Recurse -Force $tmpDir
