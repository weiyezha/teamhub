"""Admin routes"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_admin
from database import (
    ActivityLog, Announcement, Comment, User, get_db,
)
from schemas import UserOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def admin_users(page: int = 1, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    limit = min(max(limit, 1), 200)
    offset = (page - 1) * limit
    total = db.query(User).count()
    users = db.query(User).order_by(User.id).offset(offset).limit(limit).all()
    return {"total": total, "page": page, "limit": limit, "items": [UserOut.model_validate(u) for u in users]}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.add(ActivityLog(
        user_id=current_user.id, action="delete_user",
        target_type="user", target_id=user_id,
        meta_data={"deleted_name": user.name, "deleted_role": user.role},
    ))
    db.delete(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}


@router.get("/export/announcements")
def export_announcements(format: str = "json", page: int = 1, limit: int = 1000, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db.add(ActivityLog(
        user_id=current_user.id, action="export_announcements",
        target_type="system", target_id=0,
        meta_data={"format": format, "page": page, "limit": limit},
    ))
    db.commit()
    limit = min(max(limit, 1), 1000)
    offset = (page - 1) * limit
    items = db.query(Announcement).options(joinedload(Announcement.author)).order_by(Announcement.id).offset(offset).limit(limit).all()
    if format == "csv":
        from fastapi.responses import PlainTextResponse
        import csv, io
        output = io.StringIO()
        w = csv.writer(output)
        w.writerow(["ID", "标题", "类别", "状态", "作者", "阅读量", "创建时间"])
        for a in items:
            def _escape_csv(val):
                s = str(val) if val is not None else ""
                if s and s[0] in ('=', '+', '-', '@'):
                    s = "'" + s
                return s
            w.writerow([
                a.id,
                _escape_csv(a.title),
                _escape_csv(a.category),
                _escape_csv(a.status),
                _escape_csv(a.author.name if a.author else ""),
                a.view_count,
                a.created_at.isoformat() if a.created_at else "",
            ])
        return PlainTextResponse(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=announcements.csv"})
    results = []
    for a in items:
        results.append({"id": a.id, "title": a.title, "content": a.content, "category": a.category,
            "status": a.status, "author_name": a.author.name if a.author else "",
            "view_count": a.view_count, "created_at": a.created_at.isoformat() if a.created_at else None})
    return results


@router.get("/export/users")
def export_users(page: int = 1, limit: int = 1000, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db.add(ActivityLog(
        user_id=current_user.id, action="export_users",
        target_type="system", target_id=0,
        meta_data={"page": page, "limit": limit},
    ))
    db.commit()
    limit = min(max(limit, 1), 1000)
    offset = (page - 1) * limit
    items = db.query(User).order_by(User.id).offset(offset).limit(limit).all()
    return [{
        "id": u.id, "username": u.username, "name": u.name, "role": u.role,
        "department": u.department, "title": u.title, "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in items]


@router.post("/clear-logs")
def clear_logs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    count = db.query(ActivityLog).count()
    db.add(ActivityLog(
        user_id=current_user.id, action="clear_logs",
        target_type="system", target_id=0,
        meta_data={"cleared_count": count},
    ))
    db.query(ActivityLog).delete()
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True, "cleared_count": count}


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    total_users = db.query(User).count()
    total_announcements = db.query(Announcement).count()
    total_comments = db.query(Comment).count()
    pending_users = db.query(User).filter(User.is_active == False).count()
    roles = {}
    for role in ["admin", "manager", "member", "guest"]:
        roles[role] = db.query(User).filter(User.role == role).count()
    return {
        "total_users": total_users, "total_announcements": total_announcements,
        "total_comments": total_comments, "roles": roles, "pending_users": pending_users,
    }


@router.get("/activity")
def admin_activity(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit).all()
    results = []
    for log_entry in logs:
        user = db.query(User).filter(User.id == log_entry.user_id).first()
        results.append({
            "id": log_entry.id, "user_name": user.name if user else "Unknown",
            "action": log_entry.action, "target_type": log_entry.target_type,
            "target_id": log_entry.target_id, "meta_data": log_entry.meta_data,
            "created_at": log_entry.created_at,
        })
    return results


# User permission overrides
@router.get("/users/{user_id}/permissions")
def get_user_permissions(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user_id": user_id, "permissions": user.permissions or {}}


@router.put("/users/{user_id}/permissions")
def set_user_permissions(user_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_perms = dict(user.permissions or {})
    user.permissions = req.get("permissions", {})
    db.add(ActivityLog(
        user_id=current_user.id, action="set_permissions",
        target_type="user", target_id=user_id,
        meta_data={"old": old_perms, "new": user.permissions},
    ))
    db.commit()
    return {"user_id": user_id, "permissions": user.permissions}
