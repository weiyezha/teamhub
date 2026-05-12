"""POST /api/auth/register, /api/auth/login, GET /api/auth/me"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    create_reset_token,
    get_current_user,
    get_password_hash,
    verify_password,
    verify_reset_token,
)
from database import User, get_db, get_setting, utc_now
from rate_limit import check_rate_limit, record_failure, record_success
from schemas import ForgotPasswordReq, LoginReq, RegisterReq, ResetPasswordReq, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    open_reg = get_setting(db, "open_registration", True)
    if not open_reg:
        raise HTTPException(status_code=403, detail="Registration is currently closed")
    username = req.name
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=username,
        name=req.name,
        phone=req.phone.strip() if req.phone else "",
        hashed_password=get_password_hash(req.password),
        role="member",
        is_active=False,
    )
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(user)
    return {"message": "注册成功，等待管理员审批", "username": username}


@router.post("/login")
def login(req: LoginReq, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    allowed, msg = check_rate_limit(client_ip, req.username, db)
    if not allowed:
        raise HTTPException(status_code=429, detail=msg)

    user = db.query(User).filter((User.username == req.username) | (User.name == req.username)).first()
    # 防止用户枚举：无论用户不存在/密码错误/未激活，返回相同的错误信息
    if not user or not verify_password(req.password, user.hashed_password) or not user.is_active:
        record_failure(client_ip, req.username, db)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.last_seen_at = utc_now()
    record_success(client_ip, req.username, db)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    token = create_access_token({"sub": str(user.id)})
    return {"token": token, "user": UserOut.model_validate(user)}


@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from permissions import get_allowed_modules
    result = UserOut.model_validate(current_user)
    allowed = get_allowed_modules(db, current_user)
    return {"user": result, "allowed_modules": allowed}


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == req.username) | (User.name == req.username)
    ).first()
    # 无论用户是否存在，返回相同响应，防止用户枚举
    if not user or not user.phone or user.phone != req.phone.strip():
        return {"message": "If the account exists and phone matches, a reset token has been sent."}
    token = create_reset_token(user.id)
    return {"token": token}


@router.post("/reset-password")
def reset_password(req: ResetPasswordReq, db: Session = Depends(get_db)):
    user_id = verify_reset_token(req.token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(req.new_password)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": "Password reset successfully"}
