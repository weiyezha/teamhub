@echo off
chcp 65001 >nul
cd /d "%~dp0"
:: Start uvicorn with reload, excluding venv directory to avoid WinError 1450
venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-exclude "venv" --reload-exclude "__pycache__" --reload-exclude "*.pyc"
