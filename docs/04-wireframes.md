# 04 — Wireframes: Procure Mind V2.0

**Status:** Draft, awaiting PM approval · **Date:** 2026-10-28 · **Based on:** `01-PRD.md` v3, `02-journeys.md`, `03-architecture.md`

A **wireframe** is a rough sketch of a screen: what's on it and where, without final colours or fonts. Each screen S1–S12 from the journeys' screen inventory has its own Excalidraw file. Open it in VS Code and the Excalidraw extension draws it.

**How to read them:** the big frame is the screen at desktop size. **Orange numbered circles** on the screen match the **yellow notes** to the right of the frame, which explain behaviour and cite the PRD requirement. The **yellow, thick-bordered button** is the one highlighted next action. **Dashed** items are should-haves (built if time allows) or variants. All names, prices and dates are **illustrative**; the real values come from the demo dataset.

Colours match the badge legend the product will use: green = cheapest / done, yellow = needs a look, red = missing or fails, blue = from contract / information, purple = estimate or AI at work, orange = clarification.

## Screen flow

[wire-00-screen-flow.excalidraw](diagrams/wire-00-screen-flow.excalidraw): how the screens connect. Solid arrows are the guided demo path; dashed arrows are side trips (open a source, open a vendor, a clarification reply arriving).

## The screens

| Code | Screen | Wireframe | What's on it | Key requirements |
|---|---|---|---|---|
| S1 | Landing + sign up | [wire-01](diagrams/wire-01-landing.excalidraw) | One-line pitch, 3-step picture, one-screen sign-up (Google or email + password) | FR-0.2, FR-0.4 |
| S2 | Workspace frame | [wire-02](diagrams/wire-02-workspace.excalidraw) | Top bar with Reset demo; lifecycle strip; guided-tour checklist; the next-action button. Wraps every screen below | FR-0.5, FR-0.6, FR-1.1 |
| S3 | Context | [wire-03](diagrams/wire-03-context.excalidraw) | RFI results table (12 vendors, why 5 shortlisted); the Need and RFP views use the same layout | FR-1.2 |
| S4 | RFQ draft | [wire-04](diagrams/wire-04-rfq-draft.excalidraw) | Co-pilot drafting live; editable 30-line table; questionnaire and terms; evaluation-rules panel; downloads | FR-1.3, 1.4, 1.7, 1.8 |
| S5 | Send | [wire-05](diagrams/wire-05-send.excalidraw) | Rules-locked banner; the 5 outgoing emails; vendor status table; Fast-forward | FR-2.1, 2.2 |
| S6 | Inbox | [wire-06](diagrams/wire-06-inbox.excalidraw) | One card per reply with plain-word progress; LATE badge; unknown sender; upload area; a failed-reply example | FR-2.3–2.5, 3.1, 3.2, 3.11 |
| S7 | Comparison matrix + Ask | [wire-07](diagrams/wire-07-matrix.excalidraw) | Normalized / as-quoted toggle; flag count; assumptions strip; badge legend; vendor summary rows; colour-coded cells; hover conversion chain; Ask panel with question chips, an answer, Save as scenario | FR-4.1–4.6, 4.12, 5.1–5.7 |
| S8 | Source drawer | [wire-08](diagrams/wire-08-source-drawer.excalidraw) | The angled photo with a red box around the read region and the glare area flagged; conversion steps; Accept / Edit / Ask vendor; how PDF, Excel and email sources look | FR-4.9 |
| S9 | Review queue | [wire-09](diagrams/wire-09-review-queue.excalidraw) | 9 flags, each with source, confidence and actions; Accept all high-confidence; change log with Undo | FR-4.3, 4.13 |
| S10 | Clarification email | [wire-10](diagrams/wire-10-clarification.excalidraw) | Vendors with open items; auto-drafted email for V3; included-items checklist; Send; what happens after | FR-4.7, 4.8 |
| S11 | Vendor profile | [wire-11](diagrams/wire-11-vendor-profile.excalidraw) | Status timeline; RFP summary; terms; questionnaire result; certificates; open items; replies and files | FR-4.6 |
| S12 | Award memo | [wire-12](diagrams/wire-12-award-memo.excalidraw) | Headline savings; award per vendor; why; locked rules; risks; every ₹ clickable; PDF and share as should-haves | FR-6.1–6.5 |

## Layout decisions

| Decision | Why |
|---|---|
| **One frame for every screen** (top bar, lifecycle strip, tour, next button) | The user always knows where they are and what to do next (principles 1, 2) |
| **Tour shrinks to a tab on the matrix and source drawer** | Those screens need the full width for the matrix and the Ask panel |
| **Ask panel sits beside the matrix, not on its own page** | Answers and the numbers behind them are visible together (FR-5.1) |
| **Source drawer slides over the matrix** instead of opening a new page | One click to proof, one click back; you never lose your place |
| **Clarification email opens as a pop-up** from wherever Ask vendor is clicked | Same action from the matrix, the review queue and the vendor profile |
| **Flags are colours on the matrix plus a count**, not a gate | Never blocked (principle 3); the review queue is optional |
| **Desktop only**, about 1440 × 900 | Mobile is a non-goal (PRD §7) |

## Principles check

| # | Principle | Where the wireframes show it |
|---|---|---|
| 1 | No empty screens | S2: you land in a filled demo RFx |
| 2 | One obvious next step | The yellow button on every screen; the tour |
| 3 | Never blocked | S6: Open comparison is enabled after the first vendor; S7: flags on the matrix |
| 4 | Every wait shows progress | S4: "drafting 18 of 30"; S6: progress per vendor |
| 5 | Every problem comes with its fix | S6 failed card, S8 actions, S9 actions in every row |
| 6 | Change once, update everywhere | S7 assumptions strip |
| 7 | Nothing is lost | S9 change log with Undo; S10 history kept |
| 8 | No typing needed | S7 question chips; every step is a click |
| 9 | Plain language | S7 legend, hover conversion chains, plain-word progress |
| 10 | Failure is local | S6 failed card beside the others still processing |

## Notes

- Wireframes are generated by `tools/diagrams/wireframes.py`, so changes are quick: tell me what to move or change.
- Excalidraw wireframes only, as decided in D7. The real screens come in the build.
