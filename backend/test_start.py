"""Quick test to see if backend can start"""
import sys, os, traceback
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Set env vars from .env
os.environ["JWT_SECRET_KEY"] = "j5muxmkyevvbx4chbowhx3iqd85ranxgdjae6n38gcqx6es5246di2lnel3re59z"
os.environ["DATABASE_URL"] = "sqlite:///./teamhub.db"
os.environ["ALLOW_SEED"] = "false"

with open("_startup_result.txt", "w") as f:
    try:
        import main
        f.write(f"Import OK: app={type(main.app).__name__}\n")
        import uvicorn
        f.write("Starting uvicorn...\n")
        uvicorn.run(main.app, host="0.0.0.0", port=8000, log_level="info")
    except Exception as e:
        f.write(f"ERROR: {e}\n{traceback.format_exc()}\n")
