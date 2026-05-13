"""Dashboard routes"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_permission
from database import (
    ActivityLog, Announcement, User, UserTask, get_db, get_setting, utc_now,
)
from schemas import AnnouncementOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def _visibility_filter(q, current_user: User):
    """Filter out manager_only announcements for non-admin/manager users."""
    if current_user.role not in ("admin", "manager"):
        q = q.filter(Announcement.visibility == "public")
    return q


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard", "view"))):
    week_ago = utc_now() - timedelta(days=7)
    active_users = db.query(User).filter(User.last_seen_at >= week_ago).count()
    total_users = db.query(User).filter(User.is_active == True).count()
    categories = get_setting(db, "announcement_categories", ["打款", "推广", "合同", "发行", "维权", "审批", "产品"])
    category_counts = {}
    for cat in categories:
        q = db.query(Announcement).filter(Announcement.category == cat, Announcement.status == "active")
        q = _visibility_filter(q, current_user)
        category_counts[cat] = q.count()
    recent = (
        _visibility_filter(
            db.query(Announcement)
            .options(joinedload(Announcement.author))
            .filter(Announcement.status == "active"),
            current_user
        )
        .order_by(desc(Announcement.created_at))
        .limit(5)
        .all()
    )
    recent_items = []
    for a in recent:
        out = AnnouncementOut.model_validate(a)
        out.author_name = a.author.name if a.author else ""
        recent_items.append(out)
    pending_approvals = _visibility_filter(
        db.query(Announcement).filter(Announcement.approval_status == "pending"),
        current_user
    ).count()
    activity = []
    for i in range(6, -1, -1):
        day = utc_now() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(ActivityLog).filter(ActivityLog.created_at >= day_start, ActivityLog.created_at < day_end).count()
        activity.append({"date": day_start.strftime("%m-%d"), "count": count})
    return {
        "active_users": active_users, "total_users": total_users,
        "category_counts": category_counts, "recent_announcements": recent_items,
        "pending_approvals": pending_approvals, "activity_trend": activity,
    }


@router.get("/ticker")
def dashboard_ticker(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard", "view"))):
    items = (
        _visibility_filter(
            db.query(Announcement).filter(Announcement.status == "active"),
            current_user
        )
        .order_by(desc(Announcement.created_at))
        .limit(10)
        .all()
    )
    return [{"id": a.id, "title": a.title, "category": a.category, "created_at": a.created_at} for a in items]


@router.get("/urgent")
def dashboard_urgent(db: Session = Depends(get_db), current_user: User = Depends(require_permission("dashboard", "view"))):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    urgent = (
        _visibility_filter(
            db.query(Announcement)
            .filter(
                Announcement.level == "urgent",
                Announcement.status == "active",
                or_(Announcement.expires_at == None, Announcement.expires_at > now),
            ),
            current_user
        )
        .order_by(desc(Announcement.created_at))
        .limit(5)
        .all()
    )
    latest = (
        _visibility_filter(
            db.query(Announcement).filter(Announcement.status == "active"),
            current_user
        )
        .order_by(desc(Announcement.created_at))
        .limit(5)
        .all()
    )
    # User's pending tasks
    task_count = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.status != "done"
    ).count()
    return {
        "urgent": [{"id": a.id, "title": a.title, "category": a.category, "level": a.level, "created_at": a.created_at.isoformat()} for a in urgent],
        "latest": [{"id": a.id, "title": a.title, "category": a.category, "level": a.level, "created_at": a.created_at.isoformat()} for a in latest],
        "pending_tasks": task_count,
    }
