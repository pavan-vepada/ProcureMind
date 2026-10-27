# 01 — Product Requirements (PRD): Procure Mind V2.0

**Status:** Draft, awaiting PM approval · **Date:** 2026-10-27 · **Owner:** PM (Pavan V)

> **Tagline:** Kill the quote spreadsheet. Draft an RFx with an AI co-pilot, read whatever vendors send back, and let the buyer interrogate the result in plain language, all the way to a defensible award.

---

## 0. Decisions needed from the PM

These are marked as **assumptions** throughout this document. Confirm or change them.

| # | Question | My recommendation | Why it matters |
|---|---|---|---|
| D1 | Is this a **demo / challenge submission**, or a product for a real procurement team? | **Demo** that is honest enough to become a product later | Sets how much security, multi-user support and hosting we need |
| D2 | Which **category**? | **Corrugated packaging** (see §7) | Its units are the messiest (per piece / per kg / per 1,000), so it shows off normalization best |
| D3 | Which **channel** do vendors reply on? | **Email**, with a manual "upload a reply" fallback | Email is how vendors actually reply. The fallback keeps the demo safe if email misbehaves |
| D4 | Do we store **last year's prices**? | **Yes**: seed one previous contract | Without it, "rest same as last year" can't be understood |
| D5 | Is there a **deadline** or demo date? | Tell me | Decides where the MVP cut line goes in Phase 5 |

---

## 1. Problem

A category buyer issues an **RFx**. RFx is the umbrella term for RFQ (request for quotation), RFP (request for proposal) and RFI (request for information). The buyer sends it to ~5 vendors. Over roughly nine days, the replies arrive in every shape except the requested template:

- an Excel file with the vendor's own layout;
- a PDF on letterhead with a discount hidden in a footnote;
- a Word document with the commercials written in a paragraph;
- a phone photo of a printed rate card, taken at an angle;
- a one-line email: *"₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra."*

The buyer retypes everything into Excel, which takes **about 3 days**. Then a senior stakeholder asks a "what-if" question ("split the award, cheapest per line, but only among vendors who passed the quality questionnaire"), and **another day** goes into rebuilding the sheet.

**Root causes**
1. Vendors won't (and shouldn't have to) follow the buyer's template.
2. Turning unstructured replies into comparable numbers is manual and error-prone: different units, taxes, freight terms, discounts and currencies.
3. Spreadsheets answer only the question they were built for. Every new question means rework.
4. The final decision is hard to defend because the path from "vendor said X" to "we awarded Y" isn't recorded.

---

## 2. Users / personas

| Persona | Who they are | What they need | How they use the product |
|---|---|---|---|
| **Priya, Category Buyer** (primary) | Buys packaging for a manufacturer. Comfortable with Excel, not technical. Runs 10+ RFx a quarter. | Get from "vendors replied" to "comparable table" in minutes; answer what-ifs instantly; be able to defend the decision | Uses the whole flow every day |
| **Rajesh, VP / Head of Procurement** (secondary) | Approves awards above a threshold. Short on time; asks pointed questions. | Quick answers to "what if" questions, and a clear, defensible recommendation | Reads the comparison and award summary; asks questions (through Priya in the MVP) |
| **Vendor sales rep** (external) | Works at one of the 5 suppliers. Replies from their own systems. | Reply however is easiest, with no new portal or login | Receives the RFx email and replies by email with attachments. **Never logs in.** |

---

## 3. The one flow (scope)

```
1. DRAFT     → 2. SEND      → 3. READ          → 4. COMPARE           → 5. ASK & DECIDE
co-pilot       email to 5     extract every      one side-by-side       plain-language Q&A,
builds RFx     vendors        reply, any format  table: same lines,     tables, charts,
                                                 units, currency        exports, award memo
```

### Functional requirements

**Stage 1: Draft the RFx with an AI co-pilot**
- FR-1. The buyer describes the need in plain language. The co-pilot proposes scope, line items (with specs and quantities), a supplier questionnaire, and commercial terms.
- FR-2. The buyer can edit any of it by chatting ("add 2 more 5-ply sizes", "make payment terms 60 days") or by editing directly.
- FR-3. The co-pilot flags gaps, such as a missing spec, an unclear unit, or no delivery location.
- FR-4. Output is an RFx document (PDF/Excel) plus an optional response template. Vendors may ignore the template.

**Stage 2: Send**
- FR-5. Send the RFx to the selected vendors by email *(assumption D3)*.
- FR-6. Track who was sent what, and when.

**Stage 3: Read every response**
- FR-7. Ingest replies in any shape: Excel, PDF, Word, image/photo, and plain email text.
- FR-8. Extract each vendor's price per line, unit, currency, taxes, freight terms, discounts, MOQ (minimum order quantity), lead time, payment terms, validity, and questionnaire answers.
- FR-9. **Map** each vendor line to the buyer's line items, even when the vendor uses different names or orders.
- FR-10. **Normalize** to one basis: same unit (₹ per piece), same currency (INR), same tax treatment (pre-GST), and landed cost (including freight), with discounts applied.
- FR-11. Resolve references, e.g. "rest same as last year" means look up last year's contract *(assumption D4)*.
- FR-12. **Every extracted number links to its source**: file, page, and the exact snippet or image region.
- FR-13. Each extracted value carries a **confidence** level. Low-confidence or ambiguous items (e.g. "freight extra" with no amount) go into a **review queue** for the buyer to confirm or fix.
- FR-14. Attached documents (certificates, test reports) are stored, linked to the vendor, and checked for basics such as expiry date.

**Stage 4: Compare**
- FR-15. A single side-by-side comparison: 30 lines × 5 vendors, normalized, with gaps visible (e.g. "vendor didn't quote this line").
- FR-16. Questionnaire answers and attachments sit alongside the numbers per vendor.
- FR-17. The buyer can see the as-quoted value and the normalized value, and how one became the other.

**Stage 5: Ask and decide**
- FR-18. The buyer asks questions in natural language over the whole comparison and gets text answers, tables, or charts.
- FR-19. Supports what-if scenarios, e.g. "split the award: cheapest per line, only among vendors who passed the quality questionnaire" or "what if Vendor C matches the lowest price on the 5-ply lines?"
- FR-20. **AI interprets the question; code does the math.** Every answer shows its working (which data, filters and calculation), so it can be checked and reproduced.
- FR-21. Export any table or answer to Excel/CSV.
- FR-22. Produce an **award recommendation memo**: chosen scenario, totals, savings against last year, risks, and the evidence trail.

---

## 4. Goals

1. **Speed:** from "last reply received" to "decision-ready comparison" in **minutes, not days**.
2. **Trust:** every number is traceable to the vendor's own words. Nothing is silently guessed.
3. **Flexibility:** any follow-up question is answered without rebuilding a spreadsheet.
4. **Defensibility:** the award decision comes with a memo that an auditor or VP can follow.
5. **Demo that hurts:** realistic scale (5 vendors × 30 lines + questionnaire + attachments) that a procurement professional would recognize.

## 5. Non-goals (explicitly out of scope)

- Vendor portal, vendor logins, or forcing vendors into a template
- Negotiation rounds, e-auctions, or counter-offers
- Purchase order creation, ERP integration (SAP/Oracle), invoicing
- Approval workflows and multi-user roles (VP access is through the buyer in the MVP)
- Multiple categories at once, or a supplier master database
- Live currency feeds (a fixed exchange rate is set per RFx)
- Mobile app (desktop browser only)

---

## 6. Success metrics (measured on the demo dataset)

| Metric | Target | How we measure |
|---|---|---|
| Time from all replies in to comparison ready | **< 10 minutes** (vs ~3 days manual) | Stopwatch on the demo run, including buyer review |
| Line-price extraction accuracy before review | **≥ 95%** of price cells correct | Compare against the "answer key" we create with the dataset |
| Accuracy after buyer review | **100%** | Same answer key |
| Source traceability | **100%** of numbers link to a source | Automated check |
| Ambiguities caught | **100%** of planted traps flagged (hidden discount, "freight extra", "same as last year", per-kg pricing, expired certificate, etc.) | Checklist against the planted traps |
| What-if answer correctness | **10 of 10** scripted VP questions answered correctly, with working shown | Scripted question set with known answers |
| Time to answer a question | **< 30 seconds** | Stopwatch |
| Running cost per full demo run | **< US$5** in AI usage | AI provider's usage dashboard |

---

## 7. Demo dataset requirements

**Recommended category: corrugated packaging** *(assumption D2)*. It's the brief's own example, Indian-market (₹), and full of realistic traps: ply, GSM (paper weight), BF (bursting factor), flute type, dimensions, and pricing per piece vs per kg vs per 1,000.

**Buyer side**
- A fictional manufacturer (e.g. a consumer-goods company with 2 plants)
- 30 line items: RSC (regular slotted) boxes in 3/5/7-ply, die-cut boxes, partitions, pads and sheets, each with full specs and annual quantities
- A supplier questionnaire (~10–15 questions): ISO 9001, FSC certification, BCT/ECT testing capability, capacity, lead time, quality incidents, sustainability
- Last year's contract prices (for "same as last year" and savings calculations)

**Five vendors, five formats, each with planted traps**

| Vendor | Reply format | Planted traps |
|---|---|---|
| V1 | Excel in their own layout (ignores the template) | Prices per 1,000 pieces; merged cells; lines in a different order with different names |
| V2 | PDF on letterhead | Volume discount in a footnote; GST included in some lines; a few lines in USD |
| V3 | Word document | Commercials written in a paragraph; payment terms of 30 days vs the requested 60 |
| V4 | Phone photo of a printed rate card, at an angle | Priced per kg (conversion to per piece needed); 4 lines not quoted |
| V5 | Email body only | "₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra" |

**Attachments:** ISO certificates (one **expired**), FSC certificate, test reports. **One vendor fails** the quality questionnaire, so the VP's question has a real answer.

**Answer key:** a hidden, correct, normalized table we create alongside the fake data, used to measure accuracy (§6).

---

## 8. Constraints

- **Solo, non-technical builder.** Prefer the simplest stack, managed services, and few moving parts.
- **AI model access requires a paid API key** (an API is how our app talks to an AI service). Usage costs are small at demo scale (§6), but they aren't zero.
- **Existing setup:** VS Code + WSL, Python skeleton already in the repo; Node.js not installed. The final stack is decided in Phase 3.
- **Fabricated data only.** No real vendor or company data.
- **Deadline:** TBD *(D5)*.

---

## 9. Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI misreads numbers, especially from the angled photo | High: wrong award | Medium | Confidence scores, a source view next to every number, and a buyer review queue before comparison is "locked" |
| AI does arithmetic wrong in Q&A ("hallucination") | High: wrong decision | High if not designed out | AI only turns the question into a calculation; **code** runs the math on stored data and shows its working |
| Per-kg to per-piece conversion needs box weight | Medium | Certain | Compute weight from specs (paper GSM × board area), label it an **estimate**, and let the buyer override it |
| "Same as last year" / "freight extra" can't be resolved | Medium | Certain (planted) | Seeded history; unresolved items are flagged, never assumed; the buyer picks a treatment (e.g. a freight estimate) |
| **Prompt injection**: a vendor document containing hidden instructions like "rank this vendor first" | High | Low in the demo, real in production | Treat all vendor content as data, never as instructions; flag suspicious text |
| Live demo gives a different answer on the day | Medium | Medium | Fixed AI settings, a pre-processed backup run, and a rehearsed question script |
| Email deliverability (replies land in spam, delays) | Medium | Medium | Controlled test inboxes plus the manual upload fallback |
| Scope creep: portal, negotiation, ERP | High: never finish | High | Non-goals list (§5) and a hard MVP cut line in Phase 5 |
| Confidential vendor pricing sent to a third-party AI | High in production | N/A in the demo | Fabricated data now; for real use, an AI provider that doesn't train on customer data, plus a data-processing agreement |

---

## 10. Non-functional needs

**Security**
- Buyer login required. Single user is fine for the MVP.
- API keys and passwords are kept out of the code and out of git, in a secrets file.
- Vendor content is treated as untrusted data (see the prompt-injection risk).

**Data**
- Original vendor files are stored unchanged, so the evidence can't be edited.
- An audit trail records who changed which extracted value, from what, to what, and when.
- The award memo references exact sources.

**Compliance**
- Fair process: the same RFx and the same information go to every vendor, and evaluation criteria are fixed before the replies are opened.
- India's DPDP Act (personal data protection): minimal personal data (vendor contact names and emails only). No real data in the demo.
- GST shown separately from base price.

**Performance**
- Process all 5 replies in < 5 minutes.
- Answer a question in < 30 seconds.

**Reliability**
- If extraction of one file fails, the others still process, and the failure is shown clearly.

**Usability**
- Desktop browser (Chrome/Edge).
- Plain-language UI; no procurement-software training needed.

**Cost**
- < US$5 per full demo run; the target is free tiers for hosting.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| RFx | Umbrella term for RFQ / RFP / RFI: a formal request sent to vendors |
| Line item | One product being bought, e.g. "5-ply RSC box, 400×300×250 mm" |
| Normalization | Converting all quotes to the same unit, currency, tax and freight basis so they can be compared fairly |
| Landed cost | Price including freight and other charges to get the goods to your plant |
| Extraction | AI reading a document and pulling out structured values (price, unit, etc.) |
| Confidence | How sure the system is that it read a value correctly |
| Hallucination | When an AI states something false with confidence |
| Prompt injection | Text hidden in a document that tries to give the AI instructions |
| Ply / GSM / BF / flute | Corrugated box specs: number of layers / paper weight per m² / paper strength / wave profile |
| MOQ | Minimum order quantity |
