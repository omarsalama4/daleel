$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $backendRoot -Parent
Set-Location -LiteralPath $repoRoot
if (-not (Test-Path -LiteralPath 'backend/.venv/Scripts/python.exe')) {
    py -3.13 -m venv backend/.venv
    & backend/.venv/Scripts/python.exe -m pip install -e 'backend[dev]'
}
& backend/.venv/Scripts/python.exe backend/scripts/configure-local.py
& backend/.venv/Scripts/python.exe -m uvicorn daleel.main:app --host 127.0.0.1 --port 8000 --no-access-log
