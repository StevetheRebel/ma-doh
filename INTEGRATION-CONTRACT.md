# Ma-Doh Integration Contract

This document defines how the main technical parts of Ma-Doh should connect.

## 1. Shared transaction structure

All financial input methods must eventually produce the shared `TransactionDraft` structure defined in:

`frontend/src/types/transaction.ts`

The input source should not create its own incompatible transaction format.

Examples of input sources:

- Receipt
- M-Pesa or bank message
- Voice entry
- Manual entry

All of them should flow into the same transaction model.

## 2. Message extraction

Input:

Transaction message text.

Example:

`Confirmed. Ksh2,500.00 sent to JOHN DOE on 22/9/26 at 10:42 AM.`

Output:

`TransactionDraft`

The implementation belongs in:

`frontend/src/lib/ai/extract-message.ts`

## 3. Receipt extraction

Input:

Receipt image.

Output:

`TransactionDraft`

The implementation belongs in:

`frontend/src/lib/ai/extract-receipt.ts`

The extracted transaction should include relevant fields such as:

- Amount
- Merchant
- Date
- Category
- Source
- Confidence level

## 4. Voice extraction

Input:

Audio recording.

Output:

`TransactionDraft[]`

The implementation belongs in:

`frontend/src/lib/ai/extract-voice.ts`

Voice returns an array because one spoken sentence might contain more than one transaction.

Example:

`I spent 350 shillings on lunch and 200 on a matatu.`

This should produce two transaction drafts.

## 5. User verification rule

AI-generated financial information must not go directly into permanent transaction history.

The required flow is:

Input

→ AI extraction

→ TransactionDraft

→ User review

→ User edits if needed

→ User confirmation

→ Transaction

The confirmation logic belongs in:

`frontend/src/lib/transactions/confirm.ts`

Only confirmed transactions should have:

- A permanent transaction ID
- `verified: true`

## 6. Financial calculation rule

Normal financial calculations must use application code.

The calculation logic belongs in:

`frontend/src/lib/calculations/financial.ts`

Examples include:

- Total income
- Total expenses
- Net cash flow
- Category totals
- Transaction counts
- Monthly differences
- Asset totals
- Liability totals
- Net financial position

AI should explain financial information, not calculate basic totals.

## 7. Transfer rule

Transfers need separate treatment.

Moving money between accounts owned by the same user should not automatically count as an expense.

Example:

Bank account → M-Pesa

This should use:

`type: "transfer"`

rather than:

`type: "expense"`

This prevents double-counting.

## 8. Currency

The first version of Ma-Doh uses:

`KES`

All transaction amounts should be stored as numbers.

Correct:

`2500`

Incorrect:

`"KSh 2,500"`

Formatting should happen in the interface.

## 9. Date format

Transactions should use a consistent date format:

`YYYY-MM-DD`

Example:

`2026-09-22`

Input features should normalize dates before returning a transaction draft.

## 10. Transaction source

Each transaction draft should identify its source.

Allowed sources are:

- `receipt`
- `message`
- `voice`
- `manual`

## 11. AI confidence

AI-based extraction should include a confidence value where available.

Example:

`confidence: 0.94`

The user still reviews the transaction before confirmation.

## 12. Integration responsibility

Each feature owner should return data using the shared transaction contract.

Feature code should not invent separate transaction formats.

The Technical and Integration Lead reviews integration points before features are merged.

## 13. Build requirement

Before merging technical changes, run:

`npm run build`

The build must pass.

## 14. Branch rule

Feature work should happen on feature branches.

Avoid direct development on `main`.

Changes should be reviewed before merging into `main`.

## 15. Demo data

Hackathon demonstrations should use synthetic financial information.

Do not use real bank credentials, PINs, passwords, or private banking history.

## 16. Core technical flow

The expected system flow is:

Input

→ Extraction

→ TransactionDraft

→ User review

→ Confirmed Transaction

→ Storage

→ Financial calculations

→ AI interpretation

→ Dashboard and financial insights