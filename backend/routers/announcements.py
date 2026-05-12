"""Announcement routes: CRUD, bulk, links, versions, readers"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session, joinedload

import nh3

from auth import get_current_user, require_admin, require_permission
from database import (
    ActivityLog, Announcement, AnnouncementLink, AnnouncementRead,
    AnnouncementVersion, Comment, User, get_db, get_setting, utc_now,
)
from helpers import (
    _build_announcement_out, _build_reaction_summary,
    _extract_keywords, _generate_summary,
)
from schemas import (
    AnnouncementCreate, AnnouncementLinkOut, AnnouncementOut,
    AnnouncementUpdate, UserOut,
)

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


# --- Helpers ---
def _check_announcement_visibility(a: Announcement, current_user: User):
    """Block non-admin/manager users from accessing manager_only announcements."""
    if a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")


def _smart_sort_score(a: Announcement, current_user: User, db: Session) -> float:
    now = utc_now()
    days_ago = (now - a.created_at).total_seconds() / 86400
    score = 0.0
    if a.is_pinned:
        score += 1000
    score += max(0, 1 - days_ago / 30) * 500
    read = (
        db.query(AnnouncementRead)
        .filter(AnnouncementRead.announcement_id == a.id, AnnouncementRead.user_id == current_user.id)
        .first()
    )
    if not read:
        score += 100
    return score


# --- Routes ---
@router.get("", dependencies=[Depends(require_permission("announcements", "view"))])
def list_announcements(
    category: str = None,
    status: str = None,
    search: str = None,
    sort: str = None,
    unread_only: bool = False,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Announcement).options(joinedload(Announcement.author))
    if category:
        q = q.filter(Announcement.category == category)
    if status:
        q = q.filter(Announcement.status == status)
    else:
        q = q.filter(
            or_(
                Announcement.status != "active",
                Announcement.expires_at == None,
                Announcement.expires_at > datetime.now(timezone.utc),
            )
        )
    if search:
        q = q.filter(Announcement.title.contains(search) | Announcement.content.contains(search))
    if unread_only:
        read_ids = (
            db.query(AnnouncementRead.announcement_id)
            .filter(AnnouncementRead.user_id == current_user.id)
            .subquery()
        )
        q = q.filter(Announcement.id.notin_(read_ids))

    # Visibility filter: non-managers only see public announcements
    if current_user.role not in ("admin", "manager"):
        q = q.filter(Announcement.visibility == "public")

    if sort == "smart":
        all_items = q.all()
        scored = [(a, _smart_sort_score(a, current_user, db)) for a in all_items]
        scored.sort(key=lambda x: x[1], reverse=True)
        total = len(scored)
        items = [a for a, _ in scored[(page - 1) * limit : page * limit]]
    elif sort == "views":
        q = q.order_by(desc(Announcement.view_count))
        total = q.count()
        items = q.offset((page - 1) * limit).limit(limit).all()
    else:
        q = q.order_by(desc(Announcement.is_pinned), desc(Announcement.created_at))
        total = q.count()
        items = q.offset((page - 1) * limit).limit(limit).all()

    results = [_build_announcement_out(a, db, current_user.id) for a in items]
    return {"total": total, "page": page, "items": results}


@router.get("/{announcement_id}", dependencies=[Depends(require_permission("announcements", "view"))])
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = (
        db.query(Announcement)
        .options(joinedload(Announcement.author))
        .filter(Announcement.id == announcement_id)
        .first()
    )
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    _check_announcement_visibility(a, current_user)
    a.view_count += 1
    db.commit()
    existing_read = (
        db.query(AnnouncementRead)
        .filter(AnnouncementRead.announcement_id == announcement_id, AnnouncementRead.user_id == current_user.id)
        .first()
    )
    if not existing_read:
        db.add(AnnouncementRead(announcement_id=announcement_id, user_id=current_user.id))
        db.commit()
    return _build_announcement_out(a, db, current_user.id)


@router.post("", dependencies=[Depends(require_permission("announcements", "publish"))])
def create_announcement(
    req: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_approval = get_setting(db, "require_approval", False)
    approval_status = "pending" if require_approval else "approved"
    pin_limit = get_setting(db, "pin_limit", 3)
    if req.is_pinned:
        pinned_count = db.query(Announcement).filter(Announcement.is_pinned == True, Announcement.status == "active").count()
        if pinned_count >= pin_limit:
            raise HTTPException(status_code=400, detail=f"最多置顶{pin_limit}条公告")

    safe_content = nh3.clean(
        req.content,
        tags={"p", "br", "strong", "em", "b", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "td", "th", "blockquote", "pre", "code", "span", "div"},
        attributes={"a": {"href", "title", "target"}, "img": {"src", "alt", "title"}, "*": {"class", "style"}},
        url_schemes={"http", "https"},
    )
    a = Announcement(
        title=req.title, content=safe_content, content_json=req.content_json,
        category=req.category, level=req.level, visibility=req.visibility,
        is_pinned=req.is_pinned, approval_status=approval_status, author_id=current_user.id,
        images=req.images, attachments=req.attachments, expires_at=req.expires_at,
        summary=_generate_summary(safe_content),
        keywords=_extract_keywords(safe_content, req.title),
    )
    db.add(a)
    db.flush()
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(a)
    db.add(ActivityLog(
        user_id=current_user.id, action="create",
        target_type="announcement", target_id=a.id,
        meta_data={"title": a.title, "category": a.category},
    ))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(a)
    # Only notify if approved (or if approval is not required)
    if a.approval_status != "pending":
        _notify_new_announcement(a, db)
    out = AnnouncementOut.model_validate(a)
    out.author_name = current_user.name
    return out


@router.put("/{announcement_id}", dependencies=[Depends(require_permission("announcements", "publish"))])
def update_announcement(
    announcement_id: int,
    req: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if req.is_pinned:
        pin_limit = get_setting(db, "pin_limit", 3)
        from sqlalchemy import func
        pinned_count = db.query(func.count(Announcement.id)).filter(
            Announcement.is_pinned == True, Announcement.status == "active",
            Announcement.id != announcement_id
        ).scalar()
        if pinned_count >= pin_limit:
            raise HTTPException(status_code=400, detail=f"最多置顶{pin_limit}条公告")

    if req.content is not None:
        req.content = nh3.clean(
            req.content,
            tags={"p", "br", "strong", "em", "b", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "td", "th", "blockquote", "pre", "code", "span", "div"},
            attributes={"a": {"href", "title", "target"}, "img": {"src", "alt", "title"}, "*": {"class", "style"}},
            url_schemes={"http", "https"},
        )
    if req.content is not None or req.content_json is not None:
        db.add(AnnouncementVersion(
            announcement_id=a.id, content=a.content,
            content_json=a.content_json, editor_id=current_user.id,
        ))
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(a, field, value)
    a.updated_at = utc_now()
    if req.content is not None or req.title is not None:
        a.summary = _generate_summary(a.content)
        a.keywords = _extract_keywords(a.content, a.title)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(a)
    out = AnnouncementOut.model_validate(a)
    out.author_name = a.author.name if a.author else ""
    return out


@router.get("/{announcement_id}/versions", dependencies=[Depends(require_permission("announcements", "view"))])
def list_versions(announcement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    _check_announcement_visibility(a, current_user)
    if a.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    versions = db.query(AnnouncementVersion).filter(
        AnnouncementVersion.announcement_id == announcement_id
    ).order_by(AnnouncementVersion.created_at.desc()).all()
    editor_ids = {v.editor_id for v in versions}
    editors = {u.id: u.name for u in db.query(User).filter(User.id.in_(editor_ids)).all()} if editor_ids else {}
    results = []
    for v in versions:
        results.append({
            "id": v.id, "content": v.content, "content_json": v.content_json,
            "editor_name": editors.get(v.editor_id, ""), "created_at": v.created_at,
        })
    return results


@router.delete("/{announcement_id}")
def delete_announcement(announcement_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("announcements", "delete"))):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if a.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    db.delete(a)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}


@router.post("/bulk", dependencies=[Depends(require_permission("announcements", "publish"))])
def bulk_update_announcements(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ids = req.get("ids", [])
    action = req.get("action")
    payload = req.get("payload", {})
    if not ids or not action:
        raise HTTPException(status_code=400, detail="Missing ids or action")
    announcements = db.query(Announcement).filter(Announcement.id.in_(ids)).all()
    if len(announcements) != len(ids):
        raise HTTPException(status_code=404, detail="Some announcements not found")
    success_count = 0
    skip_count = 0
    for a in announcements:
        can_modify = a.author_id == current_user.id or current_user.role in ("admin", "manager")
        if action == "delete" and current_user.role not in ("admin", "manager"):
            skip_count += 1; continue
        if not can_modify:
            skip_count += 1; continue
        if action == "pin": a.is_pinned = True
        elif action == "unpin": a.is_pinned = False
        elif action == "set_category": a.category = payload.get("category", a.category)
        elif action == "archive": a.status = "archived"; a.is_pinned = False
        elif action == "approve": a.approval_status = "approved"
        elif action == "reject": a.approval_status = "rejected"; a.status = "archived"
        elif action == "delete": db.delete(a)
        else: raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
        success_count += 1
    db.commit()
    return {"success_count": success_count, "skip_count": skip_count}


@router.put("/{announcement_id}/approve")
def approve_announcement(announcement_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    status = req.get("approval_status", "approved")
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid approval status")
    a.approval_status = status
    if status == "rejected":
        a.status = "archived"
    db.add(ActivityLog(user_id=current_user.id, action="approve" if status == "approved" else "reject",
                       target_type="announcement", target_id=a.id,
                       meta_data={"title": a.title, "approval_status": status}))
    db.commit()
    out = AnnouncementOut.model_validate(a)
    out.author_name = a.author.name if a.author else ""
    return out


@router.post("/archive-expired")
def archive_expired(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    expired = db.query(Announcement).filter(
        Announcement.status == "active", Announcement.expires_at != None, Announcement.expires_at < now
    ).all()
    count = 0
    for a in expired:
        a.status = "archived"; a.is_pinned = False; count += 1
    db.commit()
    return {"archived_count": count}


# --- Links ---
@router.get("/{announcement_id}/links", dependencies=[Depends(require_permission("announcements", "view"))])
def list_links(announcement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    _check_announcement_visibility(a, current_user)
    links = db.query(AnnouncementLink).filter(
        AnnouncementLink.announcement_id == announcement_id
    ).order_by(AnnouncementLink.created_at.desc()).all()
    return [AnnouncementLinkOut.model_validate(l) for l in links]


@router.post("/{announcement_id}/links", dependencies=[Depends(require_permission("announcements", "publish"))])
def create_link(announcement_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    if a.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    link = AnnouncementLink(
        announcement_id=announcement_id, target_type=req.get("target_type", "url"),
        target_id=req.get("target_id", ""), target_url=req.get("target_url", ""),
        title=req.get("title", ""),
    )
    db.add(link)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(link)
    return AnnouncementLinkOut.model_validate(link)


@router.delete("/links/{link_id}", dependencies=[Depends(require_permission("announcements", "publish"))])
def delete_link(link_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    link = db.query(AnnouncementLink).filter(AnnouncementLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Not found")
    a = db.query(Announcement).filter(Announcement.id == link.announcement_id).first()
    if a and a.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    db.delete(link)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}


# --- Read Status ---
@router.get("/{announcement_id}/readers", dependencies=[Depends(require_permission("announcements", "view"))])
def get_readers(
    announcement_id: int, tab: str = "read", search: str = None,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    _check_announcement_visibility(a, current_user)
    read_user_ids = {
        r[0] for r in
        db.query(AnnouncementRead.user_id).filter(AnnouncementRead.announcement_id == announcement_id).all()
    }
    if tab == "read":
        q = db.query(User).filter(User.id.in_(read_user_ids)) if read_user_ids else db.query(User).filter(User.id == -1)
    else:
        q = db.query(User).filter(User.id.notin_(read_user_ids)) if read_user_ids else db.query(User)
        q = q.filter(User.is_active == True)
    if search:
        q = q.filter(User.name.contains(search))
    users = q.all()
    # Sort: same department first, then by name
    users.sort(key=lambda u: (0 if u.department == current_user.department else 1, u.name))
    results = [{
        "id": u.id, "name": u.name, "department": u.department,
        "title": u.title, "role": u.role,
    } for u in users]
    return {"total": len(results), "items": results}


@router.post("/{announcement_id}/remind-unread", dependencies=[Depends(require_permission("announcements", "view"))])
def remind_unread(
    announcement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    _check_announcement_visibility(a, current_user)
    read_ids = {r[0] for r in db.query(AnnouncementRead.user_id).filter(
        AnnouncementRead.announcement_id == announcement_id).all()}
    unread_users = db.query(User).filter(
        User.id.notin_(read_ids), User.is_active == True
    ).all() if read_ids else db.query(User).filter(User.is_active == True).all()
    from database import Reaction
    count = 0
    for u in unread_users:
        existing = db.query(Reaction).filter(
            Reaction.user_id == current_user.id, Reaction.target_type == "announcement",
            Reaction.target_id == announcement_id, Reaction.reaction_type == "remind",
        ).first()
        if not existing:
            db.add(Reaction(user_id=current_user.id, target_type="announcement",
                           target_id=announcement_id, reaction_type="remind"))
            count += 1
    db.commit()
    return {"reminded_count": count}


# --- Push notification (imported by create_announcement) ---
def _notify_new_announcement(announcement: Announcement, db: Session):
    from database import Notification, PushSubscription
    # Create in-app notifications for users who can see this announcement
    active_users = db.query(User).filter(User.is_active == True)
    if announcement.visibility == "manager_only":
        active_users = active_users.filter(User.role.in_(("admin", "manager")))
    active_users = active_users.all()
    for u in active_users:
        db.add(Notification(
            user_id=u.id, type="new_announcement",
            title=f"新公告: {announcement.category}",
            body=announcement.title,
            link=f"/announcements/{announcement.id}",
        ))
    # Send push notifications to subscribed users (respect visibility)
    subs = db.query(PushSubscription).join(User, PushSubscription.user_id == User.id).filter(User.is_active == True)
    if announcement.visibility == "manager_only":
        subs = subs.filter(User.role.in_(("admin", "manager")))
    subs = subs.all()
    for sub in subs:
        try:
            from pywebpush import webpush
            import json as _json
            data = {"title": f"新公告: {announcement.category}", "body": announcement.title,
                    "url": f"/announcements/{announcement.id}"}
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=_json.dumps(data, ensure_ascii=False),
                vapid_private_key="", vapid_claims={"sub": "mailto:admin@teamhub.local"},
            )
        except Exception:
            pass
    db.commit()
