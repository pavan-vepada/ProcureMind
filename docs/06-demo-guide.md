# 06 — Demo guide: Procure Mind V2.0

**For:** the person presenting the demo (and anyone trying it alone). **Length:** about 10 minutes.

Every step is a click. The indigo button at the bottom of each screen, and the guided tour on the right, always point at the next one.

## Before you start

- Open the app a few minutes early (free hosting can be slow on the very first visit).
- Use a fresh account, or click **↺ Reset demo** at the top to start the story again.
- **If the AI is slow on the day:** add `?savedRun=1` to the address once (e.g. `…/rfx?savedRun=1`). The seeded replies are then read from a recorded reading, and the inbox shows a “Showing saved run” banner. `?savedRun=0` switches back. Your own uploads always use the live AI.

## The story

| # | Screen | Click | What to point out |
|---|---|---|---|
| 1 | Landing | Sign up (any email, 8+ character password) | One screen, no verification email. You land inside your own copy of the demo. |
| 2 | Workspace → Need / RFI / RFP | **Read the internal request**, then the next buttons | The lifecycle strip: Need, RFI and RFP are done; the RFQ is where we are. |
| 3 | RFQ | **Draft RFQ with co-pilot** | The draft streams in line by line. Every quantity and size is checked against the buyer's volume sheet. Click any quantity to edit it. |
| 4 | RFQ | **Lock rules & send** | The pass rules and the comparison basis are frozen *before* any price is seen, so the award is defensible. |
| 5 | Send | **Fast-forward 9 days** | Five replies land: Excel, PDF, Word, a phone photo and a plain email. One is late. |
| 6 | Inbox | (nothing; it starts by itself) | All five are read at once, with plain-word progress per vendor (about 30–50 seconds each). |
| 7 | Comparison | **Open comparison** | Everything on one basis: ₹ per piece, before GST, delivered. Green = cheapest valid. Toggle **As quoted** to see the mess it came from. Hover a price for its conversion chain. |
| 8 | Source drawer | Click a **V4 (Photo)** price, then a **V2 (PDF)** price | The photo with a red box around where the number was read; the PDF page with the number highlighted. Proof in one click. |
| 9 | Review queue | **13 items need a look** → **Ask vendor** on V3 → **Send** | One consolidated email. V3 replies two days later, the reply is read automatically, and only the three missing cells change (teal **clarification** badge). |
| 10 | Comparison → Ask panel | Click **Split the award…**, then **Save as scenario** | The AI picks the calculation; code computes it. Click **Show working** for the data, filters, rule and formula. V3 (fails the questionnaire) and V4 (expired ISO) are excluded by the locked rules. |
| 11 | Ask panel | Click **What if we combine both plants' volumes?**, then **Save** | Volume tiers kick in; the saving against the previous answer is shown. |
| 12 | Ask panel | **Recommend award** on the newest scenario | The award memo: savings vs last year and vs the cheapest single vendor, the locked rules, risks, and every ₹ figure clickable to the vendor's own words. **Download PDF** prints it. |

## Things worth showing if there's time

- **Assumptions** (comparison toolbar): change the exchange rate or V5's freight estimate and watch every number, total and saved scenario update. The change can be undone in the review queue.
- **Ambiguous question:** click **Now leave out the expensive one**. The assistant asks which one you mean, with clickable choices, instead of guessing.
- **Upload your own quote** (Inbox, right panel): any Excel, PDF, Word, photo or pasted email text, for any vendor. It's read live and only the values it changes are updated; the old values stay in each cell's history.
- **Vendor profile:** click a vendor's name in the comparison header: questionnaire answers, certificates, terms and its whole timeline.

## Planted traps (and where they show)

| Vendor | Format | Trap | Where you see it handled |
|---|---|---|---|
| V1 Kaveri | Excel, own layout | “Per box” = bundle of 100; lines renamed and shuffled | Conversion chain: ₹1,850 per box → ₹18.50 per piece |
| V2 Deccan | PDF letterhead | USD; volume tiers; 5% discount in a footnote; GST included on 2 lines | `$→₹`, `tier`, `GST removed`; discount flagged and left to you in Assumptions |
| V3 Shakti | Word prose | 27 of 30 lines; 30-day terms; fails the questionnaire | “27 / 30 ⚠”, red missing cells, closed loop via Ask vendor |
| V4 Narmada | Angled phone photo | Per kg; glare over one row; expired ISO certificate | `estimate` badges; 2 unreadable lines; “ISO expired” |
| V5 Sahyadri | Plain email | “Rest same as last year”; freight extra; 2 new lines | `contract` badges (#2025-V5); 2 lines with no history; freight estimate labelled |

## Accuracy checks behind the demo

- On the five seeded replies the live AI read **129 of 129 prices correctly** (`RUN_EVAL=1 npx vitest run tests/eval`).
- With a perfect reading, the engine reproduces the answer key for all 300 vendor × line × plant prices to the paisa (`npm test`).
- Every number the AI writes in an answer or the memo is checked against the computed result; if one doesn't match, the AI's sentence is dropped and a code-written summary is shown instead.
