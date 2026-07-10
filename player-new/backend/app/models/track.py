import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    artist = Column(String(256), nullable=False)
    filename = Column(String(512), nullable=False)
    file_url = Column(String(1024), nullable=False)
    fingerprint = Column(JSON, nullable=True)
    duration = Column(Float, nullable=False, default=0.0)
    file_size = Column(Integer, nullable=False, default=0)
    cover_url = Column(String(1024), nullable=True, default=None)
    mime_type = Column(String(64), nullable=False, default="audio/mpeg")
    fingerprint_hash = Column(Text, nullable=True, index=True)
    waveform = Column(JSON, nullable=True)
    loudness = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="tracks")
