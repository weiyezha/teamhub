"""Permission management routes (admin only)"""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import User, get_db, get_setting, set_setting
from permission_defs import MODULES
from permissions import get_allowed_modules, get_user_permissions

router = APIRouter(prefix="/api/permissions", tags=["permissions"])


@router.get("/matrix")
def get_permission_matrix(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    matrix = get_setting(db, "permission_matrix", {})
    return {"modules": MODULES, "matrix": matrix}


@router.put("/matrix")
def update_permission_matrix(req: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    matrix = req.get("matrix")
    if not isinstance(matrix, dict):
        raise HTTPException(status_code=400, detail="Invalid matrix format")
    # Validate all entries reference valid modules/actions
    for role, perms in matrix.items():
        if not isinstance(perms, list):
            raise HTTPException(status_code=400, detail=f"Invalid permissions for role: {role}")
        for p in perms:
            if p.endswith(".*"):
                mod = p[:-2]
                if mod not in MODULES:
                    raise HTTPException(status_code=400, detail=f"Unknown module in wildcard: {mod}")
            else:
                parts = p.split(".")
                if len(parts) != 2 or parts[0] not in MODULES or parts[1] not in MODULES[parts[0]]["actions"]:
                    raise HTTPException(status_code=400, detail=f"Invalid permission: {p}")
    set_setting(db, "permission_matrix", matrix)
    return {"success": True}


@router.get("/me")
def my_permissions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    perms = get_user_permissions(db, current_user)
    modules = get_allowed_modules(db, current_user)
    return {"permissions": sorted(perms), "allowed_modules": modules}
