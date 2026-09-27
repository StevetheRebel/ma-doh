from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app import ai, analytics, services
from app.auth import current_user
from app.config import settings
from app.db import get_db
from app.limits import BodySizeLimit
from app.models import Account, Capture, Draft, Transaction, User
from app.schemas import (
    CATEGORIES,
    AccountCreate,
    AccountOut,
    AskRequest,
    CaptureOut,
    ConfirmRequest,
    DraftOut,
    DraftPage,
    DraftPatch,
    MessageCapture,
    ProfilePatch,
    TransactionFields,
    TransactionOut,
    TransactionPage,
    TransactionPatch,
)
from app.uploads import read_upload

app = FastAPI(
    title="Ma-Doh API",
    version="0.1.0",
    description="Backend-only personal financial intelligence. Sign in through Supabase Auth, then authorize with the session access_token. Four capture paths produce reviewable drafts; confirmed records power deterministic insights.",
)
DB = Annotated[Session, Depends(get_db)]
Owner = Annotated[User, Depends(current_user)]
app.add_middleware(BodySizeLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not echo financial documents or authentication input in error responses.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"field": ".".join(map(str, e["loc"])), "message": e["msg"]} for e in exc.errors()
            ]
        },
    )


@app.middleware("http")
async def response_headers(request: Request, call_next):
    size = request.headers.get("content-length")
    if size:
        try:
            too_large = int(size) > settings().max_upload_mb * 1024 * 1024 + 65536
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid content length."})
        if too_large:
            return JSONResponse(
                status_code=413, content={"detail": "Request exceeds upload limit."}
            )
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/health", tags=["System"])
def health(db: DB):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "ai_enabled": ai.ai_enabled()}


@app.get("/me", tags=["Accounts"])
def me(user: Owner):
    return {
        "id": user.id,
        "name": user.name,
        "timezone": user.timezone,
        "currency": "KES",
        "ai_enabled": ai.ai_enabled(),
    }


@app.patch("/me", tags=["Accounts"])
def update_profile(payload: ProfilePatch, db: DB, user: Owner):
    user.name = payload.name
    user.timezone = payload.timezone
    services.commit(db)
    return me(user)


@app.delete("/me/data", status_code=204, tags=["Privacy"])
def delete_financial_data(db: DB, user: Owner):
    from sqlalchemy import delete

    for model in (Transaction, Draft, Capture, Account):
        db.execute(delete(model).where(model.user_id == user.id))
    services.commit(db)
    return Response(status_code=204)


@app.get("/categories", tags=["Transactions"])
def categories(user: Owner):
    return CATEGORIES


@app.post("/accounts", response_model=AccountOut, status_code=201, tags=["Accounts"])
def create_account(payload: AccountCreate, db: DB, user: Owner):
    if payload.opening_date > services.today(user):
        raise HTTPException(422, "Opening balance date cannot be in the future.")
    account = Account(user_id=user.id, **payload.model_dump())
    db.add(account)
    services.commit(db)
    return account


@app.get("/accounts", response_model=list[AccountOut], tags=["Accounts"])
def list_accounts(db: DB, user: Owner):
    return db.scalars(
        select(Account).where(Account.user_id == user.id).order_by(Account.name)
    ).all()


@app.get("/accounts/balances", tags=["Accounts"])
def account_balances(db: DB, user: Owner):
    return analytics.balances(db, user)


@app.post("/transactions", response_model=TransactionOut, status_code=201, tags=["Transactions"])
def create_transaction(payload: TransactionFields, db: DB, user: Owner):
    data = services.validate_transaction(db, user, payload.model_dump())
    services.check_reference(db, user, data)
    transaction = Transaction(user_id=user.id, source="manual", **data)
    db.add(transaction)
    services.commit(db)
    return transaction


@app.get("/transactions", response_model=TransactionPage, tags=["Transactions"])
def list_transactions(
    db: DB,
    user: Owner,
    start_date: date | None = None,
    end_date: date | None = None,
    account_id: UUID | None = None,
    type: Literal["income", "expense", "transfer"] | None = None,
    category: str | None = None,
    exclude_transfers: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422, "Start date must precede end date.")
    filters = [Transaction.user_id == user.id]
    if start_date:
        filters.append(Transaction.occurred_on >= start_date)
    if end_date:
        filters.append(Transaction.occurred_on <= end_date)
    if account_id:
        services.owned(db, Account, account_id, user)
        filters.append(
            (Transaction.account_id == str(account_id))
            | (Transaction.destination_account_id == str(account_id))
        )
    if type:
        filters.append(Transaction.type == type)
    if category:
        filters.append(Transaction.category == category)
    if exclude_transfers:
        filters.append(Transaction.type != "transfer")
    rows = db.scalars(
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.occurred_on.desc(), Transaction.created_at.desc(), Transaction.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [TransactionOut.model_validate(row) for row in rows],
        "total": db.scalar(select(func.count()).select_from(Transaction).where(*filters)),
        "limit": limit,
        "offset": offset,
    }


@app.get("/transactions/{id}", response_model=TransactionOut, tags=["Transactions"])
def get_transaction(id: UUID, db: DB, user: Owner):
    return services.owned(db, Transaction, id, user)


@app.patch("/transactions/{id}", response_model=TransactionOut, tags=["Transactions"])
def patch_transaction(id: UUID, payload: TransactionPatch, db: DB, user: Owner):
    row = services.owned(db, Transaction, id, user, lock=True)
    data = services.validate_transaction(
        db, user, {**services.transaction_data(row), **payload.model_dump(exclude_unset=True)}
    )
    services.check_reference(db, user, data, exclude_id=row.id)
    for key, value in data.items():
        setattr(row, key, value)
    services.commit(db)
    return row


@app.delete("/transactions/{id}", status_code=204, tags=["Transactions"])
def delete_transaction(id: UUID, db: DB, user: Owner):
    row = services.owned(db, Transaction, id, user, lock=True)
    if row.draft_id:
        draft = services.owned(db, Draft, row.draft_id, user, lock=True)
        draft.status = "dismissed"
    db.delete(row)
    services.commit(db)
    return Response(status_code=204)


@app.post("/captures/message", response_model=CaptureOut, tags=["Capture"])
def capture_message(payload: MessageCapture, db: DB, user: Owner):
    return services.capture(db, user, payload.account_id, "message", text=payload.text)


@app.post("/captures/manual", response_model=CaptureOut, tags=["Capture"])
def capture_manual(payload: TransactionFields, db: DB, user: Owner):
    return services.manual_capture(db, user, payload)


@app.post("/captures/receipt", response_model=CaptureOut, tags=["Capture"])
def capture_receipt(
    db: DB, user: Owner, account_id: Annotated[UUID, Form()], file: Annotated[UploadFile, File()]
):
    services.owned(db, Account, account_id, user)
    data, mime, filename = read_upload(file, "receipt")
    return services.capture(
        db, user, account_id, "receipt", data=data, mime=mime, filename=filename
    )


@app.post("/captures/voice", response_model=CaptureOut, tags=["Capture"])
def capture_voice(
    db: DB, user: Owner, account_id: Annotated[UUID, Form()], file: Annotated[UploadFile, File()]
):
    services.owned(db, Account, account_id, user)
    data, mime, filename = read_upload(file, "voice")
    return services.capture(db, user, account_id, "voice", data=data, mime=mime, filename=filename)


@app.get("/captures/{id}", response_model=CaptureOut, tags=["Capture"])
def get_capture(id: UUID, db: DB, user: Owner):
    return services.capture_output(db, user, services.owned(db, Capture, id, user))


@app.delete("/captures/{id}", status_code=204, tags=["Privacy"])
def delete_capture(id: UUID, db: DB, user: Owner):
    from sqlalchemy import delete, update

    row = services.owned(db, Capture, id, user, lock=True)
    draft_ids = select(Draft.id).where(Draft.capture_id == row.id, Draft.user_id == user.id)
    db.execute(
        update(Transaction)
        .where(Transaction.user_id == user.id, Transaction.draft_id.in_(draft_ids))
        .values(draft_id=None)
    )
    db.execute(delete(Draft).where(Draft.capture_id == row.id, Draft.user_id == user.id))
    db.delete(row)
    services.commit(db)
    return Response(status_code=204)


@app.get("/drafts/{id}", response_model=DraftOut, tags=["Draft review"])
def get_draft(id: UUID, db: DB, user: Owner):
    return services.draft_output(db, user, services.owned(db, Draft, id, user))


@app.get("/drafts", response_model=DraftPage, tags=["Draft review"])
def list_drafts(
    db: DB,
    user: Owner,
    status: Literal["pending", "confirmed", "dismissed"] = "pending",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    filters = [Draft.user_id == user.id, Draft.status == status]
    rows = db.scalars(
        select(Draft)
        .where(*filters)
        .order_by(Draft.created_at.desc(), Draft.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [services.draft_output(db, user, d) for d in rows],
        "total": db.scalar(select(func.count()).select_from(Draft).where(*filters)),
        "limit": limit,
        "offset": offset,
    }


@app.patch("/drafts/{id}", response_model=DraftOut, tags=["Draft review"])
def patch_draft(id: UUID, payload: DraftPatch, db: DB, user: Owner):
    row = services.owned(db, Draft, id, user, lock=True)
    if row.status != "pending":
        raise HTTPException(409, "Only pending drafts can be edited.")
    updates = payload.model_dump(exclude_unset=True)
    for key in ("account_id", "destination_account_id"):
        if key in updates and updates[key]:
            services.owned(db, Account, updates[key], user)
            updates[key] = str(updates[key])
    if "account_id" in updates and updates["account_id"] is None:
        raise HTTPException(422, "Account cannot be empty.")
    if "description" in updates and updates["description"] is None:
        raise HTTPException(422, "Description cannot be null.")
    if updates.get("external_reference"):
        updates["external_reference"] = updates["external_reference"].upper()
    elif "external_reference" in updates:
        updates["external_reference"] = None
    for key, value in updates.items():
        setattr(row, key, value)
    services.commit(db)
    return services.draft_output(db, user, row)


@app.post("/drafts/{id}/confirm", response_model=TransactionOut, tags=["Draft review"])
def confirm_draft(id: UUID, payload: ConfirmRequest, db: DB, user: Owner):
    row = services.owned(db, Draft, id, user, lock=True)
    if row.status == "confirmed":
        return db.scalar(
            select(Transaction).where(
                Transaction.draft_id == row.id, Transaction.user_id == user.id
            )
        )
    if row.status != "pending":
        raise HTTPException(
            409, "Dismissed drafts cannot be confirmed. Capture a new entry if needed."
        )
    data = services.validate_transaction(db, user, services.transaction_data(row))
    services.check_reference(db, user, data)
    duplicates = services.duplicate_candidates(db, user, data)
    if duplicates and not payload.allow_possible_duplicate:
        raise HTTPException(
            409,
            {
                "message": "A similar transaction exists. Check it before confirming with allow_possible_duplicate=true.",
                "possible_duplicates": duplicates,
            },
        )
    capture = services.owned(db, Capture, row.capture_id, user)
    transaction = Transaction(
        user_id=user.id,
        draft_id=row.id,
        source=capture.source,
        confidence=row.confidence,
        items=row.items,
        **data,
    )
    db.add(transaction)
    row.status = "confirmed"
    services.commit(db)
    return transaction


@app.delete("/drafts/{id}", status_code=204, tags=["Draft review"])
def dismiss_draft(id: UUID, db: DB, user: Owner):
    row = services.owned(db, Draft, id, user, lock=True)
    if row.status == "confirmed":
        raise HTTPException(409, "Delete the confirmed transaction instead.")
    row.status = "dismissed"
    services.commit(db)
    return Response(status_code=204)


@app.get("/analytics/summary", tags=["Insights"])
def get_summary(
    db: DB,
    user: Owner,
    start_date: date | None = None,
    end_date: date | None = None,
    all_time: bool = False,
):
    if all_time and (start_date or end_date):
        raise HTTPException(422, "Use all_time or an explicit date range, not both.")
    return analytics.summary(db, user, start_date, end_date, all_time=all_time)


@app.post("/ask", tags=["Insights"])
def ask(payload: AskRequest, db: DB, user: Owner):
    return analytics.answer(db, user, payload.question)


@app.get("/", include_in_schema=False)
def root():
    return {"service": "Ma-Doh", "docs": "/docs", "health": "/health"}
