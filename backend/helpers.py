"""Shared helper functions for TeamHub routers"""
import re
from collections import Counter

from database import Announcement, AnnouncementRead, Comment, Reaction, User
from schemas import AnnouncementOut, ReactionSummary
from sqlalchemy.orm import Session


def _generate_summary(content: str) -> str:
    text = re.sub(r"<[^>]*>", "", content).strip()
    if not text:
        return ""
    # Always return a summary — short content in full, long content truncated
    limit = 100
    if len(text) <= limit:
        return text
    return text[:limit] + "..."


def _extract_keywords(content: str, title: str) -> list[str]:
    text = re.sub(r"<[^>]*>", "", content) + " " + title
    words = re.findall(r"[一-鿿]{2,}|[a-zA-Z]{3,}", text)
    stop_words = {"公告", "通知", "关于", "以下", "以上", "以及", "及其", "进行", "完成", "需要",
                  "通过", "根据", "按照", "对于", "由于", "因此", "或者", "并且", "但是",
                  "如果", "那么", "因为", "所以", "虽然"}
    filtered = [w for w in words if w not in stop_words and len(w) >= 2]
    counter = Counter(filtered)
    return [w for w, _ in counter.most_common(5)]


def _build_reaction_summary(
    db: Session, target_type: str, target_id: int, current_user_id: int
) -> ReactionSummary:
    reactions = (
        db.query(Reaction)
        .filter(Reaction.target_type == target_type, Reaction.target_id == target_id)
        .all()
    )
    summary = ReactionSummary()
    for r in reactions:
        if r.reaction_type == "received":
            summary.received += 1
        elif r.reaction_type == "done":
            summary.done += 1
        elif r.reaction_type == "question":
            summary.question += 1
        elif r.reaction_type == "remind":
            summary.remind += 1
        if r.user_id == current_user_id:
            summary.user_reaction = r.reaction_type
    return summary


def _get_or_404(db: Session, model, obj_id: int):
    obj = db.query(model).filter(model.id == obj_id).first()
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    return obj


def _build_announcement_out(a: Announcement, db: Session, current_user_id: int) -> AnnouncementOut:
    read_count = (
        db.query(AnnouncementRead)
        .filter(AnnouncementRead.announcement_id == a.id)
        .count()
    )
    comment_count = (
        db.query(Comment)
        .filter(Comment.target_id == a.id, Comment.target_type == "announcement")
        .count()
    )
    out = AnnouncementOut.model_validate(a)
    out.author_name = a.author.name if a.author else ""
    out.read_count = read_count
    out.comment_count = comment_count
    out.reactions = _build_reaction_summary(db, "announcement", a.id, current_user_id)
    return out
