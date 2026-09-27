from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal
from urllib.parse import urlencode

from fastapi import HTTPException
from sqlalchemy import func, or_, select

from app import ai
from app.models import Account, Transaction
from app.services import today


def money(value):
    return format(Decimal(value or 0), ".2f")


def period_dates(user, start=None, end=None):
    current = today(user)
    start = start or current.replace(day=1)
    end = end or current
    if end < start or (end - start).days > 3660:
        raise HTTPException(422, "Choose an ordered date range of at most ten years.")
    return start, end


def totals(db, user, start, end, category=None):
    filters = [
        Transaction.user_id == user.id,
        Transaction.occurred_on >= start,
        Transaction.occurred_on <= end,
    ]
    if category:
        filters.append(Transaction.category == category)
    rows = db.execute(
        select(Transaction.type, func.sum(Transaction.amount))
        .where(*filters)
        .group_by(Transaction.type)
    ).all()
    sums = {kind: amount for kind, amount in rows}
    income, expense = sums.get("income", Decimal(0)), sums.get("expense", Decimal(0))
    return {
        "income": money(income),
        "expenses": money(expense),
        "net_cash_flow": money(income - expense),
        "transfers": money(sums.get("transfer", 0)),
    }


def summary(db, user, start=None, end=None, all_time=False):
    if all_time:
        start = db.scalar(
            select(func.min(Transaction.occurred_on)).where(Transaction.user_id == user.id)
        ) or today(user)
        end = db.scalar(
            select(func.max(Transaction.occurred_on)).where(Transaction.user_id == user.id)
        ) or today(user)
    else:
        start, end = period_dates(user, start, end)
    filters = [
        Transaction.user_id == user.id,
        Transaction.occurred_on >= start,
        Transaction.occurred_on <= end,
    ]
    categories = db.execute(
        select(Transaction.category, func.sum(Transaction.amount), func.count())
        .where(*filters, Transaction.type == "expense")
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc(), Transaction.category)
    ).all()
    daily = db.execute(
        select(Transaction.occurred_on, Transaction.type, func.sum(Transaction.amount))
        .where(*filters, Transaction.type != "transfer")
        .group_by(Transaction.occurred_on, Transaction.type)
        .order_by(Transaction.occurred_on)
    ).all()
    expense_total = sum((a for _, a, _ in categories), Decimal(0))
    return {
        "start_date": start,
        "end_date": end,
        "currency": "KES",
        **totals(db, user, start, end),
        "transaction_count": db.scalar(
            select(func.count()).select_from(Transaction).where(*filters)
        ),
        "categories": [
            {
                "category": c,
                "amount": money(a),
                "count": n,
                "share_percent": money(a / expense_total * 100) if expense_total else "0.00",
            }
            for c, a, n in categories
        ],
        "daily": [{"date": d, "type": t, "amount": money(a)} for d, t, a in daily],
        "basis": "Confirmed recorded transactions only. Transfers are excluded from income and expenses.",
    }


def balances(db, user):
    result = []
    current = today(user)
    for account in db.scalars(
        select(Account).where(Account.user_id == user.id).order_by(Account.name)
    ):
        filters = [
            Transaction.user_id == user.id,
            Transaction.occurred_on >= account.opening_date,
            Transaction.occurred_on <= current,
        ]
        incoming = db.scalar(
            select(func.sum(Transaction.amount)).where(
                *filters,
                or_(
                    (Transaction.account_id == account.id) & (Transaction.type == "income"),
                    (Transaction.destination_account_id == account.id)
                    & (Transaction.type == "transfer"),
                ),
            )
        ) or Decimal(0)
        outgoing = db.scalar(
            select(func.sum(Transaction.amount)).where(
                *filters,
                Transaction.account_id == account.id,
                Transaction.type.in_(["expense", "transfer"]),
            )
        ) or Decimal(0)
        result.append(
            {
                "account_id": account.id,
                "name": account.name,
                "kind": account.kind,
                "currency": "KES",
                "estimated_balance": money(account.opening_balance + incoming - outgoing),
                "opening_date": account.opening_date,
            }
        )
    return {
        "accounts": result,
        "total_estimated_cash": money(
            sum((Decimal(a["estimated_balance"]) for a in result), Decimal(0))
        ),
        "as_of": current,
        "basis": "Estimated from opening balances and confirmed records. This is not a bank-verified balance or net worth.",
    }


def answer(db, user, question):
    plan = ai.plan_question(question, user.timezone)
    if plan.operation == "unsupported":
        raise HTTPException(
            422,
            "This question is outside the MVP. Ask about category spending, top categories, cash flow, or spending changes.",
        )
    current = today(user)
    if plan.period == "this_month":
        start, end = current.replace(day=1), current
    elif plan.period == "last_month":
        end = current.replace(day=1) - timedelta(days=1)
        start = end.replace(day=1)
    else:
        try:
            start, end = date.fromisoformat(plan.start_date), date.fromisoformat(plan.end_date)
        except (TypeError, ValueError):
            raise HTTPException(422, "Please specify a clear start and end date.") from None
    period_dates(user, start, end)
    label = f"{start.isoformat()} to {end.isoformat()}"
    result = {
        "operation": plan.operation,
        "start_date": start,
        "end_date": end,
        "currency": "KES",
        "basis": "Confirmed recorded transactions only; missing records may change these totals.",
    }
    result["evidence"] = evidence(
        db,
        user,
        start,
        end,
        plan.category if plan.operation in ("expense_total", "compare_spending") else None,
        expenses_only=plan.operation != "cash_flow",
    )
    result["transaction_count"] = result["evidence"]["total"]
    if plan.operation == "expense_total":
        data = totals(db, user, start, end, plan.category)
        text = f"You recorded KES {Decimal(data['expenses']):,.2f} in {' '.join(plan.category.split('_')) if plan.category else 'total'} expenses from {label}."
        result["data"] = {"amount": data["expenses"], "category": plan.category}
    elif plan.operation == "top_categories":
        data = summary(db, user, start, end)["categories"]
        text = (
            f"Your largest recorded spending category from {label} was {data[0]['category'].replace('_', ' ')}: KES {Decimal(data[0]['amount']):,.2f}."
            if data
            else f"No confirmed expenses were recorded from {label}."
        )
        result["data"] = data
    elif plan.operation == "cash_flow":
        data = totals(db, user, start, end)
        text = f"From {label}, recorded income was KES {Decimal(data['income']):,.2f} and expenses were KES {Decimal(data['expenses']):,.2f}. Net cash flow: KES {Decimal(data['net_cash_flow']):,.2f}."
        result["data"] = data
    else:
        if plan.period == "custom":
            raise HTTPException(422, "Spending comparisons currently support calendar months only.")
        previous_end = start - timedelta(days=1)
        previous_start = previous_end.replace(day=1)
        # Compare month-to-date with the same elapsed days of the prior month.
        if plan.period == "this_month":
            previous_end = previous_start.replace(
                day=min(end.day, monthrange(previous_start.year, previous_start.month)[1])
            )
        amount = Decimal(totals(db, user, start, end, plan.category)["expenses"])
        previous = Decimal(
            totals(db, user, previous_start, previous_end, plan.category)["expenses"]
        )
        percent = money((amount - previous) / previous * 100) if previous else None
        result["data"] = {
            "current": money(amount),
            "previous": money(previous),
            "difference": money(amount - previous),
            "percent_change": percent,
            "previous_start_date": previous_start,
            "previous_end_date": previous_end,
        }
        result["previous_evidence"] = evidence(
            db, user, previous_start, previous_end, plan.category
        )
        text = f"Recorded spending from {label} was KES {amount:,.2f}, compared with KES {previous:,.2f} from {previous_start} to {previous_end}."
    return {**result, "answer": text}


def evidence(db, user, start, end, category=None, expenses_only=True):
    filters = [
        Transaction.user_id == user.id,
        Transaction.occurred_on >= start,
        Transaction.occurred_on <= end,
    ]
    if expenses_only:
        filters.append(Transaction.type == "expense")
    else:
        filters.append(Transaction.type != "transfer")
    if category:
        filters.append(Transaction.category == category)
    count = db.scalar(select(func.count()).select_from(Transaction).where(*filters))
    rows = db.scalars(
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.occurred_on.desc(), Transaction.id)
        .limit(50)
    )
    items = [
        {
            "id": t.id,
            "url": f"/transactions/{t.id}",
            "occurred_on": t.occurred_on,
            "amount": money(t.amount),
            "type": t.type,
            "category": t.category,
            "description": t.description,
            "source": t.source,
        }
        for t in rows
    ]
    params = {"start_date": start.isoformat(), "end_date": end.isoformat(), "limit": 50}
    if expenses_only:
        params["type"] = "expense"
    else:
        params["exclude_transfers"] = "true"
    if category:
        params["category"] = category
    return {
        "items": items,
        "total": count,
        "truncated": count > 50,
        "transactions_url": "/transactions?" + urlencode(params),
    }
