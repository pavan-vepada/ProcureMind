# CLAUDE.md: Procure Mind project memory

Working notes for Claude Code, the AI coding assistant that built Procure Mind under the product manager's direction. Any new session reads this first and resumes from **Current status**. For the product itself, start with [README.md](README.md).

## Current status
- **Live:** https://procure-mind-v2.vercel.app (Vercel, deployed from GitHub `pavan-vepada/procure-mind-v2`, branch `master`; every push redeploys). The full e2e journey passes against the live site (`BASE_URL=https://procure-mind-v2.vercel.app npx playwright test`, then `node scripts/cleanup-test-users.mjs`).
- **Next:** PM shares on LinkedIn; iterate on feedback.
- **Last updated:** 2026-10-29

| Phase | Output | Status |
|---|---|---|
| 0. Setup | CLAUDE.md, folders, git | Done 2026-10-27 |
| 1. Problem and requirements | docs/01-product-requirements.md | Done 2026-10-27 |
| 2. User journeys | docs/02-user-journeys.md (+ Claude Design journey map) | Done 2026-10-27, revised 2026-10-28 |
| 3. Architecture | docs/03-how-it-is-built.md | Done 2026-10-28 |
| 4. Screen designs | docs/04-screen-designs.md (Excalidraw wireframes in docs/diagrams) | Done 2026-10-28 |
| 5. Backlog | — | Skipped by PM decision (build followed the requirements' build order) |
| 6. Build | src/ · docs/05-walkthrough.md | Done |
| 6b. Brand and voice | docs/06-brand-and-design/ | Done 2026-10-29 |
| 7. Ship and iterate | GitHub, then Vercel | In progress |

**How to run (WSL):** `source ~/.nvm/nvm.sh` first (nvm isn't loaded in non-interactive shells).
- `npm run dev` · `npm test` (unit + Supabase integration) · `npm run typecheck` · `npx eslint .` · `npm run db:migrate`
- Live AI accuracy: `bash scripts/eval-all.sh` (small cost; ~45 s per supplier)
- Browser end-to-end: `bash scripts/e2e.sh` (builds, runs Playwright, cleans up test accounts). Chromium libs were unpacked without sudo by `scripts/browser-libs.sh` into `~/.local/pw-libs`; an emoji font is in `~/.local/share/fonts`.
- Sample data: `cd tools/dataset && ~/.local/bin/uv run procure-mind-dataset ../../sample-data`
- Check `.env.local` shape without printing secrets: `node scripts/check-env.mjs`

**Gotchas learned:**
- Next.js 16: `middleware` is now `proxy.ts`; Cache Components is switched off on purpose; read `node_modules/next/dist/docs/` first (see `AGENTS.md`). The dev indicator is off (`devIndicators: false`).
- Next memoizes identical GET fetches within one render; the server Supabase client passes a fresh AbortController signal so read-after-write works (`src/lib/supabase/server.ts`).
- Replies are processed in parallel: never write the whole `rfx.assumptions` object from the pipeline; use the `merge_assumption` RPC.
- React 19 lint forbids setState in effects: use the "adjust state during render" pattern or remount with `key`.
- PowerShell mangles quotes inside `wsl -e bash -c '...'`, and `pkill -f "x"` can match its own shell: write a script file.
- Supabase rejects made-up email domains; tests sign up `TEST_EMAIL` plus-addresses and `scripts/cleanup-test-users.mjs` deletes them.
- Sample workspace seeding (`src/lib/workspace/seed.ts`) must check every write (`must()`); it retries once from scratch, and `workspace_seeds.ready_at` tells a parallel first request when the workspace is complete.
- Anything computed during seeding must reload the RFx first: reading replies adds assumptions (freight estimates) via RPC.
- e2e: after clicking a tab, wait for that page's heading before clicking buttons that exist on both pages, and match text unique to the new state (sample data already contains "Saved as…"; event titles also appear in the worklist).
- `scripts/e2e.sh` pipes through `tail`, so output appears only at the end.
- Docs screenshots: build, `npx next start -p 3100`, then `node scripts/screenshots.mjs` (masks the test email), then `node scripts/cleanup-test-users.mjs`. Playwright test runs wipe `test-results/`, so docs images live in `docs/images/`.
- Mermaid in docs: semicolons end statements in sequence diagrams; subgraph `direction` is ignored if a node inside links outside it (link subgraph to subgraph instead). Validate by parsing with mermaid in the Playwright browser.
- Theme: colours are named tokens in `src/app/globals.css` (accent, ok/warn/bad + -ink/-line, panel, page, sidebar). Use token classes, never raw hex. Informational badge tones (info/est/clar) are deliberately neutral grey.
- Tailwind only sees class names written out in full in the source; never build them with template strings (e.g. `lg:${COLS}`).
- UI wording: say "supplier", never "vendor"; no "AI"/"co-pilot" labels on screens (see docs/06-brand-and-design). Internal code names (`lib/copilot`, `vendors` table) stay.
- Docs audience: senior product leaders and non-technical readers. Plain English, a one-paragraph summary atop each doc, measured results only.

## Product context
- **Product:** Procure Mind, a sourcing workspace for category buyers. It drafts the RFQ, reads whatever suppliers send back (Excel, PDF, Word, phone photo, plain email), puts every quote on one basis with a source behind every number, and takes the buyer from what-if questions to a defensible award memo.
- **Sample data:** corrugated packaging; the main event has 5 suppliers × 30 items, a 12-question questionnaire, last year's contracts, planted traps and an answer key (`sample-data/demo.json`, generated by `tools/dataset`). Three more sample events and a waiting request in `sample-data/extra.json`. The fictional buyer is "Pavan" at Sunrise Consumer Goods (kept by PM decision).
- **Personas:** category buyer (primary), head of procurement, finance, supplier (external, never logs in).
- **Design principles:** every number links to its source; the AI reads and writes, code calculates; doubt is flagged, never assumed.

## Roles and working rules
- **PM:** owns the what and why and makes every product decision. Prefers plain-language explanations of technical choices.
- **Claude:** owns the how; proposes options in plain language with a recommendation; flags risks honestly.
1. Each phase produces a document in `docs/`; the PM approves before the next phase.
2. If an earlier decision changes, flag which later files are affected.
3. Build loop: build → automated tests → plain-language verification for the PM → local commit.
4. Nothing is pushed or published without the PM's explicit go-ahead.
5. Secrets live only in `.env.local` (git-ignored); never print or commit them.

## Toolset and environment
- VS Code on Windows 11; the project lives inside WSL (Ubuntu). Claude's shell is PowerShell; Linux commands run through `wsl -e bash <script>`.
- In WSL: git, uv, Python 3.14, Node 24 (nvm), gh, Playwright Chromium.
- Services: Supabase (URL and keys in `.env.local`; session pooler for `SUPABASE_DB_URL`; email confirmation off), OpenAI (`gpt-5.5`, set by `AI_MODEL`).
- Git: branch `master`.

## Repo structure
```
README.md                 start here: what it is, screenshots, reading order, map of the repo
LICENSE                   all rights reserved
docs/                     01 requirements · 02 journeys · 03 how it is built · 04 screens · 05 walkthrough
                          · 06 brand and design · 07 glossary; images/ (screenshots); diagrams/ (Excalidraw)
src/app/                  screens (login = page.tsx; app under rfx/) and API routes (api/)
src/components/           UI kit, shell (sidebar, top bar, notifications, account menu), source drawer, PDF viewer, clarification email
src/lib/                  ai/, extract/, engine/ (pure maths), pipeline/, ask/, copilot/, workspace/ (sample seeding), memo.ts, clarify.ts, data.ts
src/proxy.ts              session refresh, login redirects, presenter saved-run cookie
database/migrations/      tables, row-level security, functions, uploads bucket (applied by scripts/migrate.mjs)
sample-data/              context.json (hand-written), demo.json + extra.json + files/ (generated)
tests/                    unit/, integration/ (Supabase), eval/ (live AI), e2e/ (Playwright)
tools/                    dataset/ (Python sample-data generator), diagrams/ (Excalidraw generators)
scripts/                  migrate, env check, eval, e2e, screenshots, test-user cleanup, commit helper
public/ + config files    must stay at the root
```
- Import aliases: `@/…` = `src/…`, `@data/…` = `sample-data/…` (tsconfig + vitest).

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Corrugated packaging; suppliers reply in every format; email simulated; last year's contracts as memory; hosted with login | PM decisions (docs/01 §11) |
| 2026-10-28 | Next.js + Supabase + Vercel; OpenAI (`gpt-5.5`); all AI calls in `src/lib/ai/` | Fastest route to a polished, hosted, secure product |
| 2026-10-28 | Uploads go browser → Supabase Storage directly | Vercel limits request bodies to 4.5 MB; uploads allow 10 MB |
| 2026-10-28 | Conditional discounts always flagged, never applied until the buyer decides | Doubt is flagged, never assumed |
| 2026-10-28 | Questionnaire Q1 (valid ISO 9001) decided by the certificate's date in code | The AI sometimes records the certificate but not the answer |
| 2026-10-28 | Reply deadline fixed at day 7 | One sample reply is late by design |
| 2026-10-28 | No guided tour; a workspace of sourcing events at different stages; start new or continue any | It must feel like a real product |
| 2026-10-28 | Repo in reading order: code in `src/`, `sample-data/`, `database/`, numbered docs | Navigable by non-technical readers on GitHub |
| 2026-10-28 | Login page shows only the sign-in card | PM decision |
| 2026-10-29 | Visual identity "Ledger": paper neutrals, ink, petrol accent `#0b6f78`, IBM Plex; colour only for meaning | Chosen from three directions (docs/06) to feel authentic, not AI-generated |
| 2026-10-29 | No "co-pilot"/"AI" labels in the app; "supplier" everywhere; explanations in Help and docs | Such words feel generic; the AI should just work |
| 2026-10-29 | Sidebar, top bar (search, notifications); home = "Needs your action" worklist | Real product feel |
| 2026-10-29 | Licence: all rights reserved; commits keep the PM's own email; sample buyer stays "Pavan" | PM decisions before publishing |

## Open items
- Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (+ `AI_MODEL` if set). Supabase Site URL points at the Vercel address. Confirm the Vercel function region is Mumbai (bom1) to sit next to Supabase, and that the OpenAI key has a monthly cap.
- Claude Design boards are private until the PM shares them: journey map https://claude.ai/artifact/4YXN2eCXe3zb33Y9yuwuNT, visual identity https://claude.ai/artifact/MLbR3P2wpRga7pMLbCD6gs. Their exports are in docs/06-brand-and-design.
- Not built yet (roadmap): side-by-side scenarios, charts in answers, Excel export, read-only memo link, unknown-sender assignment, Google sign-in.
