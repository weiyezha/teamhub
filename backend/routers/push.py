"""Push notification routes"""
import json as _json
import os

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from database import PushSubscription, User, get_db

router = APIRouter(tags=["push"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS = {"sub": "mailto:admin@teamhub.local"}


def _send_push_notification(subscription: dict, title: str, body: str, url: str = ""):
    try:
        from pywebpush import webpush
        data = {"title": title, "body": body, "url": url}
        webpush(subscription_info=subscription, data=_json.dumps(data, ensure_ascii=False),
                vapid_private_key=VAPID_PRIVATE_KEY, vapid_claims=VAPID_CLAIMS)
    except ImportError:
        pass
    except Exception:
        pass


@router.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/api/push/subscribe")
def subscribe_push(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    endpoint = req.get("endpoint", "")
    keys = req.get("keys", {})
    p256dh = keys.get("p256dh", "")
    auth = keys.get("auth", "")
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id, PushSubscription.endpoint == endpoint,
    ).first()
    if existing:
        db.delete(existing)
    sub = PushSubscription(user_id=current_user.id, endpoint=endpoint, p256dh=p256dh, auth=auth)
    db.add(sub)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True}


@router.post("/api/push/unsubscribe")
def unsubscribe_push(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    endpoint = req.get("endpoint", "")
    db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id, PushSubscription.endpoint == endpoint,
    ).delete()
    db.commit()
    return {"success": True}
