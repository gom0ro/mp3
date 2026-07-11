import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, JSON, Uuid
from sqlalchemy.orm import relationship
import enum

from app.db import Base


class AuthProvider(str, enum.Enum):
    email = "email"
    google = "google"
    apple = "apple"


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(320), unique=True, nullable=False, index=True)
    username = Column(String(64), nullable=False)
    password_hash = Column(String(256), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    auth_provider = Column(SAEnum(AuthProvider), nullable=False, default=AuthProvider.email)
    auth_provider_id = Column(String(256), nullable=True)
    liked_track_ids = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    tracks = relationship("Track", back_populates="user", cascade="all, delete-orphan")
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
