# Ma-Doh

**Capture every transaction. Understand every shilling.**

Ma-Doh is an AI-powered personal financial intelligence assistant for people
whose money records are fragmented across M-Pesa and bank messages, receipts,
cash spending, and memory. It converts four input types into one reviewed
financial record, then uses that record to calculate financial summaries and
answer questions about the user's money.

Ma-Doh is a responsive, mobile-first web application being built by a
four-person hybrid team for the GOMYCODE Come Build with AI Hackathon.

> **Repository status:** The Next.js frontend scaffold and initial responsive
> Ma-Doh application shell are available in `frontend/`. The FastAPI backend,
> AI adapters, persistent storage, and feature interactions remain planned.

## Contents

- [Product Summary](#product-summary)
- [Target User and Problem](#target-user-and-problem)
- [MVP Scope](#mvp-scope)
- [Demo Flow](#demo-flow)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Transaction Contract](#transaction-contract)
- [Privacy Position](#privacy-position)
- [Data Sources](#data-sources)
- [AI Disclosure](#ai-disclosure)
- [Fallback Strategy](#fallback-strategy)
- [Team Roles](#team-roles)
- [Deployment Links](#deployment-links)
- [Known Limitations](#known-limitations)
- [Definition of Done](#definition-of-done)

## Product Summary

Ma-Doh captures financial activity through four paths:

1. **Receipt:** photograph or upload a receipt and extract transaction details.
2. **Voice:** record or upload a spoken description of one or more transactions.
3. **Message:** paste a selected M-Pesa or bank transaction message.
4. **Manual:** enter a transaction without using AI.

Every capture path produces the same `TransactionDraft` structure. The user
reviews and corrects the draft before saving it. Confirmed transactions power:

- An income, expense, and cash-flow overview
- Spending totals by category
- Transaction history and source traceability
- Recurring-payment indicators
- Assets, liabilities, and financial position when supplied
- **Ask My Money**, a natural-language interface for questions such as:
  - How much did I spend on transport this month?
  - Where is most of my money going?
  - How does this month compare with last month?

AI interprets unstructured input and explains results. Application code, not a
language model, calculates financial totals.

## Target User and Problem

### Target user

The primary user is a working adult in Kenya who uses M-Pesa, banking services,
cards, and cash but does not maintain a complete personal financial record.

### Problem

Financial activity is distributed across message receipts, paper receipts,
bank records, and unrecorded cash purchases. The user cannot easily combine
these sources to understand:

- Total income and expenses
- Net cash flow
- Main spending categories
- Regular commitments
- Changes in spending over time
- Their current financial position

Ma-Doh reduces the effort required to create a usable record while keeping the
user in control of what is processed and saved.

## MVP Scope

### Committed capabilities

| Capability | Minimum accepted behaviour |
| --- | --- |
| Receipt capture | Upload or photograph a receipt; extract merchant, date, total, visible items, category, and confidence; review and save |
| Voice capture | Record or upload speech; transcribe it; create one or more editable transaction drafts |
| Message capture | Paste an M-Pesa or bank message; extract type, amount, party, date, payment method, reference, and category |
| Manual entry | Save income, expense, transfer, refund, or other activity without an AI call |
| Review | Edit uncertain or incorrect fields before confirming or rejecting a draft |
| History | List saved transactions with date, source, category, type, and amount |
| Dashboard | Calculate income, expenses, cash flow, category totals, and largest category |
| Ask My Money | Answer supported questions from confirmed data and show supporting records |
| Privacy controls | Explain processing and allow correction and deletion of saved records |

### Outside the hackathon MVP

- Background SMS inbox access
- Automatic M-Pesa account synchronization
- Direct bank-account connections
- Payment initiation
- Production-grade authentication and account recovery
- Investment recommendations or trading
- Credit scoring or tax filing
- Family and multi-user accounts
- Multi-currency accounting
- Production storage of sensitive financial data

## Demo Flow

The primary demonstration is designed to fit within 90 seconds.

| Time | Action | Proof shown |
| --- | --- | --- |
| 0-8 sec | Introduce the fragmented-money problem | Clear Kenyan user and practical need |
| 8-23 sec | Photograph or upload a receipt | Vision extraction and human review |
| 23-36 sec | Paste a synthetic M-Pesa message | Message parsing and transfer-aware structure |
| 36-49 sec | Record two expenses in one sentence | Speech transcription and multiple drafts |
| 49-57 sec | Add a cash expense manually | Non-AI fallback and complete capture coverage |
| 57-68 sec | Open transaction history | One unified financial record |
| 68-79 sec | Show the dashboard update | Deterministic calculations and category analysis |
| 79-90 sec | Ask where the money went | Calculated answer with supporting transactions |

The stable demo path uses prepared, consented test inputs. Live camera and
microphone capture remain available, with file upload as the fallback.

## Architecture

```text
Mobile or desktop web browser
        |
        +-- Receipt image --> vision adapter ------------------+
        +-- Voice/audio ----> ASR --> text extraction ---------+
        +-- Pasted message -> deterministic/LLM parser --------+--> TransactionDraft[]
        +-- Manual form ----> direct field mapping ------------+          |
                                                                            v
                                                                  Schema validation
                                                                            |
                                                                            v
                                                                     Human review
                                                                            |
                                                                            v
                                                              Confirmed transaction store
                                                                    |               |
                                                                    v               v
                                                          Financial tools      Transaction history
                                                                    |
                                                                    v
                                                              Ask My Money
```

### Processing stages

1. **Input:** collect a receipt, recording, selected message, or manual form.
2. **Adapter:** convert the source into one or more transaction drafts.
3. **Normalization:** map model or parser output to `TransactionDraft[]`.
4. **Validation:** enforce the schema, allowed categories, dates, and amounts.
5. **Review:** let the user correct, confirm, or reject each draft.
6. **Storage:** save confirmed structured data and minimal source metadata.
7. **Analysis:** calculate financial metrics with deterministic functions.
8. **Explanation:** use AI only to route supported questions and explain the
   calculated result with supporting records.

### Ask My Money tools

The language model may select from approved financial functions. It does not
calculate totals independently.

```text
get_summary(period)
get_spending_by_category(period)
get_transactions(filters)
get_counterparty_total(name, period)
compare_periods(period_a, period_b)
get_recurring_commitments()
get_financial_position()
```

## Technology Stack

| Layer | Selected approach |
| --- | --- |
| Client | Next.js App Router, React, and TypeScript |
| Build tooling | Next.js with Turbopack during development |
| Interface | Responsive, mobile-first web UI |
| Backend | Python 3.11+ and FastAPI |
| API validation | Pydantic with matching TypeScript types |
| Receipt understanding | `Qwen/Qwen2.5-VL-7B-Instruct` |
| Voice transcription | `openai/whisper-large-v3-turbo` |
| Model ecosystem | Hugging Face Transformers and model repositories |
| Primary GPU environment | NVIDIA Brev, only if credits are approved and used |
| Hosted AI fallback | Gemini through Google AI Studio |
| Local/demo fallback | Deterministic parsers, manual entry, and prepared outputs |
| Storage | Small persisted demo database; provider confirmed before implementation |
| Frontend deployment | Vercel with `frontend/` as the project root |
| API deployment | Public HTTPS endpoint; provider confirmed before implementation |

## Repository Structure

The repository uses this structure, with planned paths labelled accordingly:

```text
ma-doh/
|-- frontend/                 # Next.js App Router web client
|   |-- src/
|   |   `-- app/              # Routes, root layout, and global styles
|   |-- .env.example
|   |-- next.config.ts
|   `-- package.json
|-- backend/                  # FastAPI application and AI adapters
|   |-- app/
|   |   |-- adapters/
|   |   |-- api/
|   |   |-- models/
|   |   |-- services/
|   |   `-- main.py
|   |-- tests/
|   |-- .env.example
|   `-- requirements.txt
|-- fixtures/                 # Synthetic, non-confidential demo inputs
|   |-- messages/
|   |-- receipts/
|   `-- voice/
|-- docs/                     # Architecture, demo, disclosure, and QA notes
|-- .gitignore
|-- README.md
`-- LICENSE                   # Added only after the team chooses a licence
```

## Local Setup

> The frontend commands below work now. Backend commands remain the agreed
> contract for the FastAPI scaffold and will work after `backend/` is committed.

### Prerequisites

- Git
- Node.js LTS and npm
- Python 3.11 or later
- Python virtual-environment support
- FFmpeg for uploaded or recorded audio
- A current Chrome, Edge, or Firefox browser

### 1. Clone the repository

```bash
git clone <repository-url>
cd ma-doh
```

### 2. Configure and run the backend

**Windows PowerShell**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

**macOS or Linux**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The planned API documentation URL is `http://localhost:8000/docs`.

### 3. Configure and run the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

On macOS or Linux:

```bash
cp .env.example .env.local
npm run dev
```

The frontend URL is `http://localhost:3000`.

### 4. Verify the local system

1. Open the frontend on a desktop browser.
2. Open it through the same development URL on a phone when the network allows.
3. Confirm that the API health check returns a successful response.
4. Complete a manual transaction from entry through dashboard update.
5. Test camera and microphone permission handling over a secure deployed URL.

## Environment Variables

Real secrets must never be committed. Each service will include an
`.env.example` containing names and safe placeholder values only.

### Frontend: `frontend/.env.local`

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL for the FastAPI service | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_NAME` | No | Display name | `Ma-Doh` |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | No | Enables prepared non-confidential inputs | `true` |

Variables prefixed with `NEXT_PUBLIC_` are exposed to browser code. Never place
API keys or private credentials in frontend variables.

### Backend: `backend/.env`

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `APP_ENV` | Yes | Runtime environment | `development` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed client origins | `http://localhost:3000` |
| `DATABASE_URL` | Yes | Demo database connection | `sqlite:///./madoh.db` |
| `AI_PROVIDER` | Yes | Active adapter: `brev`, `gemini`, or `mock` | `mock` |
| `GEMINI_API_KEY` | Gemini only | Server-side Gemini access | `replace-me` |
| `HF_TOKEN` | Model-dependent | Hugging Face model access | `replace-me` |
| `INFERENCE_BASE_URL` | Brev only | Brev-hosted inference endpoint | `https://example.invalid` |
| `INFERENCE_API_KEY` | Brev only | Authentication for the inference endpoint | `replace-me` |
| `RECEIPT_MODEL_ID` | Yes | Receipt model identifier | `Qwen/Qwen2.5-VL-7B-Instruct` |
| `ASR_MODEL_ID` | Yes | Speech model identifier | `openai/whisper-large-v3-turbo` |
| `AI_TIMEOUT_SECONDS` | No | Inference timeout before fallback | `30` |
| `MAX_UPLOAD_MB` | No | Receipt or audio upload limit | `10` |
| `LOG_LEVEL` | No | Application logging level | `INFO` |

Use either Gemini variables or Brev variables for the selected provider. The
`mock` provider requires no external AI credentials and keeps the demo path
available during integration.

## Scripts

The frontend scripts below are available now. Backend commands remain planned
until the FastAPI scaffold is committed.

### Frontend scripts

Run these commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create and validate the production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run frontend lint checks |

### Backend commands

Run these commands from `backend/` with the virtual environment active:

| Command | Purpose |
| --- | --- |
| `uvicorn app.main:app --reload --port 8000` | Start the development API |
| `pytest` | Run the backend test suite |
| `pytest -q tests/test_transactions.py` | Run transaction-contract tests |
| `python -m app.scripts.seed_demo` | Load fictional dashboard records |
| `python -m app.scripts.check_models` | Check configured model adapters |

The seed and model-check modules are part of the planned scaffold and do not
exist in the repository yet.

## Transaction Contract

Every capture method must return one or more objects matching the shared
transaction draft. Field names cannot be changed without agreement from the
integration owner because the client, API, analytics, and demo fixtures depend
on this contract.

### Canonical example

```json
{
  "id": "temporary-client-id",
  "type": "expense",
  "amount": 1250,
  "currency": "KES",
  "merchant": "Quickmart",
  "category": "Groceries",
  "description": "Household shopping",
  "transactionDate": "2026-09-24T18:42:00+03:00",
  "paymentMethod": "M-Pesa",
  "reference": "DEMO123",
  "source": "message",
  "confidence": 0.94,
  "verificationStatus": "draft",
  "createdAt": "2026-09-24T18:43:00+03:00"
}
```

### Field requirements

| Field | Type | Requirement |
| --- | --- | --- |
| `id` | string | Generated on save; a temporary client ID is allowed for drafts |
| `type` | enum | `income`, `expense`, `transfer`, `refund`, or `other` |
| `amount` | decimal | Positive KES amount; avoid binary floating-point storage |
| `currency` | string | `KES` for the MVP |
| `merchant` | string or null | Merchant, sender, recipient, or institution |
| `category` | string | Must match the approved category list |
| `description` | string | Short user-readable description |
| `transactionDate` | ISO 8601 datetime | East Africa offset when known |
| `paymentMethod` | string or null | M-Pesa, cash, card, bank, or other |
| `reference` | string or null | Synthetic or extracted transaction reference |
| `source` | enum | `receipt`, `voice`, `message`, or `manual` |
| `confidence` | decimal or null | Value from 0 to 1; guides review and never confirms automatically |
| `verificationStatus` | enum | `draft`, `confirmed`, or `rejected` |
| `createdAt` | ISO 8601 datetime | Audit timestamp generated by the application |

### Calculation rules

- Store money as an exact decimal or integer minor unit, not a binary float.
- Count only confirmed transactions in financial summaries.
- Do not count transfers as income or expenses.
- Treat refunds separately and apply them consistently to the selected period.
- Calculate totals, percentages, comparisons, and balances in application code.
- Preserve source and reference fields so displayed answers can show evidence.

## Privacy Position

Ma-Doh is not positioned as an application that reads a user's messages. The
hackathon MVP processes only information the user deliberately provides.

- No background or broad SMS permission is requested.
- Users paste selected M-Pesa or bank transaction messages.
- Raw private SMS history is not collected.
- Receipt images and audio are processed only for the requested extraction.
- Structured transaction data is stored only after review and confirmation.
- Users can correct, reject, and delete records.
- The application does not request PINs, OTPs, passwords, or online banking
  credentials.
- Logs must not contain full receipt text, recordings, credentials, or other
  unnecessary sensitive content.
- Low-confidence AI output is labelled and remains editable.

Suggested user-facing statement:

> Ma-Doh only processes the receipt, recording, or transaction message you
> choose to provide. It does not request access to your conversations, OTPs,
> PINs, or banking credentials. Review every extracted transaction before
> saving it.

## Data Sources

The hackathon uses a deliberately small, non-confidential test pack.

| Data | Approximate volume | Source and permission |
| --- | ---: | --- |
| Transaction messages | 20 | Team-authored fictional M-Pesa and bank formats |
| Receipt images | 10 | Fictional or voluntarily supplied by team members with identifiers removed |
| Voice clips | 10 | Short transaction descriptions recorded by consenting team members |
| Dashboard transactions | Up to 50 | Fictional structured records covering categories and transfers |

No private customer dataset is needed. No passwords, OTPs, account credentials,
or confidential banking records may be added to `fixtures/` or committed to
Git.

## AI Disclosure

| Task | Planned model or method | Output used by Ma-Doh | Human control |
| --- | --- | --- | --- |
| Receipt understanding | `Qwen/Qwen2.5-VL-7B-Instruct` | Merchant, date, total, items, category, payment method, confidence | User reviews and corrects the draft |
| Voice transcription | `openai/whisper-large-v3-turbo` | Transcript for transaction extraction | User reviews transcript-derived drafts |
| Message extraction | Deterministic parser with constrained model fallback | Valid `TransactionDraft[]` | User confirms each draft |
| Categorization | Approved rules with constrained model fallback | Approved category and confidence | Category remains editable |
| Question routing | Gemini or a compatible instruction model | Approved tool name and validated filters | Model cannot write or alter totals |
| Explanation | Selected text model | Short explanation of calculated results | Supporting transactions are displayed |

### Responsible use

- Models interpret inputs; deterministic tools calculate financial values.
- Model output is validated against the shared schema.
- Invalid or malformed output receives one repair attempt before an editable
  fallback is shown.
- The product provides financial information, not regulated investment advice.
- The final submission will disclose the actual models, prompts, services,
  generated assets, and Brev usage used during the event.
- If Brev is not used, the submission will state that clearly.

## Fallback Strategy

The product keeps the same transaction API regardless of the active AI
provider. This allows the frontend and financial analysis to continue working
when GPU credits, external APIs, connectivity, or live capture are unavailable.

| Failure | Fallback |
| --- | --- |
| Brev credits are not approved | Use Gemini/AI Studio, lightweight parsing, and prepared non-confidential inputs |
| GPU setup takes too long | Switch `AI_PROVIDER` to `gemini` or `mock` without changing the client contract |
| Receipt extraction is incorrect | Show low confidence and use editable review or manual entry |
| Live microphone is noisy or blocked | Upload a prepared, consented audio file |
| Browser camera permission fails | Upload a prepared receipt image |
| AI returns malformed JSON | Attempt schema repair once, then show an editable form |
| External AI is unavailable | Keep manual entry, message rules, history, dashboard, and prepared demo outputs working |
| Deployment fails | Use the last verified deployment and preserve a tested local demo path |

The target remains an inference-backed MVP. The fallback is for reliability,
not a claim that prepared outputs are live model results.

## Team Roles

Names will be added after the team confirms role ownership.

| Role | Location | Primary ownership | Build-day deliverables |
| --- | --- | --- | --- |
| **A. Technical and Integration Lead** | Physical | Repository, contracts, analytics, integration, deployment, and Brev | Stable `main`, shared API contract, calculations, deployed system, merges, technical Q&A |
| **B. Frontend Engineer** | Virtual | React and TypeScript client | Mobile-first shell, capture hub, review form, history, dashboard, and Ask interface |
| **C. AI and Backend Engineer** | Virtual | FastAPI and AI pipeline | Receipt inference, transcription, message parsing, schema-valid endpoints, tests, and latency evidence |
| **D. Product, QA, and Submission Lead** | Physical | Product flow, safe data, testing, and submission | Test pack, acceptance checks, privacy copy, 90-second video, project card, and link verification |

### Working agreement

- Keep one team call active during build sprints.
- Give every task one owner and one acceptance condition.
- Keep `main` deployable and merge at scheduled integration checkpoints.
- Use small pull requests that can be reviewed in approximately ten minutes.
- Never send secrets through team chat or commit them to the repository.
- The integration lead resolves contract and merge conflicts.

## Deployment Links

Replace each placeholder only after the target has been verified from an
unrelated device.

| Resource | Link | Status |
| --- | --- | --- |
| Live web application | _To be added_ | Not deployed |
| Backend API | _To be added_ | Not deployed |
| API documentation | _To be added_ | Not deployed |
| 90-second demo video | _To be added_ | Not recorded |
| Hackathon project page | _To be added_ | Not submitted |
| Architecture or disclosure notes | `docs/` | Planned |

The live web application must use HTTPS so browser camera and microphone
permissions can be tested under production-like conditions.

## Known Limitations

- The MVP supports KES only.
- Receipt accuracy depends on image quality, layout, and model availability.
- Speech accuracy depends on recording quality, accent, language, and noise.
- Message parsing covers only the synthetic formats tested during the event.
- Recurring-payment detection is heuristic and requires enough history.
- Assets and liabilities appear only when the user supplies those records.
- Ask My Money supports an approved set of questions and financial tools rather
  than unrestricted financial advice.
- The MVP does not continuously synchronize with M-Pesa or bank accounts.
- The hackathon database is not a production financial-data store.
- Camera and microphone behaviour varies across browsers and requires explicit
  user permission.
- Model latency and availability depend on the selected Brev or API service.
- The application may use prepared test inputs when live capture conditions are
  unsuitable; the demo will disclose when this occurs.

## Definition of Done

The MVP is complete when:

- A clear receipt produces an editable transaction draft.
- A recording containing two expenses produces two editable drafts.
- A pasted M-Pesa expense is parsed correctly.
- A bank-to-M-Pesa transfer is excluded from expense totals.
- A manual cash expense can be saved without an AI call.
- Confirmed transactions appear in history and update the dashboard.
- Ask My Money answers supported questions with the period, total, transaction
  count, and supporting records.
- The public web application completes the core journey on an unrelated phone.
- Privacy wording and AI-tool disclosure match the actual implementation.
- The team can complete the stable demo path within 90 seconds.

## Hackathon Details

- **Event:** GOMYCODE Come Build with AI Hackathon
- **Product:** Ma-Doh
- **Format:** Responsive, mobile-first web application
- **Team:** Four members, two physical and two virtual
- **Build objective:** A working inference-backed MVP, not model training or
  production deployment

## Licence

No open-source licence has been selected. Until a licence file is added, the
repository remains under its default copyright protections.
