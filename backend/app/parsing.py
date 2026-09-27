import re
from datetime import datetime
from decimal import Decimal

from app.schemas import CATEGORIES

CATEGORY_WORDS = {
    "transport": ("uber", "bolt", "matatu", "boda", "bus fare", "taxi", "fuel"),
    "food": (
        "restaurant",
        "cafe",
        "lunch",
        "dinner",
        "naivas",
        "carrefour",
        "quickmart",
        "groceries",
    ),
    "rent": ("rent",),
    "utilities": ("kplc", "electricity", "water bill", "airtime", "internet"),
    "health": ("hospital", "pharmacy", "clinic"),
    "education": ("school", "tuition"),
    "entertainment": ("netflix", "spotify", "cinema"),
}


def suggest_category(text, type_):
    if type_ not in CATEGORIES:
        return None
    if type_ == "expense":
        for category, words in CATEGORY_WORDS.items():
            if any(re.search(rf"\b{re.escape(word)}\b", text.lower()) for word in words):
                return category
        return "other_expense"
    return "other_income"


def parse_mpesa(text):
    """Conservative parser for common confirmed payment, send, and receipt messages.

    Unsupported templates (including reversals) fall back to AI, never guess.
    """
    text = " ".join(text.split())
    reference = re.match(r"^([A-Z0-9]{10})\s+Confirmed\.?\s*", text, re.I)
    if not reference or len(re.findall(r"\bConfirmed\b", text, re.I)) != 1:
        return None
    if re.search(r"\b(reversed|reversal|failed|fuliza|loan|withdraw|deposit)\b", text, re.I):
        return None
    outbound = re.search(
        r"Ksh\s*([\d,]+\.\d{2})\s+(paid to|sent to)\s+(.+?)\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})\b",
        text,
        re.I,
    )
    inbound = re.search(
        r"received\s+Ksh\s*([\d,]+\.\d{2})\s+from\s+(.+?)\s+on\s+(\d{1,2}/\d{1,2}/\d{2,4})\b",
        text,
        re.I,
    )
    if outbound:
        amount, action, party, day = outbound.groups()
        type_ = "expense" if action.lower() == "paid to" else None
    elif inbound:
        amount, party, day = inbound.groups()
        type_ = None
    else:
        return None
    try:
        occurred_on = datetime.strptime(
            day, "%d/%m/%Y" if len(day.split("/")[-1]) == 4 else "%d/%m/%y"
        ).date()
        amount = Decimal(amount.replace(",", ""))
        if amount <= 0 or amount >= Decimal("100000000000000"):
            return None
    except ValueError:
        return None
    warnings = (
        []
        if type_
        else [
            "Money sent/received may be a transfer, income, expense, or loan. Choose the type before confirming; do not treat borrowing as income."
        ]
    )
    # Phone numbers are not needed for categorization and need not be retained in the counterparty field.
    party = re.sub(r"\s+(?:\+?254|0)\d{9}\b", "", party)[:160]
    result = [
        {
            "type": type_,
            "category": suggest_category(party, type_),
            "amount": amount,
            "currency": "KES",
            "payment_method": "mpesa",
            "occurred_on": occurred_on,
            "description": f"M-Pesa {'received from' if inbound else action.lower()} {party}"[:500],
            "counterparty": party,
            "external_reference": reference[1].upper(),
            "warnings": warnings,
        }
    ]
    fee = re.search(r"Transaction cost,?\s*Ksh\s*([\d,]+\.\d{2})", text, re.I)
    if fee and Decimal(fee[1].replace(",", "")) > 0:
        result.append(
            {
                **result[0],
                "type": "expense",
                "category": "fees",
                "amount": Decimal(fee[1].replace(",", "")),
                "description": "M-Pesa transaction fee",
                "counterparty": "M-Pesa",
                "external_reference": reference[1].upper() + ":FEE",
                "warnings": [],
            }
        )
    return result
