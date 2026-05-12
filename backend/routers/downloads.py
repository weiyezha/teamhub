"""Secure file download endpoint."""
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from auth import get_current_user_optional
from database import User, get_db

router = APIRouter(tags=["downloads"])

UPLOAD_DIR = "./uploads"

# Image extensions allowed for public (unauthenticated) access
IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"
}


@router.get("/api/downloads/{filename}")
def download_file(
    filename: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Security: prevent path traversal
    safe_name = os.path.basename(filename)
    if not safe_name or safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = os.path.join(UPLOAD_DIR, safe_name)
    if not os.path.exists(filepath) or not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="File not found")

    # Images are publicly accessible (filename contains timestamp+uuid, hard to guess)
    ext = os.path.splitext(safe_name)[1].lower()
    is_image = ext in IMAGE_EXTENSIONS

    if not is_image and current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    return FileResponse(filepath, filename=safe_name)
