from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def new_id():
    return str(uuid4())


def now():
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120))
    timezone: Mapped[str] = mapped_column(String(80), default="Africa/Nairobi")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (CheckConstraint("currency = 'KES'", name="account_kes"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(20))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(16, 2), default=0)
    opening_date: Mapped[date] = mapped_column(Date)


class Capture(Base):
    __tablename__ = "captures"
    __table_args__ = (
        UniqueConstraint("user_id", "account_id", "source", "fingerprint", name="uq_capture_input"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"))
    source: Mapped[str] = mapped_column(String(20))
    fingerprint: Mapped[str] = mapped_column(String(64))
    text: Mapped[str | None] = mapped_column(Text)
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Draft(Base):
    __tablename__ = "transaction_drafts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    capture_id: Mapped[str] = mapped_column(ForeignKey("captures.id"), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"))
    destination_account_id: Mapped[str | None] = mapped_column(ForeignKey("accounts.id"))
    type: Mapped[str | None] = mapped_column(String(20))
    category: Mapped[str | None] = mapped_column(String(40))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(16, 2))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    occurred_on: Mapped[date | None] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(500), default="")
    counterparty: Mapped[str | None] = mapped_column(String(160))
    external_reference: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    warnings: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    payment_method: Mapped[str | None] = mapped_column(String(20))
    items: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "account_id", "external_reference", name="uq_transaction_reference"
        ),
        CheckConstraint("amount > 0", name="positive_amount"),
        CheckConstraint("currency = 'KES'", name="transaction_kes"),
        CheckConstraint("type IN ('income', 'expense', 'transfer')", name="transaction_type"),
        CheckConstraint(
            "(type = 'transfer' AND destination_account_id IS NOT NULL AND destination_account_id <> account_id AND category IS NULL) OR (type <> 'transfer' AND destination_account_id IS NULL AND category IS NOT NULL)",
            name="transfer_shape",
        ),
        Index("ix_transaction_owner_date", "user_id", "occurred_on"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"))
    destination_account_id: Mapped[str | None] = mapped_column(ForeignKey("accounts.id"))
    draft_id: Mapped[str | None] = mapped_column(ForeignKey("transaction_drafts.id"), unique=True)
    type: Mapped[str] = mapped_column(String(20))
    category: Mapped[str | None] = mapped_column(String(40))
    amount: Mapped[Decimal] = mapped_column(Numeric(16, 2))
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    occurred_on: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(500), default="")
    counterparty: Mapped[str | None] = mapped_column(String(160))
    external_reference: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(20), default="manual")
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))
    payment_method: Mapped[str | None] = mapped_column(String(20))
    items: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
