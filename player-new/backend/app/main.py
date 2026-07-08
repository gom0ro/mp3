from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select as sa_select

from app.config import settings
from app.db import engine, Base
from app.routes.auth import router as auth_router
from app.routes.tracks import router as tracks_router
from app.routes.recognize import router as recognize_router
from app.routes.playlists import router as playlists_router
from app.routes.cover import router as cover_router
from app.ws.handler import websocket_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="VibePlayer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(.*\.vercel\.app|.*\.onrender\.com|.*\.render\.com|localhost:\d+)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(tracks_router, prefix="/api/v1")
app.include_router(recognize_router, prefix="/api/v1")
app.include_router(playlists_router, prefix="/api/v1")
app.include_router(cover_router, prefix="/api/v1")


app.add_api_websocket_route("/ws", websocket_handler)
static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

backend_root = Path(__file__).resolve().parent.parent
frontend_candidates = [
    backend_root / "frontend_dist",
    backend_root.parent / "frontend" / "dist",
]
frontend_dir = next((d for d in frontend_candidates if d.exists()), None)
frontend_index = frontend_dir / "index.html" if frontend_dir else None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "VibePlayer API"}


@app.post("/api/v1/admin/seed")
async def trigger_seed():
    try:
        from seed import seed
        await seed()
        return {"status": "ok", "message": "Seed completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/v1/admin/tracks")
async def clear_all_tracks():
    try:
        from app.models.track import Track
        from app.db import async_session
        async with async_session() as session:
            tracks = await session.execute(sa_select(Track))
            for t in tracks.scalars():
                await session.delete(t)
            await session.commit()
        return {"status": "ok", "message": "All tracks deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if frontend_dir and frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="frontend_assets")

    @app.get("/sw.js")
    async def service_worker():
        return FileResponse(str(frontend_dir / "sw.js"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if not frontend_index or not frontend_index.exists():
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(str(frontend_index))
