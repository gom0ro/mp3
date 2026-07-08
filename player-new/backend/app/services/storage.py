from __future__ import annotations
import uuid
from pathlib import Path
from typing import BinaryIO

from app.config import settings


class LocalStorage:
    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or self._default_dir()

    @staticmethod
    def _default_dir() -> Path:
        return Path(__file__).resolve().parent.parent.parent / "static" / "audio"

    def _ensure_dir(self) -> Path:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        return self.base_dir

    def upload_file(self, file_obj: BinaryIO, filename: str) -> str:
        track_dir = self._ensure_dir() / uuid.uuid4().hex
        track_dir.mkdir(parents=True, exist_ok=True)
        dest = track_dir / filename
        content = file_obj.read()
        dest.write_bytes(content)
        return f"/static/audio/{track_dir.name}/{filename}"

    def delete_file(self, url: str) -> None:
        prefix = "/static/audio/"
        if url.startswith(prefix):
            rel = url[len(prefix):]
            parts = rel.split("/", 1)
            if len(parts) == 2:
                folder = self.base_dir / parts[0]
                if folder.exists():
                    import shutil
                    shutil.rmtree(folder)

    def get_presigned_url(self, filename: str, expires: int = 3600) -> str:
        return f"/static/audio/{filename}"


class S3Storage:
    def __init__(self):
        import boto3
        from botocore.config import Config as BotoConfig
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            config=BotoConfig(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET
        self.public_url = settings.S3_PUBLIC_URL

    def upload_file(self, file_obj: BinaryIO, filename: str) -> str:
        key = f"tracks/{uuid.uuid4().hex}/{filename}"
        self.client.upload_fileobj(file_obj, self.bucket, key)
        return f"{self.public_url}/{key}"

    def delete_file(self, url: str) -> None:
        prefix = f"{self.public_url}/"
        if url.startswith(prefix):
            key = url[len(prefix):]
            self.client.delete_object(Bucket=self.bucket, Key=key)

    def get_presigned_url(self, filename: str, expires: int = 3600) -> str:
        key = f"tracks/{filename}"
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )


USE_S3 = bool(settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY)
storage: LocalStorage | S3Storage = S3Storage() if USE_S3 else LocalStorage()
