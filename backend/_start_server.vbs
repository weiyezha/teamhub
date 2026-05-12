Set WshShell = CreateObject("WScript.Shell")
WshShell.Environment("Process")("JWT_SECRET_KEY") = "j5muxmkyevvbx4chbowhx3iqd85ranxgdjae6n38gcqx6es5246di2lnel3re59z"
WshShell.Environment("Process")("DATABASE_URL") = "sqlite:///C:/Users/le/projects/teamhub/backend/teamhub.db"
WshShell.CurrentDirectory = "C:\Users\le\projects\teamhub\backend"
WshShell.Run "venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000", 0, False
