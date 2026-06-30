from __future__ import annotations
import uuid
import json
import hashlib
import io
import tempfile
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np
import redis.asyncio as aioredis

from app.config import settings
from app.db import get_db
from app.models.track import Track
from app.services.audio import compute_fingerprint, match_fingerprint

router = APIRouter(prefix="/recognize", tags=["recognize"])

redis_client: Optional[aioredis.Redis] = None


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


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
        await r.setex(f"recognition:{task_id}:status", 300, "fingerprinting")
        fp = await extract_fingerprint_async(audio_bytes, filename)
        if fp is None:
            await r.setex(f"recognition:{task_id}:status", 300, "error")
            return

        await r.setex(f"recognition:{task_id}:status", 300, "matching")
        result = await db.execute(select(Track).where(Track.fingerprint.isnot(None)))
        tracks = result.scalars().all()

        stored_fingerprints: list[list[list[float]]] = []
        track_ids: list[str] = []
        for t in tracks:
            if t.fingerprint:
                stored_fingerprints.append(t.fingerprint)
                track_ids.append(str(t.id))

        if not stored_fingerprints:
            await r.setex(f"recognition:{task_id}:status", 300, "completed")
            await r.setex(f"recognition:{task_id}:result", 300, json.dumps({"match": None, "confidence": 0.0}))
            return

        best_idx, confidence = match_fingerprint(fp, stored_fingerprints, threshold=0.65)
        result_data: dict
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
        else:
            result_data = {"match": None, "confidence": round(confidence, 4)}

        await r.setex(f"recognition:{task_id}:status", 300, "completed")
        await r.setex(f"recognition:{task_id}:result", 300, json.dumps(result_data))
    except Exception as exc:
        await r.setex(f"recognition:{task_id}:status", 300, "error")
        await r.setex(f"recognition:{task_id}:result", 300, json.dumps({"error": str(exc)}))


async def extract_fingerprint_async(audio_bytes: bytes, filename: str) -> Optional[list[list[float]]]:
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

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
