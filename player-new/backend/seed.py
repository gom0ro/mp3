import asyncio
import uuid
import httpx
from datetime import datetime, timezone
from sqlalchemy import text as sa_text
from app.db import engine, async_session, Base
from app.models.user import User, AuthProvider
from app.models.track import Track
from app.services.auth import hash_password


async def fetch_cover(title: str, artist: str) -> str | None:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.deezer.com/search",
                params={"q": f'artist:"{artist}" track:"{title}"', "limit": 1, "output": "json"},
                timeout=10,
            )
            data = r.json()
            return data["data"][0]["album"]["cover_medium"]
    except Exception:
        return None

TRACKS = [
    ("Blinding Lights", "The Weeknd", 200),
    ("Shape of You", "Ed Sheeran", 233),
    ("Bohemian Rhapsody", "Queen", 354),
    ("Stairway to Heaven", "Led Zeppelin", 482),
    ("Hotel California", "Eagles", 391),
    ("Smells Like Teen Spirit", "Nirvana", 301),
    ("Imagine", "John Lennon", 187),
    ("Billie Jean", "Michael Jackson", 294),
    ("Like a Rolling Stone", "Bob Dylan", 380),
    ("Hey Jude", "The Beatles", 431),
    ("Rolling in the Deep", "Adele", 228),
    ("Lose Yourself", "Eminem", 326),
    ("One More Time", "Daft Punk", 320),
    ("Get Lucky", "Daft Punk", 369),
    ("Happy", "Pharrell Williams", 233),
    ("Despacito", "Luis Fonsi", 229),
    ("Gangnam Style", "PSY", 219),
    ("Uptown Funk", "Mark Ronson", 269),
    ("Shake It Off", "Taylor Swift", 219),
    ("Bad Guy", "Billie Eilish", 194),
    ("Old Town Road", "Lil Nas X", 113),
    ("Dance Monkey", "Tones and I", 209),
    ("Someone Like You", "Adele", 284),
    ("All of Me", "John Legend", 269),
    ("Thinking Out Loud", "Ed Sheeran", 281),
    ("Hello", "Adele", 295),
    ("Skyfall", "Adele", 286),
    ("Rolling Stone", "The Beatles", 360),
    ("Purple Rain", "Prince", 521),
    ("Sweet Child O' Mine", "Guns N' Roses", 356),
    ("Back in Black", "AC/DC", 255),
    ("Thunderstruck", "AC/DC", 292),
    ("Enter Sandman", "Metallica", 331),
    ("Nothing Else Matters", "Metallica", 388),
    ("November Rain", "Guns N' Roses", 537),
    ("Wonderwall", "Oasis", 258),
    ("Creep", "Radiohead", 233),
    ("Paranoid Android", "Radiohead", 387),
    ("Karma Police", "Radiohead", 261),
    ("Fade to Black", "Metallica", 417),
    ("One", "Metallica", 446),
    ("Master of Puppets", "Metallica", 515),
    ("Come as You Are", "Nirvana", 218),
    ("Lithium", "Nirvana", 257),
    ("Heart-Shaped Box", "Nirvana", 284),
    ("Californication", "Red Hot Chili Peppers", 321),
    ("Under the Bridge", "Red Hot Chili Peppers", 264),
    ("Scar Tissue", "Red Hot Chili Peppers", 217),
    ("Otherside", "Red Hot Chili Peppers", 255),
    ("By the Way", "Red Hot Chili Peppers", 216),
    ("Snow (Hey Oh)", "Red Hot Chili Peppers", 334),
    ("Can't Stop", "Red Hot Chili Peppers", 269),
    ("Zombie", "The Cranberries", 326),
    ("Losing My Religion", "R.E.M.", 268),
    ("Every Breath You Take", "The Police", 253),
    ("With or Without You", "U2", 296),
    ("Where the Streets Have No Name", "U2", 347),
    ("One", "U2", 276),
    ("Still Haven't Found What I'm Looking For", "U2", 278),
    ("Sunday Bloody Sunday", "U2", 279),
    ("In the End", "Linkin Park", 217),
    ("Numb", "Linkin Park", 185),
    ("Crawling", "Linkin Park", 216),
    ("Breaking the Habit", "Linkin Park", 196),
    ("What I've Done", "Linkin Park", 205),
    ("Bring Me to Life", "Evanescence", 235),
    ("My Immortal", "Evanescence", 266),
    ("Toxicity", "System of a Down", 218),
    ("Chop Suey!", "System of a Down", 210),
    ("Aerials", "System of a Down", 236),
    ("Lonely Day", "System of a Down", 167),
    ("Boulevard of Broken Dreams", "Green Day", 263),
    ("Wake Me Up When September Ends", "Green Day", 285),
    ("21 Guns", "Green Day", 321),
    ("American Idiot", "Green Day", 174),
    ("Holiday", "Green Day", 233),
    ("Chasing Cars", "Snow Patrol", 266),
    ("How to Save a Life", "The Fray", 262),
    ("The Reason", "Hoobastank", 245),
    ("Dani California", "Red Hot Chili Peppers", 282),
    ("Save Tonight", "Eagle-Eye Cherry", 239),
    ("Let Her Go", "Passenger", 252),
    ("Riptide", "Vance Joy", 204),
    ("Ho Hey", "The Lumineers", 165),
    ("Little Talks", "Of Monsters and Men", 246),
    ("Somebody That I Used to Know", "Gotye", 244),
    ("We Are Young", "fun.", 244),
    ("Pumped Up Kicks", "Foster the People", 211),
    ("Feel Good Inc.", "Gorillaz", 221),
    ("Clint Eastwood", "Gorillaz", 342),
    ("Take Me Out", "Franz Ferdinand", 238),
    ("Last Nite", "The Strokes", 195),
    ("Reptilia", "The Strokes", 217),
    ("Seven Nation Army", "The White Stripes", 231),
    ("Smoke on the Water", "Deep Purple", 347),
    ("Comfortably Numb", "Pink Floyd", 383),
    ("Wish You Were Here", "Pink Floyd", 333),
    ("Money", "Pink Floyd", 382),
    ("Another Brick in the Wall, Pt. 2", "Pink Floyd", 239),
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # add cover_url column if it doesn't exist (dev migration)
        try:
            await conn.execute(sa_text("ALTER TABLE tracks ADD COLUMN cover_url VARCHAR(1024)"))
        except Exception:
            pass  # column already exists

    async with async_session() as session:
        from sqlalchemy import select as sa_select
        result = await session.execute(sa_select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                email="dev@example.com",
                username="Dev User",
                password_hash=hash_password("dev123"),
                auth_provider=AuthProvider.email,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

        existing = await session.execute(sa_select(Track).limit(1))
        if existing.scalars().first():
            needs_commit = False

            rows = await session.execute(sa_select(Track).where(Track.cover_url.is_(None)))
            tracks_no_cover = rows.scalars().all()
            if tracks_no_cover:
                print(f"Fetching covers for {len(tracks_no_cover)} existing tracks...")
                for t in tracks_no_cover:
                    cover = await fetch_cover(t.title, t.artist)
                    if cover:
                        t.cover_url = cover
                        print(f"  {t.title}: {cover}")
                needs_commit = True

            rows = await session.execute(sa_select(Track).where(Track.file_url.like("http://localhost:8000/static/audio/%")))
            tracks_local_url = rows.scalars().all()
            if tracks_local_url:
                print(f"Fixing file_url for {len(tracks_local_url)} existing tracks...")
                for t in tracks_local_url:
                    old_url = t.file_url
                    t.file_url = old_url.replace("http://localhost:8000", "")
                    print(f"  {t.title}: {old_url} -> {t.file_url}")
                needs_commit = True

            if needs_commit:
                await session.commit()
            else:
                print("All tracks already have covers and correct file_url")
            return

        samples = ["sample1.mp3", "sample2.mp3", "sample3.mp3"]
        for i, (title, artist, duration) in enumerate(TRACKS):
            print(f"Seeding {i+1}/{len(TRACKS)}: {title}")
            cover_url = await fetch_cover(title, artist)
            if cover_url:
                print(f"  cover: {cover_url}")
            track = Track(
                id=uuid.uuid4(),
                user_id=user.id,
                title=title,
                artist=artist,
                filename=samples[i % 3],
                file_url=f"/static/audio/{samples[i % 3]}",
                cover_url=cover_url,
                duration=duration if duration > 0 else 240,
                file_size=0,
                mime_type="audio/mpeg",
                created_at=datetime.now(timezone.utc),
            )
            session.add(track)

        await session.commit()
        print(f"Seeded {len(TRACKS)} tracks")

if __name__ == "__main__":
    asyncio.run(seed())
