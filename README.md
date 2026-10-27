# Kept — Promise Intelligence Prototype

> **Kept** is a Promise Intelligence platform for B2B software vendors. It automatically captures verbal commitments from sales conversations, checks them against delivery capability, enforces pipeline resolution gates before contract and Closed-Won stages, and objectively attributes delivery breaks across sales, engineering, and customer dependencies.

---

## 1. What Kept Is

In enterprise B2B sales, deals are won on promises made during calls—timelines, custom integrations, SLAs, and data migrations. When those promises break post-sale, churn spikes and sales and delivery point fingers.

Kept solves this by closing the loop between what was promised and what can be delivered:
1. **Captures promises** with character-for-character quote grounding and timestamps.
2. **Checks promises** deterministically against what delivery can actually do (Green, Amber, Red).
3. **Enforces pipeline gates** blocking premature contract advancement or Closed-Won status until flags are resolved.
4. **Catches off-record promises** during kickoff readbacks.
5. **Attributes renewal breaks** across Sales, Delivery, and Customer dependencies with evidence verification.
6. **Measures AI accuracy** transparently on a held-out benchmark.

---

## 2. Two-Minute Evaluator Click Path

Follow this path to see all core moments in under two minutes:

1. **Moment 1 (Capture):** Switch header role to `Account Executive`. Go to **Deals** → **Harbor Logistics (fictional)** → **Capture** tab. Click **"Find commitments"** (or use precomputed results) to see quotes, timestamps, risk flags, and rejected decoys.
2. **Auditable Review:** Go to the **Commitments** tab. Click **Mark "not a commitment"** on a proposed item. Note how it stays visible and greyed out with its required audit reason.
3. **Moment 2 (Contract Gate Blocker):** Go to the **Stage** tab and click **"Move to Contract"**. The contract gate blocks advancement due to unresolved amber and red flags.
4. **Separation of Duties:** Switch role to `Implementation Lead` in the header. Go to **Approvals** and resolve Harbor's flags: approve one (with note), adjust one, and decline one.
5. **Walk-Back & Closed-Won Gate:** Switch back to `Account Executive`. Record a walk-back on the declined item. Advance to Contract, confirm items, assign owners, and advance to Closed-Won.
6. **Handoff & Kickoff Readback:** Open **Cedar Health Clinics (fictional)** → **Handoff** tab. Review customer dependencies, check acknowledgement, and log a verbal off-record promise.
7. **Moment 3 (Account Renewal & Attribution):** Open **Accounts** → **Northgate Retail (fictional)**. View the objective three-way attribution summary showing exactly 1 Sales break, 1 Delivery break, and 1 Customer break.
8. **AI Accuracy:** Visit **/eval** to inspect precision, recall, ungrounded rate, and decoy rejection measured against the held-out test benchmark.

---

## 3. What is Real vs. Simulated (Table 0.2)

| Real (Fully Implemented) | Simulated (Mocked for Demo) |
|---|---|
| **LLM Extraction & Schema Adherence:** Live inference via Groq SDK using `openai/gpt-oss-120b` with strict structured outputs (`strict: true`). | **Call Recording & ASR:** Transcripts are realistic fictional JSON files with pre-split speakers, timestamps, and lines rather than live Zoom/Gong audio webhooks. |
| **Quote Grounding Engine:** Deterministic character-for-character quote verification against transcript lines; ungrounded quotes are automatically dropped. | **CRM Platform:** In-browser interactive pipeline board instead of a live Salesforce or HubSpot REST integration. |
| **Rules Checking Engine:** Deterministic code evaluating promises against catalog lead times, standard offerings, and capabilities. | **Collaboration & Messaging:** In-app approval queues and modals instead of Slack or email alert webhooks. |
| **Pipeline Resolution Gates:** Mathematical contract checkpoints and Closed-Won blocker panels blocking premature stage moves. | **User Auth & Permissions:** Instant header role switcher simulating AE, Implementation Lead, CSM, and VP CS roles instead of SSO logins. |
| **Three-Way Root Cause Attribution:** Objective rule engine classifying broken commitments into Sales, Delivery, or Customer faults. | **Time Elapsed:** Pre-seeded accounts (Harbor in proposal, Cedar in onboarding, Northgate in renewal) with historical event logs. |
| **Benchmark Evaluation Harness:** Automated greedy matching calculating precision, recall, ungrounded rates, and decoy leakage. | **Customer Identities:** All company names (Brightpath, Harbor, Cedar, Northgate) and persons are completely fictional. |

---

## 4. Model, Strict Mode & Schema Smoke Test

- **Primary Model**: `openai/gpt-oss-120b` on Groq.
- **Fallback Model**: `openai/gpt-oss-20b`.
- **Structured Outputs (Strict Mode)**: Strict mode (`strict: true`) is enforced using JSON Schema with strict property constraints and zero disallowed keywords.
- **Schema Smoke Test Outcome**: Strict mode was tested with sample multi-turn conversations. Groq's engine adheres strictly to the schema definition without dropping required keys or producing ungrounded quotes.
- **Prompt Version**: `v1.0` (frozen on dev set, evaluated without test set leakage).

---

## 5. Rate Limits & Environment Variables

### Environment Variables
Configure `.env.local` for local execution or add environment variables in your deployment settings:
```bash
# Groq API Key (Primary)
GROQ_API_KEY=gsk_your_key_here

# Optional: Multiple rotated keys separated by commas for high-throughput batch evaluation
# GROQ_API_KEYS=gsk_key1,gsk_key2

# Live extraction mode: 'on' enables live API calls; 'off' defaults to instant precomputed extraction
LIVE_MODE=on
```

### Rate Limit Strategy
- **Precomputed Mode by Default**: For instant, reliable presentations and offline evaluation, seed extractions are precomputed into `data/precomputed/extractions.json`.
- **Rotated API Keys**: The `lib/llm/groq.ts` client supports round-robin rotation across multiple keys in `GROQ_API_KEYS`.
- **Evaluation Throttling**: The evaluation runner (`scripts/eval.ts`) enforces a 1.5-second pause between transcript extractions to remain within Groq API tier limits.
- **Best-Effort IP Limiting**: Live web extraction (`/api/extract` and `/try`) enforces client-side and server-side rate guards.

---

## 6. How to Run Locally

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- A Groq API Key (`GROQ_API_KEY`)

### Quickstart
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

# 3. Run all unit and integration tests (13 suites, 73 tests)
npm test

# 4. Start local development server
npm run dev

# 5. Open in browser
# Visit http://localhost:3000
```

### Additional Scripts
```bash
# Run AI accuracy evaluation on held-out test split (15 transcripts)
npm run eval

# Run AI accuracy evaluation on development split (5 transcripts)
npm run eval -- --split dev

# Precompute extraction results for all seed transcripts
npm run precompute

# Build production bundle
npm run build
```

---

## 7. AI Accuracy Benchmark Results

Evaluated against the 15 held-out synthetic test transcripts using one-to-one greedy Jaccard word-set matching (Section 3.8):

| Metric | Score | Raw Counts | Description |
|---|---|---|---|
| **Precision** | **93.55%** | 29 / 31 | Proportion of extracted candidates that match gold commitments |
| **Recall** | **100.00%** | 29 / 29 | Proportion of true gold commitments successfully detected |
| **Ungrounded Rate** | **0.00%** | 0 / 41 | Proportion of model quotes that could not be grounded in transcript lines |
| **Type Accuracy** | **79.31%** | 23 / 29 | Correct classification of commitment category (integration, timeline, etc.) |
| **Decoy False-Positive Rate** | **0.00%** | 0 / 19 | Tentative vendor discussions mistakenly promoted to firm commitments |

*Results recorded in `data/eval/results.json` and visible at `/eval`.*

---

## 8. Known Limitations

1. **Synthetic Data**: All customer accounts, deal conversations, employee identities, and historical CRM logs are fictional synthetic scenarios.
2. **In-Browser Sandbox State**: Application state lives in browser `localStorage`. Reviewers get independent sandboxes, but data is not synchronized across devices.
3. **Catalog Scope**: The rules engine currently evaluates commitments against the Brightpath field-service scheduling catalog.
4. **Serverless Rate Limits**: Rate limiting on `/try` and `/api/extract` is best-effort per IP in serverless environments.
