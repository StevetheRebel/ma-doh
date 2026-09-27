from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CATEGORIES = {
    "income": ["salary", "business", "gifts", "other_income"],
    "expense": [
        "food",
        "transport",
        "rent",
        "utilities",
        "shopping",
        "health",
        "education",
        "entertainment",
        "fees",
        "other_expense",
    ],
}
TransactionType = Literal["income", "expense", "transfer"]
Category = Literal[
    "salary",
    "business",
    "gifts",
    "other_income",
    "food",
    "transport",
    "rent",
    "utilities",
    "shopping",
    "health",
    "education",
    "entertainment",
    "fees",
    "other_expense",
]
Money = Annotated[Decimal, Field(gt=0, max_digits=16, decimal_places=2)]
Balance = Annotated[Decimal, Field(max_digits=16, decimal_places=2)]


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)


class AccountCreate(Schema):
    name: str = Field(min_length=1, max_length=80)
    kind: Literal["mpesa", "bank", "cash"]
    opening_balance: Balance = Decimal("0")
    opening_date: date
    currency: Literal["KES"] = "KES"


class AccountOut(AccountCreate):
    id: str


class ReceiptItem(Schema):
    description: str = Field(max_length=200)
    amount: Balance | None = None


class ProfilePatch(Schema):
    name: str = Field(min_length=1, max_length=120)
    timezone: str = "Africa/Nairobi"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Use a valid IANA timezone, for example Africa/Nairobi.") from None
        return value


class TransactionFields(Schema):
    account_id: UUID
    destination_account_id: UUID | None = None
    type: TransactionType
    category: Category | None = None
    amount: Money
    currency: Literal["KES"] = "KES"
    occurred_on: date
    description: str = Field(default="", max_length=500)
    counterparty: str | None = Field(default=None, max_length=160)
    external_reference: str | None = Field(default=None, max_length=100)
    payment_method: Literal["mpesa", "bank", "cash", "card", "other"] | None = None

    @field_validator("external_reference")
    @classmethod
    def normalize_reference(cls, value):
        return value.upper() if value else None

    @model_validator(mode="after")
    def consistent(self):
        if self.type == "transfer":
            if not self.destination_account_id or self.destination_account_id == self.account_id:
                raise ValueError("A transfer needs a different destination account.")
            if self.category is not None:
                raise ValueError("Transfers do not have spending categories.")
        elif self.destination_account_id is not None:
            raise ValueError("Only transfers can have a destination account.")
        elif self.category not in CATEGORIES[self.type]:
            raise ValueError("Select a category matching the transaction type.")
        return self


class TransactionOut(TransactionFields):
    id: str
    source: str
    draft_id: str | None
    confidence: Decimal | None
    items: list[ReceiptItem]
    created_at: datetime
    updated_at: datetime


class TransactionPatch(Schema):
    account_id: UUID | None = None
    destination_account_id: UUID | None = None
    type: TransactionType | None = None
    category: Category | None = None
    amount: Money | None = None
    occurred_on: date | None = None
    description: str | None = Field(default=None, max_length=500)
    counterparty: str | None = Field(default=None, max_length=160)
    external_reference: str | None = Field(default=None, max_length=100)
    payment_method: Literal["mpesa", "bank", "cash", "card", "other"] | None = None


class DraftPatch(TransactionPatch):
    pass


class ConfirmRequest(Schema):
    allow_possible_duplicate: bool = False


class MessageCapture(Schema):
    account_id: UUID
    text: str = Field(min_length=1, max_length=12000)


class DuplicateOut(Schema):
    id: str
    description: str
    amount: Decimal
    occurred_on: date


class DraftOut(Schema):
    id: str
    capture_id: str
    source: str
    account_id: str
    destination_account_id: str | None
    type: TransactionType | None
    category: Category | None
    amount: Decimal | None
    currency: Literal["KES"]
    occurred_on: date | None
    description: str
    counterparty: str | None
    external_reference: str | None
    payment_method: str | None
    status: Literal["pending", "confirmed", "dismissed"]
    confidence: Decimal | None
    items: list[ReceiptItem]
    warnings: list[str]
    missing_fields: list[str]
    possible_duplicates: list[DuplicateOut]
    created_at: datetime


class CaptureOut(Schema):
    id: str
    source: str
    text: str | None
    warnings: list[str]
    reused: bool
    drafts: list[DraftOut]


class DraftPage(Schema):
    items: list[DraftOut]
    total: int
    limit: int
    offset: int


class TransactionPage(Schema):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int


class ExtractedTransaction(Schema):
    # Required-but-nullable fields give the model a way to acknowledge uncertainty.
    type: TransactionType | None
    category: Category | None
    amount: str | None
    currency: str | None
    occurred_on: str | None
    description: str
    counterparty: str | None
    external_reference: str | None
    warnings: list[str]
    confidence: float | None = Field(default=None, ge=0, le=1)
    payment_method: Literal["mpesa", "bank", "cash", "card", "other"] | None = None
    items: list[ReceiptItem] = Field(default_factory=list, max_length=100)


class Extraction(Schema):
    transactions: list[ExtractedTransaction]
    warnings: list[str]


class AskRequest(Schema):
    question: str = Field(min_length=3, max_length=1000)


class AskPlan(Schema):
    operation: Literal[
        "expense_total", "top_categories", "cash_flow", "compare_spending", "unsupported"
    ]
    period: Literal["this_month", "last_month", "custom"]
    category: Category | None
    start_date: str | None
    end_date: str | None
