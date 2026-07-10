from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt

from app.config import settings
from app.db import get_db
from app.models.user import User, AuthProvider
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user, handle_oauth_callback

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    email: str
    password: str


class OAuthRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    avatar_url: str | None
    auth_provider: str
    created_at: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    hashed = hash_password(req.password)
    user = User(
        email=req.email,
        username=req.username,
        password_hash=hashed,
        auth_provider=AuthProvider.email,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/google", response_model=TokenResponse)
async def google_login(req: OAuthRequest, db: AsyncSession = Depends(get_db)):
    if settings.GOOGLE_CLIENT_ID:
        try:
            payload = jwt.decode(req.token, settings.GOOGLE_CLIENT_ID, algorithms=["RS256"], audience=settings.GOOGLE_CLIENT_ID)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
        sub = payload.get("sub")
        email = payload.get("email", f"{sub}@google-oauth.local")
        name = payload.get("name", email.split("@")[0])
        picture = payload.get("picture")
    else:
        sub = "dev-google-user"
        email = "dev-google@example.com"
        name = "Dev Google User"
        picture = None
    user = await handle_oauth_callback(AuthProvider.google, sub, email, name, picture, db)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.post("/apple", response_model=TokenResponse)
async def apple_login(req: OAuthRequest, db: AsyncSession = Depends(get_db)):
    if settings.APPLE_CLIENT_ID:
        try:
            payload = jwt.decode(req.token, settings.APPLE_CLIENT_ID, algorithms=["RS256"], audience=settings.APPLE_CLIENT_ID)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token")
        sub = payload.get("sub")
        email = payload.get("email", f"{sub}@apple-oauth.local")
        name = payload.get("name", email.split("@")[0])
    else:
        sub = "dev-apple-user"
        email = "dev-apple@example.com"
        name = "Dev Apple User"
    user = await handle_oauth_callback(AuthProvider.apple, sub, email, name, None, db)
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        username=user.username,
        avatar_url=user.avatar_url,
        auth_provider=user.auth_provider.value,
        created_at=user.created_at.isoformat(),
    )


@router.get("/me/likes", response_model=list[str])
async def get_my_likes(user: User = Depends(get_current_user)):
    return [str(t) for t in (user.liked_track_ids or [])]


@router.post("/me/likes/{track_id}", response_model=list[str])
async def add_like(track_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current_ids = [str(t) for t in (user.liked_track_ids or [])]
    if track_id not in current_ids:
        current_ids.append(track_id)
        user.liked_track_ids = current_ids
        await db.commit()
    return current_ids


@router.delete("/me/likes/{track_id}", response_model=list[str])
async def remove_like(track_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current_ids = [str(t) for t in (user.liked_track_ids or [])]
    if track_id in current_ids:
        current_ids.remove(track_id)
        user.liked_track_ids = current_ids
        await db.commit()
    return current_ids

