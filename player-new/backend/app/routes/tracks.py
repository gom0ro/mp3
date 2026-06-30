from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db import get_db
from app.models.track import Track
from app.models.user import User
from app.services.auth import get_current_user
from app.services.storage import storage
from app.services.audio import compute_fingerprint, extract_metadata

router = APIRouter(prefix="/tracks", tags=["tracks"])


class TrackResponse(BaseModel):
    id: str
    title: str
    artist: str
    filename: str
    file_url: str
    cover_url: str | None = None
    duration: float
    file_size: int
    mime_type: str
    created_at: str


class TrackListResponse(BaseModel):
    tracks: list[TrackResponse]


@router.get("", response_model=TrackListResponse)
async def list_tracks(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Track).order_by(Track.created_at.desc())
    if search:
        like = f"%{search}%"
        query = query.where(
            Track.title.ilike(like) | Track.artist.ilike(like)
        )
    result = await db.execute(query)
    tracks = result.scalars().all()
    return TrackListResponse(
        tracks=[
            TrackResponse(
                id=str(t.id),
                title=t.title,
                artist=t.artist,
                filename=t.filename,
                file_url=t.file_url,
                cover_url=t.cover_url,
                duration=t.duration,
                file_size=t.file_size,
                mime_type=t.mime_type,
                created_at=t.created_at.isoformat(),
            )
            for t in tracks
        ]
    )


@router.post("/upload", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
async def upload_track(
    file: UploadFile = File(...),
    title: Optional[str] = Query(None),
    artist: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contents = await file.read()
    file_size = len(contents)

    import io
    file_obj = io.BytesIO(contents)
    file_url = storage.upload_file(file_obj, file.filename)

    track_title = title or (file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename)
    track_artist = artist or "Unknown Artist"

    import mimetypes
    mime_type = mimetypes.guess_type(file.filename)[0] or "audio/mpeg"

    duration = 0.0
    if file.filename.endswith(".wav"):
        try:
            from scipy.io import wavfile
            import io as _io
            sample_rate, data = wavfile.read(_io.BytesIO(contents))
            duration = float(data.shape[0] / sample_rate) if data.ndim == 1 else float(data.shape[0] / sample_rate)
        except Exception:
            duration = 0.0
    else:
        duration = 0.0

    track = Track(
        user_id=user.id,
        title=track_title,
        artist=track_artist,
        filename=file.filename,
        file_url=file_url,
        duration=duration,
        file_size=file_size,
        mime_type=mime_type,
    )
    db.add(track)
    await db.commit()
    await db.refresh(track)

    return TrackResponse(
        id=str(track.id),
        title=track.title,
        artist=track.artist,
        filename=track.filename,
        file_url=track.file_url,
        cover_url=track.cover_url,
        duration=track.duration,
        file_size=track.file_size,
        mime_type=track.mime_type,
        created_at=track.created_at.isoformat(),
    )


@router.get("/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    return TrackResponse(
        id=str(track.id),
        title=track.title,
        artist=track.artist,
        filename=track.filename,
        file_url=track.file_url,
        cover_url=track.cover_url,
        duration=track.duration,
        file_size=track.file_size,
        mime_type=track.mime_type,
        created_at=track.created_at.isoformat(),
    )


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track(
    track_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Track).where(Track.id == track_id, Track.user_id == user.id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    storage.delete_file(track.file_url)
    await db.execute(delete(Track).where(Track.id == track_id))
    await db.commit()


@router.post("/{track_id}/fingerprint", response_model=dict)
async def fingerprint_track(
    track_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Track).where(Track.id == track_id, Track.user_id == user.id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    import httpx
    resp = httpx.get(track.file_url)
    resp.raise_for_status()
    content = resp.content
    import io as _io
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        import numpy as np
        sample_rate, data = wavfile_read_safe(tmp_path)
        fp = compute_fingerprint(data.astype(np.float32), sample_rate)
        import hashlib, json
        fp_hash = hashlib.sha256(json.dumps(fp, sort_keys=True).encode()).hexdigest()
        track.fingerprint = fp
        track.fingerprint_hash = fp_hash
        await db.commit()
        return {"fingerprint_hash": fp_hash, "bands": len(fp), "frames": len(fp[0]) if fp else 0}
    finally:
        import os
        os.unlink(tmp_path)


def wavfile_read_safe(path: str):
    import numpy as np
    from scipy.io import wavfile
    sample_rate, data = wavfile.read(path)
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        data = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.uint8:
        data = (data.astype(np.float32) - 128.0) / 128.0
    return sample_rate, data
