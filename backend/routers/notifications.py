"""Notification routes"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import Notification, User, get_db
from schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def list_notifications(unread_only: bool = False, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    items = q.order_by(Notification.created_at.desc()).limit(limit).all()
    return [NotificationOut.model_validate(n) for n in items]


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
    return {"success": True}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"success": True}
