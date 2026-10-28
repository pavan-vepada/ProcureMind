import os
import random
import sys

from excal import *

random.seed(7)
OUT = sys.argv[1]

AI = PURPLE      # AI step
CODE = GREEN     # deterministic code
STORE = BLUE     # storage
EXT = ORANGE     # outside service / actor


def legend(s, x, y):
    s.text(x, y, "Legend", 16)
    for i, (label, c) in enumerate([("AI (OpenAI)", AI), ("Code (deterministic)", CODE),
                                    ("Storage", STORE), ("People / outside services", EXT)]):
        s.box(x + i * 200, y + 26, 185, 40, label, c, 13)


# ---------------- A1: System overview ----------------
s = Scene()
s.text(0, 0, "A1 · System overview: what runs where", 32)
s.text(0, 46, "One web app on Vercel, one managed backend (Supabase), one AI service (OpenAI). "
              "Everything a user sees goes through login.", 16, MUTED)
legend(s, 0, 80)

users = s.box(0, 220, 230, 120, "People\nBuyer · Reviewer · (VP / CFO via screen-share)\nDesktop browser", EXT, 15, sw=2)

s.box(330, 180, 520, 430, "", WHITE, style="dashed", stroke="#868e96")
s.text(345, 190, "Vercel (hosting) · Next.js app", 18)
ui = s.box(350, 230, 480, 90, "Screens (React)\nS1–S12: lifecycle strip, inbox, matrix, drawer, Ask panel, memo", STORE if False else WHITE, 14)
api = s.box(350, 350, 480, 240,
            "Server routes (TypeScript)\n"
            "• Auth check on every request\n"
            "• Seed / reset demo\n"
            "• Send + fast-forward (simulated email)\n"
            "• Process a reply (A2 pipeline)\n"
            "• Normalize + scenario engine (pure code)\n"
            "• Ask engine (A3) · Award memo\n"
            "• Rate limits per account", CODE, 14, align="left")

s.box(950, 180, 400, 430, "", WHITE, style="dashed", stroke="#868e96")
s.text(965, 190, "Supabase (managed backend, Mumbai)", 18)
auth = s.box(970, 230, 360, 80, "Auth\nSign-up / log-in (email + password; Google optional)", STORE, 14)
db = s.box(970, 330, 360, 150, "Postgres database\nRFx, lines, vendors, quote values + sources, issues, scenarios, change log.\nRow-level security: each user sees only their rows", STORE, 14)
files = s.box(970, 500, 360, 90, "File storage\nOriginal vendor files, kept unchanged", STORE, 14)

claude = s.box(1450, 350, 280, 150, "OpenAI API\nModel set in AI_MODEL\nReads PDFs, photos, text. Returns structured JSON", AI, 14, sw=2)

gh = s.box(350, 700, 230, 90, "GitHub repo\n(code + seed data)", EXT, 14)
dev = s.box(0, 700, 260, 90, "Dataset generator (Python, run once on the laptop)", CODE, 14)
seed = s.box(650, 700, 230, 90, "Seed bundle\nJSON + Excel, PDF, Word, photo, emails", STORE, 14)

s.arrow(users, ui, "HTTPS")
s.arrow(ui, api, None)
s.arrow(api, auth, "verify session")
s.arrow(api, db, "read / write")
s.arrow(api, files, "store / fetch")
s.arrow(api, claude, "documents +\nquestions")
s.arrow(dev, gh, "commit")
s.arrow(gh, api, "push = deploy", style="dashed")
s.arrow(dev, seed, None, side="h")
s.arrow(seed, files, "copied per\naccount on sign-up", style="dashed")
s.box(1450, 560, 280, 110, "Secrets (API keys) live only in Vercel's encrypted settings. Never in code or git.", YELLOW, 13)
s.save(os.path.join(OUT, "arch-1-system-overview.excalidraw"))

# ---------------- A2: Reply processing pipeline ----------------
s = Scene()
s.text(0, 0, "A2 · Reading a vendor reply: from any format to comparable numbers", 32)
s.text(0, 46, "AI only reads and interprets. Code checks, converts and calculates. Each step writes a progress line the screen shows live.", 16, MUTED)
legend(s, 0, 80)
W, H, G, Y = 230, 200, 50, 200
steps = [
    ("1. Store original\nFile saved unchanged; reply linked to vendor by sender", STORE),
    ("2. Prepare by format\nExcel → cell grid with addresses (B7)\nWord → numbered paragraphs\nPDF → pages + text positions\nPhoto → image\nEmail → text", CODE),
    ("3. Extract + map\nThe AI reads the reply and the 30 RFQ lines. Returns JSON: price, unit, currency, tax, tiers, discount, terms, answers, the source of each value, confidence", AI),
    ("4. Validate\nSchema check; every number must appear in the source; sanity ranges; low confidence → flag", CODE),
    ("5. Normalize\nper box / per 100 / per kg → per piece; USD → ₹ at locked rate; discount; GST out; freight; tier for each plant's quantity", CODE),
    ("6. Resolve gaps\nMissing-value policy: same reply → last year's contract (spec match) → flag + add to vendor's issue list", CODE),
    ("7. Save\nValues + conversion chain + source location + history (old values kept)", STORE),
]
ids = []
for i, (t, c) in enumerate(steps):
    ids.append(s.box(i * (W + G), Y, W, H, t, c, 13, align="left"))
for a, b in zip(ids, ids[1:]):
    s.arrow(a, b)
prog = s.box(0, Y + H + 90, 7 * (W + G) - G, 60,
             "processing_runs: 'Reading → Finding prices → Matching lines → Converting → Done (27 of 30 lines found)'  ·  the screen polls every second",
             YELLOW, 14)
for i in (0, 2, 4, 6):
    s.arrow(ids[i], prog, None, style="dashed")
out = s.box(6 * (W + G), Y + H + 200, W, 90, "Matrix (S7) and review queue (S9) update", WHITE, 14, sw=2)
s.arrow(prog, out, None)
fail = s.box(2 * (W + G), Y - 140, W, 80, "Failure in any step → that reply shows a reason + Retry; others continue", RED, 13)
s.arrow(fail, ids[2], None, style="dashed")
s.save(os.path.join(OUT, "arch-2-reply-pipeline.excalidraw"))

# ---------------- A3: Ask engine ----------------
s = Scene()
s.text(0, 0, "A3 · Ask engine: AI interprets the question, code does the math", 32)
s.text(0, 46, "The AI never produces a total or a price on its own. Every number in an answer comes from the scenario engine.", 16, MUTED)
legend(s, 0, 80)
q = s.box(0, 230, 220, 110, "Question\n(chip or typed) + earlier turns", EXT, 14)
interp = s.box(290, 230, 250, 110, "Interpret\nThe AI turns it into a scenario spec using a fixed set of tools", AI, 14)
amb = s.box(290, 420, 250, 100, "Ambiguous?\nAsk one clarifying question with clickable choices", YELLOW, 13)
spec = s.box(610, 230, 260, 110, "Scenario spec (JSON)\nvendors: passed questionnaire, exclude V2\naward: cheapest per line\nvolumes: combine plants", WHITE, 13, align="left")
val = s.box(940, 230, 200, 110, "Validate spec\nknown vendors, lines, rules only", CODE, 14)
eng = s.box(1210, 230, 250, 110, "Scenario engine\nApplies filters, tiers, award rule to stored values. Exact math", CODE, 14)
res = s.box(1210, 420, 250, 110, "Result + working\nTable, totals, savings, filters and formula used", WHITE, 14)
expl = s.box(900, 420, 240, 110, "Explain\nThe AI writes 2–3 sentences using only the result's numbers", AI, 14)
chk = s.box(600, 420, 230, 110, "Number check\nEvery figure in the text must exist in the result; else show table only", CODE, 13)
ans = s.box(600, 600, 230, 100, "Ask panel (S7)\nAnswer · table · show working · Save as scenario", EXT, 14, sw=2)
s.arrow(q, interp)
s.arrow(interp, amb, "unclear", style="dashed")
s.arrow(interp, spec)
s.arrow(spec, val)
s.arrow(val, eng)
s.arrow(eng, res)
s.arrow(res, expl)
s.arrow(expl, chk)
s.arrow(chk, ans)
s.box(0, 600, 520, 130,
      "Tools the AI may call:\n• run_scenario(spec): award splits, filters, volume aggregation, price-match what-ifs\n"
      "• query_values(filters, sort, group): look-ups like 'which vendors still have open issues?'\n"
      "• get_vendor_profile(vendor): terms, questionnaire, certificates", GRAY, 13, align="left")
s.save(os.path.join(OUT, "arch-3-ask-engine.excalidraw"))

# ---------------- A4: Data model ----------------
s = Scene()
s.text(0, 0, "A4 · Data model: the main tables and how they connect", 32)
s.text(0, 46, "Every table also has owner_id; row-level security means a user can only ever read or change their own rows.", 16, MUTED)
T = {}


def table(key, x, y, name, fields, c=STORE, w=260):
    body = name + "\n" + "\n".join("· " + f for f in fields)
    h = 34 + 19 * (len(fields) + 1)
    T[key] = s.box(x, y, w, h, body, c, 13, align="left", valign="top")


table("rfx", 560, 110, "rfx", ["title, stage, tour_step", "internal_request", "fx_rate, fx_date, due_date", "rules_locked_at"], STORE, 280)
table("lines", 80, 330, "line_items", ["line_no, name", "specs: ply, GSM, BF, flute, L×W×H", "qty_plant1, qty_plant2", "est_weight_kg"])
table("vendors", 560, 330, "vendors", ["code (V1–V5), name, email", "rfi_note, rfp_summary", "status", "payment_days, lead_time", "freight_terms, freight_amount"], STORE, 280)
table("questions", 1080, 110, "questions", ["q_no, text", "pass_rule"])
table("msgs", 1080, 330, "messages", ["direction (out / in)", "kind: rfq / reply / clarification", "subject, body, at, is_late"])
table("att", 1480, 330, "attachments", ["filename, type", "storage_path (original file)"])
table("runs", 1480, 110, "processing_runs", ["step, progress_text", "status, error"])
table("qv", 300, 640, "quote_values", ["raw: price, unit, currency, GST, discount, tiers", "price_inr_per_piece", "conversion_chain", "confidence, status", "provenance: vendor / contract / clarification / manual / estimate", "source: attachment, page, cell, paragraph, snippet, box", "contract_ref, is_current, replaced_by"], STORE, 380)
table("issues", 800, 640, "issues", ["kind: missing line / ambiguous / unreadable / no history / terms", "line_item_id, text", "status: open / asked / resolved"], STORE, 300)
table("ans", 1180, 640, "answers + certificates", ["answer, passed, source", "cert type, expires_on, valid"])
table("contracts", 0, 980, "contracts + contract_lines", ["vendor, contract_no (#2025-V5), year", "spec_key, price, unit"], STORE, 300)
table("scen", 560, 980, "scenarios", ["name, spec (JSON)", "result (JSON)"])
table("memo", 900, 980, "award_memos", ["scenario_id, content"])
table("chat", 1200, 980, "chat_messages", ["role, text, spec, result"])
table("misc", 1500, 980, "assumptions + change_log", ["key, value (FX, freight, weights)", "table, row, field, old, new, who, when"], STORE, 300)

for a, b, l in [
    ("rfx", "lines", "has 30"), ("rfx", "vendors", "has 5"), ("rfx", "questions", None),
    ("vendors", "msgs", None), ("msgs", "att", None), ("msgs", "runs", None),
    ("lines", "qv", None), ("vendors", "qv", None), ("att", "qv", "source"),
    ("vendors", "issues", None), ("vendors", "ans", None), ("questions", "ans", None),
    ("contracts", "qv", "pulled from"), ("scen", "memo", None),
]:
    s.arrow(T[a], T[b], l)
s.save(os.path.join(OUT, "arch-4-data-model.excalidraw"))
print("ok")
