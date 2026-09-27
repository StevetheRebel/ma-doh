# Ma-Doh backend

Personal financial intelligence for KES, built with **FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Supabase Auth, and OpenAI**. This is a backend-only implementation. Swagger at `/docs` is an API explorer, not a product frontend.

Receipt photos, voice recordings, pasted messages, and manual input become reviewable drafts. Only confirmed transactions affect income, spending, category totals, and estimated account balances. Ask My Money selects an approved query; SQL computes its answer and returns supporting records.

## Start here

Requirements: Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/), and a free Supabase project. Docker is optional for local PostgreSQL.

```bash
cd outputs/money-assistant
cp .env.example .env
uv sync --frozen
```

Edit `.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://YOUR_DATABASE_USER:YOUR_PASSWORD@YOUR_HOST:5432/postgres?sslmode=require
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
CORS_ORIGINS=["http://localhost:5173"]
```

Then:

```bash
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API explorer: http://localhost:8000/docs
- Contract: http://localhost:8000/openapi.json (also exported in `openapi.json`)
- Health: http://localhost:8000/health

`OPENAI_API_KEY` is optional for manual transactions, recognized M-Pesa messages, analytics, and the four example questions below. It is required for receipt images, voice, bank/free-form text extraction, and more flexible question phrasing. Missing keys return explicit errors, never fabricated transactions.

## Supabase: database and hosted authentication

1. Create a project in [Supabase](https://supabase.com/dashboard). Save its database password privately.
2. In **Connect**, copy the PostgreSQL connection string. For an IPv4-only backend, use the **session pooler**, typically port 5432. Use the exact host and username displayed; the pooled username includes your project reference. Change the scheme to `postgresql+psycopg://`, URL-encode special password characters, and require SSL. Use the direct/session connection for migrations; do not use a transaction pooler for this setup.
3. Copy the project URL and **publishable key** from project settings to `.env`. The legacy **anon** key also works. This backend does not need your service-role key or JWT signing secret.
4. Create an email/password test user under **Authentication → Users**. For a synthetic-data demo, you can explicitly confirm that test user in the dashboard. For public email signup/magic links, configure your own SMTP provider. Supabase's built-in mail service is restricted to project-team addresses and is rate limited; Google sign-in is another option your frontend can enable.
5. Run the migrations. The `users.id` in this application's public schema is the verified Supabase Auth user ID; the profile is created on the first authenticated API request. Supabase owns identity/password/session management. The app stores only its display name/timezone.

Supabase's documented Free plan currently includes **50,000 monthly active users** and **500 MB PostgreSQL storage** (checked 27 September 2026). Free projects can pause after inactivity; verify your project before the demo. Auth, database, email-provider, and AI usage limits are separate.

Sign in without building a frontend:

```bash
# Prompts for the Supabase test user's password without echoing it.
export ACCESS_TOKEN="$(uv run python scripts/get_token.py --email you@example.com)"
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8000/me
```

Or paste the resulting access token into **Authorize** in `/docs`. Use the **session access token**, not the project publishable key. When the token expires, sign in again. A frontend should use Supabase's SDK to manage sign-in and refresh tokens, then send `Authorization: Bearer <session.access_token>` to this API.

The API validates tokens by calling your project's `/auth/v1/user` endpoint on every request. This supports both asymmetric and legacy Supabase signing keys and fails closed when verification is unavailable. There is no local auth bypass. It adds an auth-network round trip; caching/JWKS optimization can be added later if needed.

Migrations enable **row-level security with no public policies** on financial tables to block direct browser/Data API access. The server's database connection must be the table owner (the dashboard-provided `postgres` connection is suitable for this MVP). That connection bypasses RLS, so all backend queries independently enforce verified user ownership. Never put `DATABASE_URL` in a frontend.

Sources: [plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase), [database connections](https://supabase.com/docs/guides/database/connecting-to-postgres), [token verification](https://supabase.com/docs/guides/auth/jwts), [email limitations](https://supabase.com/docs/guides/auth/auth-smtp).

## API workflow

1. Create an account with a start-of-day opening balance.
2. Capture a receipt, voice recording, message, or manual entry.
3. Inspect `drafts`, `warnings`, `missing_fields`, and `possible_duplicates`.
4. `PATCH /drafts/{id}` to correct the fields.
5. `POST /drafts/{id}/confirm` with `{}` to commit it.
6. Read `/analytics/summary`, `/accounts/balances`, and `/ask`.

All financial routes require the Supabase bearer token.

| Method | Endpoint | Purpose |
|---|---|---|
| GET / PATCH | `/me` | Profile and timezone |
| POST / GET | `/accounts` | Create/list your accounts |
| GET | `/accounts/balances` | Estimated balances across accounts |
| GET | `/categories` | Allowed categories by type |
| POST | `/captures/manual` | Manual input through the shared draft flow |
| POST | `/captures/message` | Recognized M-Pesa parser or AI text extraction |
| POST | `/captures/receipt` | JPEG, PNG, or WebP receipt extraction |
| POST | `/captures/voice` | WAV, MP3, WebM, or MP4/M4A transcription and extraction |
| GET / DELETE | `/captures/{id}` | Retrieve or erase capture and drafts; confirmed records remain |
| GET | `/drafts` | Paginated drafts, filter `status` |
| GET / PATCH / DELETE | `/drafts/{id}` | Inspect, correct, or dismiss a draft |
| POST | `/drafts/{id}/confirm` | Idempotent confirmation |
| POST | `/transactions` | Direct manual save after the caller's review |
| GET | `/transactions` | Pagination; date, account, type, and category filters |
| GET / PATCH / DELETE | `/transactions/{id}` | Confirmed transaction detail/correction/deletion |
| GET | `/analytics/summary` | Income, expenses, net cash flow, categories/shares, daily totals |
| POST | `/ask` | Supported question, deterministic result, and evidence |
| DELETE | `/me/data` | Erase this user's financial records; retain the profile/Auth account |

Account creation:

```bash
curl -X POST http://localhost:8000/accounts \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"M-Pesa","kind":"mpesa","opening_balance":"5000.00","opening_date":"2026-01-01"}'
```

Use the returned account ID:

```bash
export ACCOUNT_ID='REPLACE_WITH_ACCOUNT_ID'
curl -X POST http://localhost:8000/captures/receipt \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "account_id=$ACCOUNT_ID" -F 'file=@receipt.jpg'

curl -X POST http://localhost:8000/captures/voice \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "account_id=$ACCOUNT_ID" -F 'file=@voice-note.webm'
```

See `examples/requests.http` for a synthetic message and the review/confirmation flow. Use synthetic records for demos; no PINs, OTPs, bank credentials, background SMS access, or bank connections are needed.

## Transaction contract and financial rules

The executable contract is `app/schemas.py` and `/openapi.json`. All four capture endpoints return the same `CaptureOut` with a `drafts` array. A draft may have null amount, date, type, or category. Confirmation requires valid, complete values. Fields use **snake_case** for this backend; this mapping lets the frontend align the strategy document's example without guessing:

| Strategy example | Backend field |
|---|---|
| `merchant` | `counterparty` |
| `transactionDate` | `occurred_on` (ISO date; date-only MVP) |
| `paymentMethod` | `payment_method` (`mpesa`, `bank`, `cash`, `card`, `other`) |
| `reference` | `external_reference` |
| `verificationStatus` | Draft `status`: `pending`, `confirmed`, `dismissed` |
| `createdAt` | `created_at` |
| `confidence` | `confidence`: optional original model estimate, not calibrated accuracy |

- Amounts use `Decimal` and PostgreSQL `NUMERIC(16,2)`. JSON money is a **decimal string**, e.g. `"1250.00"`; clients should preserve that precision.
- Only KES is supported. Foreign currency is rejected, never silently relabelled or converted.
- Confirmed types: `income`, `expense`, `transfer`. Uncertain drafts use `null`, not an invented classification. Loans/refunds/reversals need review and do not automatically become income.
- Transfers require two distinct, owned accounts. They move balances but do not inflate income or expenses. Explicit M-Pesa fees are separate expenses with a `:FEE` reference suffix.
- Opening balance is at the **start of opening_date**. Earlier transactions and future-dated confirmations are rejected. Balances are estimates from recorded activity, not synced account balances or net worth.
- Dates are stored at day granularity. Monthly questions use the user's IANA timezone (default `Africa/Nairobi`). Precise transaction timestamps and accrual accounting are deferred.
- Receipt line items are supporting metadata, never added to the receipt total a second time. Confidence does not bypass review and remains the original extraction estimate after corrections.
- Identical source/account captures reuse the original drafts. Reference uniqueness is enforced per user/account. Similar same-account/date/amount transactions require explicit duplicate acknowledgement at draft confirmation. Distinct manual entries may legitimately have identical amounts.
- Editing a draft does not change the original extraction warnings/confidence. Confirming performs all validation again. Deleting a confirmed transaction dismisses its original draft so replaying the capture cannot silently resurrect it.

## Ask My Money

These work without an AI key:

- `How much did I spend on transport this month?`
- `Where is most of my money going?`
- `Show my cash flow`
- `Compare spending`

OpenAI can translate other phrasing/custom periods into the same approved query schema. It never receives database credentials or executes SQL. Unsupported requests return 422 rather than a fabricated answer.

Answers contain the inclusive date range, decimal totals, `transaction_count`, and up to 50 supporting records with `/transactions/{id}` links. `evidence.total`, `evidence.truncated`, and `evidence.transactions_url` support pagination. Comparisons also return `previous_evidence`. Month-to-date compares against the same elapsed days in the previous month, capped to its length. A zero prior total produces a null percentage rather than division by zero.

## OpenAI integration and privacy

- `OPENAI_MODEL=gpt-4.1-mini`: image/text extraction and constrained question planning.
- `OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe`: speech transcription.
- Model names are configurable. This build uses OpenAI, per the requested choice; it does **not** use Brev, Qwen, Whisper hosting, or Gemini. Do not claim otherwise in the hackathon disclosure.
- `responses.parse(..., text_format=...)` constrains extraction/planning to Pydantic schemas. The backend validates the result again. Provider failures return explicit errors; manual capture remains available.
- AI timeouts/unusable output get one bounded retry. Refusals, missing configuration, and rate-limit errors are surfaced directly. The timeout is per attempt; a voice capture can perform transcription plus extraction, so allow up to four attempts' worth of time at your ingress. Logs contain operation/model/latency/status, not input content or tokens.
- Incoming original images/audio are never persisted. Pasted text/transcripts are returned for immediate review but not saved unless `RETAIN_SOURCE_TEXT=true`. Structured records, receipt items, warnings, source type, and input fingerprints are persisted until deleted.
- AI-enabled inputs are sent to OpenAI. Responses use `store=False`; that flag is not a claim of zero provider-side retention. Use synthetic input for hackathon testing.
- Source deletion removes the capture and drafts, detaching already confirmed records. Delete transactions separately or use `/me/data` to erase all financial records. Supabase account deletion is managed through Supabase.
- Uploads are limited to 10 MB by default. Processing is synchronous with a configured provider timeout. For a public deployment, configure the ingress upload limit/rate limit and AI project budget; durable queues are intentionally outside this MVP.

Implementation references: [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [image inputs](https://developers.openai.com/api/docs/guides/images-vision), [transcription](https://developers.openai.com/api/docs/guides/speech-to-text).

## Local PostgreSQL and tests

You can use hosted Supabase Auth with local PostgreSQL:

```bash
docker compose up -d db
# DATABASE_URL=postgresql+psycopg://money:money@localhost:5432/money
uv run alembic upgrade head
uv run pytest -q
uv run ruff check app tests scripts migrations
```

The default test suite uses in-memory SQLite and mocks external services. For PostgreSQL constraints and concurrent confirmation testing, create a **disposable database with a name ending `_test`**:

```bash
docker compose exec db createdb -U money money_test
TEST_DATABASE_URL=postgresql+psycopg://money:money@localhost:5432/money_test uv run pytest -q
```

Tests create and drop application tables in that test database. Never point them at real records. The tests cover money precision, validation, ownership isolation, Supabase failures, transfers, fees, missing fields, duplicate captures/references, concurrent confirmation, source deletion, two voice expenses, and evidence calculations. AI/auth adapters use mocked provider responses; live external calls need your credentials.

## Deploy the backend

The Dockerfile can run on a container host with network access to Supabase and OpenAI:

```bash
docker build -t ma-doh-api .
docker run --rm --env-file .env -p 8000:8000 ma-doh-api
```

The container migrates the database, then starts Uvicorn on `PORT` (default 8000). For multiple replicas, move migrations to a single release job. Configure the hosted `DATABASE_URL` rather than localhost inside the container, set exact frontend `CORS_ORIGINS`, and serve behind HTTPS. The Free Supabase project hosts Postgres/Auth, **not this Python API**. No remote project or deployment is created by these source files.

## Scope relative to the strategy

Implemented: four capture paths, shared review, transaction history/corrections/deletion, decimal calculations, category shares, account estimates, four evidenced questions, Supabase Auth, private-by-default storage, and test coverage. The API exports everything needed by a separately built frontend.

Deferred: frontend, recurring-payment detection, assets/liabilities/net worth, refunds and loan accounting, prepayments/receivables, automatic SMS/bank imports, detailed transaction timestamps, multi-currency, GPU hosting, and hackathon video/submission work. These are not required to prove the core capture → review → financial evidence workflow.
