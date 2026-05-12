"""Task routes"""
from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import Announcement, User, UserTask, get_db
from schemas import UserTaskOut

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_user_tasks(status: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(UserTask).filter(UserTask.user_id == current_user.id)
    if status:
        q = q.filter(UserTask.status == status)
    q = q.order_by(UserTask.created_at.desc())
    tasks = q.all()
    return [UserTaskOut.model_validate(t) for t in tasks]


@router.post("")
def create_user_task(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    title = req.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if len(title) > 100:
        title = title[:100]
    source_announcement_id = req.get("source_announcement_id")
    source_quote = req.get("source_quote", "")
    if source_announcement_id:
        a = db.query(Announcement).filter(Announcement.id == source_announcement_id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="No permission")
    if source_announcement_id and source_quote:
        existing = db.query(UserTask).filter(
            UserTask.user_id == current_user.id,
            UserTask.source_announcement_id == source_announcement_id,
            UserTask.source_quote == source_quote,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Task already exists for this quote")
    due_date_str = req.get("due_date")
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
        except ValueError:
            pass
    task = UserTask(
        user_id=current_user.id, title=title, description=req.get("description", ""),
        source_announcement_id=source_announcement_id, source_quote=source_quote,
        due_date=due_date, priority=req.get("priority", "medium"), status="todo",
    )
    db.add(task)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(task)
    return UserTaskOut.model_validate(task)


@router.put("/{task_id}")
def update_user_task(task_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(UserTask).filter(UserTask.id == task_id, UserTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    allowed = {"title", "description", "due_date", "priority", "status"}
    for key, value in req.items():
        if key in allowed:
            if key == "due_date" and value:
                try:
                    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                except ValueError:
                    continue
            setattr(task, key, value)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(task)
    return UserTaskOut.model_validate(task)


@router.delete("/{task_id}")
def delete_user_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(UserTask).filter(UserTask.id == task_id, UserTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(task)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}
