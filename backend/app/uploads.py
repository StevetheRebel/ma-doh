import io
import warnings

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.config import settings


def read_upload(file: UploadFile, source: str):
    limit = settings().max_upload_mb * 1024 * 1024
    try:
        data = file.file.read(limit + 1)
    finally:
        file.file.close()
    if not data:
        raise HTTPException(422, "The uploaded file is empty.")
    if len(data) > limit:
        raise HTTPException(413, f"Upload limit is {settings().max_upload_mb} MB.")
    if source == "receipt":
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data)) as image:
                    if image.format not in ("JPEG", "PNG", "WEBP"):
                        raise HTTPException(415, "Use a JPEG, PNG, or WebP receipt image.")
                    mime = Image.MIME[image.format]
                    image.verify()
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ):
            raise HTTPException(415, "The file is not a valid supported image.") from None
        return data, mime, "receipt." + mime.split("/")[1]
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        mime, suffix = "audio/wav", "wav"
    elif data[:3] == b"ID3" or (len(data) > 1 and data[0] == 255 and data[1] & 224 == 224):
        mime, suffix = "audio/mpeg", "mp3"
    elif data[:4] == b"\x1aE\xdf\xa3":
        mime, suffix = "audio/webm", "webm"
    elif data[4:8] == b"ftyp":
        mime, suffix = "audio/mp4", "mp4"
    else:
        raise HTTPException(415, "Use a WAV, MP3, WebM, or MP4/M4A audio recording.")
    return data, mime, "recording." + suffix
