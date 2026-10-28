# src · the application

Everything the user sees, and the logic behind it.

| Folder | What's inside |
|---|---|
| [`app/`](app/) | The screens and server endpoints. `page.tsx` is the sign-in page; [`rfx/`](app/rfx/) is the workspace; [`rfx/[id]/`](app/rfx/[id]/) holds one sourcing event's tabs (overview, RFQ, replies, comparison, review, award); [`api/`](app/api/) holds the endpoints for drafting, reading replies and asking questions |
| [`components/`](components/) | Shared building blocks: the evidence drawer, the PDF viewer, the clarification email, the top bar |
| [`lib/ai/`](lib/ai/) | The only code that talks to the AI provider |
| [`lib/extract/`](lib/extract/) | Preparing each file type, asking the AI to read it, and the rules for missing values |
| [`lib/engine/`](lib/engine/) | **Pure calculation, no AI:** unit and currency conversion, the comparison, questionnaire scoring, what-if scenarios |
| [`lib/pipeline/`](lib/pipeline/) | Reading one reply from start to finish, with live progress |
| [`lib/ask/`](lib/ask/) | The question engine, and the check that every number the AI writes matches the calculation |
| [`lib/copilot/`](lib/copilot/) | Drafting the RFQ |
| [`lib/workspace/`](lib/workspace/) | Creating a new user's sample workspace |
| [`lib/supabase/`](lib/supabase/) | Connecting to the database and login service |
| [`proxy.ts`](proxy.ts) | Runs before every page: keeps the login fresh and sends signed-out visitors to sign-in |

The design behind it is in [How it is built](../docs/03-how-it-is-built.md).
