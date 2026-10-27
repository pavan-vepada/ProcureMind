import os
import random
import sys

from excal import *

random.seed(42)
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

MAP_LANES = ["Does", "Sees (screen)", "Procure Mind does", "Friction removed"]
MAP_COLORS = [WHITE, BLUE, PURPLE, GREEN]

# ---------------- J1: Buyer, end to end ----------------
s = Scene()
journey_map(
    s, 0, 0,
    "J1 · Pavan (Category Buyer): from internal request to award",
    "Goal: a defensible award without retyping a single number.  Trigger: Plant Operations emails a packaging need.  "
    "Screen codes (S1–S12) are listed in docs/02-journeys.md.",
    MAP_LANES,
    [
        ("Log in", [
            "Opens the link. Signs up with one-click Google (or email + password).",
            "S1 Sign up / log in → lands inside the demo RFx (S2). Guided tour opens.",
            "Creates the account and copies the demo RFx, vendors and replies into it.",
            "No verification email. No empty dashboard. One obvious next step."]),
        ("Understand context", [
            "Clicks Need, RFI and RFP on the lifecycle strip.",
            "S3 Context: the internal request email; RFI results (12 vendors → 5 shortlisted, with reasons); RFP summary per vendor.",
            "Shows seeded context; feeds it to the co-pilot.",
            "All background in one place instead of scattered email threads."]),
        ("Draft RFQ", [
            "Clicks 'Draft RFQ with co-pilot'. Fixes one quantity inline.",
            "S4 RFQ draft: 30 lines streaming in, questionnaire, payment terms, delivery plants, due date.",
            "AI drafts from the request + RFP context. If AI is down: prepared draft, labelled.",
            "No blank page. Edits happen directly in the table."]),
        ("Lock rules & send", [
            "Checks pass rules and comparison basis. Clicks 'Lock rules & send'.",
            "S4 rules panel → S5 Send: 5 outgoing emails with RFQ PDF + Excel template. Status: Sent.",
            "Freezes the evaluation rules with a timestamp. Records the send.",
            "Rules fixed before prices are seen, so the award is defensible later."]),
        ("Replies arrive", [
            "Clicks 'Fast-forward 9 days'.",
            "S6 Inbox: 5 replies with real arrival dates, one marked late. Live progress per vendor: 'Reading → Finding prices → 27 of 30 lines found'.",
            "Processes every reply automatically, in parallel. One failed file never stops the rest.",
            "No 'Process' button. No bare spinner. Plain-word progress."]),
        ("Compare", [
            "Scans the matrix. Toggles as-quoted / normalized. Changes the freight estimate once.",
            "S7 Comparison: fills in as each vendor finishes. Badges + legend. '9 items need a look'.",
            "Maps lines; converts per-box, per-kg, USD, discounts, tiers; pulls V5's 2025 contract; checks questionnaire and certificates.",
            "Never blocked by review. Change once, every number updates."]),
        ("Check evidence", [
            "Clicks a V4 price (photo) and a V2 price (PDF).",
            "S8 Source drawer: the photo with a box around the number; the PDF footnote highlighted; the conversion chain.",
            "Keeps the exact source location of every value.",
            "Proof is one click away. No digging through attachments."]),
        ("Resolve & chase", [
            "S9: 'Accept all high-confidence'. On V3 clicks 'Ask vendor', edits a line, clicks Send.",
            "S9 Review queue → S10 drafted email: 'missing #12, #14, #19; confirm payment terms'. Later: 3 cells fill in, badge 'Updated from clarification'.",
            "One consolidated email per vendor. Reads the reply, updates only the changed cells, keeps history.",
            "No hand-written chase emails. The loop closes by itself."]),
        ("Ask what-ifs", [
            "Clicks a suggested question. Follows up: 'now leave out V2'. Saves the scenario.",
            "S7 Ask panel beside the matrix: answer + table + 'show working'. Numbers are clickable.",
            "AI turns the question into a calculation; code does the math; tiers re-priced for combined volumes.",
            "No typing needed. No spreadsheet rebuild. Asks back if a question is ambiguous."]),
        ("Award", [
            "Picks the saved scenario. Clicks 'Recommend award'.",
            "S12 Award memo: award per vendor and line, total, savings vs last year, rules, risks, evidence links. Strip: Award ✓, PO next.",
            "Builds the memo from the scenario and its evidence trail.",
            "A defensible memo in one click."]),
    ],
    MAP_COLORS,
)
s.save(os.path.join(OUT, "journey-1-buyer-end-to-end.excalidraw"))

# ---------------- J2: Challenge reviewer, alone ----------------
s = Scene()
journey_map(
    s, 0, 0,
    "J2 · Challenge reviewer: alone, no presenter, ~10 minutes",
    "Goal: understand the story unaided, see it work, and test it with an own file.  Trigger: receives the public link.",
    MAP_LANES,
    [
        ("Open link", [
            "Opens the shared link cold.",
            "S1 Landing: one-line pitch 'Kill the quote spreadsheet', a 3-step picture of the flow, and 'Sign up'.",
            "Serves the page fast (warmed up before the demo).",
            "Understands what this is within 5 seconds."]),
        ("Sign up", [
            "One-click Google, or email + password.",
            "One screen. No extra form.",
            "Creates the account and seeds a private copy of the demo.",
            "No verification email, no setup questions."]),
        ("Land & orient", [
            "Reads tour step 1.",
            "S2 RFx workspace: lifecycle strip, tour checklist, the next action highlighted.",
            "Tracks tour progress.",
            "Never an empty screen; always one next step."]),
        ("Follow the fast path", [
            "Follows the tour: Draft → Send → Fast-forward → Compare → Evidence → Ask → Award.",
            "Each step highlights exactly one button. Suggested-question chips.",
            "Runs live AI processing on the seeded replies.",
            "No typing. First comparison in under 3 minutes."]),
        ("Test own file", [
            "Drags an own quote (PDF, Excel or photo) into 'Upload a reply' and picks a vendor.",
            "S6 progress → S7 values appear with badges and a clickable source.",
            "Extracts live. An unusual file gets a plain message; nothing else breaks.",
            "Proof it isn't hard-coded."]),
        ("Replay or leave", [
            "Clicks 'Reset demo', or leaves and comes back later.",
            "A fresh start, or exactly where they left off.",
            "Restores the seed, or reloads the saved state.",
            "Nothing lost. Easy to replay."]),
    ],
    MAP_COLORS,
)
s.save(os.path.join(OUT, "journey-2-reviewer-solo.excalidraw"))

# ---------------- J3: Closed-loop clarification ----------------
s = Scene()
swimlane(
    s, 0, 0,
    "J3 · Closed loop: chasing a vendor who quoted 27 of 30 lines",
    "Improvement A end to end. Actors: Pavan (buyer), Procure Mind, Vendor V3 (by email; never logs in).",
    ["Pavan (buyer)", "Procure Mind", "Vendor V3"],
    {
        "v1": (2, 0, "Sends a Word doc: prices in prose, 27 of 30 lines, 30-day payment terms", "rectangle"),
        "p1": (1, 1, "Reads the reply. Finds missing #12, #14, #19 and terms ≠ 60 days", "rectangle"),
        "p2": (1, 2, "Flags the 3 cells + terms. Adds them to V3's issue list", "rectangle"),
        "b1": (0, 3, "Sees '27 of 30' badge. Clicks 'Ask vendor'", "rectangle"),
        "p3": (1, 4, "Drafts ONE email with every open V3 issue", "rectangle"),
        "b2": (0, 5, "Reads, edits if needed, clicks Send", "rectangle"),
        "p4": (1, 6, "Status → 'Clarification requested'", "rectangle"),
        "v2": (2, 7, "Replies: the 3 missing prices + accepts 60 days", "rectangle"),
        "p5": (1, 8, "Matches to V3. Updates only the changed cells. Keeps history", "rectangle"),
        "d1": (1, 9, "All issues resolved?", "diamond"),
        "b3": (0, 10, "Sees cells filled, badge 'Updated from clarification'. Totals and answers refresh", "rectangle"),
    },
    [
        ("v1", "p1", "email arrives", None),
        ("p1", "p2", None, None),
        ("p2", "b1", None, None),
        ("b1", "p3", None, None),
        ("p3", "b2", None, None),
        ("b2", "p4", None, None),
        ("p4", "v2", "email", None),
        ("v2", "p5", "reply arrives", None),
        ("p5", "d1", None, None),
        ("d1", "b3", "yes", None),
        ("d1", "p3", "no: draft a follow-up", "dashed", "below"),
    ],
    [GRAY, PURPLE, ORANGE],
    col_w=200, node_w=175, node_h=120,
)
s.save(os.path.join(OUT, "journey-3-closed-loop.excalidraw"))

# ---------------- J4: VP what-ifs and CFO audit ----------------
s = Scene()
swimlane(
    s, 0, 0,
    "J4 · Decision: the VP's what-ifs and the CFO's audit",
    "Rajesh asks during a screen-share; Pavan drives; the CFO checks the memo's evidence. AI interprets, code does the math.",
    ["Rajesh (VP)", "Pavan (buyer)", "Procure Mind", "CFO / auditor"],
    {
        "r1": (0, 0, "'Split the award: cheapest per line, only vendors who passed the questionnaire?'", "rectangle"),
        "b1": (1, 1, "Clicks that suggested question", "rectangle"),
        "p1": (2, 2, "Applies locked pass rules (V3 fails). Cheapest valid vendor per line. Code totals it. Shows working", "rectangle"),
        "r2": (0, 3, "'And if we combine both plants' volumes?'", "rectangle"),
        "b2": (1, 4, "Asks the follow-up", "rectangle"),
        "p2": (2, 5, "Re-prices with volume tiers. Shows the saving vs the previous answer", "rectangle"),
        "b3": (1, 6, "Saves scenario. Clicks 'Recommend award'", "rectangle"),
        "p3": (2, 7, "Generates the memo: award, totals, savings vs last year, rules, risks, evidence", "rectangle"),
        "c1": (3, 8, "Opens the memo. Clicks a ₹ figure", "rectangle"),
        "p4": (2, 9, "Drawer: the vendor's own words / photo region behind that number", "rectangle"),
        "c2": (3, 10, "Satisfied. Approves (offline today; approval workflow is roadmap)", "rectangle"),
    },
    [
        ("r1", "b1", None, None), ("b1", "p1", None, None), ("p1", "r2", "answer +\ntable", None),
        ("r2", "b2", None, None), ("b2", "p2", None, None), ("p2", "b3", None, None),
        ("b3", "p3", None, None), ("p3", "c1", "memo", None), ("c1", "p4", None, None),
        ("p4", "c2", None, None),
    ],
    [YELLOW, GRAY, PURPLE, GREEN],
    col_w=200, node_w=180, node_h=130, lane_h=175,
)
s.save(os.path.join(OUT, "journey-4-decision-vp-cfo.excalidraw"))

# ---------------- J5: Recovery paths ----------------
s = Scene()
s.text(0, 0, "J5 · When things go wrong: every problem comes with its fix", 32)
s.text(0, 46, "No dead ends. Each row: what happens → what the user sees → the one next action.", 16, MUTED)
rows = [
    ("A reply can't be read (e.g. photo too blurry)", "Red card on that reply: plain reason. The other replies keep processing", "Retry · upload a clearer file · Ask vendor"),
    ("Co-pilot AI unavailable while drafting", "Prepared draft appears, labelled 'Prepared draft (AI unavailable)'", "Edit and send as normal"),
    ("Low-confidence value", "Amber cell + an entry in the review queue, next to its source", "Accept · Edit · Ask vendor"),
    ("Line not in last year's contract", "Cell flagged 'No history for this line'; kept out of totals", "Auto-added to the vendor's clarification email"),
    ("'Freight extra' with no amount", "Freight flag on the vendor; assumptions panel offers an estimate", "Set an estimate (labelled) · Ask vendor"),
    ("Ambiguous question in Ask", "One short clarifying question with clickable choices", "Click a choice"),
    ("Reply from an unknown sender", "Inbox item: 'Who is this from?'", "Pick the vendor from a dropdown"),
    ("Unusual upload (too big, password-protected, not a quote)", "Plain message: what's wrong and the limits", "Upload another file"),
    ("Page refreshed / user returns tomorrow", "Same screen, same state", "Carry on"),
    ("Wrong manual edit", "Change log entry with Undo", "Undo"),
    ("AI slow on demo day (presenter only)", "Banner: 'Showing saved run'", "Continue the story"),
]
heads = ["When this happens", "The user sees", "Next action"]
colors = [RED, BLUE, GREEN]
widths = [330, 420, 330]
xs = [0, 330 + 70, 330 + 70 + 420 + 70]
y = 100
for i, h in enumerate(heads):
    s.box(xs[i], y, widths[i], 50, h, GRAY, 17, sw=2)
y += 70
for row in rows:
    ids = [s.box(xs[i], y, widths[i], 76, row[i], colors[i], 14) for i in range(3)]
    s.arrow(ids[0], ids[1])
    s.arrow(ids[1], ids[2])
    y += 92
s.save(os.path.join(OUT, "journey-5-recovery-paths.excalidraw"))

print("ok")
