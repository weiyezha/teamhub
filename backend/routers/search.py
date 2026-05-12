"""Enhanced global search with date range and author filtering"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import Announcement, Comment, User, UserTask, get_db
from schemas import SearchResult


def _check_announcement_visibility(a: Announcement, current_user: User):
    if a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def global_search(
    q: str = "",
    type: str = "all",
    date_from: str = None,
    date_to: str = None,
    author: str = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not q and not date_from and not author:
        return {"results": []}
    results = []

    # Build date filter
    try:
        dt_from = datetime.fromisoformat(date_from) if date_from else None
        dt_to = datetime.fromisoformat(date_to) if date_to else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00).")

    # Author filter - find user by name
    author_id = None
    if author:
        u = db.query(User).filter(User.name.contains(author)).first()
        if u: author_id = u.id

    if type in ("all", "announcements"):
        aq = db.query(Announcement)
        if q: aq = aq.filter(or_(Announcement.title.contains(q), Announcement.content.contains(q)))
        if dt_from: aq = aq.filter(Announcement.created_at >= dt_from)
        if dt_to: aq = aq.filter(Announcement.created_at <= dt_to)
        if author_id: aq = aq.filter(Announcement.author_id == author_id)
        if current_user.role not in ("admin", "manager"):
            aq = aq.filter(Announcement.visibility == "public")
        items = aq.order_by(Announcement.created_at.desc()).limit(limit).all()
        for a in items:
            results.append(SearchResult(type="announcement", id=a.id, title=a.title,
                         snippet=a.content[:120] if a.content else "", link=f"/announcements/{a.id}"))

    if type in ("all", "tasks"):
        tq = db.query(UserTask)
        if q: tq = tq.filter(UserTask.title.contains(q))
        tq = tq.filter(UserTask.user_id == current_user.id)
        if dt_from: tq = tq.filter(UserTask.created_at >= dt_from)
        items = tq.order_by(UserTask.created_at.desc()).limit(limit).all()
        for t in items:
            results.append(SearchResult(type="task", id=t.id, title=t.title,
                         snippet=t.description[:120] or "", link=f"/tasks"))

    if type in ("all", "comments"):
        cq = db.query(Comment)
        if q: cq = cq.filter(Comment.content.contains(q))
        if dt_from: cq = cq.filter(Comment.created_at >= dt_from)
        if author_id: cq = cq.filter(Comment.author_id == author_id)
        items = cq.order_by(Comment.created_at.desc()).limit(limit).all()
        for c in items:
            # Filter out comments on manager_only announcements for non-admin/manager
            if c.target_type == "announcement":
                a = db.query(Announcement).filter(Announcement.id == c.target_id).first()
                if a and a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
                    continue
            results.append(SearchResult(type="comment", id=c.id, title=c.content[:80],
                         snippet=c.content[:120], link=f"/announcements/{c.target_id}"))

    return {"results": [r.model_dump() for r in results[:limit]]}
