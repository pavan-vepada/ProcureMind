# 1 · Product requirements

> **In one paragraph.** Category buyers lose days turning messy supplier quotes into a comparison they can trust, and lose more time every time a leader asks a what-if question. Procure Mind is a sourcing workspace that covers the stretch of procurement from *"we need this"* to *"award it to these suppliers"*. It drafts the request for quotation, reads every reply in any format, converts every price to one basis, keeps a receipt for every number, chases suppliers for what's missing, and answers what-if questions all the way to an award memo. The AI reads and writes; plain, tested code does every calculation.

**Owner:** Pavan V (Product Manager) · **Status:** built and tested on fictional data · **Last updated:** 2026-10-28

---

## 1. Where this product sits

Buying anything significant in a company follows the same sequence. Procure Mind focuses on the most painful part, the middle, and stays aware of the stages around it.

```mermaid
flowchart LR
  A["🏭 Plant needs<br/>something"] --> B["🔎 RFI<br/>Who can supply?"]
  B --> C["📋 RFP<br/>How would you do it?"]
  C --> D["✍️ RFQ<br/>Exact prices please"]
  D --> E["📥 Replies arrive<br/>in every format"]
  E --> F["⚖️ Compare<br/>on one basis"]
  F --> G["💬 What-ifs<br/>and award"]
  G --> H["🧾 Purchase<br/>order"]
  style D fill:#eef2ff,stroke:#4f46e5
  style E fill:#eef2ff,stroke:#4f46e5
  style F fill:#eef2ff,stroke:#4f46e5
  style G fill:#eef2ff,stroke:#4f46e5
```

*Highlighted: what Procure Mind does. Earlier stages (the plant's request, the supplier shortlist) are used as context; the purchase order is the hand-off to the company's main business system.*

## 2. The problem

**The template is ignored.** The buyer sends five suppliers a clean template. Back come an Excel sheet in the supplier's own layout, a PDF in US dollars with a discount in a footnote, a Word document that skips three items, a tilted phone photo priced per kilogram, and an email that says *"rest same as last year, freight extra"*.

**The cost.** About three days of retyping per sourcing event, then a rebuild for every new question from leadership. Gaps are found late and chased by hand.

**The real risk is trust.** A finance leader approving a multi-crore award asks *"where does this number come from?"* With a spreadsheet, the honest answer is "somewhere in my inbox".

**Root causes**
1. Suppliers won't follow the buyer's template, and shouldn't have to.
2. Converting different units, currencies, taxes, freight terms, discounts and volume tiers by hand is slow and error-prone.
3. Missing information is discovered late.
4. A spreadsheet answers only the question it was built for.
5. Numbers without a visible source don't earn approval.
6. Scoring rules are often decided after prices are seen, which makes the award hard to defend.

## 3. Who it is for

| Person | Role | What they need from the product |
|---|---|---|
| 🧑‍💼 **Category buyer** (primary) | Runs ten or more sourcing events a quarter. Strong in Excel, not technical | A comparison in minutes, suppliers chased for them, what-ifs answered instantly, a decision they can defend |
| 👔 **Head of procurement** | Approves large awards; asks pointed what-if questions | Straight answers, with the working shown |
| 💼 **Finance / audit** | Signs off on large spend | Click any figure and see the original evidence |
| 🏭 **Supplier** (external) | Sends the quote | Reply however is easiest. **Never needs to log in** |

## 4. Design principles

Every screen was checked against these.

| | Principle | What it means in the product |
|---|---|---|
| 1 | **Every number has a receipt** | Any price, total or saving opens the supplier's own words: the cell, the PDF line, the region of the photo |
| 2 | **AI reads and writes; code calculates** | The AI never produces a figure the buyer sees. Any number the AI writes in a sentence is checked against the calculation; if it doesn't match, the sentence is replaced |
| 3 | **Doubt is flagged, never assumed** | Missing, unclear or estimated values are labelled and explained, and kept out of totals until resolved |
| 4 | **Rules before prices** | Pass/fail criteria and the comparison basis are locked before any reply is opened, and quoted in the award memo |
| 5 | **Never blocked** | The comparison appears as soon as the first reply is read; flags sit on it rather than gating it |
| 6 | **Every wait shows progress** | Drafting and reading show what is happening, in plain words |
| 7 | **Every problem comes with its fix** | Each flag offers Accept, Edit or Ask the supplier, right where it appears |
| 8 | **Nothing is lost** | Work resumes exactly where it stopped; every manual change is logged and can be undone |
| 9 | **Plain language** | No unexplained jargon; every badge has a visible legend |

## 5. What the product does

✅ = built and working · 🗺️ = on the roadmap

### Workspace
| Capability | Status |
|---|---|
| Sign up and log in with email and password; each user sees only their own data | ✅ |
| A workspace listing every sourcing event and its stage, with search and filters; continue any event where it was left | ✅ |
| New users start with four sample sourcing events at different stages, so nothing is ever empty | ✅ |
| Requests from the plants waiting to be turned into a sourcing event | ✅ |
| Restore the sample workspace at any time | ✅ |
| Company single sign-on, roles (buyer / approver / auditor), shared team workspaces | 🗺️ |

### Draft the request for quotation
| Capability | Status |
|---|---|
| Procure Mind drafts items, quantities per plant, questionnaire, terms and cover email from a plant's request and volume sheet, streaming live | ✅ |
| Or from a need described in the buyer's own words, with every assumption flagged for confirmation | ✅ |
| Quantities can be edited in place; quantities from a volume sheet are checked against it | ✅ |
| Scoring rules (required certificates, minimum score) and the comparison basis are locked before sending | ✅ |
| Downloadable RFQ document and Excel response template | ✅ |
| If the AI is unavailable, a clearly labelled prepared draft is used instead | ✅ |

### Receive and read replies
| Capability | Status |
|---|---|
| Replies are read automatically on arrival, all in parallel, with live progress per supplier | ✅ |
| Reads Excel, PDF, Word, phone photos and plain email text | ✅ |
| Upload any reply (up to 10 MB) or paste an email; works with the buyer's own files | ✅ |
| Late replies are marked | ✅ |
| Supplier documents are treated as data, never as instructions; text that tries to instruct the AI is flagged | ✅ |
| One unreadable file never stops the others; it shows a reason and a retry | ✅ |
| Real email sending and receiving | 🗺️ |

### Compare
| Capability | Status |
|---|---|
| One table: every item × every supplier, converted to rupees per piece, before tax, delivered; cheapest valid price highlighted | ✅ |
| Handles per-bundle, per-1,000 and per-kilogram pricing, US dollars, tax-inclusive prices, footnote discounts and volume tiers | ✅ |
| "Same as last year" is filled from last year's contract, **only** where the item's specification is unchanged | ✅ |
| Switch between converted and as-quoted values; every conversion shown step by step | ✅ |
| Adjustable assumptions (exchange rate, freight estimates, box weights) recalculate everything at once | ✅ |
| Questionnaire results and certificate checks (for example, an expired ISO certificate) beside the prices | ✅ |
| Every number opens its source: spreadsheet cell, PDF line, Word paragraph, email phrase or photo region | ✅ |
| Export to Excel | 🗺️ |

### Review and chase
| Capability | Status |
|---|---|
| One review list of everything that needs a look, each beside its source, with Accept / Edit / Ask supplier | ✅ |
| "Accept all high-confidence" clears the easy items in one click | ✅ |
| One consolidated, specific clarification email per supplier, drafted for the buyer | ✅ |
| The supplier's answer is read automatically and only the affected numbers change; old values stay in history | ✅ |
| Every manual change is logged with Undo | ✅ |

### Ask and decide
| Capability | Status |
|---|---|
| An assistant beside the comparison answers questions in plain words, with suggested questions | ✅ |
| Follow-ups keep context ("now leave out the expensive one") | ✅ |
| Ambiguous questions get one short clarifying question instead of a guess | ✅ |
| Every answer shows its working: data used, filters, rule, formula | ✅ |
| Save any answer as a named scenario | ✅ |
| Award memo from a scenario: award per supplier, savings against last year and against the best single supplier, rules used, risks, and evidence for every figure; downloadable as PDF | ✅ |
| Compare saved scenarios side by side; charts in answers; read-only share link for approvers | 🗺️ |
| Purchase order hand-off; award and regret letters to suppliers | 🗺️ |

## 6. How missing information is handled

Every gap is resolved in the same order, and the source is always shown:

1. **Elsewhere in the same reply:** a footnote, a second attachment.
2. **Last year's contract** with that supplier, but only where the item's specification is unchanged. New or changed items are never filled from history.
3. **Otherwise it is flagged:** kept out of totals, or given a clearly labelled estimate the buyer chooses, and added automatically to that supplier's clarification email.

Nothing is ever silently assumed.

## 7. Out of scope (deliberately)

- A supplier portal or supplier logins. Suppliers reply the way they already do.
- Running the earlier stages (supplier discovery, proposals) as workflows. They appear as context.
- Negotiation, e-auctions, invoicing, ERP integration.
- Live currency feeds. The exchange rate is locked per sourcing event, for defensibility.
- Mobile layouts. This is a desk tool.

## 8. Success measures

| Measure | Target | Result |
|---|---|---|
| Replies in → comparison ready | under 5 minutes (vs about 3 days by hand) | ✅ under a minute per reply, all in parallel |
| Prices read correctly before any human review | 95% or better | ✅ 129 of 129 on the sample replies |
| Prices converted correctly to the common basis | 100% | ✅ 300 of 300 against the answer key |
| Planted traps caught and explained | 100% | ✅ every trap in the sample data |
| Numbers with a clickable source | 100% | ✅ |
| What-if answers with their working shown | every answer | ✅ |
| A first-time user reaches a comparison without help | under 3 minutes | ✅ the comparison is one click from the workspace |
| Dead ends | none | ✅ every screen states where you are and what you can do next |

## 9. Risks and how they are handled

| Risk | How it is handled |
|---|---|
| The AI misreads a document (a blurry photo, an odd layout) | Confidence levels, a review list, a visible source for every number; unreadable regions are flagged, not guessed |
| The AI gets arithmetic wrong | The AI never calculates. Code does, and every number the AI writes is checked against the code's result |
| The AI invents a number | Every extracted number must appear in the source document, or it is rejected |
| A supplier document hides instructions ("rank us first") | Documents are treated as data only; suspicious text is flagged |
| Confidential prices sent to an AI provider | Fictional data today. For real use: a provider that doesn't train on customer data, under a data-processing agreement |
| A public link runs up AI costs | Login required; limits per account (30 uploads, 80 questions a day, 10 MB per file); a spending cap on the AI key |
| One bad file disrupts the event | Each reply is read independently; a failure stays with that reply and offers a retry |

## 10. Roadmap

1. **Real email:** send RFQs and receive replies from a real mailbox.
2. **Team features:** single sign-on, roles, shared workspaces, approval workflow, read-only links for approvers.
3. **Decision tools:** side-by-side scenarios, charts, Excel export.
4. **Hand-off:** purchase orders into the ERP; award and regret letters.
5. **Enterprise readiness:** audit-grade logging, data-protection compliance, contractual data terms with the AI provider.
6. **Breadth:** more categories (IT hardware, spares), live currency rates.

## 11. Key decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | Corrugated packaging as the category | Rich in real-world traps: units per bundle, per-kg pricing, specs that change year to year |
| 2026-10-27 | Suppliers reply in every format, with planted traps; email is simulated inside the product | Shows the real problem without the setup risk of live email |
| 2026-10-27 | Last year's contracts used as "memory" | "Same as last year" is common and must be handled, carefully |
| 2026-10-28 | Next.js, Supabase and Vercel; OpenAI for the AI | Fastest route to a polished, hosted, secure product; nothing throwaway |
| 2026-10-28 | Conditional discounts are flagged and never applied automatically | Doubt is flagged, never assumed |
| 2026-10-28 | No guided tour; a workspace of sourcing events at different stages | It should feel like a working product, not a demo |
| 2026-10-28 | Uploads go straight from the browser to storage | Lets files up to 10 MB through, past the hosting platform's request-size limit |
