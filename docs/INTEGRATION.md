# Ma-Doh integration

The Next.js frontend and FastAPI backend are compatible and now integrated in this repository. Next.js renders the interface; Supabase manages authentication; FastAPI owns capture, transaction validation, PostgreSQL persistence, and financial calculations. OpenAI remains the extraction/transcription adapter.

## Architecture changes

- Replaced placeholder login with Supabase email/password sign-in, sign-up, password recovery, and sign-out. Every finance API request carries the session access token; FastAPI validates identity independently.
- Replaced browser demo storage with authenticated API reads. Demo fixtures remain only for unit tests; they are not loaded into the application.
- Added account creation with opening balances. Capture requires an account; transfers require a distinct destination account.
- All four capture paths create persistent drafts. Review supports multiple drafts, incomplete extraction, warnings, receipt items, edits, dismissal, and explicit duplicate override.
- Confirmed records can be edited or deleted. Dashboard and insights use server-computed decimal totals; balance is labeled as an estimate from opening balances and records.
- Ask My Money calls the backend and links actual evidence records. It supports the backend's bounded MVP question types and reports unsupported questions.
- Mapped API snake_case, date-only fields, lowercase categories, and decimal strings to the existing frontend presentation. Exact amount strings are retained for monetary display; charts use numeric coordinates.
- Assets, liabilities, recurring detection, prepayments, and receivables remain deferred. Financial position and recurring screens remain explicit coming-soon pages.

## Start locally

Use Node.js 22+ and Python 3.12+. Commands are run from the repository root unless shown otherwise.

```bash
cd backend
cp .env.example .env
uv sync --group dev
# Fill .env, then:
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Without uv, create a Python 3.12 virtual environment and install `requirements.txt`; run `alembic` and `uvicorn` through that environment.

Backend configuration:

- `DATABASE_URL`: PostgreSQL SQLAlchemy URL using `postgresql+psycopg://`. If Supabase's direct IPv6 endpoint is unreachable, use the **Session pooler** URL from the project's Connect dialog, port 5432, with its exact username/host and `?sslmode=require`. URL-encode special characters in the database password.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`: same project as the frontend. A service-role key is unnecessary.
- `OPENAI_API_KEY`: needed for receipt/audio and free-form AI extraction. Manual capture, recognized M-Pesa messages, and supported deterministic questions can work without it.
- `CORS_ORIGINS`: JSON array containing the exact frontend origins. Defaults include `http://localhost:3000` and `http://127.0.0.1:3000`.

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
# Fill Supabase URL and publishable key; leave API URL at localhost:8000.
npm ci
npm run dev
```

Configure Supabase Auth's Site URL as `http://localhost:3000` and allow redirects to `http://localhost:3000/dashboard` and `http://localhost:3000/reset-password`. Add equivalents for any alternate hostname or production origin. Enable email/password authentication. If email confirmation is enabled, users must confirm their email before signing in. Restart/rebuild Next.js after changing NEXT_PUBLIC variables. Never put the OpenAI key, database password, or Supabase service-role key in frontend variables.

First-use flow: sign up/sign in → Settings → create an account and opening balance → add a transaction → review → confirm → inspect dashboard or ask a question.

## Validation

```bash
cd frontend
npm run lint
npm test
npm run build
# Install test browser once:
npx playwright install chromium
# Activate backend Python environment or supply E2E_PYTHON:
npm run test:e2e

cd ../backend
uv run pytest -q
```

Browser tests start Next.js on 3100 and an isolated FastAPI process on 8100. They mock only Supabase's auth HTTP responses and use a disposable temporary SQLite database. `frontend/e2e/support_api.py` is test-only and must never be deployed. Set `CHROMIUM_PATH` to use an existing browser and `E2E_PYTHON` to select a Python executable with backend dependencies. Production servers must run `app.main:app` from `backend/`.

For PostgreSQL-specific tests, set `TEST_DATABASE_URL` to a disposable database with a name ending `_test`; test tables are created and dropped. Never use your application database for this command.

## Limits

Live provider credentials are not bundled, and hosted Supabase/OpenAI calls have not been verified by this integration's isolated tests. Receipt/audio processing remains synchronous. API records are loaded in pages of 200 for the MVP's local filtering; very large datasets should move filtering and pagination into the UI. Account estimates reflect only recorded activity. Uploaded audio formats are WAV, MP3, WebM, and MP4/M4A; receipt formats are JPEG, PNG, and WebP, up to 10 MB with the default server configuration.

The pre-existing untracked backend scaffold was backed up before replacement; unused modules are retained under `backend/legacy_scaffold/`. The full original scaffold archive is in the Codex task's `work/ma-doh-original-backend.zip`.

## Verified in this integration

- Production Next.js build and TypeScript: passed.
- Frontend ESLint: passed.
- Frontend unit tests: 8 passed.
- Backend tests using SQLite: 49 passed, 1 PostgreSQL-only test skipped.
- Backend Ruff: passed.
- Browser integration: passed against real FastAPI with temporary SQLite and simulated Supabase auth. Covered sign-in, account creation, manual draft persistence after reload, confirmation, balance recalculation, Ask evidence, edit, delete, and sign-out.
- Live Supabase email delivery/session validation and OpenAI receipt/audio extraction require configured provider credentials for a final live smoke test.
