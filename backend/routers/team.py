"""Team + user profile routes"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_password_hash, require_admin, require_permission, verify_password
from database import User, get_db
from schemas import UserOut

router = APIRouter(tags=["team"])


@router.get("/api/team", dependencies=[Depends(require_permission("team", "view"))])
def team_list(page: int = 1, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    limit = min(max(limit, 1), 500)
    offset = (page - 1) * limit
    total = db.query(User).filter(User.is_active == True).count()
    users = db.query(User).filter(User.is_active == True).offset(offset).limit(limit).all()
    return {"total": total, "page": page, "limit": limit, "items": [UserOut.model_validate(u) for u in users]}


@router.put("/api/users/me")
def update_current_user(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    allowed = {"name", "department", "title"}
    for key, value in req.items():
        if key not in allowed:
            continue
        if key == "name":
            value = str(value).strip()
            if not value or len(value) > 50:
                raise HTTPException(status_code=400, detail="Name must be 1-50 characters")
        if key in ("department", "title"):
            value = str(value).strip()
            if len(value) > 50:
                raise HTTPException(status_code=400, detail=f"{key} must be at most 50 characters")
        setattr(current_user, key, value)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return UserOut.model_validate(current_user)


@router.put("/api/users/me/password")
def change_password(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current = req.get("current_password")
    new_pw = req.get("new_password")
    if not current or not new_pw:
        raise HTTPException(status_code=400, detail="Missing password fields")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not verify_password(current, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(new_pw)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"message": "Password changed successfully"}


@router.put("/api/team/{user_id}")
def update_user(user_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = {"name", "role", "department", "title", "is_active"}
    for key, value in req.items():
        if key not in allowed:
            continue
        if key == "name":
            value = str(value).strip()
            if not value or len(value) > 50:
                raise HTTPException(status_code=400, detail="Name must be 1-50 characters")
        if key == "role":
            value = str(value).strip()
            if value not in ("admin", "manager", "member", "guest"):
                raise HTTPException(status_code=400, detail="Invalid role")
            # Only admin can assign admin role
            if value == "admin" and current_user.role != "admin":
                raise HTTPException(status_code=403, detail="Only admin can assign admin role")
        if key in ("department", "title"):
            value = str(value).strip()
            if len(value) > 50:
                raise HTTPException(status_code=400, detail=f"{key} must be at most 50 characters")
        setattr(user, key, value)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return UserOut.model_validate(user)
