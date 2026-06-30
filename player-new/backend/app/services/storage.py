from __future__ import annotations
import uuid
from typing import BinaryIO
import boto3
from botocore.config import Config as BotoConfig

from app.config import settings


class S3Storage:
    def __init__(self):
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


storage = S3Storage()
