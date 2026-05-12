@echo off
set JWT_SECRET_KEY=j5muxmkyevvbx4chbowhx3iqd85ranxgdjae6n38gcqx6es5246di2lnel3re59z
set DATABASE_URL=sqlite:///C:/Users/le/projects/teamhub/backend/teamhub.db
cd /d "C:\Users\le\projects\teamhub\backend"
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
