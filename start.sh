#!/bin/bash
cd "C:/Users/le/projects/teamhub"
PYTHONPATH=backend ./backend/venv/Scripts/python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
echo "Backend PID=$!"
cd frontend && npm run dev &
echo "Frontend PID=$!"
wait
