# 02 — User journeys: Procure Mind V2.0

**Status:** Approved 2026-10-27 · **Date:** 2026-10-27 · **Based on:** `01-PRD.md` v3

A **user journey** is the step-by-step path a person takes through the product to reach a goal, including what they do, what they see, what the system does behind the scenes, and where friction could appear. Each journey below has an Excalidraw diagram. Open the `.excalidraw` file in VS Code and the Excalidraw extension draws it.

| # | Journey | Persona | Diagram |
|---|---|---|---|
| J1 | From internal request to award (the main story) | Pavan, Category Buyer | [journey-1-buyer-end-to-end.excalidraw](diagrams/journey-1-buyer-end-to-end.excalidraw) |
| J2 | Alone with the link, ~10 minutes | Challenge reviewer | [journey-2-reviewer-solo.excalidraw](diagrams/journey-2-reviewer-solo.excalidraw) |
| J3 | Closed loop: chasing a vendor who quoted 27 of 30 | Buyer + Vendor V3 | [journey-3-closed-loop.excalidraw](diagrams/journey-3-closed-loop.excalidraw) |
| J4 | The VP's what-ifs and the CFO's audit | VP, Buyer, CFO | [journey-4-decision-vp-cfo.excalidraw](diagrams/journey-4-decision-vp-cfo.excalidraw) |
| J5 | When things go wrong: recovery paths | Everyone | [journey-5-recovery-paths.excalidraw](diagrams/journey-5-recovery-paths.excalidraw) |

**How to read J1 and J2:** columns are the steps in order, left to right. The four rows are: what the person **does**, what they **see** (with a screen code), what **Procure Mind does** behind the scenes, and the **friction removed** at that step. J3 and J4 are **swimlane** diagrams: one horizontal band per person or system, with arrows showing who hands off to whom.

---

## Screen inventory

The journeys need these screens. Phase 4 (wireframes) draws each one.

| Code | Screen | Used in |
|---|---|---|
| S1 | Landing + sign up / log in | J1, J2 |
| S2 | RFx workspace: lifecycle strip, guided-tour panel, next-action button (the frame around every screen below) | all |
| S3 | Context: internal request, RFI results, RFP summaries | J1 |
| S4 | RFQ draft (co-pilot) with the evaluation-rules panel | J1, J2 |
| S5 | Send: the 5 outgoing emails, vendor statuses | J1, J2 |
| S6 | Inbox: replies, arrival dates, live progress per vendor, upload a reply | J1, J2, J3, J5 |
| S7 | Comparison matrix with the Ask panel, badge legend and assumptions panel | J1, J2, J4 |
| S8 | Source drawer (slides over S7) | J1, J4 |
| S9 | Review queue | J1, J5 |
| S10 | Clarification email composer | J1, J3 |
| S11 | Vendor profile: RFP summary, questionnaire result, certificates, status timeline | J1, J3 |
| S12 | Award memo | J1, J4 |

---

## J1 · Pavan, Category Buyer: from internal request to award

**Goal:** a defensible award without retyping a single number. **Trigger:** Plant Operations emails a packaging need. **Covers:** demo script steps 1–10 (PRD §6).

| # | Step | Pavan does | Screen | Procure Mind does | Friction removed |
|---|---|---|---|---|---|
| 1 | Log in | One-click Google sign-up | S1 → S2 | Creates the account, copies the demo data | No verification email; no empty dashboard |
| 2 | Understand context | Clicks Need, RFI, RFP on the strip | S3 | Shows seeded context | All background in one place |
| 3 | Draft RFQ | "Draft RFQ with co-pilot"; fixes one quantity inline | S4 | Drafts 30 lines, questionnaire and terms from the context; prepared draft if AI is down | No blank page |
| 4 | Lock rules and send | "Lock rules & send" | S4 → S5 | Freezes the rules with a timestamp; records the send | Defensible later |
| 5 | Replies arrive | "Fast-forward 9 days" | S6 | Processes all 5 automatically, in parallel, with plain-word progress | No button; no bare spinner |
| 6 | Compare | Scans; toggles as-quoted / normalized; changes freight estimate | S7 | Maps, converts, applies tiers, pulls V5's contract, checks questionnaire and certificates | Never blocked; change once, update everywhere |
| 7 | Check evidence | Clicks a photo-sourced price and a PDF price | S8 | Shows the photo with a box around the number, the highlighted footnote, the conversion chain | Proof in one click |
| 8 | Resolve and chase | "Accept all high-confidence"; "Ask vendor" on V3; Send | S9 → S10 | One consolidated email; reads the reply; updates only the changed cells (detail in J3) | No hand-written chasers |
| 9 | Ask what-ifs | Clicks suggested questions; follow-up; saves scenario | S7 (Ask panel) | AI turns the question into a calculation; code computes it and shows the working (detail in J4) | No typing; no rebuild |
| 10 | Award | "Recommend award" on the saved scenario | S12 | Builds the memo; strip shows Award ✓, PO next | Defensible memo in one click |

**Where Pavan could get stuck, and what prevents it:**
- *Not knowing what to do next* → the guided tour and the single highlighted next-action button on every screen.
- *Too many flags to face at once* → "Accept all high-confidence" leaves only the real issues, and none of them blocks the comparison.
- *Wondering where a number came from* → hovering shows its conversion chain; clicking shows the source.

---

## J2 · Challenge reviewer: alone, no presenter

**Goal:** understand the story, see it work, try an own file. **Trigger:** receives the public link. **Target:** first comparison in under 3 minutes, without help.

| # | Step | Reviewer does | Screen | Friction removed |
|---|---|---|---|---|
| 1 | Open link | Opens it cold | S1: one-line pitch, a 3-step picture, "Sign up" | Understands the purpose within 5 seconds |
| 2 | Sign up | Google or email + password | S1 (one screen) | No verification, no setup form |
| 3 | Land and orient | Reads tour step 1 | S2 | Never an empty screen |
| 4 | Follow the fast path | Draft → Send → Fast-forward → Compare → Evidence → Ask → Award | S4–S12 | No typing needed |
| 5 | Test own file | Drags a quote into "Upload a reply", picks a vendor | S6 → S7 | Proves it isn't hard-coded; a bad file fails politely |
| 6 | Replay or leave | "Reset demo", or returns later | S2 | Nothing lost |

**Design consequence:** the tour must be skippable and resumable, and each tour step must point at exactly one control.

---

## J3 · Closed loop: chasing a vendor who quoted 27 of 30 lines

**Goal:** get missing information without writing an email by hand (PRD Improvement A, FR-4.7 and FR-4.8).

1. V3 replies with a Word document: prices in prose, 27 of 30 lines, 30-day payment terms.
2. Procure Mind finds the missing lines (#12, #14, #19) and the terms mismatch, flags those cells, and adds them to V3's issue list.
3. Pavan sees the "27 of 30" badge and clicks **Ask vendor** (from the matrix, the review queue, or V3's profile).
4. Procure Mind drafts **one** email that covers every open V3 issue.
5. Pavan edits if needed and clicks **Send**. V3's status becomes *Clarification requested*.
6. V3 replies with the 3 missing prices and accepts 60 days.
7. Procure Mind matches the reply to V3, updates only the changed cells, and keeps the old values in history.
8. **All issues resolved?** Yes: the cells show **[Updated from clarification]**, and totals and saved answers refresh. No: back to step 4 for a follow-up that lists only what's still open.

**The same loop serves V5:** its "freight extra" and the 2 lines with no contract history go into one email, and its seeded reply gives a freight amount.

---

## J4 · Decision: the VP's what-ifs and the CFO's audit

**Goal:** answer the VP's questions live and give the CFO proof behind every number.

1. Rajesh (VP, on a screen-share): *"Split the award: cheapest per line, only vendors who passed the questionnaire?"*
2. Pavan clicks that suggested question.
3. Procure Mind applies the **locked** pass rules (V3 fails), picks the cheapest valid vendor per line, has code compute the totals, and shows the working.
4. Rajesh: *"And if we combine both plants' volumes?"* Pavan asks the follow-up.
5. Procure Mind re-prices using volume tiers and shows the saving compared with the previous answer.
6. Pavan saves the scenario and clicks **Recommend award**. Procure Mind generates the memo.
7. The CFO opens the memo and clicks a ₹ figure. The source drawer shows the vendor's own words or the photo region behind it.
8. The CFO approves. That happens outside the app today; an approval workflow is on the roadmap.

**Note for the demo:** the CFO sees the memo through Pavan's screen. A read-only share link (FR-6.5) is a Should item.

---

## J5 · When things go wrong

Every problem has a visible reason and one next action (journey principles 5 and 10).

| When this happens | The user sees | Next action |
|---|---|---|
| A reply can't be read (e.g. photo too blurry) | A red card on that reply with a plain reason; the others keep processing | Retry · upload a clearer file · Ask vendor |
| Co-pilot AI unavailable while drafting | A prepared draft, labelled "Prepared draft (AI unavailable)" | Edit and send as normal |
| Low-confidence value | An amber cell and a review-queue entry next to its source | Accept · Edit · Ask vendor |
| Line not in last year's contract | Cell flagged "No history for this line", kept out of totals | Added automatically to the clarification email |
| "Freight extra" with no amount | A freight flag; the assumptions panel offers an estimate | Set an estimate (labelled) · Ask vendor |
| Ambiguous question in Ask | One short clarifying question with clickable choices | Click a choice |
| Reply from an unknown sender | Inbox item: "Who is this from?" | Pick the vendor |
| Unusual upload (too big, password-protected, not a quote) | A plain message explaining what's wrong and the limits | Upload another file |
| Page refreshed / user returns tomorrow | Same screen, same state | Carry on |
| Wrong manual edit | Change-log entry with Undo | Undo |
| AI slow on demo day (presenter only) | Banner: "Showing saved run" | Continue the story |

---

## Journey principles check

Each PRD §4 principle, and where the journeys satisfy it.

| # | Principle | Where it's satisfied |
|---|---|---|
| 1 | No empty screens | J1-1, J2-3: land inside the demo RFx |
| 2 | One obvious next step | Next-action button and tour on every screen (S2) |
| 3 | Never blocked | J1-6: matrix fills in as vendors finish; flags sit on the matrix |
| 4 | Every wait shows progress | J1-5: plain-word progress per vendor; J1-3: the RFQ streams in |
| 5 | Every problem comes with its fix | J5 (every row); J1-8 review queue actions |
| 6 | Change once, update everywhere | J1-6 assumptions panel; J3-8 totals and answers refresh |
| 7 | Nothing is lost | J2-6 resume; J5 undo; J3-7 history kept |
| 8 | No typing needed for the demo path | Suggested question chips (J1-9, J4-2); all other steps are clicks |
| 9 | Plain language | Badge legend, hover explanations, plain-word progress |
| 10 | Failure is local and recoverable | J5 rows 1, 2, 8 |

---

## What this changes downstream

- **Phase 3 (architecture)** must support: per-account copies of the demo data, auto-processing in parallel with progress updates pushed to the screen, the source location stored for every value, a value history (for revisions and undo), and a saved-run fallback.
- **Phase 4 (wireframes)** draws screens S1–S12 from the inventory above.
