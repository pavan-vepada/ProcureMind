# Procure Mind V2.0

**Kill the quote spreadsheet.** An AI co-pilot drafts the RFQ, reads whatever vendors send back (Excel, PDF, Word, a phone photo, plain email), puts every quote on one basis with a source behind every number, and answers the VP's what-ifs all the way to an award memo.

- Product docs: `docs/` (PRD, journeys, architecture, wireframes, demo guide)
- Project status and working notes: `CLAUDE.md`

## Run it locally (WSL)

```bash
source ~/.nvm/nvm.sh
cp .env.example .env.local      # fill in Supabase + OpenAI values
npm install
npm run db:migrate              # create tables and security rules in Supabase
npm run dev                     # http://localhost:3000
```

## Checks

```bash
npm test                        # unit tests + Supabase integration tests
npm run typecheck && npx eslint .
bash scripts/eval-all.sh        # live AI accuracy on the 5 seeded replies
bash scripts/e2e.sh             # the whole demo story in a real browser
```

## How it is built

Next.js 16 (TypeScript) on Vercel · Supabase (login, Postgres with row-level security, file storage) · OpenAI (`gpt-5.5`) for reading replies, drafting and interpreting questions. All arithmetic is plain code (`lib/engine/`); the AI never computes a number shown to the user.
