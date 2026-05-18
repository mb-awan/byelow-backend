# Start Byelow AI Services (port 8000)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment..."
    python -m venv venv
}

Write-Host "Installing / verifying dependencies..."
& .\venv\Scripts\pip.exe install -r requirements.txt -q
& .\venv\Scripts\pip.exe install --force-reinstall pydantic-core lxml -q

Write-Host "Starting AI service on http://localhost:8000 ..."
& .\venv\Scripts\uvicorn.exe main:app --reload --host 0.0.0.0 --port 8000
