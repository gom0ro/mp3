from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/cover", tags=["cover"])

DEEZER_SEARCH_URL = "https://api.deezer.com/search"

@router.get("/search")
async def search_cover(
    artist: str = Query(...),
    track: str = Query(...),
):
    query = f'artist:"{artist}" track:"{track}"'
    async with httpx.AsyncClient() as client:
        resp = await client.get(DEEZER_SEARCH_URL, params={"q": query, "limit": 1})
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Deezer API error")
        data = resp.json()
        result = data.get("data", [])
        if result:
            album = result[0].get("album", {})
            return {"cover_url": album.get("cover_medium")}
        return {"cover_url": None}
