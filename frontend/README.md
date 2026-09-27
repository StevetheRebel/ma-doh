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

The application currently contains the responsive overview shell. Capture
flows, FastAPI integration, persistence, and Ask My Money interactions will be
implemented in subsequent feature branches.

See the [root README](../README.md) for the product strategy, architecture,
privacy position, transaction contract, and team workflow.
