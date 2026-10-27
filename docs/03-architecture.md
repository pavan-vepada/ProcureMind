# 03 — Architecture: tech stack and data model

**Status:** Draft, awaiting PM approval · **Date:** 2026-10-27 · **Based on:** `01-PRD.md` v3, `02-journeys.md`

This document answers: what are we building with, where does it run, how does a messy reply become a trustworthy number, how are questions answered without the AI doing math, and what data do we keep. Diagrams are in Excalidraw:

| # | Diagram | Shows |
|---|---|---|
| A1 | [arch-1-system-overview.excalidraw](diagrams/arch-1-system-overview.excalidraw) | What runs where: browser, web app, backend, AI service |
| A2 | [arch-2-reply-pipeline.excalidraw](diagrams/arch-2-reply-pipeline.excalidraw) | The 7 steps from a vendor reply to comparable numbers |
| A3 | [arch-3-ask-engine.excalidraw](diagrams/arch-3-ask-engine.excalidraw) | How a plain-language question becomes an exact, checked answer |
| A4 | [arch-4-data-model.excalidraw](diagrams/arch-4-data-model.excalidraw) | The main tables and how they connect |

Colour code in every diagram: **purple = AI**, **green = deterministic code**, **blue = storage**, **orange = people and outside services**.

---

## 1. Stack decision

### Options considered

| | A. **Next.js + Supabase + Vercel** (recommended) | B. Python (FastAPI) + simple pages + Render | C. Streamlit (Python dashboard tool) |
|---|---|---|---|
| What it is | One TypeScript web app (screens and server together) on Vercel; Supabase gives login, database and file storage ready-made | Python server with hand-built pages, hosted on Render | A Python tool that turns scripts into simple web pages |
| Fit for our screens (matrix, side drawer, live progress, chat panel) | **Best**: built for rich, interactive screens | OK, but every interaction is hand-built | **Poor**: no real side drawer or inline editing; looks like a prototype |
| Login + per-user data | **Ready-made** (Supabase Auth + row-level security) | Must wire up a login service ourselves | Weak; add-ons only |
| Deploy in one day | **Push to GitHub = live** | Easy, but free tier sleeps (~50 s first load) | Easy, but same login problem |
| Grows into a real product | **Yes**, a common production stack | Yes | No, would be rewritten |
| Cost for the demo | Free tiers | Free tier | Free tier |
| Downside | Needs **Node.js** installed in WSL (10 minutes, needs your OK) | Slower to build a polished UI | Fails the "seamless" bar |

**Recommendation: A.** It's the fastest way to get a polished, hosted app with login in one day, and nothing about it is throwaway. The existing Python skeleton isn't wasted: it becomes the **dataset generator** (§7), because Python has the best libraries for producing fake Excel, Word, PDF files and the angled phone photo.

### The stack, in plain words

| Layer | Choice | What it does for us |
|---|---|---|
| Screens + server | **Next.js** (React, TypeScript) | One codebase for the pages users see and the server logic behind them |
| Look and feel | **Tailwind CSS + shadcn/ui** | Ready-made, clean components (tables, drawers, dialogs) so screens look professional fast |
| Hosting | **Vercel** | Runs the app at a public HTTPS address; every push to GitHub redeploys automatically |
| Login | **Supabase Auth** | Sign-up / log-in with email + password (Google sign-in optional); we never store passwords |
| Database | **Supabase Postgres** with **row-level security** | Stores everything; the database itself refuses to show one user's rows to another |
| File storage | **Supabase Storage** | Keeps every original vendor file exactly as received |
| AI | **Anthropic API, Claude Opus 5.5** (`claude-opus-5-5`) | Reads PDFs, photos, Word/Excel content and email text; drafts the RFQ; interprets questions; writes memo prose |
| File reading helpers | SheetJS (Excel), mammoth (Word), pdf.js (PDF text positions) | Turn files into a form where every value has an exact address (cell B7, paragraph 4, page 2 at x/y) |
| Checks | **zod** | Rejects any AI output that doesn't match the expected shape |
| Tests | **Vitest** (logic), **Playwright** (clicks through the demo path in a real browser) | Proves the math and the journey work before you see them |
| Region | Vercel Mumbai + Supabase Mumbai | Fast in India; data stays in one region |

---

## 2. A1 · System overview

See [A1](diagrams/arch-1-system-overview.excalidraw).

- **The browser** talks only to our Next.js app over HTTPS.
- **The Next.js app** checks the login on every request, then does the work: seeding a demo copy, the simulated send, processing replies, normalizing, answering questions, building the memo.
- **Supabase** holds the login, the data and the original files. Row-level security means even a bug in our code can't leak one user's data to another.
- **Anthropic API** is called only from the server. The API key never reaches the browser.
- **GitHub → Vercel:** every commit to `master` deploys automatically. That's how we "deploy early and often" (risk R9).
- **Seed bundle:** the dataset generator produces the demo files once. On sign-up (or Reset demo), the server copies the seed rows into the new user's account. The original files are shared read-only, so nothing is duplicated.

## 3. A2 · Reading a vendor reply

See [A2](diagrams/arch-2-reply-pipeline.excalidraw). Each reply runs through 7 steps. All 5 run **in parallel**, each as its own server job.

| Step | Who | What happens |
|---|---|---|
| 1. Store original | Code | File saved unchanged; reply matched to a vendor by sender address |
| 2. Prepare by format | Code | Excel → a grid where every value carries its cell address. Word → numbered paragraphs. PDF → pages plus the position of every text fragment. Photo → image. Email → text with character positions |
| 3. Extract + map | **AI** | Claude receives the prepared reply **and** the 30 RFQ lines. It returns structured data: for each line, price, unit, currency, tax, tiers, discount, plus terms and questionnaire answers. For each value it gives **where it found it** and a confidence level |
| 4. Validate | Code | Shape check; **every number Claude returns must actually appear in the source** (stops invented numbers); sanity ranges (a box can't cost ₹50,000); low confidence → flag |
| 5. Normalize | Code | per box / per 100 / per 1,000 / per kg → per piece (kg uses box weight estimated from GSM × board area, labelled "estimate"); USD → ₹ at the locked rate; discount applied; GST removed; freight added; the right tier for each plant's quantity. Every step is recorded as the **conversion chain** shown on hover |
| 6. Resolve gaps | Code | The missing-value policy: same reply → last year's contract (only when specs match) → otherwise flag and add to the vendor's issue list |
| 7. Save | Code | Values, conversion chain, source location and history. A revision never overwrites; the old value is marked replaced |

**Live progress:** each step writes a plain-language line ("Matching lines… 27 of 30 found") to a `processing_runs` row; the inbox screen checks it every second.

**How "click to see the source" is exact (Improvement B):**
| Source | How we highlight it | Precision |
|---|---|---|
| Email text | Character range in the body | Exact |
| Excel | Cell address | Exact |
| Word | Paragraph number + the phrase | Exact |
| PDF with text | Position of the matching text from pdf.js | Exact |
| Photo / scanned PDF | Claude returns the region as fractions of the image's width and height | **Approximate**; labelled when confidence is low (risk R12). Because we generate the photo ourselves, we know the true positions and can measure how close it gets |

## 4. A3 · Ask engine: AI interprets, code does the math

See [A3](diagrams/arch-3-ask-engine.excalidraw).

1. **Interpret (AI):** Claude reads the question, the conversation so far, and a short description of the data. It doesn't calculate. It calls one of three tools:
   - `run_scenario(spec)`: award splits, vendor filters (e.g. passed questionnaire), volume aggregation across plants, "what if Vendor X matches the lowest price";
   - `query_values(filters, sort, group)`: look-ups such as "which vendors still have open issues?";
   - `get_vendor_profile(vendor)`: terms, questionnaire result, certificates.
2. **Ambiguous?** Claude asks one clarifying question with clickable choices instead of guessing.
3. **Validate (code):** the spec may only name real vendors, lines and rules.
4. **Scenario engine (code):** applies the filters, tiers and award rule to the stored normalized values and computes totals and savings exactly.
5. **Explain (AI):** Claude writes two or three sentences **using only the numbers in the result**.
6. **Number check (code):** every figure in the explanation must exist in the result. If one doesn't, the explanation is dropped and only the table is shown.
7. The answer shows the table, **Show working** (filters, rule, formula), clickable numbers, and **Save as scenario**.

The award memo uses the same rule: code assembles every number; the AI writes only the connecting prose.

## 5. A4 · Data model

See [A4](diagrams/arch-4-data-model.excalidraw). Every table carries `owner_id` for row-level security.

| Table | Holds | Key fields |
|---|---|---|
| `rfx` | The RFQ and its locked rules | stage, tour_step, internal_request, fx_rate + date, due_date, rules_locked_at |
| `line_items` | The 30 buyer lines | specs (ply, GSM, BF, flute, dimensions), qty per plant, estimated weight |
| `questions` | Questionnaire | text, pass rule |
| `vendors` | The 5 vendors | RFI note, RFP summary, status (Sent / Replied / Clarification requested), payment days, freight terms |
| `messages` / `attachments` | Every email out and in, and its files | direction, kind (rfq / reply / clarification), arrival time, late flag; storage path of the original |
| `processing_runs` | Live progress per reply | step, progress text, status, error |
| `quote_values` | **The heart of the system**: one price per vendor per line | raw values; tiers; ₹ per piece; conversion chain; confidence; status; **provenance** (vendor / contract / clarification / manual / estimate); **source** (attachment, page, cell, paragraph, snippet, image region); contract reference; current / replaced |
| `issues` | Everything to chase per vendor | kind (missing line, ambiguous, unreadable, no history, terms), status (open / asked / resolved) |
| `answers`, `certificates` | Questionnaire answers and certificate checks | passed, expiry, valid |
| `contracts`, `contract_lines` | Mock enterprise memory | contract no. (e.g. #2025-V5), spec key, price, unit |
| `assumptions` | Buyer-adjustable inputs | FX rate, freight estimates, box weights |
| `scenarios`, `chat_messages`, `award_memos` | Ask history, saved scenarios, the memo | spec and result as JSON |
| `change_log` | Every manual change, for audit and undo | table, row, field, old, new, who, when |

---

## 6. Key design decisions

| Decision | Why |
|---|---|
| **Simulated email** inside the app | Real email is the riskiest piece for a one-day build (PRD R6). The data model already has `messages` with direction and kind, so real email later is an addition, not a rewrite |
| **One AI model** (Claude Opus 5.5) for everything, with lower effort on simple tasks | One model is simpler to tune and test. At demo scale it costs about US$2 per full run (§8) |
| **AI returns structured data, never free text, for extraction** | Every value can be validated, located and converted by code |
| **Every number must appear in its source** | The main defence against invented numbers (PRD R2, R3) |
| **Revisions mark old values replaced; nothing is deleted** | Gives history, undo, and an audit trail for free |
| **Per-account copy of the demo** on sign-up; Reset = delete and copy again | Two reviewers never collide; replaying the story is instant |
| **Progress by polling** (screen checks every second) | Simpler and more robust than live push for a one-day build |
| **Saved run of the seeded replies** stored with the seed | Presenter-only fallback if the AI is slow on the day; the app shows a "Showing saved run" banner |
| **Vendor content is data, never instructions** | System prompts tell Claude to treat documents as data; outputs are schema-checked; the extraction step has no tools that can change anything (PRD R7) |
| **Limits per account**: 20 uploaded files, 60 questions per day, 10 MB per file, known file types only | Protects the AI budget on a public link (PRD R10, R13) |

## 7. Repository layout

```
procure-mind-v2/
  app/                 Next.js screens and server routes
  lib/
    extract/           step 2 (prepare by format) and step 3 (Claude extraction)
    engine/            normalize + scenario engine (pure code, heavily tested)
    ask/               Ask engine tools and prompts
    db/                database access
  supabase/migrations/ table definitions + row-level security rules
  seed/                generated demo bundle (JSON, files, saved run, answer key)
  tools/dataset/       Python dataset generator (the existing uv skeleton, renamed)
  tests/               Vitest (logic) and Playwright (demo path)
  docs/                these documents
```

The Python package `third_project` becomes `tools/dataset` (`procure-mind-dataset`), which resolves the open item in CLAUDE.md.

## 8. AI usage and cost (per full demo run)

Claude Opus 5.5 is priced at US$4 per million input tokens and US$20 per million output tokens. A token is roughly ¾ of a word.

| Task | Calls | Estimated cost |
|---|---|---|
| Draft the RFQ | 1 | ~US$0.20 |
| Extract 5 replies + 2 clarifications | 7 | ~US$1.10 |
| 10 questions | ~20 | ~US$0.70 |
| Award memo prose | 1 | ~US$0.10 |
| **Total** | | **~US$2** (target < US$5) ✓ |

Repeated parts of prompts (the RFQ lines, instructions) are cached, which lowers this further.

## 9. Testing approach

- **Scenario and normalize engine:** unit tests against the **answer key** (every conversion and every scripted VP question has a known correct answer).
- **Extraction accuracy:** a script runs extraction on the 5 seeded replies and scores it against the answer key (PRD target ≥ 95%).
- **Demo path:** a Playwright test signs up, follows the tour from start to award, and fails if any step has no next action.
- **You verify** each built piece using plain-language steps (CLAUDE.md rule 6).

## 10. What I need from you before the build

| # | What | Time | Why |
|---|---|---|---|
| 1 | **Approve installing Node.js** (LTS, via nvm) inside WSL | 10 min, I do it | Runs Next.js. Nothing is installed on Windows itself |
| 2 | **GitHub account** (you may already have one) and an empty private repo, or let me create it with your login | 5 min | Vercel deploys from GitHub |
| 3 | **Vercel account**: sign up with GitHub (free Hobby plan) | 3 min | Hosting |
| 4 | **Supabase account**: sign up with GitHub, create a project in the **Mumbai** region, free plan | 5 min | Login, database, file storage |
| 5 | **Anthropic API key** with a monthly spending limit (steps given earlier) | 10 min | The AI |

When we connect these, you'll paste keys into the Vercel and Supabase dashboards or into a local `.env.local` file that git ignores. **Never into this chat.**

## 11. Glossary (new terms)

| Term | Meaning |
|---|---|
| Next.js / React | A popular toolkit for building web apps; React draws the screens, Next.js adds the server side |
| TypeScript | JavaScript with type checks that catch mistakes before the code runs |
| Node.js | The engine that runs JavaScript/TypeScript outside a browser; needed to build and run Next.js |
| Supabase | A hosted service that bundles a database, login and file storage |
| Postgres | The database Supabase uses |
| Row-level security (RLS) | A database rule that lets each user see only their own rows, enforced by the database itself |
| Vercel | A hosting service that runs Next.js apps and redeploys on every GitHub push |
| Server route | Code that runs on the server when the screen asks for something |
| Schema / structured output | A fixed shape the AI's answer must match, so code can check and use it |
| Token | The unit AI services charge by, roughly ¾ of a word |
| Polling | The screen asking the server "anything new?" every second |
| Seed | The starting demo data copied into every new account |
