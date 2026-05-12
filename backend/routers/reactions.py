"""Reaction routes"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import Announcement, Reaction, User, get_db
from schemas import ReactionOut

router = APIRouter(tags=["reactions"])


@router.get("/api/reactions")
def list_reactions(target_type: str, target_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if target_type == "announcement":
        a = db.query(Announcement).filter(Announcement.id == target_id).first()
        if a and a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="No permission")
    items = (
        db.query(Reaction)
        .filter(Reaction.target_type == target_type, Reaction.target_id == target_id)
        .order_by(Reaction.created_at.desc())
        .all()
    )
    results = []
    for r in items:
        out = ReactionOut.model_validate(r)
        user = db.query(User).filter(User.id == r.user_id).first()
        out.user_name = user.name if user else ""
        results.append(out)
    return results


@router.post("/api/reactions")
def create_or_update_reaction(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_type = req.get("target_type", "announcement")
    target_id = req.get("target_id")
    reaction_type = req.get("reaction_type")
    if not target_id or not reaction_type:
        raise HTTPException(status_code=400, detail="Missing fields")
    if target_type == "announcement":
        a = db.query(Announcement).filter(Announcement.id == target_id).first()
        if a and a.visibility == "manager_only" and current_user.role not in ("admin", "manager"):
            raise HTTPException(status_code=403, detail="No permission")
    existing = db.query(Reaction).filter(
        Reaction.user_id == current_user.id, Reaction.target_type == target_type, Reaction.target_id == target_id,
    ).first()
    if existing:
        if existing.reaction_type == reaction_type:
            db.delete(existing)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            return {"success": True, "action": "removed"}
        else:
            existing.reaction_type = reaction_type
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            db.refresh(existing)
            out = ReactionOut.model_validate(existing)
            out.user_name = current_user.name
            return out
    r = Reaction(user_id=current_user.id, target_type=target_type, target_id=target_id, reaction_type=reaction_type)
    db.add(r)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(r)
    out = ReactionOut.model_validate(r)
    out.user_name = current_user.name
    return out


@router.delete("/api/reactions/{reaction_id}")
def delete_reaction(reaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Reaction).filter(Reaction.id == reaction_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.user_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    db.delete(r)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}
