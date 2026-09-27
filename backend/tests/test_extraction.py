from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import pytest
from fastapi import HTTPException
from openai import APITimeoutError

from app import ai
from app.parsing import parse_mpesa
from app.schemas import Extraction


def extracted(**changes):
    return {
        "type": "expense",
        "category": "food",
        "amount": "125.50",
        "currency": "KES",
        "occurred_on": "2026-01-10",
        "description": "Lunch",
        "counterparty": "Cafe",
        "external_reference": None,
        "warnings": [],
        **changes,
    }


def test_normalize_missing_and_invalid_fields():
    result = ai.normalize_extracted(
        extracted(amount="unknown", occurred_on="yesterday", category="salary")
    )
    assert result["amount"] is None
    assert result["occurred_on"] is None
    assert result["category"] is None
    assert len(result["warnings"]) == 3


def test_foreign_currency_not_relabelled():
    with pytest.raises(HTTPException) as exc:
        ai.normalize_extracted(extracted(currency="USD"))
    assert exc.value.status_code == 422


def test_responses_adapter_uses_schema_and_nonretention(monkeypatch):
    api = MagicMock()
    api.__enter__.return_value = api
    api.responses.parse.return_value = SimpleNamespace(
        output_parsed=Extraction.model_validate({"transactions": [extracted()], "warnings": []})
    )
    monkeypatch.setattr(ai, "client", lambda: api)
    result, warnings = ai.extract("Lunch KES 125.50 on 2026-01-10", "Africa/Nairobi")
    assert result[0]["amount"] == Decimal("125.50")
    assert result[0]["occurred_on"] == date(2026, 1, 10)
    kwargs = api.responses.parse.call_args.kwargs
    assert kwargs["store"] is False and kwargs["text_format"] is Extraction


def test_refusal_and_timeout_are_explicit(monkeypatch):
    api = MagicMock()
    api.__enter__.return_value = api
    monkeypatch.setattr(ai, "client", lambda: api)
    api.responses.parse.return_value = SimpleNamespace(output_parsed=None)
    with pytest.raises(HTTPException) as refused:
        ai.extract("irrelevant", "Africa/Nairobi")
    assert refused.value.status_code == 422
    api.responses.parse.side_effect = APITimeoutError(
        request=httpx.Request("POST", "https://api.openai.com/v1/responses")
    )
    with pytest.raises(HTTPException) as timeout:
        ai.extract("text", "Africa/Nairobi")
    assert timeout.value.status_code == 504
    # Refusal used one call; timeout uses exactly two bounded attempts.
    assert api.responses.parse.call_count == 3


def test_reversals_and_unsupported_messages_not_guessed():
    assert (
        parse_mpesa(
            "UAI1234567 Confirmed. Ksh150.00 paid to SHOP on 10/1/26. Transaction reversed."
        )
        is None
    )
    assert parse_mpesa("Your balance is Ksh1000.00") is None
    assert parse_mpesa("UAI1234567 Confirmed. Ksh150.00 paid to SHOP on 31/2/26.") is None
