"""Upload + fetch-title routes"""
import ipaddress
import os
import re
import socket
import time
import urllib.request
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Body, Depends, File, HTTPException, Request, UploadFile

from auth import get_current_user
from database import User, get_db

router = APIRouter(tags=["upload"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024
MAX_UPLOADS_PER_MINUTE = 30
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".zip", ".rar"}

# Simple in-memory upload rate limiter per user
_upload_timestamps: dict[int, list[float]] = defaultdict(list)

def _check_upload_rate(user_id: int) -> bool:
    """Returns True if user is within rate limit, False if exceeded."""
    now = time.time()
    window = now - 60
    timestamps = _upload_timestamps[user_id]
    # Clean old entries
    _upload_timestamps[user_id] = [t for t in timestamps if t > window]
    if len(_upload_timestamps[user_id]) >= MAX_UPLOADS_PER_MINUTE:
        return False
    _upload_timestamps[user_id].append(now)
    return True

# File type validation: extension -> allowed MIME types
# Include application/octet-stream because some browsers/OS cannot correctly
# identify MIME types for certain files (e.g. docx/xlsx may be sent as octet-stream).
ALLOWED_MIME_TYPES = {
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".png": {"image/png"},
    ".gif": {"image/gif"},
    ".webp": {"image/webp"},
    ".pdf": {"application/pdf"},
    ".doc": {"application/msword"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    ".xls": {"application/vnd.ms-excel"},
    ".csv": {"text/csv", "application/csv"},
    ".txt": {"text/plain"},
    ".zip": {"application/zip", "application/x-zip-compressed"},
    ".rar": {"application/x-rar-compressed", "application/vnd.rar"},
}

# Magic bytes for common file types
MAGIC_BYTES = {
    b"\xff\xd8\xff": ".jpg",
    b"\x89PNG\r\n\x1a\n": ".png",
    b"GIF87a": ".gif",
    b"GIF89a": ".gif",
    b"RIFF": ".webp",  # WebP starts with RIFF...WEBP
    b"%PDF": ".pdf",
    b"PK\x03\x04": ".zip",  # Also DOCX/XLSX
    b"\xd0\xcf\x11\xe0": ".doc",  # OLE format (DOC/XLS)
    b"Rar!": ".rar",
}


def _check_magic_bytes(content: bytes) -> str | None:
    for magic, ext in MAGIC_BYTES.items():
        if content.startswith(magic):
            return ext
    return None


def _is_safe_url(url: str) -> bool:
    """Check URL for SSRF prevention — resolves DNS and blocks internal IPs."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    hostname = parsed.hostname
    if not hostname:
        return False
    # Block localhost variants
    if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"):
        return False
    # Block non-standard ports
    port = parsed.port
    if port is not None and port not in (80, 443):
        return False
    # Resolve DNS and check if it points to internal IP (SSRF prevention)
    try:
        resolved = socket.getaddrinfo(hostname, None)
        for fam, _, _, _, addr in resolved:
            if fam in (socket.AF_INET, socket.AF_INET6):
                ip = ipaddress.ip_address(addr[0])
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
                    return False
    except socket.gaierror:
        return False
    return True


@router.post("/api/upload")
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Rate limit check
    if not _check_upload_rate(current_user.id):
        raise HTTPException(status_code=429, detail="Upload rate limit exceeded. Please try again later.")

    # Validate extension
    original_filename = file.filename or "unknown"
    ext = os.path.splitext(original_filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")

    # Read and validate size
    content = file.file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Validate MIME type
    declared_type = file.content_type or ""
    allowed_mimes = ALLOWED_MIME_TYPES.get(ext, set())
    if declared_type and allowed_mimes and declared_type not in allowed_mimes:
        raise HTTPException(status_code=400, detail="File MIME type does not match extension")

    # Validate magic bytes (skip for docx/xlsx since they are ZIP-based)
    magic_ext = _check_magic_bytes(content)
    if magic_ext and magic_ext != ".zip":
        if ext != magic_ext:
            raise HTTPException(status_code=400, detail="File content does not match extension")
    # For ZIP-based formats (docx, xlsx, zip), we at least verify it's a ZIP
    if ext in (".docx", ".xlsx", ".zip"):
        if not content.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=400, detail="Invalid file format")

    # Generate safe filename (no user input in filename)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4().hex[:8]
    safe_filename = f"{timestamp}_{unique_id}_{current_user.id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/api/downloads/{safe_filename}", "filename": original_filename}


@router.post("/api/fetch-title")
def fetch_link_title(
    req: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    url = req.get("url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not _is_safe_url(url):
        raise HTTPException(status_code=400, detail="Invalid or unsafe URL")

    try:
        req_obj = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            method="GET",
        )
        # Limit redirect count by using a custom opener
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def http_error_302(self, req, fp, code, msg, headers):
                raise HTTPException(status_code=400, detail="Redirects are not allowed")
            http_error_301 = http_error_303 = http_error_307 = http_error_302

        opener = urllib.request.build_opener(NoRedirectHandler())
        with opener.open(req_obj, timeout=5) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            title = m.group(1).strip() if m else ""
            title = title.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
            return {"title": title or "No title found"}
    except HTTPException:
        raise
    except Exception:
        return {"title": "Unable to fetch title"}
