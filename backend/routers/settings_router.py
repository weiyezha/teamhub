"""GET/PUT/POST/DELETE /api/settings"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import User, get_db, get_setting, set_setting

router = APIRouter(tags=["settings"])


@router.get("/api/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return all settings from database
    from database import SystemSetting
    all_settings = db.query(SystemSetting).all()
    result = {}
    for s in all_settings:
        result[s.key] = s.value.get("value")
    # Ensure known keys have defaults if not in DB
    known_defaults = {
        "open_registration": False,
        "require_approval": False,
        "allow_guest_access": False,
        "pin_limit": 3,
        "level_colors": {"urgent": "#D93025", "important": "#E37300", "normal": "#1A73E8"},
        "permission_matrix": {
            "admin": ["announcements.*", "documents.*", "dashboard.*"],
            "manager": ["announcements.*", "documents.view", "documents.create_edit", "dashboard.view"],
            "member": ["announcements.view", "documents.view", "dashboard.view"],
            "guest": ["announcements.view"],
        },
        "app_name": "TeamHub",
        "app_subtitle": "Studio",
    }
    for key, default in known_defaults.items():
        if key not in result:
            result[key] = default
    return result


@router.put("/api/settings")
def update_settings(
    req: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    protected = {"permission_matrix"}  # require special handling if needed
    for key, value in req.items():
        if key in protected:
            continue
        # Validation for known keys
        if key == "app_name":
            value = str(value).strip()
            if len(value) > 100:
                raise HTTPException(status_code=400, detail="app_name must be at most 100 characters")
        if key == "app_subtitle":
            value = str(value).strip()
            if len(value) > 200:
                raise HTTPException(status_code=400, detail="app_subtitle must be at most 200 characters")
        if key == "pin_limit":
            try:
                v = int(value)
                if v < 1 or v > 10:
                    raise HTTPException(status_code=400, detail="pin_limit must be between 1 and 10")
                value = v
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="pin_limit must be an integer")
        set_setting(db, key, bool(value) if key in ("open_registration", "require_approval", "allow_guest_access") else value)
    return get_settings(db)


@router.post("/api/settings/keys")
def create_setting(
    req: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create or update a dynamic setting key."""
    key = req.get("key", "").strip()
    value = req.get("value")
    if not key:
        raise HTTPException(status_code=400, detail="key is required")
    if len(key) > 100:
        raise HTTPException(status_code=400, detail="key must be at most 100 characters")
    set_setting(db, key, value)
    return {"key": key, "value": value}


@router.delete("/api/settings/keys/{key}")
def delete_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a setting key."""
    from database import SystemSetting
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail="Setting not found")
    db.delete(s)
    db.commit()
    return {"success": True}
