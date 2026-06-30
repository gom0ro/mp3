from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import engine, Base
from app.routes.auth import router as auth_router
from app.routes.tracks import router as tracks_router
from app.routes.recognize import router as recognize_router
from app.routes.playlists import router as playlists_router
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
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(tracks_router, prefix="/api/v1")
app.include_router(recognize_router, prefix="/api/v1")
app.include_router(playlists_router, prefix="/api/v1")

app.add_api_websocket_route("/ws", websocket_handler)

static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


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
