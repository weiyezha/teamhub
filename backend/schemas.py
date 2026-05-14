"""Pydantic schemas for TeamHub API"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


import re


class RegisterReq(BaseModel):
    name: str
    password: str
    phone: str = ""

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v


class LoginReq(BaseModel):
    username: str
    password: str


class AnnouncementCreate(BaseModel):
    title: str
    content: str = ""
    content_json: dict = {}
    category: str
    is_pinned: bool = False
    level: str = "normal"
    visibility: str = "public"
    target_user_ids: list = []
    approval_status: str = ""
    images: list = []
    attachments: list = []
    expires_at: Optional[datetime] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    content_json: Optional[dict] = None
    category: Optional[str] = None
    is_pinned: Optional[bool] = None
    level: Optional[str] = None
    visibility: Optional[str] = None
    target_user_ids: Optional[list] = None
    status: Optional[str] = None
    approval_status: Optional[str] = None
    expires_at: Optional[datetime] = None


class CommentCreate(BaseModel):
    content: str
    target_type: str = "announcement"
    target_id: int

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError('Comment cannot be empty')
        if len(v) > 2000:
            raise ValueError('Comment must be less than 2000 characters')
        return v


class UserOut(BaseModel):
    id: int
    username: str
    name: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    department: Optional[str] = None
    title: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    received: int = 0
    done: int = 0
    question: int = 0
    remind: int = 0
    user_reaction: Optional[str] = None


class AnnouncementOut(BaseModel):
    id: int
    title: str
    content: str
    category: str
    status: str
    level: str = "normal"
    visibility: str = "public"
    target_user_ids: list = []
    approval_status: str
    author_id: Optional[int] = None
    author_name: str = ""
    is_pinned: bool
    view_count: int
    attachments: list
    images: list
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    read_count: int = 0
    is_read: bool = False
    comment_count: int = 0
    reactions: ReactionSummary = ReactionSummary()
    summary: str = ""
    keywords: list = []

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: int
    content: str
    author_id: Optional[int] = None
    author_name: str = ""
    target_type: str
    target_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReactionOut(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    target_type: str
    target_id: int
    reaction_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class AnnouncementLinkOut(BaseModel):
    id: int
    announcement_id: int
    target_type: str
    target_id: str
    target_url: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserTaskOut(BaseModel):
    id: int
    user_id: int
    title: str
    description: str
    source_announcement_id: Optional[int] = None
    source_quote: str
    due_date: Optional[datetime] = None
    priority: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    body: str
    link: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    type: str
    id: int
    title: str
    snippet: str
    link: str


class ForgotPasswordReq(BaseModel):
    username: str
    phone: str


class ResetPasswordReq(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v
