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
    waveform: list[float] | None = None
    loudness: float | None = None
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
                waveform=t.waveform,
                loudness=t.loudness,
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
    
    from app.services.storage import USE_S3, storage
    
    if not USE_S3 and hasattr(storage, 'get_track_dir'):
        import tempfile
        import os
        import asyncio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            track_dir, base_url = storage.get_track_dir()
            m3u8_path = track_dir / "index.m3u8"
            
            cmd = [
                "ffmpeg", "-i", tmp_path, 
                "-c:a", "aac", "-b:a", "192k", 
                "-f", "hls", "-hls_time", "10", 
                "-hls_list_size", "0", 
                str(m3u8_path)
            ]
            process = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            await process.communicate()
            
            file_url = f"{base_url}/index.m3u8"
        finally:
            os.unlink(tmp_path)
    else:
        file_url = storage.upload_file(file_obj, file.filename)

    track_title = title or (file.filename.rsplit(".", 1)[0] if "." in file.filename else file.filename)
    track_artist = artist or "Unknown Artist"

    import mimetypes
    mime_type = mimetypes.guess_type(file.filename)[0] or "audio/mpeg"

    duration = 0.0
    waveform = None
    loudness = None

    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(contents))
        duration = len(audio) / 1000.0
        loudness = audio.dBFS

        if duration > 0:
            points = 100
            chunk_length = max(1, len(audio) // points)
            wave = []
            for i in range(points):
                chunk = audio[i * chunk_length : (i + 1) * chunk_length]
                if len(chunk) > 0:
                    wave.append(chunk.rms)
            max_rms = max(wave) if wave else 1
            if max_rms > 0:
                waveform = [round(w / max_rms, 3) for w in wave]
    except Exception as e:
        print("Audio processing error:", e)

    track = Track(
        user_id=user.id,
        title=track_title,
        artist=track_artist,
        filename=file.filename,
        file_url=file_url,
        duration=duration,
        file_size=file_size,
        mime_type=mime_type,
        waveform=waveform,
        loudness=loudness,
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
        waveform=track.waveform,
        loudness=track.loudness,
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
        waveform=track.waveform,
        loudness=track.loudness,
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


@router.get("/{track_id}/recommendations", response_model=TrackListResponse)
async def get_recommendations(
    track_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()
    
    query = select(Track).where(Track.id != track_id)
    if track:
        query = query.order_by((Track.artist == track.artist).desc(), Track.created_at.desc())
    else:
        query = query.order_by(Track.created_at.desc())
        
    query = query.limit(5)
    res = await db.execute(query)
    recs = res.scalars().all()
    
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
                waveform=t.waveform,
                loudness=t.loudness,
                created_at=t.created_at.isoformat(),
            )
            for t in recs
        ]
    )

