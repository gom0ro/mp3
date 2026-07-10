from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db import get_db
from app.models.playlist import Playlist
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/playlists", tags=["playlists"])


class PlaylistResponse(BaseModel):
    id: str
    name: str
    track_ids: list[str]
    track_count: int
    created_at: str
    updated_at: str


class PlaylistListResponse(BaseModel):
    playlists: list[PlaylistResponse]


class PlaylistCreate(BaseModel):
    name: str


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    track_ids: Optional[list[str]] = None


@router.get("", response_model=PlaylistListResponse)
async def list_playlists(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.user_id == user.id).order_by(Playlist.updated_at.desc())
    )
    playlists = result.scalars().all()
    return PlaylistListResponse(
        playlists=[
            PlaylistResponse(
                id=str(p.id),
                name=p.name,
                track_ids=[str(t) for t in (p.track_ids or [])],
                track_count=p.track_count,
                created_at=p.created_at.isoformat(),
                updated_at=p.updated_at.isoformat(),
            )
            for p in playlists
        ]
    )


@router.post("", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    body: PlaylistCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    playlist = Playlist(
        user_id=user.id,
        name=body.name,
        track_ids=[],
        track_count=0,
    )
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return PlaylistResponse(
        id=str(playlist.id),
        name=playlist.name,
        track_ids=[],
        track_count=0,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
    )


@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    return PlaylistResponse(
        id=str(playlist.id),
        name=playlist.name,
        track_ids=[str(t) for t in (playlist.track_ids or [])],
        track_count=playlist.track_count,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
    )


@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: uuid.UUID,
    body: PlaylistUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user.id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    if body.name is not None:
        playlist.name = body.name
    if body.track_ids is not None:
        playlist.track_ids = body.track_ids
        playlist.track_count = len(body.track_ids)
    playlist.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(playlist)
    return PlaylistResponse(
        id=str(playlist.id),
        name=playlist.name,
        track_ids=[str(t) for t in (playlist.track_ids or [])],
        track_count=playlist.track_count,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
    )


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user.id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    await db.execute(delete(Playlist).where(Playlist.id == playlist_id))
    await db.commit()


@router.post("/{playlist_id}/tracks/{track_id}", response_model=PlaylistResponse)
async def add_track_to_playlist(
    playlist_id: uuid.UUID,
    track_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user.id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    current_ids = [str(t) for t in (playlist.track_ids or [])]
    tid = str(track_id)
    if tid not in current_ids:
        current_ids.append(tid)
        playlist.track_ids = current_ids
        playlist.track_count = len(current_ids)
        playlist.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(playlist)
    return PlaylistResponse(
        id=str(playlist.id),
        name=playlist.name,
        track_ids=[str(t) for t in (playlist.track_ids or [])],
        track_count=playlist.track_count,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
    )


@router.delete("/{playlist_id}/tracks/{track_id}", response_model=PlaylistResponse)
async def remove_track_from_playlist(
    playlist_id: uuid.UUID,
    track_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user.id)
    )
    playlist = result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")
    current_ids = [str(t) for t in (playlist.track_ids or [])]
    tid = str(track_id)
    if tid in current_ids:
        current_ids.remove(tid)
        playlist.track_ids = current_ids
        playlist.track_count = len(current_ids)
        playlist.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(playlist)
    return PlaylistResponse(
        id=str(playlist.id),
        name=playlist.name,
        track_ids=[str(t) for t in (playlist.track_ids or [])],
        track_count=playlist.track_count,
        created_at=playlist.created_at.isoformat(),
        updated_at=playlist.updated_at.isoformat(),
    )
