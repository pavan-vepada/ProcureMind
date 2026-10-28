# CLAUDE.md — Procure Mind V2.0

This file is the project's memory. Any new Claude session should read it first and resume from **Current status**.

## Current status
- **Current phase:** 6 — Build. Step 1 code written and tested locally; waiting on PM to fill `.env.local`, run the database setup, and import the repo into Vercel.
- **Resume here (2026-10-28):** finish build step 1 (see Build progress below): PM creates `.env.local` from `.env.example`, switches off email confirmation in Supabase, then Claude runs `npm run db:migrate` and the integration tests, and PM imports the GitHub repo into Vercel with the two `NEXT_PUBLIC_SUPABASE_*` env vars.
- **Phase 4:** wireframes approved 2026-10-28.
- **Demo date:** moved from 2026-10-28 to "within the week of 2026-10-28"; exact date to be set by the PM. Follow the pre-decided phase order.
- **Wireframe generator:** `tools/diagrams/wireframes.py`; `check_overflow.py` flags text that doesn't fit its box.
- **Diagram generators:** `tools/diagrams/` (`excal.py` helper + one script per doc). Run via WSL: `cd tools/diagrams && python3 <script>.py ../../docs/diagrams`. Reuse `excal.py` for wireframes.
- **Phase 2:** journeys approved 2026-10-27.
- **Phase 1:** PRD v3 approved 2026-10-27.
- **DEADLINE:** demo within the week of 2026-10-28 (date TBD by PM; was 2026-10-28). Hosted, with user-account login. Keep all docs (journeys, architecture, wireframes); Phase 5 backlog skipped (roadmap item, PRD §13).
- **Next phase:** 6 — Build (Phase 5 skipped)
- **Last updated:** 2026-10-28

| Phase | Output | Status |
|---|---|---|
| 0. Setup | CLAUDE.md, folders, git | Done (approved 2026-10-27) |
| 1. Problem and PRD | docs/01-PRD.md | Done (v3 approved 2026-10-27) |
| 2. User journeys | docs/02-journeys.md | Done (approved 2026-10-27) |
| 3. Tech stack and data model | docs/03-architecture.md | Done (approved 2026-10-28) |
| 4. Wireframes | docs/04-wireframes.md (Excalidraw, per D7) | Done (approved 2026-10-28) |
| 5. Epics, stories, release plan | docs/05-backlog.md | Skipped by PM decision (roadmap item); build follows PRD §5 demo script |
| 6. Build the MVP | app/, lib/, components/ | In progress (see Build progress) |
| 7. Ship and iterate | docs/06-iteration-log.md | Not started |

## Build progress (PRD §6 build order; replaces the skipped backlog)
| # | Step | Status |
|---|---|---|
| 1 | Hosted skeleton: login, lifecycle strip, tour, demo copy per account, Reset demo (S1, S2, S3) | Code + unit tests done; DB setup, integration tests, Vercel deploy pending |
| 2 | Demo inbox, send / fast-forward, upload a reply | Not started |
| 3 | Extraction for all 5 formats, live progress | Not started |
| 4 | Mapping, normalization, matrix, badge legend | Not started |
| 5 | Source drawer (photo bounding box) | Not started |
| 6 | Missing-value policy, contract memory, tiers, assumptions, review queue | Not started |
| 7 | Discrepancy emails, closed loop | Not started |
| 8 | Ask panel, suggested questions, scenarios | Not started |
| 9 | Award memo | Not started |
| 10 | Co-pilot RFQ drafting, rule lock, guided tour completion | Not started |

**How to run (WSL):** `source ~/.nvm/nvm.sh` first (nvm isn't loaded in non-interactive shells). `npm run dev` · `npm test` · `npm run typecheck` · `npx eslint .` · `npm run db:migrate`.
**Next.js 16 notes:** `middleware` is now `proxy.ts`; Cache Components is switched off on purpose (`next.config.ts`); read `node_modules/next/dist/docs/` before using unfamiliar APIs (see `AGENTS.md`).
**Shell quoting:** PowerShell mangles quotes inside `wsl -e bash -c '...'`; for anything non-trivial, write a script file or use the Write tool.

## Product context
- **Product name:** Procure Mind V2.0
- **One-liner:** "Kill the quote spreadsheet." An AI co-pilot drafts an RFx, the system reads whatever vendors send back (Excel, PDF, Word, phone photo, plain email), normalizes everything into one side-by-side comparison, and lets the buyer ask plain-language questions all the way to a defensible award memo.
- **Demo size:** 5 vendors × 30 line items + questionnaire + attachments, fabricated data with planted traps and an answer key.
- **Proposed category:** corrugated packaging (pending PM confirmation, D2).
- **Personas:** Category Buyer (primary), VP Procurement (secondary), Vendor rep (external, never logs in).
- **Core design principles:** every number links to its source; AI interprets, code does the math; ambiguities are flagged, never assumed.
- **Full detail:** `docs/01-PRD.md`.
- **MVP scope:** all **M** items in PRD §5, built in the order of PRD §6.

## Roles
- **PM (user):** owns the "what" and "why". Non-technical; cannot read code fluently.
- **Claude:** owns the "how". Proposes technical options in plain language and recommends one. Challenges ideas and flags risks honestly.

## Working rules
1. Phases run in order. Each phase produces one markdown file in `docs/`.
2. At the end of each phase: show the file, summarize it in a few lines, and **wait for explicit PM approval** before moving on.
3. If an earlier decision changes, flag which later files are affected.
4. Explain every technical term the first time it is used.
5. Update this file at the end of every phase.
6. Phase 6 build loop, **one story at a time, never batched:** build → automated tests for the acceptance criteria → plain-language manual verification steps for the PM → update status in `docs/05-backlog.md` → git commit.
7. Recommend free VS Code extensions when useful; the PM approves before anything is installed.

## Toolset and environment
- **Editor:** VS Code on Windows 11. The project lives inside WSL (Ubuntu), which is Linux running inside Windows.
- **Claude's shell:** Windows PowerShell. Linux commands (git, uv, python) must be run through WSL:
  `wsl -e bash -lc "cd ~/workspace/procure-mind-v2 && <command>"`
- **Available in WSL:** git 2.53, uv 0.13.5, Python 3.14 (project pins 3.12 via `.python-version`).
- **Not installed:** Node.js (on neither Windows nor WSL).
- **Git:** branch `master`. Author identity is set for this repo only.

## Repo structure
```
procure-mind-v2/            WSL path: ~/workspace/procure-mind-v2 (renamed from third-project on 2026-10-27)
  CLAUDE.md                 this file
  README.md
  docs/                     phase documents 01–06
  app/                      Next.js screens and server actions (S1 = app/page.tsx, workspace = app/rfx/)
  components/               shared UI (shell: top bar, lifecycle strip, tour)
  lib/                      data access, Supabase clients, lifecycle, demo seed
  proxy.ts                  runs before every page: session refresh + login redirects
  supabase/migrations/      database tables + row-level security (applied by scripts/migrate.mjs)
  seed/                     demo content copied into each new account
  tests/                    unit/ (always) and integration/ (needs .env.local)
  tools/dataset/            Python dataset generator (uv project, formerly src/third_project)
  tools/diagrams/           Excalidraw generators for docs
```

## Conventions
- Docs are markdown. Journeys, architecture and wireframes are drawn as `.excalidraw` files in `docs/diagrams/` (opened with the Excalidraw VS Code extension, `pomdtr.excalidraw-editor`, already installed) and linked from the markdown. Small inline diagrams may use Mermaid.
- Commit messages: `Phase N: <what>` for docs; `Story <ID>: <what>` during build.
- Dates are absolute (YYYY-MM-DD).

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Keep the existing uv/Python skeleton for now | PM decision. Final stack choice is still made in Phase 3, which may revisit this. |
| 2026-10-27 | Keep working through WSL from the current setup | PM decision. |
| 2026-10-27 | Product name: "Procure Mind V2.0" | PM decision. |
| 2026-10-27 | Folder renamed to `procure-mind-v2` | Spaces and dots in folder names break developer tools. The product name stays "Procure Mind V2.0" everywhere users see it. |
| 2026-10-27 | D1 demo (product-ready later), D2 corrugated, D3 email in mixed formats via demo inbox, D4 mock contract DB, D5 demo 2026-10-28 | PM decisions; see `docs/01-PRD.md` §0 |
| 2026-10-27 | D6 hosted with user-account login; D7 keep journeys/architecture/wireframes (Excalidraw), skip backlog | PM decisions |
| 2026-10-28 | Architecture approved: Next.js + Supabase + Vercel | PM approval of `docs/03-architecture.md` |
| 2026-10-28 | Demo moved to within the week of 2026-10-28 (exact date TBD); keep the planned phase order | PM decision; supersedes D5 date |
| 2026-10-28 | AI provider is OpenAI, not Anthropic; model name in one setting (`AI_MODEL`), all AI calls in `lib/ai/` | PM has an OpenAI key, not an Anthropic key |

## Open items
- PM has an OpenAI API key; set a monthly spending limit. Key goes in `.env.local` / Vercel dashboard, never in chat.
- Google sign-in (FR-0.2 option) not set up; needs a Google Cloud OAuth client. Email + password works.
