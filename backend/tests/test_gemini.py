import json

import httpx
import pytest
from fastapi import HTTPException

from app import gemini
from app.config import settings
from app.schemas import AskPlan


@pytest.fixture
def gemini_http(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "synthetic-gemini-key")
    settings.cache_clear()
    original_client = httpx.Client
    calls = []

    def install(handler):
        def dispatch(request):
            calls.append(request)
            return handler(request)

        monkeypatch.setattr(
            gemini.httpx,
            "Client",
            lambda **kwargs: original_client(transport=httpx.MockTransport(dispatch), **kwargs),
        )

    yield install, calls
    settings.cache_clear()


def test_gemini_validates_json_and_sends_image(gemini_http):
    install, calls = gemini_http
    result = {
        "operation": "expense_total",
        "period": "this_month",
        "category": None,
        "start_date": None,
        "end_date": None,
    }
    install(
        lambda request: httpx.Response(
            200,
            json={
                "candidates": [
                    {"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(result)}]}}
                ]
            },
        )
    )
    plan = gemini.structured(
        AskPlan,
        "Instructions",
        [
            {"type": "input_text", "text": "Question"},
            {"type": "input_image", "image_url": "data:image/png;base64,aW1hZ2U="},
        ],
    )
    assert plan.operation == "expense_total"
    payload = json.loads(calls[0].content)
    assert payload["generationConfig"]["responseJsonSchema"] == AskPlan.model_json_schema()
    assert payload["contents"][0]["parts"][1]["inlineData"]["mimeType"] == "image/png"
    assert "synthetic-gemini-key" not in str(calls[0].url)
    assert calls[0].headers["x-goog-api-key"] == "synthetic-gemini-key"


@pytest.mark.parametrize("status,expected", [(429, 503), (403, 503), (500, 502)])
def test_gemini_failure_does_not_expose_response(gemini_http, status, expected):
    install, _ = gemini_http
    install(lambda request: httpx.Response(status, text="private provider details"))
    with pytest.raises(HTTPException) as exc:
        gemini.generate("instruction", [{"text": "input"}])
    assert exc.value.status_code == expected
    assert "private" not in exc.value.detail


def test_gemini_rejects_truncated_output(gemini_http):
    install, _ = gemini_http
    install(
        lambda request: httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "MAX_TOKENS",
                        "content": {"parts": [{"text": "partial transcript"}]},
                    }
                ]
            },
        )
    )
    with pytest.raises(HTTPException) as exc:
        gemini.transcribe(b"audio", "audio/wav")
    assert exc.value.status_code == 502
