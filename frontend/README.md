# Ma-Doh frontend

Next.js interface integrated with the FastAPI backend in `../backend`.

See [Integration and setup](../docs/INTEGRATION.md) for configuration, Supabase authentication, migrations, and the first-use workflow.

```bash
npm ci
cp .env.example .env.local
# Configure API URL and Supabase public credentials.
npm run dev
```

Checks: `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`.
