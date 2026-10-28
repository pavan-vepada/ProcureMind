# 06 — Walkthrough guide: Procure Mind V2.0

**For:** anyone presenting the product, or exploring it alone. There is no tour: every screen says where you are and what you can do.

## What a new account sees

Creating an account takes one screen. The buyer lands on **Sourcing events**: the RFx they're running, at different stages, each with live numbers.

| RFx | Status | What to try |
|---|---|---|
| **RFX-2026-014** Corrugated packaging for both plants | Analysing quotes | 5 vendors, 30 lines, every format, all read. Open the **Comparison**: click any price for its source, ask what-ifs, chase a vendor, recommend the award. |
| **RFX-2026-017** Heavy-duty export cartons | Out for quote | One reply has just arrived: open **Replies** and watch the AI read it live. Then **Add 1 sample reply** for the vendor still to answer. |
| **RFX-2026-019** Q3 capacity buffer | Ready to send | The co-pilot's draft is done. **RFQ** → check the rules → **Lock rules & send**, then bring in the sample replies. |
| **RFX-2026-009** Inner packaging renewal | Awarded | The award memo, with savings, rules used, risks and evidence for every number. |
| **Requests waiting for you** (right side) | — | "Packaging for the liquid detergent launch": **Start RFx** and the co-pilot drafts it live from the request and volume sheet. |

**New RFx** also lets you describe a need in your own words; the co-pilot proposes the lines and flags what it assumed. Replies to such an RFx come in by upload.

## A 10-minute story on RFX-2026-014

1. **Overview** says where it stands: 5 of 5 quotes on one basis, the best complete offer, items needing a look.
2. **Comparison**: one basis (₹ per piece, before GST, delivered). Green = cheapest valid. **As quoted** shows the mess it came from. Hover any price for its conversion.
3. Click a **Narmada (photo)** price: the vendor's photo with a box where the number was read. Click a **Deccan (PDF)** price: the PDF page with the number outlined.
4. **Review** → **Ask vendor** on Shakti → **Send**. Shakti replies, the reply is read automatically, and only its 3 missing prices change (teal "clarification" badge).
5. Back in **Comparison**, click **What if we combine both plants' volumes?** in the Ask panel. The AI picks the calculation; code computes it; **Show working** shows data, filters, rule and formula. **Save as scenario**.
6. **Recommend award** on the saved scenario: the memo, with every ₹ clickable to the vendor's own words. **Download PDF** prints it.

## Planted traps in RFX-2026-014

| Vendor | Format | Trap | Where it's handled |
|---|---|---|---|
| Kaveri | Excel, own layout | "Per box" = bundle of 100; lines renamed and shuffled | Conversion chain: ₹1,850 per box → ₹18.50 per piece |
| Deccan | PDF letterhead | USD; volume tiers; 5% discount footnote; GST included on 2 lines | `$→₹`, `tier`, `GST removed`; discount flagged for the buyer |
| Shakti | Word prose | 27 of 30 lines; 30-day terms; fails the questionnaire | "27 / 30 ⚠", missing cells, chase by email |
| Narmada | Angled phone photo | Per kg; glare over one row; expired ISO certificate | `estimate`; 2 unreadable lines; "ISO expired" |
| Sahyadri | Plain email | "Rest same as last year"; freight extra; 2 new lines | `contract` badges (#2025-V5); 2 lines with no history; freight estimate |

The other sample RFx add a vendor quoting **per 1,000 pieces**, one quoting **per box of 50**, and another that skipped two lines and fails the BCT requirement.

## Things worth knowing

- **Restore sample workspace** (account menu, top right) puts every sample RFx back to its starting point.
- **Upload your own quote** on any RFx's **Replies** tab: Excel, PDF, Word, a photo or pasted email text. It's read live.
- **If the AI is slow during a presentation:** add `?savedRun=1` to the address once; sample replies then use a recorded reading (the Replies tab says so). `?savedRun=0` switches back. Uploads always use the live AI.

## Accuracy behind it

- On the five main sample replies the live AI read **129 of 129 prices correctly** (`bash scripts/eval-all.sh`).
- With a correct reading, the engine reproduces the answer key for all 300 vendor × line × plant prices (`npm test`).
- Every number the AI writes in an answer or memo is checked against the computed result; if one doesn't match, a code-written summary is shown instead.
