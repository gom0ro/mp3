from __future__ import annotations
import uuid
import json
import tempfile
import os
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db import get_db
from app.models.track import Track
from app.services.audio import compute_fingerprint, match_fingerprint

router = APIRouter(prefix="/recognize", tags=["recognize"])

class _MemStore:
    def __init__(self):
        self._data: dict[str, tuple[str, float]] = {}
    async def setex(self, key: str, ttl: int, value: str):
        self._data[key] = (value, time.time() + ttl)
    async def get(self, key: str) -> str | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        val, expiry = entry
        if time.time() > expiry:
            del self._data[key]
            return None
        return val

try:
    import redis.asyncio as _aioredis
    _redis_impl = _aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    _impl_type = "redis"
except Exception:
    _redis_impl = _MemStore()
    _impl_type = "memory"

async def get_redis():
    return _redis_impl


class RecognizeResponse(BaseModel):
    task_id: str
    status: str = "processing"


class StatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[dict] = None


@router.post("", response_model=RecognizeResponse)
async def recognize_clip(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    contents = await file.read()
    task_id = uuid.uuid4().hex
    r = await get_redis()
    await r.setex(f"recognition:{task_id}:status", 300, "processing")
    await r.setex(f"recognition:{task_id}:data", 300, "placeholder")
    import asyncio
    asyncio.create_task(process_recognition(task_id, contents, file.filename, db))
    return RecognizeResponse(task_id=task_id)


@router.get("/status/{task_id}", response_model=StatusResponse)
async def poll_status(task_id: str, db: AsyncSession = Depends(get_db)):
    r = await get_redis()
    status_val = await r.get(f"recognition:{task_id}:status")
    if status_val is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found or expired")
    if status_val != "completed":
        return StatusResponse(task_id=task_id, status=status_val)

    result_json = await r.get(f"recognition:{task_id}:result")
    result = json.loads(result_json) if result_json else None
    return StatusResponse(task_id=task_id, status="completed", result=result)


async def process_recognition(task_id: str, audio_bytes: bytes, filename: str, db: AsyncSession):
    r = await get_redis()
    try:
        await r.setex(f"recognition:{task_id}:status", 300, "searching_internet")
        match = await shazam_recognize(audio_bytes)

        if match:
            result_data = {
                "match": {
                    "track_id": None,
                    "title": match["title"],
                    "artist": match["artist"],
                    "cover_url": match.get("cover_url"),
                },
                "confidence": 1.0,
            }
            await r.setex(f"recognition:{task_id}:status", 300, "completed")
            await r.setex(f"recognition:{task_id}:result", 300, json.dumps(result_data))
            return

        await r.setex(f"recognition:{task_id}:status", 300, "matching_local")
        fp = await extract_fingerprint_async(audio_bytes, filename)
        if fp:
            result = await db.execute(select(Track).where(Track.fingerprint.isnot(None)))
            tracks = result.scalars().all()
            stored_fingerprints: list[list[list[float]]] = []
            for t in tracks:
                if t.fingerprint:
                    stored_fingerprints.append(t.fingerprint)
            if stored_fingerprints:
                best_idx, confidence = match_fingerprint(fp, stored_fingerprints, threshold=0.65)
                if best_idx >= 0:
                    matched_track = tracks[best_idx]
                    result_data = {
                        "match": {
                            "track_id": str(matched_track.id),
                            "title": matched_track.title,
                            "artist": matched_track.artist,
                            "file_url": matched_track.file_url,
                        },
                        "confidence": round(confidence, 4),
                    }
                    await r.setex(f"recognition:{task_id}:status", 300, "completed")
                    await r.setex(f"recognition:{task_id}:result", 300, json.dumps(result_data))
                    return

        await r.setex(f"recognition:{task_id}:status", 300, "completed")
        await r.setex(f"recognition:{task_id}:result", 300, json.dumps({"match": None, "confidence": 0.0}))
    except Exception as exc:
        await r.setex(f"recognition:{task_id}:status", 300, "error")
        await r.setex(f"recognition:{task_id}:result", 300, json.dumps({"error": str(exc)}))


async def shazam_recognize(audio_bytes: bytes) -> dict | None:
    try:
        from shazamio import Shazam
        shazam = Shazam()
        result = await shazam.recognize(audio_bytes)
        track = result.get("track", {})
        title = track.get("title") or track.get("heading", {}).get("title")
        artist = track.get("subtitle") or track.get("heading", {}).get("subtitle")
        if not title:
            return None
        images = track.get("images", {})
        cover_url = images.get("coverarthq") or images.get("coverart") or images.get("background")
        return {"title": title, "artist": artist or "Unknown", "cover_url": cover_url}
    except Exception:
        return None


async def extract_fingerprint_async(audio_bytes: bytes, filename: str) -> Optional[list[list[float]]]:
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        import numpy as np
        from scipy.io import wavfile
        sample_rate, data = wavfile.read(tmp_path)
        os.unlink(tmp_path)

        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0
        elif data.dtype == np.int32:
            data = data.astype(np.float32) / 2147483648.0
        elif data.dtype == np.uint8:
            data = (data.astype(np.float32) - 128.0) / 128.0

        return compute_fingerprint(data.astype(np.float32), sample_rate)
    except Exception:
        return None
