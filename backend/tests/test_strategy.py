from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app import ai
from app.models import Capture
from tests.test_api import capture


def test_manual_review_pipeline(client, users, entry):
    auth = users[0]["headers"]
    response = client.post("/captures/manual", headers=auth, json=entry)
    assert response.status_code == 200, response.text
    draft = response.json()["drafts"][0]
    assert draft["amount"] == "120.50"
    assert client.get("/transactions", headers=auth).json()["total"] == 0
    confirmed = client.post(f"/drafts/{draft['id']}/confirm", headers=auth, json={})
    assert confirmed.json()["source"] == "manual"


def test_source_text_not_retained_and_capture_deletion(client, users, account, db_engine):
    result = capture(client, users, account)
    assert result["text"] is not None
    with Session(db_engine) as db:
        assert db.get(Capture, result["id"]).text is None
    auth = users[0]["headers"]
    tx = client.post(f"/drafts/{result['drafts'][0]['id']}/confirm", headers=auth, json={}).json()
    assert (
        client.delete(f"/captures/{result['id']}", headers=users[1]["headers"]).status_code == 404
    )
    assert client.delete(f"/captures/{result['id']}", headers=auth).status_code == 204
    assert client.get(f"/captures/{result['id']}", headers=auth).status_code == 404
    saved = client.get(f"/transactions/{tx['id']}", headers=auth).json()
    assert saved["draft_id"] is None and saved["amount"] == "150.00"


def test_ask_evidence_matches_total_and_is_linkable(client, users, entry):
    auth = users[0]["headers"]
    for amount in ("0.10", "0.20"):
        client.post(
            "/transactions",
            headers=auth,
            json={**entry, "amount": amount, "occurred_on": date.today().isoformat()},
        )
    result = client.post(
        "/ask", headers=auth, json={"question": "How much did I spend on transport this month?"}
    ).json()
    assert result["transaction_count"] == 2
    assert sum((Decimal(t["amount"]) for t in result["evidence"]["items"]), Decimal(0)) == Decimal(
        result["data"]["amount"]
    )
    assert client.get(result["evidence"]["transactions_url"], headers=auth).json()["total"] == 2
    for record in result["evidence"]["items"]:
        assert client.get(record["url"], headers=auth).status_code == 200


def test_voice_two_expenses_remain_separate_drafts(client, users, account, monkeypatch):
    monkeypatch.setattr(
        ai, "transcribe", lambda *args: "I spent 200 shillings on lunch and 80 on transport today."
    )

    def fake_extract(*args, **kwargs):
        return [
            {
                "type": "expense",
                "category": category,
                "amount": Decimal(amount),
                "currency": "KES",
                "occurred_on": date.today(),
                "description": category,
                "counterparty": None,
                "external_reference": None,
                "warnings": [],
                "confidence": 0.9,
                "payment_method": "cash",
                "items": [],
            }
            for category, amount in [("food", "200"), ("transport", "80")]
        ], []

    monkeypatch.setattr(ai, "extract", fake_extract)
    response = client.post(
        "/captures/voice",
        headers=users[0]["headers"],
        data={"account_id": account["id"]},
        files={"file": ("note.wav", b"RIFF0000WAVE" + b"0" * 20, "audio/wav")},
    )
    assert response.status_code == 200, response.text
    assert len(response.json()["drafts"]) == 2
    assert {d["amount"] for d in response.json()["drafts"]} == {"80.00", "200.00"}


def test_delete_my_data_is_scoped(client, users, account, entry):
    client.post("/transactions", headers=users[0]["headers"], json=entry)
    capture(client, users, account)
    assert client.delete("/me/data", headers=users[1]["headers"]).status_code == 204
    assert client.get("/transactions", headers=users[0]["headers"]).json()["total"] == 1
    assert client.delete("/me/data", headers=users[0]["headers"]).status_code == 204
    for path in ("/transactions", "/drafts"):
        assert client.get(path, headers=users[0]["headers"]).json()["total"] == 0
    assert client.get("/accounts", headers=users[0]["headers"]).json() == []


def test_profile_timezone_validation(client, users):
    assert (
        client.patch(
            "/me", headers=users[0]["headers"], json={"name": "Amina", "timezone": "Invalid/Place"}
        ).status_code
        == 422
    )
    response = client.patch(
        "/me", headers=users[0]["headers"], json={"name": "Amina", "timezone": "Africa/Nairobi"}
    )
    assert response.status_code == 200
