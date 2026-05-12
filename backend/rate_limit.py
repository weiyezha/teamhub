"""Database-backed rate limiter for login attempts. Survives server restarts."""
from datetime import datetime, timedelta, timezone

from database import RateLimitEntry, get_db
from sqlalchemy.orm import Session

MAX_FAILURES = 5
LOCKOUT_MINUTES = 15
CLEANUP_HOURS = 1


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def check_rate_limit(ip: str, username: str, db: Session | None = None) -> tuple[bool, str]:
    """Returns (allowed, message). Must receive db session if available."""
    if db is None:
        # Fallback: no session provided — allow
        return True, ""

    entry = (
        db.query(RateLimitEntry)
        .filter(RateLimitEntry.ip == ip, RateLimitEntry.username == username)
        .first()
    )
    if not entry:
        return True, ""

    now = _now()
    locked_until = _ensure_aware(entry.locked_until)
    first_failure_at = _ensure_aware(entry.first_failure_at)

    # Reset if lockout expired
    if locked_until and now >= locked_until:
        db.delete(entry)
        db.commit()
        return True, ""

    # Reset if first failure was too long ago
    if first_failure_at and (now - first_failure_at) > timedelta(hours=CLEANUP_HOURS):
        db.delete(entry)
        db.commit()
        return True, ""

    if locked_until and now < locked_until:
        remaining = int((locked_until - now).total_seconds() // 60) + 1
        return False, f"Account locked due to too many failed attempts. Try again in {remaining} minute(s)."

    return True, ""


def record_failure(ip: str, username: str, db: Session | None = None) -> None:
    if db is None:
        return

    entry = (
        db.query(RateLimitEntry)
        .filter(RateLimitEntry.ip == ip, RateLimitEntry.username == username)
        .first()
    )

    now = _now()
    if entry:
        entry.failure_count += 1
    else:
        entry = RateLimitEntry(ip=ip, username=username, failure_count=1, first_failure_at=now)
        db.add(entry)

    if entry.failure_count >= MAX_FAILURES:
        entry.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)

    db.commit()


def record_success(ip: str, username: str, db: Session | None = None) -> None:
    if db is None:
        return

    entry = (
        db.query(RateLimitEntry)
        .filter(RateLimitEntry.ip == ip, RateLimitEntry.username == username)
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()
