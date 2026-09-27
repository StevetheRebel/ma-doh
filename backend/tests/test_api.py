import io
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from decimal import Decimal

import pytest
from PIL import Image

from app import ai

MESSAGE = "UAI1234567 Confirmed. Ksh150.00 paid to NAIVAS on 10/1/26 at 3:00 PM. New M-PESA balance is Ksh2,000.00. Transaction cost, Ksh0.00."


def capture(client, users, account, text=MESSAGE):
    response = client.post(
        "/captures/message",
        headers=users[0]["headers"],
        json={"account_id": account["id"], "text": text},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_auth_required(client, users):
    assert client.get("/accounts").status_code == 401
    assert client.get("/accounts", headers={"Authorization": "Bearer invalid"}).status_code == 401
    response = client.get("/me", headers=users[0]["headers"])
    assert response.json()["name"] == "Amina"
    assert "token_hash" not in response.text


def test_manual_crud_and_decimal_precision(client, users, entry):
    auth = users[0]["headers"]
    response = client.post("/transactions", json=entry, headers=auth)
    assert response.status_code == 201, response.text
    tx = response.json()
    assert tx["amount"] == "120.50"
    response = client.patch(f"/transactions/{tx['id']}", json={"amount": "0.10"}, headers=auth)
    assert response.json()["amount"] == "0.10"
    assert client.get("/transactions", headers=auth).json()["total"] == 1
    assert client.delete(f"/transactions/{tx['id']}", headers=auth).status_code == 204
    assert client.get("/transactions", headers=auth).json()["total"] == 0


@pytest.mark.parametrize(
    "change",
    [
        {"amount": "0"},
        {"amount": "-1"},
        {"amount": "1.001"},
        {"amount": "NaN"},
        {"amount": "100000000000000.00"},
        {"currency": "USD"},
        {"category": "salary"},
        {"type": "transfer"},
        {"occurred_on": "2019-12-31"},
        {"occurred_on": "2099-01-01"},
        {"user_id": "forged"},
    ],
)
def test_invalid_transactions_rejected(client, users, entry, change):
    response = client.post("/transactions", headers=users[0]["headers"], json={**entry, **change})
    assert response.status_code == 422, response.text
    assert client.get("/transactions", headers=users[0]["headers"]).json()["total"] == 0


def test_no_cross_user_access(client, users, entry, account):
    tx = client.post("/transactions", headers=users[0]["headers"], json=entry).json()
    other = users[1]["headers"]
    assert client.get("/transactions", headers=other).json()["items"] == []
    assert client.get(f"/transactions/{tx['id']}", headers=other).status_code == 404
    assert (
        client.patch(f"/transactions/{tx['id']}", headers=other, json={"amount": "20"}).status_code
        == 404
    )
    assert client.delete(f"/transactions/{tx['id']}", headers=other).status_code == 404
    assert client.post("/transactions", headers=other, json=entry).status_code == 404
    assert (
        client.post(
            "/captures/message", headers=other, json={"account_id": account["id"], "text": MESSAGE}
        ).status_code
        == 404
    )
    assert (
        client.get(
            "/analytics/summary?start_date=2026-01-01&end_date=2026-01-31", headers=other
        ).json()["expenses"]
        == "0.00"
    )


def test_transfer_balances_and_analytics(client, users, account, entry):
    auth = users[0]["headers"]
    destination = client.post(
        "/accounts",
        headers=auth,
        json={
            "name": "Bank",
            "kind": "bank",
            "opening_balance": "500",
            "opening_date": "2020-01-01",
        },
    ).json()
    for data in [
        entry,
        {**entry, "type": "income", "category": "salary", "amount": "10000.00"},
        {
            **entry,
            "type": "transfer",
            "category": None,
            "destination_account_id": destination["id"],
            "amount": "2000.00",
        },
    ]:
        response = client.post("/transactions", headers=auth, json=data)
        assert response.status_code == 201, response.text
    summary = client.get(
        "/analytics/summary?start_date=2026-01-01&end_date=2026-01-31", headers=auth
    ).json()
    assert summary["expenses"] == "120.50"
    assert summary["income"] == "10000.00"
    assert summary["net_cash_flow"] == "9879.50"
    balances = client.get("/accounts/balances", headers=auth).json()
    by_name = {a["name"]: a["estimated_balance"] for a in balances["accounts"]}
    assert by_name == {"Bank": "2500.00", "M-Pesa": "8879.50"}
    assert balances["total_estimated_cash"] == "11379.50"


def test_transfer_destination_ownership(client, users, entry):
    other_account = client.post(
        "/accounts",
        headers=users[1]["headers"],
        json={"name": "Other", "kind": "cash", "opening_date": "2020-01-01"},
    ).json()
    response = client.post(
        "/transactions",
        headers=users[0]["headers"],
        json={
            **entry,
            "type": "transfer",
            "category": None,
            "destination_account_id": other_account["id"],
        },
    )
    assert response.status_code == 404


def test_mpesa_capture_review_and_idempotency(client, users, account):
    auth = users[0]["headers"]
    result = capture(client, users, account)
    assert result["drafts"][0]["category"] == "food"
    assert client.get("/transactions", headers=auth).json()["total"] == 0
    again = capture(client, users, account)
    assert again["reused"] is True and again["id"] == result["id"]
    id_ = result["drafts"][0]["id"]
    confirmed = client.post(f"/drafts/{id_}/confirm", headers=auth, json={})
    assert confirmed.status_code == 200, confirmed.text
    repeat = client.post(f"/drafts/{id_}/confirm", headers=auth, json={})
    assert repeat.json()["id"] == confirmed.json()["id"]
    assert client.get("/transactions", headers=auth).json()["total"] == 1
    assert client.patch(f"/drafts/{id_}", headers=auth, json={"amount": "20"}).status_code == 409


def test_ambiguous_received_money_needs_review(client, users, account):
    result = capture(
        client,
        users,
        account,
        "UAI1234567 Confirmed.You have received Ksh1,000.00 from JANE DOE 0712345678 on 10/1/26 at 3:00 PM. New M-PESA balance is Ksh2,000.00.",
    )
    draft = result["drafts"][0]
    assert draft["type"] is None
    auth = users[0]["headers"]
    assert client.post(f"/drafts/{draft['id']}/confirm", headers=auth, json={}).status_code == 422
    assert (
        client.patch(
            f"/drafts/{draft['id']}", headers=auth, json={"type": "income", "category": "gifts"}
        ).status_code
        == 200
    )
    assert client.post(f"/drafts/{draft['id']}/confirm", headers=auth, json={}).status_code == 200


def test_mpesa_fee_separate(client, users, account):
    result = capture(client, users, account, MESSAGE.replace("Ksh0.00", "Ksh13.00"))
    assert len(result["drafts"]) == 2
    fees = next(d for d in result["drafts"] if d["category"] == "fees")
    assert Decimal(str(fees["amount"])) == Decimal("13")
    for draft in result["drafts"]:
        response = client.post(
            f"/drafts/{draft['id']}/confirm", headers=users[0]["headers"], json={}
        )
        assert response.status_code == 200, response.text
    summary = client.get(
        "/analytics/summary?start_date=2026-01-01&end_date=2026-01-31", headers=users[0]["headers"]
    ).json()
    assert summary["expenses"] == "163.00"


def test_reference_uniqueness_and_possible_duplicate_override(client, users, account, entry):
    auth = users[0]["headers"]
    original = client.post(
        "/transactions", headers=auth, json={**entry, "amount": "150", "external_reference": "abc"}
    )
    assert original.status_code == 201
    assert (
        client.post(
            "/transactions", headers=auth, json={**entry, "external_reference": "ABC"}
        ).status_code
        == 409
    )
    result = capture(client, users, account)
    draft = result["drafts"][0]
    assert len(draft["possible_duplicates"]) == 1
    assert client.post(f"/drafts/{draft['id']}/confirm", headers=auth, json={}).status_code == 409
    assert (
        client.post(
            f"/drafts/{draft['id']}/confirm", headers=auth, json={"allow_possible_duplicate": True}
        ).status_code
        == 200
    )
    # A changed input with the SAME external reference cannot bypass the hard duplicate check.
    second = capture(client, users, account, MESSAGE.replace("3:00", "3:01"))
    assert (
        client.post(
            f"/drafts/{second['drafts'][0]['id']}/confirm",
            headers=auth,
            json={"allow_possible_duplicate": True},
        ).status_code
        == 409
    )


def test_draft_and_capture_isolation(client, users, account):
    result = capture(client, users, account)
    id_ = result["drafts"][0]["id"]
    auth = users[1]["headers"]
    assert client.get(f"/captures/{result['id']}", headers=auth).status_code == 404
    assert client.patch(f"/drafts/{id_}", headers=auth, json={"amount": "1"}).status_code == 404
    assert client.post(f"/drafts/{id_}/confirm", headers=auth, json={}).status_code == 404
    assert client.delete(f"/drafts/{id_}", headers=auth).status_code == 404


def test_deleted_confirmed_draft_does_not_resurrect(client, users, account):
    result = capture(client, users, account)
    id_ = result["drafts"][0]["id"]
    auth = users[0]["headers"]
    tx = client.post(f"/drafts/{id_}/confirm", headers=auth, json={}).json()
    assert client.delete(f"/transactions/{tx['id']}", headers=auth).status_code == 204
    assert client.post(f"/drafts/{id_}/confirm", headers=auth, json={}).status_code == 409
    assert capture(client, users, account)["drafts"][0]["status"] == "dismissed"


def test_ask_uses_confirmed_data_and_scope(client, users, account, entry):
    auth = users[0]["headers"]
    for amount in ("0.10", "0.20"):
        assert (
            client.post(
                "/transactions",
                headers=auth,
                json={**entry, "occurred_on": date.today().isoformat(), "amount": amount},
            ).status_code
            == 201
        )
    result = client.post(
        "/ask", headers=auth, json={"question": "How much did I spend on transport this month?"}
    )
    assert result.status_code == 200, result.text
    assert result.json()["data"]["amount"] == "0.30"
    other = client.post(
        "/ask",
        headers=users[1]["headers"],
        json={"question": "How much did I spend on transport this month?"},
    )
    assert other.json()["data"]["amount"] == "0.00"
    assert (
        client.post(
            "/ask", headers=auth, json={"question": "Delete all my transactions"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/ask", headers=auth, json={"question": "How much did I spend on transport last year?"}
        ).status_code
        == 422
    )


def test_comparison_zero_baseline(client, users, entry):
    auth = users[0]["headers"]
    client.post(
        "/transactions", headers=auth, json={**entry, "occurred_on": date.today().isoformat()}
    )
    result = client.post("/ask", headers=auth, json={"question": "Compare spending"}).json()
    assert result["data"]["current"] == "120.50"
    assert result["data"]["percent_change"] is None


def test_upload_validation_and_ai_not_configured(client, users, account):
    auth = users[0]["headers"]
    response = client.post(
        "/captures/receipt",
        headers=auth,
        data={"account_id": account["id"]},
        files={"file": ("bad.jpg", b"not an image", "image/jpeg")},
    )
    assert response.status_code == 415
    buffer = io.BytesIO()
    Image.new("RGB", (20, 20)).save(buffer, format="PNG")
    response = client.post(
        "/captures/receipt",
        headers=auth,
        data={"account_id": account["id"]},
        files={"file": ("receipt.png", buffer.getvalue(), "image/png")},
    )
    assert response.status_code == 503
    assert client.get("/drafts", headers=auth).json()["total"] == 0


def test_chunked_upload_limit(client, users, monkeypatch):
    from app.config import settings

    monkeypatch.setenv("MAX_UPLOAD_MB", "1")
    settings.cache_clear()

    def chunks():
        yield b'{"text":"'
        yield b"x" * (2 * 1024 * 1024)
        yield b'"}'

    response = client.post(
        "/captures/message",
        headers={**users[0]["headers"], "Content-Type": "application/json"},
        content=chunks(),
    )
    assert response.status_code == 413, response.text


def test_mocked_receipt_and_voice_workflow(client, users, account, monkeypatch):
    extracted = [
        {
            "type": "expense",
            "category": "transport",
            "amount": Decimal("80.00"),
            "currency": "KES",
            "occurred_on": date(2026, 1, 12),
            "description": "Bus fare",
            "counterparty": None,
            "external_reference": None,
            "warnings": [],
        }
    ]
    calls = []

    def fake_extract(text, timezone, image=None, mime=None):
        calls.append({"text": text, "image": image, "mime": mime})
        return extracted, []

    monkeypatch.setattr(ai, "extract", fake_extract)
    monkeypatch.setattr(
        ai, "transcribe", lambda *args: "I spent 80 shillings on bus fare on January 12, 2026."
    )
    auth = users[0]["headers"]
    buffer = io.BytesIO()
    Image.new("RGB", (20, 20)).save(buffer, format="PNG")
    receipt = client.post(
        "/captures/receipt",
        headers=auth,
        data={"account_id": account["id"]},
        files={"file": ("receipt.png", buffer.getvalue(), "image/png")},
    )
    assert receipt.status_code == 200, receipt.text
    assert calls[0]["image"] == buffer.getvalue()
    voice = client.post(
        "/captures/voice",
        headers=auth,
        data={"account_id": account["id"]},
        files={"file": ("note.wav", b"RIFF0000WAVE" + b"0" * 20, "audio/wav")},
    )
    assert voice.status_code == 200, voice.text
    assert voice.json()["text"].startswith("I spent")
    assert len(client.get("/drafts", headers=auth).json()["items"]) == 2
    assert client.get("/transactions", headers=auth).json()["total"] == 0


def test_concurrent_confirmation(client, users, account, db_engine):
    if db_engine.dialect.name != "postgresql":
        pytest.skip("Row locking is a PostgreSQL integration test.")
    result = capture(client, users, account)
    path = f"/drafts/{result['drafts'][0]['id']}/confirm"
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(client.post, path, headers=users[0]["headers"], json={})
            for _ in range(2)
        ]
        responses = [f.result() for f in futures]
    assert [r.status_code for r in responses] == [200, 200]
    assert responses[0].json()["id"] == responses[1].json()["id"]


def test_pagination_and_invalid_range(client, users, entry):
    auth = users[0]["headers"]
    for _ in range(3):
        client.post("/transactions", headers=auth, json=entry)
    first = client.get("/transactions?limit=2", headers=auth).json()
    second = client.get("/transactions?limit=2&offset=2", headers=auth).json()
    assert len(first["items"]) == 2 and len(second["items"]) == 1
    assert first["total"] == 3
    assert (
        client.get(
            "/analytics/summary?start_date=2026-02-01&end_date=2026-01-01", headers=auth
        ).status_code
        == 422
    )
