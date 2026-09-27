import hashlib
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import ai
from app.config import settings
from app.models import Account, Capture, Draft, Transaction
from app.parsing import parse_mpesa
from app.schemas import TransactionFields


def today(user):
    return datetime.now(ZoneInfo(user.timezone)).date()


def owned(db, model, id_, user, lock=False):
    query = select(model).where(model.id == str(id_), model.user_id == user.id)
    if lock:
        query = query.with_for_update()
    row = db.scalar(query)
    if not row:
        raise HTTPException(404, "Record not found.")
    return row


def values(schema):
    return {k: str(v) if isinstance(v, UUID) else v for k, v in schema.model_dump().items()}


def validate_transaction(db, user, data):
    try:
        fields = TransactionFields.model_validate(data)
    except ValidationError as exc:
        raise HTTPException(
            422,
            [{"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in exc.errors()],
        ) from None
    account = owned(db, Account, fields.account_id, user)
    if fields.payment_method is None:
        fields.payment_method = account.kind
    if fields.occurred_on > today(user):
        raise HTTPException(422, "Transactions cannot be future-dated in this MVP.")
    if fields.occurred_on < account.opening_date:
        raise HTTPException(422, "Transaction date precedes the account opening balance date.")
    if fields.destination_account_id:
        destination = owned(db, Account, fields.destination_account_id, user)
        if fields.occurred_on < destination.opening_date:
            raise HTTPException(
                422, "Transaction date precedes the destination account opening balance date."
            )
    return values(fields)


def duplicate_candidates(db, user, data, exclude_id=None):
    if not data.get("amount") or not data.get("occurred_on"):
        return []
    query = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.account_id == str(data["account_id"]),
        Transaction.amount == data["amount"],
        Transaction.occurred_on == data["occurred_on"],
    )
    if exclude_id:
        query = query.where(Transaction.id != exclude_id)
    return [
        {
            "id": t.id,
            "description": t.description,
            "amount": str(t.amount),
            "occurred_on": t.occurred_on.isoformat(),
        }
        for t in db.scalars(query.limit(10))
    ]


def check_reference(db, user, data, exclude_id=None):
    if not data.get("external_reference"):
        return
    query = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.account_id == data["account_id"],
        Transaction.external_reference == data["external_reference"],
    )
    if exclude_id:
        query = query.where(Transaction.id != exclude_id)
    existing = db.scalar(query)
    if existing:
        raise HTTPException(
            409,
            {
                "message": "This transaction reference is already recorded.",
                "transaction_id": existing.id,
            },
        )


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            409, "A conflicting record was saved. Refresh before retrying."
        ) from None


def transaction_data(row):
    return {name: getattr(row, name) for name in TransactionFields.model_fields}


def draft_output(db, user, draft):
    data = transaction_data(draft)
    missing = [k for k in ("type", "amount", "occurred_on") if data[k] is None]
    if draft.type in ("income", "expense") and not draft.category:
        missing.append("category")
    if draft.type == "transfer" and not draft.destination_account_id:
        missing.append("destination_account_id")
    return {
        **data,
        "amount": str(draft.amount) if draft.amount is not None else None,
        "id": draft.id,
        "capture_id": draft.capture_id,
        "source": owned(db, Capture, draft.capture_id, user).source,
        "status": draft.status,
        "warnings": draft.warnings,
        "confidence": str(draft.confidence) if draft.confidence is not None else None,
        "items": draft.items,
        "created_at": draft.created_at,
        "missing_fields": missing,
        "possible_duplicates": duplicate_candidates(db, user, data)
        if draft.status == "pending"
        else [],
    }


def capture_output(db, user, capture, reused=False):
    drafts = db.scalars(
        select(Draft)
        .where(Draft.capture_id == capture.id, Draft.user_id == user.id)
        .order_by(Draft.created_at, Draft.id)
    ).all()
    return {
        "id": capture.id,
        "source": capture.source,
        "text": capture.text,
        "warnings": capture.warnings,
        "reused": reused,
        "drafts": [draft_output(db, user, d) for d in drafts],
    }


def capture(db, user, account_id, source, *, text=None, data=None, mime=None, filename=None):
    account = owned(db, Account, account_id, user)
    raw = data if data is not None else " ".join(text.split()).encode()
    fingerprint = hashlib.sha256(raw).hexdigest()
    query = select(Capture).where(
        Capture.user_id == user.id,
        Capture.account_id == account.id,
        Capture.source == source,
        Capture.fingerprint == fingerprint,
    )
    existing = db.scalar(query)
    if existing:
        return capture_output(db, user, existing, reused=True)
    warnings = []
    if source == "receipt":
        extracted, warnings = ai.extract(None, user.timezone, image=data, mime=mime)
    else:
        if source == "voice":
            text = ai.transcribe(data, filename, mime)
        extracted = parse_mpesa(text) if source == "message" else None
        if extracted is None:
            extracted, warnings = ai.extract(text, user.timezone)
    record = Capture(
        user_id=user.id,
        account_id=account.id,
        source=source,
        fingerprint=fingerprint,
        text=text if settings().retain_source_text else None,
        warnings=warnings,
    )
    db.add(record)
    try:
        db.flush()
        for item in extracted:
            item.setdefault("payment_method", account.kind)
            db.add(Draft(user_id=user.id, capture_id=record.id, account_id=account.id, **item))
        db.commit()
    except IntegrityError:
        # A concurrent retry may have inserted this same input while AI ran.
        db.rollback()
        existing = db.scalar(query)
        if existing:
            return capture_output(db, user, existing, reused=True)
        raise HTTPException(409, "Capture conflicts with an existing record.") from None
    return {**capture_output(db, user, record), "text": text}


def manual_capture(db, user, payload):
    from uuid import uuid4

    fields = validate_transaction(db, user, payload.model_dump())
    record = Capture(
        user_id=user.id,
        account_id=fields["account_id"],
        source="manual",
        fingerprint=uuid4().hex,
        warnings=[],
    )
    db.add(record)
    db.flush()
    draft = Draft(user_id=user.id, capture_id=record.id, **fields)
    db.add(draft)
    commit(db)
    return capture_output(db, user, record)
