"""Hugging Face Inference Providers adapters for receipt vision and speech."""

import base64
import json
import re

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from app.config import settings


def enabled():
    return bool(settings().hf_token.get_secret_value())


def _headers(content_type="application/json"):
    token = settings().hf_token.get_secret_value()
    if not token:
        raise HTTPException(503, "Hugging Face is not configured on the server. Set HF_TOKEN.")
    return {"Authorization": f"Bearer {token}", "Content-Type": content_type}


def _provider_error(response):
    if response.status_code in (401, 403, 404, 429, 503):
        raise HTTPException(
            503,
            "Hugging Face inference is unavailable. Check the token, model access, provider availability, and quota.",
        )
    response.raise_for_status()


def _json_text(text):
    cleaned = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL | re.IGNORECASE)
    return fenced.group(1) if fenced else cleaned


def receipt(schema, instructions, image, mime, text=None):
    config = settings()
    encoded = base64.b64encode(image).decode()
    prompt = f"{instructions}\n\n{text or 'Extract the transactions in this receipt.'}\nReturn JSON only."
    payload = {
        "model": config.hf_vision_model,
        "stream": False,
        "temperature": 0,
        "max_tokens": 4000,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{encoded}"},
                    },
                ],
            }
        ],
    }
    try:
        with httpx.Client(timeout=config.ai_timeout_seconds) as client:
            response = client.post(
                f"{config.hf_inference_base_url.rstrip('/')}/v1/chat/completions",
                headers=_headers(),
                json=payload,
            )
        _provider_error(response)
        content = response.json()["choices"][0]["message"]["content"]
        return schema.model_validate_json(_json_text(content))
    except httpx.TimeoutException:
        raise HTTPException(504, "Receipt extraction timed out. Retry with a clearer image.") from None
    except (httpx.HTTPError, ValidationError, json.JSONDecodeError, KeyError, IndexError, TypeError):
        raise HTTPException(502, "Qwen returned an unusable receipt result. No transactions were saved.") from None


def transcribe(data, mime):
    config = settings()
    model = config.hf_transcription_model
    try:
        with httpx.Client(timeout=config.ai_timeout_seconds) as client:
            response = client.post(
                f"{config.hf_inference_base_url.rstrip('/')}/hf-inference/models/{model}",
                headers=_headers(mime),
                content=data,
            )
        _provider_error(response)
        text = response.json().get("text", "").strip()
        if not text:
            raise HTTPException(422, "No speech was detected in the recording.")
        if len(text) > 12000:
            raise HTTPException(422, "Recording is too long. Use a shorter note.")
        return text
    except httpx.TimeoutException:
        raise HTTPException(504, "Transcription timed out. Retry with a shorter recording.") from None
    except (httpx.HTTPError, json.JSONDecodeError, AttributeError, TypeError):
        raise HTTPException(502, "Whisper could not transcribe the audio. Check the file and try again.") from None
