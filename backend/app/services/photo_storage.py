"""
Photo storage with a local-disk fallback.

The project was written against S3 only, which meant a missing/failing AWS
credential turned every student photo upload into a 500. This wrapper tries S3
first (when it is configured) and otherwise writes the file under
``uploads/students`` and returns a URL the API already serves via the
``/uploads`` static mount.
"""
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple

from loguru import logger

from app.core.config import settings

LOCAL_STUDENT_DIR = Path("uploads/students")

MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def s3_configured() -> bool:
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.AWS_S3_BUCKET
    )


def _extension_for(content_type: str) -> str:
    return MIME_EXTENSIONS.get((content_type or "").lower(), "jpg")


def store_student_photo(
    file_content: bytes,
    content_type: str,
    student_id: str,
) -> Tuple[str, Optional[Path]]:
    """
    Persist a student photo and return ``(public_url, local_path)``.

    ``local_path`` is the on-disk copy; it is ``None`` only if the file could
    not be written locally. Callers use it to generate the face encoding and,
    for S3-backed storage, delete it afterwards.
    """
    extension = _extension_for(content_type)
    filename = f"{student_id}_{uuid.uuid4().hex}.{extension}"

    LOCAL_STUDENT_DIR.mkdir(parents=True, exist_ok=True)
    local_path = LOCAL_STUDENT_DIR / filename
    try:
        with open(local_path, "wb") as handle:
            handle.write(file_content)
    except OSError as exc:
        logger.error(f"Failed to write photo to disk: {exc}")
        local_path = None

    if s3_configured():
        try:
            from app.services.s3_service import get_s3_service

            url = get_s3_service().upload_photo(file_content, content_type, student_id)
            if url:
                return url, local_path
            logger.warning("S3 upload returned no URL; falling back to local storage")
        except Exception as exc:  # noqa: BLE001 - any AWS failure must degrade gracefully
            logger.warning(f"S3 upload unavailable ({exc}); falling back to local storage")

    if local_path is None:
        raise RuntimeError("Unable to store photo: S3 unavailable and local disk write failed")

    # Served by the /uploads static mount in main.py.
    return f"/uploads/students/{filename}", local_path


def delete_student_photo(photo_url: Optional[str]) -> None:
    """Best-effort delete of a previously stored photo (S3 object or local file)."""
    if not photo_url:
        return

    if photo_url.startswith("http") and ".amazonaws.com/" in photo_url:
        if not s3_configured():
            return
        try:
            from app.services.s3_service import get_s3_service

            get_s3_service().delete_photo(photo_url)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Failed to delete S3 photo: {exc}")
        return

    # Local file: "/uploads/students/<name>" (or a legacy relative path).
    relative = photo_url.lstrip("/")
    if not relative.startswith("uploads/"):
        return
    path = Path(relative)
    try:
        if path.is_file():
            os.remove(path)
    except OSError as exc:
        logger.warning(f"Failed to delete local photo {path}: {exc}")


def local_path_for(photo_url: Optional[str]) -> Optional[Path]:
    """Return the on-disk path for a locally stored photo URL, if it exists."""
    if not photo_url or photo_url.startswith("http"):
        return None
    path = Path(photo_url.lstrip("/"))
    return path if path.is_file() else None
