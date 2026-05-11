param(
    [string[]]$Models = @("base.en")
)

# Downloads default Whisper models (ggml format) into the user's app-data folder.
# The app itself can also download models on-demand; this script is a convenience
# for first-time setup so you don't wait at startup.
$ErrorActionPreference = "Stop"

$appData = Join-Path $env:APPDATA "com.audiotranscribe.app\models"
New-Item -ItemType Directory -Force -Path $appData | Out-Null

foreach ($model in $Models) {
    $fileName = "ggml-$model.bin"
    $dest = Join-Path $appData $fileName
    if (Test-Path $dest) {
        Write-Host "$fileName already present, skipping" -ForegroundColor DarkGray
        continue
    }
    $url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$fileName"
    Write-Host "Downloading $fileName ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Write-Host "Saved to $dest" -ForegroundColor Green
}

Write-Host "`nDone. Available models in $appData :" -ForegroundColor Green
Get-ChildItem $appData -Filter "ggml-*.bin" | Select-Object Name, @{Name="MB"; Expression={[math]::Round($_.Length / 1MB, 1)}}
