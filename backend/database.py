import os
from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

# Use absolute path to avoid CWD-dependent DB resolution issues
_DEFAULT_DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "teamhub.db")
)
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}"
)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar = Column(String, default="")
    role = Column(String, default="member")  # admin, manager, member, guest
    department = Column(String, default="")
    title = Column(String, default="")
    phone = Column(String, default="", index=True)
    permissions = Column(JSON, default=dict)  # individual permission overrides
    is_active = Column(Boolean, default=False)  # new users need admin approval
    created_at = Column(DateTime, default=utc_now)
    last_seen_at = Column(DateTime, default=utc_now)

    announcements = relationship("Announcement", back_populates="author")
    comments = relationship("Comment", back_populates="author")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    content_json = Column(JSON, default=dict)  # TipTap JSON format
    category = Column(String, index=True, nullable=False)
    status = Column(String, default="active")  # active, archived
    approval_status = Column(String, default="")  # pending, approved, rejected
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    is_pinned = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    attachments = Column(JSON, default=list)
    images = Column(JSON, default=list)
    level = Column(String, default="normal")  # urgent, important, normal
    visibility = Column(String, default="public")  # public, manager_only
    expires_at = Column(DateTime, nullable=True)
    summary = Column(String, default="")
    keywords = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    author = relationship("User", back_populates="announcements")
    reads = relationship("AnnouncementRead", back_populates="announcement", cascade="all, delete-orphan")
    comments = relationship(
        "Comment",
        primaryjoin="and_(foreign(Comment.target_id) == Announcement.id, Comment.target_type == 'announcement')",
        back_populates="announcement",
        cascade="all, delete-orphan",
    )


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    read_at = Column(DateTime, default=utc_now)

    announcement = relationship("Announcement", back_populates="reads")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    target_type = Column(String, default="announcement")
    target_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    author = relationship("User", back_populates="comments")
    announcement = relationship(
        "Announcement",
        primaryjoin="and_(foreign(Comment.target_id) == Announcement.id, Comment.target_type == 'announcement')",
        back_populates="comments",
    )


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)  # login, view, create, comment
    target_type = Column(String)
    target_id = Column(Integer)
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String, default="announcement")
    target_id = Column(Integer, nullable=False)
    reaction_type = Column(String, nullable=False)  # received, done, question, remind
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        # One reaction type per user per target
        # But we allow switching, so unique constraint is on user+target+type
        # Actually we want one reaction per user per target (any type)
        # So if user switches from received to done, delete old, insert new
        # No unique constraint needed; application layer enforces
    )


class AnnouncementVersion(Base):
    __tablename__ = "announcement_versions"

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, default="")
    content_json = Column(JSON, default=dict)
    editor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=utc_now)


class AnnouncementLink(Base):
    __tablename__ = "announcement_links"

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"), nullable=False, index=True)
    target_type = Column(String, nullable=False)  # document, project, meeting, url
    target_id = Column(String, default="")
    target_url = Column(String, default="")
    title = Column(String, default="")
    created_at = Column(DateTime, default=utc_now)


class UserTask(Base):
    __tablename__ = "user_tasks"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    source_announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"))
    source_quote = Column(Text, default="")
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")  # low, medium, high
    status = Column(String, default="todo")  # todo, in_progress, done
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    endpoint = Column(String, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # new_announcement, comment_reply, mention, system
    title = Column(String, nullable=False)
    body = Column(String, default="")
    link = Column(String, default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    author_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String, default="通用")
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    author = relationship("User")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class RateLimitEntry(Base):
    __tablename__ = "rate_limits"

    id = Column(Integer, primary_key=True)
    ip = Column(String, nullable=False, index=True)
    username = Column(String, nullable=False)
    failure_count = Column(Integer, default=1)
    first_failure_at = Column(DateTime, default=utc_now)
    locked_until = Column(DateTime, nullable=True)



def get_setting(db: Session, key: str, default=None):
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if s:
        return s.value.get("value", default)
    # Fallback defaults for known keys
    fallbacks = {
        "app_name": "TeamHub",
        "app_subtitle": "Studio",
        "pin_limit": 3,
        "level_colors": {"urgent": "#D93025", "important": "#E37300", "normal": "#1A73E8"},
        "permission_matrix": {
            "admin": ["announcements.*", "documents.*", "dashboard.*"],
            "manager": ["announcements.*", "documents.view", "documents.create_edit", "dashboard.view"],
            "member": ["announcements.view", "documents.view"],
            "guest": ["announcements.view"],
        },
    }
    if key in fallbacks:
        return fallbacks[key]
    return default


def set_setting(db: Session, key: str, value):
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if s:
        s.value = {"value": value}
    else:
        s = SystemSetting(key=key, value={"value": value})
        db.add(s)
    db.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
