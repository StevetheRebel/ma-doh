from fastapi import HTTPException

from app.config import settings


class BodySizeLimit:
    """Bound streamed/chunked requests before the multipart parser spools them."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        received = 0
        limit = settings().max_upload_mb * 1024 * 1024 + 65536

        async def bounded_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise HTTPException(413, "Request exceeds upload limit.")
            return message

        await self.app(scope, bounded_receive, send)
