"""
TeamHub API v2.0 - Main application entry point
"""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from auth import get_password_hash
from database import (
    Announcement, Base, User, engine, get_db, utc_now,
)
from routers.announcements import router as announcements_router
from routers.auth_router import router as auth_router
from routers.comments import router as comments_router
from routers.dashboard import router as dashboard_router
from routers.reactions import router as reactions_router
from routers.tasks import router as tasks_router
from routers.team import router as team_router
from routers.admin import router as admin_router
from routers.settings_router import router as settings_router
from routers.upload import router as upload_router
from routers.downloads import router as downloads_router
from routers.push import router as push_router
from routers.permissions import router as permissions_router
from routers.notifications import router as notifications_router
from routers.search import router as search_router
from routers.documents import router as documents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="TeamHub API", version="2.0.0", lifespan=lifespan)

# CORS: allow local dev + Docker nginx proxy
_origins = os.environ.get("CORS_ORIGINS", "")
if _origins:
    allow_origins = [o.strip() for o in _origins.split(",")]
else:
    allow_origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Register routers
app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(announcements_router)
app.include_router(comments_router)
app.include_router(reactions_router)
app.include_router(tasks_router)
app.include_router(dashboard_router)
app.include_router(team_router)
app.include_router(admin_router)
app.include_router(upload_router)
app.include_router(downloads_router)
app.include_router(push_router)
app.include_router(permissions_router)
app.include_router(notifications_router)
app.include_router(search_router)
app.include_router(documents_router)

# Health check endpoint (used by Docker HEALTHCHECK and load balancers)
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}


# Categories endpoint
CATEGORIES = ["打款", "推广", "合同", "发行", "维权", "审批", "产品"]


@app.get("/api/categories")
def get_categories():
    return CATEGORIES


# Seed endpoint (idempotent) — disabled by default in production
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    import secrets
    if os.environ.get("ALLOW_SEED", "").lower() != "true":
        raise HTTPException(status_code=403, detail="Seed is disabled. Set ALLOW_SEED=true to enable.")
    if db.query(User).count() > 0:
        return {"message": "Already seeded"}
    import secrets, string
    admin_pw = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    admin = User(
        username="管理员", name="管理员",
        hashed_password=get_password_hash(admin_pw),
        role="admin", department="运营", title="系统管理员", is_active=True,
    )
    db.add(admin)
    demo_pw = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
    demo_user = User(
        username="测试成员", name="测试成员",
        hashed_password=get_password_hash(demo_pw),
        role="member", department="推广", title="推广专员", is_active=True,
    )
    db.add(demo_user)
    db.commit()
    import logging
    logging.getLogger("teamhub.seed").warning(f"SEED ADMIN PASSWORD: {admin_pw}")
    logging.getLogger("teamhub.seed").warning(f"SEED DEMO PASSWORD: {demo_pw}")
    demo_data = [
        {"title": "3月推广费用结算通知", "category": "打款", "content": "本月推广费用将于3月15日统一结算，请各团队负责人核对数据。", "is_pinned": True},
        {"title": "Q2 产品发行计划", "category": "发行", "content": "Q2季度计划发行5首新歌，请各团队配合准备宣发物料。", "is_pinned": True},
        {"title": "维权案件进展汇报", "category": "维权", "content": "本月已处理12起侵权案件，其中8起已下架，4起正在跟进中。", "is_pinned": False},
        {"title": "新合同模板更新", "category": "合同", "content": "法务部门更新了艺人签约合同模板，请下载使用最新版本。", "is_pinned": False},
        {"title": "推广渠道审批流程优化", "category": "审批", "content": "为提高效率，推广渠道审批改为线上提交。", "is_pinned": False},
        {"title": "产品功能需求收集", "category": "产品", "content": "请各团队提交Q2产品功能需求，产品部将在月底进行评审。", "is_pinned": False},
        {"title": "4月推广排期表", "category": "推广", "content": "4月推广排期已确定，详见附件。", "is_pinned": False},
    ]
    for d in demo_data:
        db.add(Announcement(title=d["title"], content=d["content"], category=d["category"],
                            is_pinned=d["is_pinned"], author_id=admin.id))
    db.commit()
    return {"message": "Seed data created"}


# Production: serve frontend static files
# In dev mode, use Vite dev server (http://localhost:5173) instead
if os.environ.get("SERVE_STATIC"):
    app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
