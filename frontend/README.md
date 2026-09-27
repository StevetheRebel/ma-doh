# Ma-Doh Frontend

The Ma-Doh web client uses Next.js App Router, React, TypeScript, Tailwind CSS,
and Lucide icons. It is designed for mobile browsers first and deploys to
Vercel from the `frontend/` project root.

## Start locally

```bash
npm install
```

Copy `.env.example` to `.env.local`, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest financial-logic tests |

## Implemented client flow

- Three-step welcome experience and clearly disclosed prototype sign-in
- Responsive dashboard with calculated income, expenses, and net cash flow
- Data-driven dashboard and insight charts with explainable findings
- Dashboard period filtering, amount privacy, notifications, and profile menu
- Receipt camera/upload, voice recording, message parsing, and manual entry
- Manual transaction entry, editable review, confirmation, and detail views
- Searchable transaction history backed by browser-local demo persistence
- Deterministic Ask My Money answers, supporting records, and voice questions

Receipt OCR and production speech transcription are not connected yet. FastAPI,
AI inference, and database integration will replace browser-native and local
demo processing in a later branch.

Routes: `/` opens welcome, `/sign-in` opens prototype access, and `/dashboard`
opens the main financial workspace.

See the [root README](../README.md) for the product strategy, architecture,
privacy position, transaction contract, and team workflow.
