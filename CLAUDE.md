# CLAUDE.md — Procure Mind V2.0

This file is the project's memory. Any new Claude session should read it first and resume from **Current status**.

## Current status
- **Current phase:** 3 — Architecture (`docs/03-architecture.md` + `docs/diagrams/arch-*.excalidraw`). Draft written; awaiting PM approval, Node.js install approval, and account setup (§10 of that doc).
- **Resume here (session paused 2026-10-27):** ask the PM to (1) approve the architecture, (2) approve installing Node.js LTS via nvm in WSL, (3) confirm GitHub / Vercel / Supabase (Mumbai) / Anthropic API key are set up. Then Phase 4 wireframes (S1–S12 from `docs/02-journeys.md`), then build per PRD §6 build order. Demo timing was "tomorrow" as of 2026-10-27 — confirm the actual demo date with the PM, since the schedule is now very tight.
- **Diagram generators:** `tools/diagrams/` (`excal.py` helper + one script per doc). Run via WSL: `cd tools/diagrams && python3 <script>.py ../../docs/diagrams`. Reuse `excal.py` for wireframes.
- **Phase 2:** journeys approved 2026-10-27.
- **Phase 1:** PRD v3 approved 2026-10-27.
- **DEADLINE:** demo on 2026-10-28, build in one day. Hosted, with user-account login. Keep all docs (journeys, architecture, wireframes); Phase 5 backlog skipped (roadmap item, PRD §13).
- **Next phase:** 2 — User journeys (`docs/02-journeys.md`)
- **Last updated:** 2026-10-27

| Phase | Output | Status |
|---|---|---|
| 0. Setup | CLAUDE.md, folders, git | Done (approved 2026-10-27) |
| 1. Problem and PRD | docs/01-PRD.md | Done (v3 approved 2026-10-27) |
| 2. User journeys | docs/02-journeys.md | Done (approved 2026-10-27) |
| 3. Tech stack and data model | docs/03-architecture.md | Draft, awaiting approval |
| 4. Wireframes | docs/04-wireframes.md (+ HTML screens) | Not started |
| 5. Epics, stories, release plan | docs/05-backlog.md | Skipped by PM decision (roadmap item); build follows PRD §5 demo script |
| 6. Build the MVP | src/ | Not started |
| 7. Ship and iterate | docs/06-iteration-log.md | Not started |

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
  src/third_project/        existing Python skeleton (made with uv), kept by PM decision
  pyproject.toml            Python project settings (uv)
  .python-version, .gitignore, .venv/ (not committed)
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

## Open items
- PM is setting up an Anthropic API key (needed before Phase 6 build).
- Python package is still named `third-project` / `third_project`. Revisit in Phase 3 together with the stack decision.
