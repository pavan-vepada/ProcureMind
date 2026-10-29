# 7 · Glossary

Every term used in this repository, in plain English.

## Procurement

| Term | Meaning |
|---|---|
| **Category buyer** | The person responsible for buying one category of goods (here, packaging) for the company |
| **Sourcing event** | One round of asking suppliers for prices and choosing who to buy from |
| **RFI** · Request for Information | "Who out there can supply this?" The first, broad question to many suppliers |
| **RFP** · Request for Proposal | "How would you do it?" Asked of a shortlist |
| **RFQ** · Request for Quotation | "Exactly what price, for exactly these items?" |
| **RFx** | The umbrella term for RFI, RFP and RFQ. In the product, one sourcing event |
| **Line item** | One product being bought, such as "5-ply shipper box, 400 × 300 × 250 mm" |
| **Award** | The decision on which supplier supplies which items |
| **Split award** | Giving different items to different suppliers, usually the cheapest eligible one per item |
| **Award memo** | The document that recommends the award and justifies it |
| **Purchase order (PO)** | The formal order sent to a supplier after the award |
| **ERP** | The company's main business system (for example SAP), where purchase orders live |
| **Questionnaire** | Quality and capability questions each supplier answers, such as "Do you hold ISO 9001?" |
| **Evaluation rules** | The pass criteria and comparison basis, fixed before prices are seen |
| **Landed / delivered cost** | The price including transport to the buyer's plant |
| **GST** | India's goods and services tax. Prices are compared before GST |
| **Volume tier** | A lower unit price once the order quantity passes a threshold |
| **MOQ** | Minimum order quantity |
| **Payment terms** | How many days after delivery the buyer pays, such as "60 days" |

## Packaging

| Term | Meaning |
|---|---|
| **Corrugated** | Cardboard made of a wavy layer between flat layers, as in shipping boxes |
| **Ply** | The number of layers: 3-ply for light items, 5-ply and 7-ply for heavy ones |
| **GSM** | Paper weight, in grams per square metre |
| **BF** | Bursting factor: how strong the paper is |
| **Flute** | The size of the wave in the board (B, C, E, BC) |
| **RSC** | Regular slotted container: the standard box with flaps |
| **Die-cut** | A box cut to a custom shape |
| **BCT / ECT** | Box compression test / edge crush test: strength tests |
| **ISO 9001 · FSC** | A quality-management certificate · a responsible-forestry certificate |

## The product

| Term | Meaning |
|---|---|
| **Normalise / one basis** | Convert every price to the same unit, currency and terms (₹ per piece, before GST, delivered) so prices can be compared fairly |
| **Conversion chain** | The visible steps from the price as quoted to the comparable price |
| **Evidence / source** | The exact place in the supplier's document a number came from |
| **Provenance** | Where a value came from: the supplier's reply, last year's contract, a clarification, or a manual edit |
| **Confidence** | How sure the AI is that it read a value correctly |
| **Flag** | Something the buyer should look at: a missing item, an unclear term, an estimate |
| **Clarification** | A follow-up email asking a supplier to fill a gap |
| **Closing the loop** | The supplier's answer being read automatically, so only the affected numbers update |
| **Scenario** | A saved way of splitting the award, such as "cheapest per item, passing suppliers only" |
| **Contract memory** | Last year's contracts, used to fill "same as last year", but only where the specification is unchanged |

## Technology

| Term | Meaning |
|---|---|
| **AI model** | The service that reads documents and writes text (here, OpenAI's `gpt-5.5`) |
| **API** | How one piece of software talks to another, such as Procure Mind to the AI service |
| **Structured output** | Making the AI answer in an exact, checkable format instead of free text |
| **Tool calling** | Letting the AI choose a calculation for the code to run, rather than doing maths itself |
| **Prompt injection** | Text in a document that tries to give the AI instructions ("rank us first"). Procure Mind treats documents as data only |
| **Next.js · React · TypeScript** | The toolkit the application is built with |
| **Supabase** | A hosted service providing the database, login and file storage |
| **Postgres** | The database |
| **Row-level security** | A database rule that lets each user see only their own rows, enforced by the database itself |
| **Vercel** | A hosting service that publishes the application at a web address |
| **Migration** | A script that sets up or changes the database structure |
| **Seeding / sample data** | The fictional starting data each new user receives |
| **Unit test · integration test · end-to-end test** | Automated checks of one calculation · of the database working together with the code · of a full user journey in a real browser |
| **Repository (repo)** | The project folder, with its full history, as stored on GitHub |
