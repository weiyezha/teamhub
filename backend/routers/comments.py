"""Comment routes"""
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

import nh3

from auth import get_current_user
from database import Announcement, Comment, Notification, User, get_db
from schemas import CommentCreate, CommentOut

router = APIRouter(tags=["comments"])


@router.get("/api/comments")
def list_comments(target_type: str, target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check visibility for announcement targets
    if target_type == "announcement":
        a = db.query(Announcement).filter(Announcement.id == target_id).first()
        if a and a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="No permission")
    items = (
        db.query(Comment)
        .options(joinedload(Comment.author))
        .filter(Comment.target_type == target_type, Comment.target_id == target_id)
        .order_by(desc(Comment.created_at))
        .all()
    )
    results = []
    for c in items:
        out = CommentOut.model_validate(c)
        out.author_name = c.author.name if c.author else ""
        results.append(out)
    return results


@router.post("/api/comments")
def create_comment(req: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate target exists and visibility
    if req.target_type == "announcement":
        target = db.query(Announcement).filter(Announcement.id == req.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="Announcement not found")
        if target.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="No permission")
    else:
        raise HTTPException(status_code=400, detail="Unsupported target_type")

    safe_content = nh3.clean(
        req.content,
        tags={"p", "br", "strong", "em", "b", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "span"},
        attributes={"*": {"class"}},
        url_schemes=set(),
    )
    c = Comment(content=safe_content, author_id=current_user.id, target_type=req.target_type, target_id=req.target_id)
    db.add(c)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(c)
    if req.target_type == "announcement":
        a = db.query(Announcement).filter(Announcement.id == req.target_id).first()
        notified_users = set()
        # Notify announcement author (if not self)
        if a and a.author_id and a.author_id != current_user.id:
            db.add(Notification(user_id=a.author_id, type="comment_reply",
                               title=f"新评论: {a.title}", body=c.content[:200],
                               link=f"/announcements/{req.target_id}"))
            notified_users.add(a.author_id)
        # Parse @mentions and notify mentioned users
        mentioned_names = set(re.findall(r'@([\w\u4e00-\u9fff]+)', req.content))
        if mentioned_names:
            mentioned_users = db.query(User).filter(User.name.in_(mentioned_names)).all()
            for mu in mentioned_users:
                if mu.id != current_user.id and mu.id not in notified_users:
                    db.add(Notification(user_id=mu.id, type="mention",
                                       title=f"{current_user.name} 提到了你",
                                       body=c.content[:200],
                                       link=f"/announcements/{req.target_id}"))
                    notified_users.add(mu.id)
        try:
            db.commit()
        except Exception:
            db.rollback()
            # Notification failure should not fail the comment creation
    out = CommentOut.model_validate(c)
    out.author_name = current_user.name
    return out
