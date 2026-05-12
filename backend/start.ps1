$env:JWT_SECRET_KEY = "your-secret-key-here"
$env:CORS_ORIGINS = "http://localhost:5173,http://localhost:3000"
$env:DATABASE_URL = "sqlite:///./teamhub.db"
& .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload