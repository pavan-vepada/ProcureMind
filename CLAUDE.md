# CLAUDE.md — Procure Mind V2.0

This file is the project's memory. Any new Claude session should read it first and resume from **Current status**.

## Current status
- **Current phase:** 6 — Build. **All MVP features (PRD §6 steps 1–10) are built** and run end to end locally against the real Supabase project and the live OpenAI model. Not yet deployed.
- **Restructured (2026-10-28, PM feedback):** no tour, no "demo" framing. Login lands on a **workspace of many RFx** (`/rfx`): 4 sample RFx at different stages (drafted, replies arriving, analysis with a saved scenario and earlier Q&A, awarded with memo), a pending internal request, "New RFx" (from a request or a free-text need, co-pilot drafts live). Each RFx has tabs: Overview · RFQ · Replies · Comparison · Review · Award (`app/rfx/[id]/`). "Restore sample workspace" in the account menu.
- **Resume here (2026-10-28):** (1) PM walks the product using `docs/06-demo-guide.md` and reports anything that feels off. (2) **Do not push anywhere** until the PM says so (PM instruction 2026-10-28). Deploy later needs the PM's OK to create the GitHub repo, then Vercel import with env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (optionally `AI_MODEL`); set Supabase Auth Site URL to the Vercel address.
- **Demo date:** "within the week of 2026-10-28", exact date to be set by the PM. PM later said to forget the date and build everything (2026-10-28).
- **Last updated:** 2026-10-28

| Phase | Output | Status |
|---|---|---|
| 0. Setup | CLAUDE.md, folders, git | Done (approved 2026-10-27) |
| 1. Problem and PRD | docs/01-PRD.md | Done (v3 approved 2026-10-27) |
| 2. User journeys | docs/02-journeys.md | Done (approved 2026-10-27) |
| 3. Tech stack and data model | docs/03-architecture.md | Done (approved 2026-10-28) |
| 4. Wireframes | docs/04-wireframes.md (Excalidraw, per D7) | Done (approved 2026-10-28) |
| 5. Epics, stories, release plan | docs/05-backlog.md | Skipped by PM decision (roadmap item) |
| 6. Build the MVP | src/ · docs/05-walkthrough.md | Built and tested locally; deploy pending |
| 7. Ship and iterate | docs/07-iteration-log.md | Not started |

## Build progress (PRD §6 build order; replaces the skipped backlog)
| # | Step | Status |
|---|---|---|
| 1 | Login, lifecycle strip, tour, demo copy per account, Reset demo (S1–S3) | Done |
| 2 | Send / fast-forward, demo inbox, upload a reply (S5, S6) | Done |
| 3 | AI extraction for all 5 formats, live progress | Done (live eval 129/129 prices) |
| 4 | Mapping, normalization, matrix, badge legend (S7) | Done (engine = answer key to the paisa) |
| 5 | Source drawer: Excel cell, Word paragraph, PDF highlight, photo bounding box, contract (S8) | Done |
| 6 | Missing-value policy, contract memory, tiers, assumptions, review queue + undo (S9) | Done |
| 7 | Clarification emails and the closed loop (S10) | Done |
| 8 | Ask panel: tools, show working, clarifying questions, scenarios (S7b) | Done |
| 9 | Award memo with evidence links, print to PDF (S12) | Done |
| 10 | Co-pilot RFQ drafting (streamed), rule lock, guided tour (S4) | Done |
| — | Vendor profile (S11), presenter saved-run fallback | Done |
| — | Deploy to Vercel | Pending PM approval for GitHub repo |

**How to run (WSL):** `source ~/.nvm/nvm.sh` first (nvm isn't loaded in non-interactive shells).
- `npm run dev` · `npm test` (unit + Supabase integration) · `npm run typecheck` · `npx eslint .` · `npm run db:migrate`
- Live AI accuracy: `bash scripts/eval-all.sh` (costs a little; ~45 s per vendor)
- Browser end-to-end: `bash scripts/e2e.sh` (builds, runs Playwright, cleans up test accounts). Chromium libs were unpacked without sudo by `scripts/browser-libs.sh` into `~/.local/pw-libs`.
- Dataset: `cd tools/dataset && ~/.local/bin/uv run procure-mind-dataset ../../sample-data`
- Check `.env.local` shape without printing secrets: `node scripts/check-env.mjs`

**Gotchas learned:**
- Next.js 16: `middleware` is now `proxy.ts`; Cache Components is switched off on purpose; read `node_modules/next/dist/docs/` first (see `AGENTS.md`).
- Next memoizes identical GET fetches within one render; the server Supabase client passes a fresh AbortController signal so read-after-write works (`src/lib/supabase/server.ts`).
- Replies are processed in parallel: never write the whole `rfx.assumptions` object from the pipeline; use the `merge_assumption` RPC.
- React 19 lint forbids setState in effects: use the "adjust state during render" pattern or remount with `key`.
- PowerShell mangles quotes inside `wsl -e bash -c '...'`, and `pkill -f "x"` can match its own shell: write a script file.
- Supabase rejects made-up email domains; tests sign up `TEST_EMAIL` plus-addresses and `scripts/cleanup-test-users.mjs` deletes them.
- Sample workspace seeding (`src/lib/workspace/seed.ts`) must check every write (`must()`); it retries once from scratch, and `workspace_seeds.ready_at` tells a parallel first request when the workspace is complete.
- Anything computed during seeding must reload the RFx first: reading replies adds assumptions (freight estimates) via RPC.
- e2e: after clicking a tab, wait for that page's heading before clicking buttons that exist on both pages (e.g. "Ask vendor"), and match text unique to the new state (sample data already contains "Saved as…").
- `scripts/e2e.sh` pipes through `tail`, so output appears only at the end.

## Product context
- **Product name:** Procure Mind V2.0
- **One-liner:** "Kill the quote spreadsheet." An AI co-pilot drafts an RFx, the system reads whatever vendors send back (Excel, PDF, Word, phone photo, plain email), normalizes everything into one side-by-side comparison, and lets the buyer ask plain-language questions all the way to a defensible award memo.
- **Demo data:** corrugated packaging, 5 vendors × 30 lines, 12-question questionnaire, last year's contracts, planted traps, answer key (`sample-data/demo.json`, generated by `tools/dataset`). Three more sample RFx in `sample-data/extra.json`.
- **Personas:** Category Buyer (primary), VP Procurement (secondary), Vendor rep (external, never logs in).
- **Core design principles:** every number links to its source; AI interprets, code does the math; ambiguities are flagged, never assumed.
- **Full detail:** `docs/01-product-requirements.md`.

## Roles
- **PM (user):** owns the "what" and "why". Non-technical; cannot read code fluently.
- **Claude:** owns the "how". Proposes technical options in plain language and recommends one. Challenges ideas and flags risks honestly.

## Working rules
1. Phases run in order. Each phase produces one markdown file in `docs/`.
2. At the end of each phase: show the file, summarize it in a few lines, and **wait for explicit PM approval** before moving on.
3. If an earlier decision changes, flag which later files are affected.
4. Explain every technical term the first time it is used.
5. Update this file at the end of every phase.
6. Build loop: build → automated tests → plain-language verification steps for the PM → git commit. (PM asked on 2026-10-28 to build everything without stopping between steps.)
7. Recommend free VS Code extensions when useful; the PM approves before anything is installed.

## Toolset and environment
- **Editor:** VS Code on Windows 11. The project lives inside WSL (Ubuntu).
- **Claude's shell:** Windows PowerShell; Linux commands run through `wsl -e bash -c '...'`.
- **In WSL:** git, uv, Python 3.14, Node 24 (nvm), gh (logged in as pavan-vepada), Playwright Chromium.
- **Services:** Supabase project (URL in `.env.local`; session pooler for `SUPABASE_DB_URL`), OpenAI key (model `gpt-5.5` by default). Email confirmation is off in Supabase Auth.
- **Git:** branch `master`, local only (no remote yet).

## Repo structure (reorganised 2026-10-28 so a non-technical reader can navigate GitHub in order)
```
procure-mind-v2/
  README.md                 start here: what it is, screenshots, map of the repo
  docs/                     numbered reading order: 01 product requirements … 06 glossary; diagrams/
  src/app/                  screens (login = page.tsx; workspace under rfx/) and API routes (api/)
  src/components/           UI kit, shell (top bar, account menu), source drawer, PDF viewer, clarification composer
  src/lib/                  ai/, extract/, engine/ (pure maths), pipeline/, ask/, copilot/, workspace/ (sample seeding), memo.ts, clarify.ts
  src/proxy.ts              session refresh, login redirects, presenter saved-run cookie
  database/migrations/      tables, row-level security, functions, uploads bucket (applied by scripts/migrate.mjs)
  sample-data/              context.json (hand-written), demo.json + extra.json + files/ (generated by tools/dataset)
  tests/                    unit/, integration/ (Supabase), eval/ (live AI), e2e/ (Playwright)
  tools/dataset/            Python sample-data generator (deterministic)
  tools/diagrams/           Excalidraw generators for docs
  scripts/                  migrate, env check, eval, e2e, test-user cleanup, commit helper
  public/ + config files    must stay at the root (Next.js, TypeScript, lint, test runners)
```
- Import aliases: `@/…` = `src/…`, `@data/…` = `sample-data/…` (tsconfig + vitest).

## Conventions
- Docs are markdown; diagrams are `.excalidraw` in `docs/diagrams/`.
- Commit messages: `Phase N: <what>` for docs; `Story <ID>: <what>` or a plain summary during build.
- Dates are absolute (YYYY-MM-DD).

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Product name "Procure Mind V2.0"; folder `procure-mind-v2` | PM decision; folder names without spaces/dots |
| 2026-10-27 | D1 demo, D2 corrugated, D3 simulated email in mixed formats, D4 mock contract DB, D6 hosted with login, D7 keep design docs, skip backlog | PM decisions; see `docs/01-PRD.md` §0 |
| 2026-10-28 | Architecture: Next.js + Supabase + Vercel | PM approval of `docs/03-architecture.md` |
| 2026-10-28 | AI provider OpenAI (`gpt-5.5`, set in `AI_MODEL`); all AI calls in `lib/ai/` | PM has an OpenAI key |
| 2026-10-28 | Demo date moved to "within the week"; then "build everything" without step-by-step approval | PM decisions |
| 2026-10-28 | Uploads go browser → Supabase Storage directly | Vercel limits request bodies to 4.5 MB; uploads allow 10 MB |
| 2026-10-28 | Conditional discounts are always flagged and not applied until the buyer decides | "Ambiguities are flagged, never assumed"; the AI judged V2's footnote clear |
| 2026-10-28 | Questionnaire Q1 (valid ISO 9001) is decided by the certificate's date in code | The AI sometimes records the certificate but not the Q1 answer |
| 2026-10-28 | Reply deadline fixed at Day 7 | The demo script needs one late reply |
| 2026-10-28 | No guided tour; workspace of many RFx at different stages; start new or continue any | PM: it must feel like a real LLM product for public display (GitHub, LinkedIn) |
| 2026-10-28 | Do not push anywhere until the PM says so | PM instruction |
| 2026-10-28 | Repo reorganised: code in `src/`, `seed/` → `sample-data/`, `supabase/` → `database/`, docs numbered in reading order | PM wants to navigate GitHub sequentially; docs written for senior product leaders |
| 2026-10-28 | Login page shows only the sign-in card; no tagline | PM decision |
| 2026-10-28 | Sample world keeps the buyer persona "Pavan, Sunrise Consumer Goods" for every user | Vendor emails address the buyer by name; open question for the PM |

## Open items
- Deploy (see Current status). Supabase Auth → URL Configuration → Site URL must be set to the Vercel URL after deploy.
- Set a monthly spending limit on the OpenAI key.
- Google sign-in (FR-0.2 option) not set up; needs a Google Cloud OAuth client. Email + password works.
- Should-haves not built: compare saved scenarios side by side (FR-5.8), charts in answers (FR-5.9), Excel export (FR-5.10), read-only share link for the memo (FR-6.5), unknown-sender assignment (FR-2.3).
