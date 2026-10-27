# CLAUDE.md — Procure Mind V2.0

This file is the project's memory. Any new Claude session should read it first and resume from **Current status**.

## Current status
- **Current phase:** 0 — Setup (awaiting PM approval)
- **Next phase:** 1 — Problem and PRD (`docs/01-PRD.md`)
- **Last updated:** 2026-10-27

| Phase | Output | Status |
|---|---|---|
| 0. Setup | CLAUDE.md, folders, git | Awaiting approval |
| 1. Problem and PRD | docs/01-PRD.md | Not started |
| 2. User journeys | docs/02-journeys.md | Not started |
| 3. Tech stack and data model | docs/03-architecture.md | Not started |
| 4. Wireframes | docs/04-wireframes.md (+ HTML screens) | Not started |
| 5. Epics, stories, release plan | docs/05-backlog.md | Not started |
| 6. Build the MVP | src/ | Not started |
| 7. Ship and iterate | docs/06-iteration-log.md | Not started |

## Product context
- **Product name:** Procure Mind V2.0
- **Idea / problem:** _Not yet shared._ The PM will describe it at the start of Phase 1.
- **Users / personas:** _TBD in Phase 1._
- **MVP scope:** _TBD in Phase 5._

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
  `wsl -e bash -lc "cd ~/workspace/third-project && <command>"`
- **Available in WSL:** git 2.53, uv 0.13.5, Python 3.14 (project pins 3.12 via `.python-version`).
- **Not installed:** Node.js (on neither Windows nor WSL).
- **Git:** branch `master`. Author identity is set for this repo only.

## Repo structure
```
third-project/              (PM has asked to rename it; see Open items)
  CLAUDE.md                 this file
  README.md
  docs/                     phase documents 01–06
  src/third_project/        existing Python skeleton (made with uv), kept by PM decision
  pyproject.toml            Python project settings (uv)
  .python-version, .gitignore, .venv/ (not committed)
```

## Conventions
- Docs are markdown; diagrams use Mermaid (text-based diagrams that render as pictures).
- Commit messages: `Phase N: <what>` for docs; `Story <ID>: <what>` during build.
- Dates are absolute (YYYY-MM-DD).

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Keep the existing uv/Python skeleton for now | PM decision. Final stack choice is still made in Phase 3, which may revisit this. |
| 2026-10-27 | Keep working through WSL from the current setup | PM decision. |
| 2026-10-27 | Product name: "Procure Mind V2.0" | PM decision. |

## Open items
- **Folder rename** to match the product name. Pending the PM's choice of folder spelling. The rename is done last because it disconnects the open VS Code session.
- Python package is still named `third-project` / `third_project`. Rename it together with the folder if the PM wants.
