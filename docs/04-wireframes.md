# 04 — Wireframes: Procure Mind V2.0

**Status:** Draft, awaiting PM approval · **Date:** 2026-10-28 · **Based on:** `01-PRD.md` v3, `02-journeys.md`, `03-architecture.md`

A **wireframe** is a rough sketch of a screen: what's on it and where, without final colours or fonts. Each screen S1–S12 from the journeys' screen inventory has its own Excalidraw file. Open it in VS Code and the Excalidraw extension draws it.

**How to read them:** the big frame is the screen at desktop size. **Orange numbered circles** on the screen match the **yellow notes** to the right of the frame, which explain behaviour and cite the PRD requirement. Circles and notes are annotations, not part of the product. **Dashed** items are should-haves (built if time allows) or variants. All names, prices and dates are **illustrative**; the real values come from the demo dataset.

## Colour palette

Calm and minimal by default; one energetic colour, used only where the user should act.

| Role | Colour | Used for |
|---|---|---|
| Text | Charcoal `#1f2328`, grey `#6b7280` | Body text, secondary text |
| Surfaces | White `#ffffff`, light grey `#f6f8fa`, hairline borders `#d0d7de` | Page, side panels, table headers |
| **Accent (energetic)** | **Indigo `#4f46e5`**, white text | The **one next-action button** per screen, progress bars, current stage outline |
| Accent, soft | Pale indigo `#eef2ff` | Selected tab or item, current stage, the user's own questions in Ask |
| Cheapest / done / pass | Soft green `#e6f6ec` | Badge and cell tint |
| Needs a look | Soft amber `#fff4d6` | Badge and cell tint |
| Missing / fails | Soft red `#fde8e8` | Badge and cell tint |
| From contract / info | Soft blue `#e8f1fd` | Badge, information banners |
| Estimate / AI at work | Soft violet `#f1ecfd` | Badge, co-pilot drafting |
| Updated from clarification | Soft teal `#e3f6f5` | Badge |

Badge tints are pale so a matrix full of them stays readable; the badge text always says what the colour means.

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
| S7 | Comparison matrix + Ask | [wire-07](diagrams/wire-07-matrix.excalidraw) | Normalized / as-quoted toggle; flag count; assumptions strip; badge legend; vendor summary rows; colour-coded cells; hover conversion chain; Ask panel with question chips, a first answer | FR-4.1–4.6, 4.12, 5.1, 5.2 |
| S7b | Matrix, later state: Ask, scenarios, award | [wire-07b](diagrams/wire-07b-ask-and-award.excalidraw) | V3's cells updated from its clarification; Show working opened; follow-up answer compared with the previous one; a clarifying question with choices; saved scenarios with Recommend award | FR-4.8, 4.10, 5.3–5.7, 6.1 |
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
| **Saved scenarios live under the matrix**, each with Recommend award | The award starts from the same screen where the what-ifs were asked |
| **One indigo button per screen** | The eye goes straight to the next step; everything else stays quiet |
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

## Coverage check

Every journey step and recovery path from `02-journeys.md`, and where it is drawn.

**J1 · Buyer, request to award**

| Step | Screen |
|---|---|
| 1 Log in | S1 → S2 |
| 2 Understand context | S3 |
| 3 Draft RFQ, fix a quantity | S4 |
| 4 Lock rules and send | S4 → S5 |
| 5 Replies arrive, live progress | S6 |
| 6 Compare, toggle, change freight estimate | S7 |
| 7 Check evidence (photo, PDF) | S8 |
| 8 Accept all high-confidence, Ask vendor, Send | S9 → S10 |
| 9 Ask what-ifs, follow-up, save scenario | S7, S7b |
| 10 Recommend award | S7b → S12 |

**J2 · Reviewer alone:** open link and sign up (S1), orient (S2 tour), fast path (S4–S12), upload own file (S6 → S7), Reset demo (S2).

**J3 · Closed loop:** missing lines flagged (S7, S9), Ask vendor from matrix, queue or profile (S7, S9, S11), one email (S10), status Clarification requested (S11), reply arrives (S6), only changed cells update with the badge (S7b), follow-up if still open (S7b note).

**J4 · VP and CFO:** split-award chip (S7), working shown (S7b), combine-volumes follow-up with saving vs previous (S7b), save and Recommend award (S7b), CFO clicks a ₹ in the memo → source (S12 → S8).

**J5 · Recovery paths**

| Situation | Screen |
|---|---|
| Unreadable reply | S6 failed card |
| Co-pilot unavailable | S4 note: prepared draft, labelled |
| Low-confidence value | S7 amber cell, S9 row |
| No contract history | S7 cell, S9 row |
| Freight extra | S7 assumptions strip, S9 row |
| Ambiguous question | S7b clarifying question with choices |
| Unknown sender | S6 |
| Unusual upload | S6 upload note |
| Refresh / return later | S1 note, S2 |
| Wrong manual edit | S9 change log with Undo |
| AI slow on demo day | S6 "Showing saved run" variant |

All Must (M) requirements in PRD §5 that have a screen are cited in the notes. Those without one are behind the scenes: FR-0.1 hosting, FR-0.3 login protection, FR-3.3–3.8 extraction and conversion. They show up as results in S6–S8.

## Notes

- Wireframes are generated by `tools/diagrams/wireframes.py`, so changes are quick: tell me what to move or change.
- Excalidraw wireframes only, as decided in D7. The real screens come in the build.
