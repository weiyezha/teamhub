"""Document CRUD routes"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

import nh3

from auth import get_current_user, require_permission
from database import Document, User, get_db, utc_now

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", dependencies=[Depends(require_permission("documents", "view"))])
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(Document).options(joinedload(Document.author)).order_by(desc(Document.updated_at)).all()
    return [{
        "id": d.id, "title": d.title, "content": d.content,
        "category": d.category, "status": d.status,
        "author_name": d.author.name if d.author else "",
        "created_at": d.created_at.isoformat() if d.created_at else "",
        "updated_at": d.updated_at.isoformat() if d.updated_at else "",
    } for d in docs]


@router.post("", dependencies=[Depends(require_permission("documents", "create_edit"))])
def create_document(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    safe_content = nh3.clean(
        req.get("content", ""),
        tags={"p", "br", "strong", "em", "b", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "span"},
        attributes={"*": {"class"}},
        url_schemes=set(),
    )
    d = Document(title=req.get("title", ""), content=safe_content,
                 category=req.get("category", "通用"), author_id=current_user.id)
    db.add(d)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(d)
    return {"id": d.id, "title": d.title, "message": "创建成功"}


@router.put("/{doc_id}")
def update_document(doc_id: int, req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    if d.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    if "title" in req: d.title = req["title"]
    if "content" in req:
        d.content = nh3.clean(
            req["content"],
            tags={"p", "br", "strong", "em", "b", "i", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "span"},
            attributes={"*": {"class"}},
            url_schemes=set(),
        )
    if "category" in req: d.category = req["category"]
    d.updated_at = utc_now()
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"id": d.id, "message": "更新成功"}


@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Document).filter(Document.id == doc_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    if d.author_id != current_user.id and current_user.role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="No permission")
    db.delete(d)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}
