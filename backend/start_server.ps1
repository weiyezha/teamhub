# Start TeamHub Backend Server
# Requires: Python venv with uvicorn/fastapi installed
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot "venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "Virtual environment not found at venv\Scripts\python.exe"
    exit 1
}

Write-Host "Starting TeamHub API server..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:8000" -ForegroundColor Green
Write-Host "Docs: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

& $venvPython -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload `
    --reload-exclude "venv" `
    --reload-exclude "__pycache__" `
    --reload-exclude "*.pyc"
