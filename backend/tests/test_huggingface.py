import json

import httpx
import pytest
from fastapi import HTTPException

from app import huggingface
from app.config import settings
from app.schemas import Extraction


@pytest.fixture
def hf_http(monkeypatch):
    monkeypatch.setenv("HF_TOKEN", "synthetic-hf-token")
    settings.cache_clear()
    original_client = httpx.Client
    calls = []

    def install(handler):
        def dispatch(request):
            calls.append(request)
            return handler(request)

        monkeypatch.setattr(
            huggingface.httpx,
            "Client",
            lambda **kwargs: original_client(transport=httpx.MockTransport(dispatch), **kwargs),
        )

    yield install, calls
    settings.cache_clear()


def extraction_payload():
    return {
        "transactions": [
            {
                "type": "expense",
                "category": "food",
                "amount": "450.00",
                "currency": "KES",
                "occurred_on": "2026-09-27",
                "description": "Lunch",
                "counterparty": "Cafe",
                "external_reference": None,
                "warnings": [],
            }
        ],
        "warnings": [],
    }


def test_qwen_receipt_sends_image_and_validates_output(hf_http):
    install, calls = hf_http
    install(
        lambda request: httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(extraction_payload())}}]},
        )
    )
    result = huggingface.receipt(Extraction, "Extract safely", b"image", "image/png")
    assert result.transactions[0].amount == "450.00"
    payload = json.loads(calls[0].content)
    assert payload["model"] == "Qwen/Qwen2.5-VL-7B-Instruct"
    assert payload["messages"][0]["content"][1]["image_url"]["url"].startswith(
        "data:image/png;base64,"
    )
    assert calls[0].headers["authorization"] == "Bearer synthetic-hf-token"
    assert "synthetic-hf-token" not in str(calls[0].url)


def test_whisper_transcription_uses_configured_model(hf_http):
    install, calls = hf_http
    install(lambda request: httpx.Response(200, json={"text": "I spent 500 shillings."}))
    assert huggingface.transcribe(b"audio", "audio/webm") == "I spent 500 shillings."
    assert calls[0].url.path.endswith("/openai/whisper-large-v3-turbo")
    assert calls[0].content == b"audio"


def test_huggingface_failure_does_not_expose_provider_body(hf_http):
    install, _ = hf_http
    install(lambda request: httpx.Response(500, text="private provider details"))
    with pytest.raises(HTTPException) as exc:
        huggingface.transcribe(b"audio", "audio/wav")
    assert exc.value.status_code == 502
    assert "private" not in exc.value.detail
