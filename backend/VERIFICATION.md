# Verification — 27 September 2026

- **PostgreSQL 16:** 49 tests passed, including concurrent confirmation.
- **SQLite fallback:** 48 passed, 1 PostgreSQL-only concurrency test skipped.
- **Ruff:** lint and formatting checks passed.
- **Migrations:** fresh PostgreSQL and SQLite upgrades succeeded; Alembic reported no model/schema drift. SQLite downgrade succeeded.
- **Database exposure:** all five financial/profile tables have RLS enabled by the migration. A non-owner role with explicit SELECT permission could not read a synthetic profile. The test role, grants, and synthetic record were rolled back.
- **Real HTTP smoke test:** Uvicorn served `/health` using PostgreSQL, `/docs`, and `/openapi.json`; financial endpoints rejected unauthenticated requests. The temporary smoke server was stopped afterward.
- **Contract:** the generated `openapi.json` includes the shared capture/draft response schemas and Supabase bearer authentication.

External integrations were tested with mocked responses, including Supabase invalid/expired tokens, service outages, profile provisioning, Gemini structured extraction, Hugging Face Qwen receipt extraction, Whisper transcription-to-drafts, refusal, and bounded timeout retries. **No live Supabase project, Gemini key, or Hugging Face token was supplied**, so live SaaS calls and extraction quality on real media remain unverified. No remote deployment was performed. The Dockerfile is supplied but was not image-built in this environment.

The test runner currently reports a Starlette deprecation warning about its httpx test transport; it does not affect the passing results.
