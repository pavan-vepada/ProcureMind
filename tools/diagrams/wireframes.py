"""Phase 4 wireframes: one .excalidraw file per screen (S1–S12) plus a screen-flow map."""
import os
import random
import sys

from excal import *

random.seed(11)
OUT = sys.argv[1]

W, H = 1440, 900          # screen frame
OY = 100                  # frame top (title + subtitle sit above it)
NOTE_X = W + 60           # sticky-note column to the right of the frame
NEXT = YELLOW             # the one highlighted next action
RED_INK = "#e03131"

STAGES = ["Need", "RFI", "RFP", "RFQ", "Replies", "Analysis", "Award", "PO"]
TOUR = ["See the request", "Draft the RFQ", "Lock rules & send", "Fast-forward 9 days",
        "Compare quotes", "Check a source", "Ask a vendor", "Ask a what-if",
        "Combine volumes", "Recommend award"]


class Wire:
    def __init__(self, code, slug, title, subtitle):
        self.s = Scene()
        self.file = f"wire-{int(code[1:]):02d}-{slug}.excalidraw"
        self.n = 0
        self.notes = []
        self.s.text(0, 0, f"{code} · {title}", 32)
        self.s.text(0, 46, subtitle, 16, MUTED)
        self.s.box(0, OY, W, H, "", WHITE, sw=2)

    # all coordinates below are relative to the frame's top-left corner
    def box(self, x, y, w, h, text="", bg=WHITE, size=13, **kw):
        return self.s.box(x, OY + y, w, h, text, bg, size, **kw)

    def text(self, x, y, text, size=13, color=INK):
        return self.s.text(x, OY + y, text, size, color)

    def btn(self, x, y, w, text, bg=WHITE, h=34, **kw):
        return self.box(x, y, w, h, text, bg, 13, **kw)

    def next_btn(self, label, x=900, y=836, w=260):
        return self.box(x, y, w, 46, "▶ " + label, NEXT, 15, sw=3)

    def rotate(self, el_id, angle):
        el = self.s.by_id[el_id]
        el["angle"] = angle
        for b in el["boundElements"]:
            if b["type"] == "text":
                self.s.by_id[b["id"]]["angle"] = angle

    def table(self, x, y, widths, rows, row_h=32, size=12, fills=None):
        """rows[0] is the header. fills: {(row, col): colour} for highlighted cells."""
        fills = fills or {}
        for r, row in enumerate(rows):
            cx = x
            for c, (wd, cell) in enumerate(zip(widths, row)):
                bg = GRAY if r == 0 else fills.get((r, c), WHITE)
                self.box(cx, y + r * row_h, wd, row_h, cell, bg, size, align="left")
                cx += wd
        return y + len(rows) * row_h

    def note(self, x, y, text):
        """Numbered marker on the screen plus a matching sticky note beside the frame."""
        self.n += 1
        self.box(x - 14, y - 14, 28, 28, str(self.n), ORANGE, 13, shape="ellipse", sw=2)
        self.notes.append(f"{self.n}. {text}")

    def shell(self, stage, tour_step, view=None, tour_open=True):
        """The S2 frame around every workspace screen: top bar, lifecycle strip, guided tour."""
        self.box(0, 0, W, 52, "", GRAY)
        self.text(20, 14, "Procure Mind V2.0", 20)
        self.text(260, 17, "RFx-2026-014 · Corrugated packaging for both plants · "
                           "Sunrise Consumer Goods", 14, MUTED)
        self.btn(1110, 9, 110, "↺ Reset demo")
        self.btn(1230, 9, 190, "Pavan ▾  (log out)")
        for i, name in enumerate(STAGES):
            if i < stage:
                bg, label, style = GREEN, f"{name} ✓", "solid"
            elif i == stage:
                bg, label, style = BLUE_D, f"● {name}", "solid"
            else:
                bg, label, style = WHITE, name, "dashed"
            if name == "PO":
                label += " (roadmap)"
            if i == view:
                label += " · viewing"
            self.box(20 + i * 172, 64, 165, 40, label, bg, 14, style=style,
                     sw=3 if i == view else (2 if i == stage else 1))
        if not tour_open:
            self.box(1392, 120, 44, 160, "Tour ▸", GRAY, 12)
            return
        self.box(1180, 120, 240, 700, "", GRAY)
        self.text(1194, 132, f"Guided tour · {tour_step + 1} of 10", 14)
        self.text(1194, 154, "Hide ✕", 12, MUTED)
        for i, step in enumerate(TOUR):
            mark = "✓" if i < tour_step else ("▶" if i == tour_step else "○")
            self.box(1194, 186 + i * 52, 212, 42, f"{mark} {i + 1}. {step}",
                     NEXT if i == tour_step else WHITE, 13, align="left")

    def save(self):
        self.s.text(NOTE_X, OY - 30, "Notes", 20)
        y = OY
        for t in self.notes:
            h = text_height(t, 380, 14) + 24
            self.s.box(NOTE_X, y, 380, h, t, YELLOW, 14, align="left")
            y += h + 12
        self.s.save(os.path.join(OUT, self.file))


# ---------------- S1: Landing + sign up ----------------
w = Wire("S1", "landing", "Landing + sign up / log in", "The public link. First thing a reviewer sees (J1, J2).")
w.box(0, 0, W, 52, "", GRAY)
w.text(20, 14, "Procure Mind V2.0", 20)
w.btn(1300, 9, 120, "Log in")
w.text(80, 130, "Kill the quote spreadsheet.", 40)
w.text(80, 190, "An AI co-pilot drafts your RFQ, reads whatever vendors send back,\n"
                "and turns it into one comparison you can question, all the way to an award memo.", 18, MUTED)
a = w.box(80, 300, 220, 150, "1. Vendors reply any way they like\nExcel · PDF · Word · phone photo · email", BLUE, 14)
b = w.box(360, 300, 220, 150, "2. One comparison\nEvery number converted and traced to its source", GREEN, 14)
c = w.box(640, 300, 220, 150, "3. Ask and award\nWhat-ifs in plain words, then a defensible memo", PURPLE, 14)
w.s.arrow(a, b)
w.s.arrow(b, c)
w.text(80, 490, "Try it on a ready-made demo: 5 vendors, 30 box sizes, every messy format.", 15, MUTED)
w.box(960, 120, 400, 520, "", WHITE, sw=2)
w.text(990, 145, "Create your account", 22)
w.btn(990, 200, 340, "G   Continue with Google", h=44)
w.text(1150, 262, "or", 13, MUTED)
w.box(990, 290, 340, 40, "Email", WHITE, 13, align="left")
w.box(990, 345, 340, 40, "Password", WHITE, 13, align="left")
w.box(990, 410, 340, 50, "Sign up and open the demo", NEXT, 15, sw=3)
w.text(990, 480, "Already have an account? Log in", 13, MUTED)
w.text(990, 510, "No email verification. You land inside\nyour own copy of the demo.", 12, MUTED)
w.note(80, 130, "The pitch is readable in 5 seconds (J2-1): one line plus a 3-step picture.")
w.note(990, 200, "Google one-click, or email + password on the same screen (FR-0.2). No verification email in the demo.")
w.note(990, 410, "The only highlighted button. After sign-up the server copies the demo data into this account and opens S2 (FR-0.4).")
w.note(1300, 9, "Returning users log in and land exactly where they left off (FR-0.7).")
w.save()


# ---------------- S2: RFx workspace (the frame) ----------------
w = Wire("S2", "workspace", "RFx workspace: the frame around every screen",
         "What a new user sees right after sign-up. The top bar, strip, tour and next button wrap S3–S12.")
w.shell(stage=3, tour_step=0)
w.box(20, 120, 1140, 96, "", WHITE)
w.text(40, 134, "Welcome, Pavan. This is your own copy of the demo RFx.", 20)
w.text(40, 168, "Plant Operations needs new shipper boxes for both plants. Follow the tour on the right, "
                "or click the highlighted button\nat the bottom of each screen.", 14, MUTED)
for i, t in enumerate(["Stage\nRFQ, not drafted yet", "Vendors\n5 shortlisted from 12 (RFI)",
                       "Line items\n30 to be drafted", "Replies\n0 of 5 · due Day 7"]):
    w.box(20 + i * 290, 236, 270, 90, t, BLUE if i == 0 else WHITE, 15)
w.box(20, 350, 700, 300, "Activity\n\n• Day −30 · Internal request from Plant Operations\n"
                         "• RFI: 12 vendors asked, 5 shortlisted\n• RFP: 5 proposals summarised\n"
                         "• Next: read the request, then draft the RFQ with the co-pilot", WHITE, 14, align="left")
w.box(740, 350, 420, 300, "Your demo copy\n\nEverything you do here is private to your account and saved as you go.\n\n"
                          "↺ Reset demo puts it back to the start so you can replay the story.", BLUE, 14, align="left")
w.next_btn("Read the internal request")
w.note(240, 14, "This frame (top bar, lifecycle strip, tour, next button) wraps every screen S3–S12.")
w.note(20, 64, "Lifecycle strip (FR-1.1): green = done, blue = where the RFx is now, dashed = later. "
               "Every chip is clickable. Need, RFI and RFP start done because they are seeded context.")
w.note(1180, 120, "Guided tour (FR-0.6): one step at a time, each pointing at exactly one control. "
                  "Can be hidden and picked up again.")
w.note(900, 836, "One highlighted next action on every screen (principle 2). Its label follows the story.")
w.note(1110, 9, "Reset demo (FR-0.5): asks 'Start over?', then restores the starting data.")
w.save()


# ---------------- S3: Context ----------------
w = Wire("S3", "context", "Context: internal request, RFI results, RFP summaries",
         "Opened by clicking Need, RFI or RFP on the strip. Shown here: the RFI view.")
w.shell(stage=3, tour_step=0, view=1)
w.text(20, 124, "RFI results · 12 vendors asked, 5 shortlisted", 18)
rows = [["#", "Vendor", "ISO 9001", "FSC", "Capacity / month", "Shortlisted", "Why"],
        ["V1", "Vendor 1", "✓", "✓", "4.0 L boxes", "✓ Yes", "Within 200 km of both plants; 7-ply capable"],
        ["V2", "Vendor 2", "✓", "✓", "6.5 L boxes", "✓ Yes", "Largest capacity; export unit, quotes in USD"],
        ["V3", "Vendor 3", "✓", "✕", "2.5 L boxes", "✓ Yes", "Low prices last year; smaller capacity"],
        ["V4", "Vendor 4", "✓", "✕", "3.0 L boxes", "✓ Yes", "Next to Plant 2; current inner-packaging supplier"],
        ["V5", "Vendor 5", "✓", "✓", "3.5 L boxes", "✓ Yes", "Current supplier; last year's contract #2025-V5"],
        ["—", "Vendor 6", "✕", "✕", "1.0 L boxes", "✕ No", "No ISO 9001; capacity too small"],
        ["—", "Vendor 7", "✓", "✕", "0.8 L boxes", "✕ No", "Cannot make 7-ply"]]
fills = {(r, 5): GREEN for r in range(1, 6)}
w.table(20, 160, [40, 200, 90, 70, 150, 120, 460], rows, fills=fills)
w.text(20, 424, "… 5 more vendors, not shortlisted", 13, MUTED)
w.box(20, 470, 550, 330, "When you click Need on the strip\n\nInternal request email\nFrom: Plant Operations · Day −30\n"
                         "“We need new shipper boxes and inner packaging for both plants, starting next quarter…”\n\n"
                         "Annual volumes per plant attached", WHITE, 13, align="left", style="dashed")
w.box(590, 470, 570, 330, "When you click RFP on the strip\n\nOne card per shortlisted vendor:\n"
                          "V1 · how they will supply two plants, quality testing, buffer stock (one paragraph)\n"
                          "V2 …   V3 …   V4 …   V5 …\n\nEach card links to the vendor profile (S11)",
      WHITE, 13, align="left", style="dashed")
w.next_btn("Draft RFQ with co-pilot")
w.note(20, 124, "Seeded and read-only (FR-1.2). The co-pilot reads all of it to draft the RFQ.")
w.note(192, 64, "The chip being viewed gets a thick outline; the blue chip still shows where the RFx really is.")
w.note(20, 470, "Need and RFP use the same page layout with different content; the strip is the navigation.")
w.save()


# ---------------- S4: RFQ draft ----------------
w = Wire("S4", "rfq-draft", "RFQ draft (co-pilot) with the evaluation-rules panel",
         "The co-pilot drafts 30 lines, the questionnaire and terms. The buyer edits, locks the rules, sends.")
w.shell(stage=3, tour_step=1)
w.text(20, 124, "RFQ draft", 20)
w.box(150, 120, 330, 32, "✦ Co-pilot drafting… 18 of 30 lines", PURPLE, 13)
w.btn(20, 166, 150, "Line items (30)", BLUE_D)
w.btn(175, 166, 160, "Questionnaire (12)")
w.btn(340, 166, 120, "Terms")
rows = [["#", "Item", "Ply", "GSM", "BF", "Flute", "Size mm", "Qty P1", "Qty P2"],
        ["1", "RSC shipper, large", "5", "150", "22", "BC", "500×400×300", "60,000", "45,000"],
        ["2", "RSC shipper, medium", "5", "140", "20", "BC", "400×300×250", "52,000 ✎", "40,000"],
        ["3", "RSC carton, small", "3", "120", "18", "B", "300×200×150", "90,000", "70,000"],
        ["4", "Heavy-duty RSC", "7", "180", "25", "BCB", "600×400×400", "12,000", "8,000"],
        ["5", "Die-cut tray", "3", "120", "16", "E", "350×250×80", "40,000", "30,000"],
        ["6", "Partition set 4×6", "3", "120", "16", "B", "380×280×200", "25,000", "18,000"],
        ["7", "Layer pad", "3", "120", "16", "B", "1000×1200", "15,000", "12,000"],
        ["8", "✦ drafting…", "", "", "", "", "", "", ""]]
w.table(20, 210, [36, 250, 44, 54, 44, 50, 130, 80, 80], rows, fills={(2, 7): YELLOW})
w.text(20, 506, "+ 22 more lines", 13, MUTED)
w.btn(20, 540, 150, "⬇ RFQ PDF")
w.btn(180, 540, 220, "⬇ Excel response template")
w.box(20, 600, 768, 200, "Terms (drafted)\nPayment 60 days · Delivery to Plant 1 and Plant 2, freight paid to plant · "
                         "Quote valid 90 days · Response due Day 7\n\nQuestionnaire (12)\nISO 9001 certificate · FSC · "
                         "BCT/ECT test reports · monthly capacity · lead time · quality incidents (last 12 months) …",
      WHITE, 13, align="left")
w.box(810, 120, 350, 540, "", BLUE)
w.text(826, 132, "Evaluation rules", 18)
w.text(826, 158, "Locked before sending. Quoted in the award memo.", 12, MUTED)
w.box(826, 190, 318, 150, "Questionnaire pass rules\n☑ Valid ISO 9001 certificate\n☑ BCT test reports provided\n"
                          "☑ Score ≥ 70%", WHITE, 13, align="left")
w.box(826, 355, 318, 200, "Comparison basis\n• ₹ per piece\n• Before GST\n• Delivered to each plant\n"
                          "• 1 USD = ₹84.00, as of today ✎\n• Price tier = each plant's own volume",
      WHITE, 13, align="left")
w.box(826, 570, 318, 70, "🔓 Not locked yet", WHITE, 14)
w.next_btn("Lock rules & send")
w.note(150, 120, "The draft streams in line by line (principle 4). If the AI is down, a prepared draft appears, "
                 "labelled 'Prepared draft (AI unavailable)'.")
w.note(628, 274, "Click any cell to edit it in place (FR-1.4).")
w.note(810, 120, "Lock rules & send freezes these rules with a timestamp (FR-1.7), so nobody can say the "
                 "goalposts moved after prices were seen.")
w.note(20, 540, "The documents vendors receive (FR-1.8).")
w.save()


# ---------------- S5: Send ----------------
w = Wire("S5", "send", "Send: the 5 outgoing emails and vendor statuses",
         "Right after Lock rules & send. Sending is simulated inside the app.")
w.shell(stage=4, tour_step=3)
w.box(20, 120, 1140, 44, "✓ Rules locked Day 0, 10:01 · RFQ sent to 5 vendors (simulated email) · Replies due Day 7",
      GREEN, 14)
w.text(20, 182, "Outgoing emails", 16)
for i in range(5):
    w.box(20, 210 + i * 70, 380, 60, f"To: V{i + 1} · sales@vendor{i + 1}.example\n"
                                     "RFQ-2026-014 · 2 attachments · Sent ✓",
          BLUE_D if i == 0 else WHITE, 13, align="left")
w.box(420, 182, 740, 420, "To: sales@vendor1.example\nSubject: RFQ-2026-014 · Corrugated packaging for both plants, "
                          "quote by Day 7\n\nDear Vendor 1,\nPlease quote for the 30 items in the attached RFQ. You can "
                          "use the Excel template, or reply in any format you prefer.\n…\n"
                          "Regards, Pavan · Sunrise Consumer Goods\n\n📎 RFQ-2026-014.pdf    📎 Response-template.xlsx",
      WHITE, 13, align="left")
rows = [["Vendor", "Status", "Sent", "Reply"]] + [[f"V{i}", "Sent", "Day 0, 10:02", "—"] for i in range(1, 6)]
w.table(420, 620, [150, 150, 200, 240], rows, row_h=28)
w.next_btn("Fast-forward 9 days")
w.note(20, 120, "Simulated send (D3, risk R6): nothing leaves the app.")
w.note(420, 182, "Each vendor gets the RFQ PDF and the Excel template, and is told any format is fine.")
w.note(420, 620, "Vendor status moves Sent → Replied → Clarification requested.")
w.note(900, 836, "Jumps the demo clock 9 days and drops the 5 seeded replies into the inbox (FR-2.2).")
w.save()


# ---------------- S6: Inbox ----------------
w = Wire("S6", "inbox", "Inbox: replies, live progress per vendor, upload a reply",
         "After Fast-forward. Every reply starts processing on its own, all five at once.")
w.shell(stage=4, tour_step=3)
w.box(20, 120, 1140, 44, "⏩ Fast-forwarded to Day 9 · 5 replies received · reading them now", BLUE, 14)
cards = [("V1", "Excel", 2, "", "✓ Done · 30 of 30 lines found", 1.0, GREEN),
         ("V2", "PDF", 4, "", "Converting… USD → ₹, applying tiers (22 of 30)", 0.75, WHITE),
         ("V3", "Word", 5, "", "Matching lines… 27 of 30 found", 0.6, WHITE),
         ("V4", "Photo", 6, "", "Reading the photo… 1 region hard to read", 0.35, WHITE),
         ("V5", "Email text", 9, "  · LATE", "Finding prices… looking up last year's contract", 0.2, WHITE)]
for i, (v, fmt, day, late, prog, p, bg) in enumerate(cards):
    y = 180 + i * 102
    w.box(20, y, 720, 92, f"{v} · {fmt} · arrived Day {day}{late}\n{prog}", bg, 14, align="left")
    w.box(560, y + 58, 160, 14, "", GRAY)
    w.box(560, y + 58, 160 * p, 14, "", BLUE_D)
w.box(20, 690, 720, 92, "Unknown sender · quotes@newbox.example · Day 8\nWho is this from?  [ Pick a vendor ▾ ]",
      ORANGE, 14, align="left", style="dashed")
w.box(760, 180, 400, 280, "⬆ Upload a reply\n\nDrag a file here, or paste email text\nExcel · PDF · Word · image\n\n"
                          "From vendor: [ V1 ▾ ]\n\nUp to 10 MB per file · 20 files per account",
      WHITE, 14, style="dashed", sw=2)
w.box(760, 480, 400, 150, "Example: a reply that failed\n✕ V4 photo: too blurry to read the prices\n\n"
                          "[ Retry ]  [ Upload a clearer file ]  [ Ask vendor ]", RED, 13, align="left")
w.next_btn("Open comparison")
w.note(20, 180, "Processing starts when a reply lands (FR-3.1). Each card says what it is doing, in plain words, "
                "with counts (FR-3.2). No bare spinners.")
w.note(20, 588, "Replies after the due date get a LATE badge (FR-2.5, should-have).")
w.note(20, 690, "Unknown sender: the buyer picks the vendor (FR-2.3, should-have).")
w.note(760, 180, "Reviewers can test their own file here (FR-2.4). Unusual files fail politely and show the limits.")
w.note(760, 480, "One failed file never stops the others, and always offers a fix (FR-3.11).")
w.note(900, 836, "Enabled as soon as the first vendor is done; the matrix fills in as the others finish (FR-4.2).")
w.save()


# ---------------- S7: Comparison matrix + Ask panel ----------------
w = Wire("S7", "matrix", "Comparison matrix with the Ask panel, badge legend and assumptions",
         "The heart of the product. The tour shrinks to a tab to make room for the Ask panel.")
w.shell(stage=5, tour_step=4, tour_open=False)
w.btn(20, 120, 120, "Normalized", BLUE_D)
w.btn(140, 120, 110, "As quoted")
w.btn(270, 120, 250, "⚠ 9 items need a look → Review", ORANGE)
w.box(20, 164, 1040, 40, "Assumptions:   1 USD = ₹84.00 ✎    ·    V5 freight estimate ₹1.20 per piece ✎    ·    "
                         "Box weights from specs (estimate) ✎", BLUE, 13, align="left")
w.text(20, 222, "Legend:", 13)
x = 80
for label, col, wd in [("Cheapest valid", GREEN, 120), ("Needs a look", YELLOW, 115), ("Missing / fails", RED, 125),
                       ("From contract", BLUE, 120), ("Estimate", PURPLE, 90),
                       ("Updated from clarification", ORANGE, 200)]:
    w.box(x, 214, wd, 30, label, col, 12)
    x += wd + 8
rows = [["#", "Line item", "Qty P1 / P2", "V1 · Excel", "V2 · PDF", "V3 · Word", "V4 · Photo", "V5 · Email"],
        ["", "Lines quoted", "", "30 / 30", "30 / 30", "27 / 30 ⚠", "28 / 30 ⚠", "28 / 30 ⚠"],
        ["", "Total value", "", "₹1.31 Cr", "₹1.24 Cr", "₹1.19 Cr *", "₹1.27 Cr *", "₹1.29 Cr *"],
        ["", "Questionnaire", "", "Pass 82%", "Pass 76%", "Fail 58%", "ISO expired", "Pass 88%"],
        ["", "Payment · lead time", "", "60 d · 14 d", "60 d · 21 d", "30 d ⚠ · 10 d", "45 d · 14 d", "60 d · 12 d"],
        ["1", "RSC shipper, large 5-ply", "60k / 45k", "₹31.20", "₹29.40 tier", "₹30.10", "₹33.10 est.",
         "₹28.90 contract"],
        ["2", "RSC shipper, medium 5-ply", "52k / 40k", "₹18.50 per-100 fixed", "₹19.95 $→₹", "₹20.40",
         "₹21.78 est.", "₹20.79 est."],
        ["3", "RSC carton, small 3-ply", "90k / 70k", "₹8.10", "₹8.45 GST removed", "₹7.90", "unreadable · Ask",
         "₹7.60 contract"],
        ["12", "Die-cut tray 3-ply", "40k / 30k", "₹11.30", "₹10.95", "missing · Ask", "₹12.40 est.",
         "₹11.80 contract"],
        ["29", "Partition set 4×6 (new)", "25k / 18k", "₹6.20", "₹5.85", "₹6.05", "₹6.60 est.", "no history · Ask"]]
fills = {(1, 5): YELLOW, (1, 6): YELLOW, (1, 7): YELLOW, (3, 5): RED, (3, 6): RED, (4, 5): YELLOW,
         (5, 7): GREEN, (5, 6): PURPLE, (6, 3): GREEN, (6, 6): PURPLE, (6, 7): PURPLE,
         (7, 7): GREEN, (7, 6): YELLOW, (8, 4): GREEN, (8, 5): RED, (8, 6): PURPLE, (8, 7): BLUE,
         (9, 4): GREEN, (9, 6): PURPLE, (9, 7): RED}
w.table(20, 256, [32, 206, 92, 142, 142, 142, 142, 142], rows, row_h=36, size=11, fills=fills)
w.text(20, 624, "… 25 more lines (scroll).  * total excludes missing lines", 12, MUTED)
w.box(20, 656, 640, 110, "Hovering V1 · line 2 shows its conversion chain:\n"
                         "₹1,850 per box → 1 box = 100 pieces → ₹18.50 per piece → no discount → freight included "
                         "→ ₹18.50 delivered, before GST", WHITE, 12, align="left", sw=2)
w.box(1070, 120, 310, 700, "", GRAY)
w.text(1084, 132, "Ask about these quotes", 16)
for i, q in enumerate(["Split award: cheapest per line, only vendors who passed the questionnaire",
                       "What if we combine both plants' volumes?",
                       "What if V1 matches the lowest 5-ply prices?",
                       "Which vendors still have open issues?"]):
    w.box(1084, 166 + i * 50, 282, 44, q, WHITE, 12)
w.box(1140, 376, 226, 44, "Split award… passed the questionnaire", BLUE, 12)
w.box(1084, 430, 282, 200, "Award by line to V2, V5 and V1. V3 fails the questionnaire; V4 fails the ISO rule.\n"
                           "Total ₹1.19 Cr, ₹5.0 L below the cheapest single vendor.\n\n[ table: vendor · lines · value ]",
      WHITE, 12, align="left")
w.btn(1084, 640, 140, "Save as scenario")
w.btn(1230, 640, 136, "Show working ▾")
w.box(1084, 760, 282, 44, "Type a question (optional)", WHITE, 12, align="left")
w.next_btn("Review 9 items", x=780)
w.note(20, 120, "Switch between normalized and as-quoted values (FR-4.4).")
w.note(270, 120, "Flags sit on the matrix and never block it (principle 3). The count opens the review queue (S9).")
w.note(20, 164, "Change an assumption once and every number, total and answer updates (FR-4.5).")
w.note(80, 214, "The badge legend is always visible (FR-4.12).")
w.note(20, 292, "Vendor summary rows: lines quoted, total, questionnaire result, terms (FR-4.1, FR-4.6).")
w.note(20, 656, "Hover any cell for its conversion chain; click it to open the source drawer (S8).")
w.note(1070, 120, "Ask panel beside the matrix (FR-5.1). Chips mean no typing (principle 8). The AI interprets the "
                  "question; code does the math and shows its working (FR-5.5).")
w.note(1392, 120, "The tour shrinks to a tab on this screen.")
w.save()


# ---------------- S8: Source drawer ----------------
w = Wire("S8", "source-drawer", "Source drawer (slides over the matrix)",
         "Opened by clicking any number. Shown here: V4's price, read from an angled phone photo.")
w.shell(stage=5, tour_step=5, tour_open=False)
w.box(20, 120, 700, 700, "Comparison matrix (dimmed behind the drawer)", GRAY, 16, style="dashed")
w.box(740, 120, 640, 700, "", WHITE, sw=2)
w.text(760, 132, "V4 · Line 2 · RSC shipper, medium 5-ply", 16)
w.text(760, 158, "₹21.78 per piece · estimate · confidence: medium", 14, MUTED)
w.btn(1330, 128, 36, "✕")
w.btn(760, 188, 100, "Source", BLUE_D)
w.btn(864, 188, 120, "Conversion")
w.btn(988, 188, 90, "History")
photo = w.box(780, 240, 380, 300, "RATE CARD 2026\n\n3 Ply 300x200x150 ..... Rs 46/kg\n5 Ply 400x300x250 ..... Rs 44/kg\n"
                                  "5 Ply 500x400x300 ..... Rs 42/kg\n\n7 Ply 600x400x400 ..... Rs ██\n"
                                  "Pads / sheets ......... Rs ██", GRAY, 13, align="left")
w.rotate(photo, -0.06)
w.box(796, 312, 330, 30, "", "transparent", stroke=RED_INK, sw=3)
w.box(970, 430, 180, 80, "glare: unreadable", WHITE, 12, style="dashed", stroke=RED_INK)
w.text(780, 556, "Red box: where the price was read (approximate).\nRead as: “5 Ply 400x300x250 … Rs 44/kg”", 12, MUTED)
w.box(1180, 240, 190, 300, "Conversion\n\n₹44 per kg\n× 0.495 kg box weight (estimate from GSM × board area ✎)\n"
                           "= ₹21.78 per piece\nGST: not included ✓\nFreight: included ✓", WHITE, 12, align="left")
w.btn(780, 600, 110, "✓ Accept")
w.btn(900, 600, 110, "✎ Edit")
w.btn(1020, 600, 140, "✉ Ask vendor")
w.text(780, 656, "Other sources open the same way:", 13)
for i, t in enumerate(["PDF (V2)\nPage 2, footnote highlighted: “*5% volume discount…”",
                       "Excel (V1)\nSheet ‘Quote’, cell D14 highlighted",
                       "Email (V5)\nPhrase highlighted: “₹42/kg for the 5-ply”"]):
    w.box(780 + i * 196, 680, 186, 120, t, WHITE, 12, style="dashed")
w.next_btn("Close and review flags", x=420)
w.note(740, 120, "Any number in the matrix, an answer or the memo opens this drawer (FR-4.9).")
w.note(780, 240, "The vendor's actual photo with a box around where the number was read. Labelled approximate "
                 "when confidence is low (risk R12).")
w.note(970, 430, "Planted trap: the glare region is flagged as unreadable, never guessed.")
w.note(1180, 240, "Every conversion step. The box-weight estimate is editable (risk R4).")
w.note(780, 600, "The fix sits right next to the evidence (principle 5).")
w.save()


# ---------------- S9: Review queue ----------------
w = Wire("S9", "review-queue", "Review queue",
         "Every flag in one list, each beside its source, each with its fix. Never blocks the matrix.")
w.shell(stage=5, tour_step=6)
w.text(20, 124, "Review queue · 9 items need a look", 20)
w.btn(20, 160, 300, "✓ Accept all high-confidence (2)", GREEN)
w.btn(340, 160, 60, "All", BLUE_D)
for i in range(5):
    w.btn(405 + i * 55, 160, 50, f"V{i + 1}")
rows = [["Kind", "Vendor", "What we found", "Source", "Confidence", "Actions"],
        ["Mapping", "V1", "“Shipper 5P Lg” → line 1", "Excel cell B9", "High", "[Accept] [Edit] [Re-map ▾]"],
        ["GST removed", "V2", "GST included on lines 3, 8; removed", "PDF p.1", "High", "[Accept] [Edit]"],
        ["Discount scope", "V2", "5% discount: all lines or 5-ply only?", "PDF p.2 footnote", "Medium",
         "[Apply to all] [Edit] [Ask vendor]"],
        ["Missing lines", "V3", "Lines 12, 14, 19 not quoted", "Word document", "—", "[Ask vendor]"],
        ["Terms", "V3", "Payment 30 days vs 60 requested", "Word ¶6", "High", "[Accept] [Ask vendor]"],
        ["Unreadable", "V4", "Glare over lines 21–22", "Photo region", "Low", "[Edit] [Ask vendor]"],
        ["Certificate", "V4", "ISO 9001 expired", "ISO-cert.pdf", "High", "[Accept] [Ask vendor]"],
        ["Freight", "V5", "“Freight extra”, no amount", "Email ¶1", "—", "[Set estimate] [Ask vendor]"],
        ["No history", "V5", "Lines 29, 30 are new; no contract price", "Contract #2025-V5", "—",
         "[Edit] [Ask vendor]"]]
conf = {"High": GREEN, "Medium": YELLOW, "Low": RED}
fills = {(r, 4): conf[row[4]] for r, row in enumerate(rows) if row[4] in conf}
w.table(20, 210, [130, 60, 280, 170, 100, 390], rows, row_h=40, fills=fills)
w.box(20, 630, 1140, 180, "Recent changes · undo any of them\n\n"
                          "• You accepted V1 mapping “Shipper 5P Lg” → line 1 · 10:42 · [Undo]\n"
                          "• You set V5 freight estimate ₹1.20 per piece · 10:40 · [Undo]", WHITE, 13, align="left")
w.next_btn("Ask V3 to fill gaps", x=880, y=836, w=280)
w.note(20, 160, "Clears the easy ones in one click (FR-4.3). Only real issues stay.")
w.note(20, 210, "Each row shows its source; clicking it opens the source drawer (S8).")
w.note(20, 370, "Ask vendor collects all of a vendor's open items into one email (S10).")
w.note(20, 630, "Every manual change is logged and can be undone (FR-4.13).")
w.save()


# ---------------- S10: Clarification composer ----------------
w = Wire("S10", "clarification", "Clarification email composer",
         "Opened from Ask vendor (matrix, review queue or vendor profile). The closed loop, Improvement A.")
w.shell(stage=5, tour_step=6)
w.box(20, 120, 1140, 700, "Review queue (dimmed)", GRAY, 16, style="dashed")
w.box(120, 150, 940, 640, "", WHITE, sw=2)
w.text(140, 166, "Ask vendor for clarification", 20)
w.text(140, 206, "Vendors with open items", 13, MUTED)
for i, t in enumerate(["V3 · 2 open", "V5 · 2 open", "V4 · 2 open", "V2 · 1 open"]):
    w.box(140, 230 + i * 52, 200, 44, t, BLUE_D if i == 0 else WHITE, 13)
w.box(360, 206, 680, 380, "To: sales@vendor3.example\nSubject: RFQ-2026-014 · two items to complete your quote\n\n"
                          "Dear Vendor 3,\nThank you for your quote. To include it fully in our evaluation, please:\n"
                          "1. Quote lines 12, 14 and 19, which were missing.\n"
                          "2. Confirm whether you can offer 60-day payment terms (you quoted 30).\n\n"
                          "Reply directly to this email and we will update your quote automatically.\nRegards, Pavan",
      WHITE, 13, align="left")
w.text(360, 600, "Included:   ☑ Missing lines 12, 14, 19     ☑ Payment terms 30 vs 60 days", 13)
w.btn(720, 636, 120, "Cancel")
w.box(860, 630, 180, 46, "Send (simulated)", NEXT, 15, sw=3)
w.box(140, 700, 900, 76, "After sending: V3's status becomes Clarification requested. Its seeded reply lands in the "
                         "inbox, is read automatically, and only the 3 missing cells fill in, badged "
                         "[Updated from clarification, Day 11].", ORANGE, 13, align="left")
w.note(360, 206, "One consolidated email per vendor, drafted from its open items (FR-4.7). Fully editable.")
w.note(140, 230, "Pick another vendor to draft its email. V5's covers the freight amount and the 2 new lines.")
w.note(360, 600, "Untick an item to leave it out.")
w.note(860, 630, "Simulated send. The loop closes when the reply arrives (FR-4.8); old values stay in history.")
w.save()


# ---------------- S11: Vendor profile ----------------
w = Wire("S11", "vendor-profile", "Vendor profile",
         "Opened by clicking a vendor's column header or name anywhere. Shown here: V3.")
w.shell(stage=5, tour_step=6)
w.text(20, 124, "V3 · Vendor 3", 22)
w.box(200, 120, 240, 32, "Clarification requested", ORANGE, 13)
steps = ["RFI ✓ shortlisted", "RFP ✓ proposal", "RFQ sent Day 0", "Replied Day 5", "Clarification asked Day 9",
         "Reply Day 11"]
ids = [w.box(20 + i * 190, 170, 170, 40, t, GREEN if i < 5 else WHITE, 12, style="solid" if i < 5 else "dashed")
       for i, t in enumerate(steps)]
for p, q in zip(ids, ids[1:]):
    w.s.arrow(p, q)
w.box(20, 230, 540, 150, "RFP summary\nSupplies both plants from one unit, 140 km from Plant 1. In-house BCT testing "
                         "on request. Offers 2 weeks' buffer stock at its warehouse.", WHITE, 13, align="left")
w.box(20, 395, 540, 200, "Commercial terms\nPayment: 30 days ⚠ (requested 60)\nQuote validity: 60 days\n"
                         "Lead time: 10 days\nFreight: included to both plants", WHITE, 13, align="left")
w.box(20, 610, 540, 200, "Replies and files\n• Day 5 · quote.docx (Word) · 27 of 30 lines\n"
                         "• Day 9 · clarification sent\n• Day 11 · reply email · 3 lines, 60-day terms",
      WHITE, 13, align="left")
rows = [["Questionnaire · Fail 58% (rule: ≥ 70%)", "Answer", "Result"],
        ["ISO 9001 certificate", "Valid to 2027-05", "✓ Pass"],
        ["FSC certified", "No", "—"],
        ["BCT test reports", "Not provided", "✕ Fail"],
        ["Monthly capacity", "2.5 L boxes", "—"],
        ["Quality incidents (12 months)", "3", "—"],
        ["… 6 more", "", ""]]
w.table(580, 230, [300, 150, 130], rows, fills={(1, 2): GREEN, (3, 2): RED})
w.box(580, 470, 580, 100, "Certificates\nISO 9001 · valid to 2027-05 ✓\nFSC · none", WHITE, 13, align="left")
w.box(580, 585, 580, 140, "Open items (2)\n• Lines 12, 14, 19 missing\n• Payment terms 30 vs 60 days",
      YELLOW, 13, align="left")
w.btn(1000, 740, 160, "✉ Ask vendor")
w.next_btn("Back to comparison", x=620)
w.note(20, 170, "Status timeline for this vendor across the whole lifecycle.")
w.note(580, 230, "Pass or fail against the rules locked before sending (FR-4.6).")
w.note(580, 585, "The same open items and Ask vendor action as in the matrix and review queue.")
w.save()


# ---------------- S12: Award memo ----------------
w = Wire("S12", "award-memo", "Award memo",
         "Generated from a saved scenario with Recommend award. All figures in these wireframes are illustrative.")
w.shell(stage=7, tour_step=9)
w.box(20, 120, 1140, 700, "", WHITE, sw=2)
w.text(50, 136, "Award recommendation · RFx-2026-014 Corrugated packaging", 22)
w.text(50, 170, "Prepared by Pavan · Day 11 · Scenario: “Split by line, passing vendors, combined volumes”", 13, MUTED)
w.btn(850, 164, 130, "⬇ PDF (later)", style="dashed", h=30)
w.btn(990, 164, 150, "🔗 Share (later)", style="dashed", h=30)
for i, t in enumerate(["Total award value\n₹1.16 Cr per year", "Saving vs last year\n₹9.4 L (7.5%)",
                       "Saving vs cheapest single vendor\n₹8.0 L"]):
    w.box(50 + i * 365, 206, 345, 80, t, GREEN if i == 0 else WHITE, 15)
rows = [["Vendor", "Lines awarded", "Annual value", "Share"],
        ["V2", "1, 4, 7, 9 … (14 lines)", "₹0.58 Cr", "50%"],
        ["V5", "2, 3, 12 … (10 lines)", "₹0.37 Cr", "32%"],
        ["V1", "5, 6, 29 … (6 lines)", "₹0.21 Cr", "18%"],
        ["V3, V4", "None: V3 failed the questionnaire; V4's ISO 9001 expired", "—", "—"]]
w.table(50, 300, [180, 500, 200, 200], rows)
w.box(50, 480, 530, 190, "Why this award\nCheapest valid price on each line among vendors that passed the "
                         "questionnaire. Combining both plants' volumes moves V2 into its higher tier on 6 lines.\n\n"
                         "(The AI writes these sentences; every figure comes from the calculation.)",
      WHITE, 13, align="left")
w.box(600, 480, 530, 190, "Evaluation rules used (locked Day 0, 10:01)\nPass: valid ISO 9001, BCT reports, score ≥ 70%\n"
                          "Basis: ₹ per piece, before GST, delivered, 1 USD = ₹84.00, tier by volume",
      BLUE, 13, align="left")
w.box(50, 690, 1080, 110, "Risks and assumptions\n• V5 freight is a buyer estimate (₹1.20 per piece), not quoted\n"
                          "• Per-kg prices converted with estimated box weights\n"
                          "• V4 excluded: ISO 9001 expired · no open flags on awarded lines", YELLOW, 13, align="left")
w.next_btn("Replay the demo (Reset)", y=836)
w.note(50, 206, "Every ₹ figure is clickable to its source (FR-6.2), for the CFO's audit.")
w.note(50, 480, "AI writes only the connecting sentences; code supplies every number and checks them.")
w.note(600, 480, "The rules locked before sending, quoted back.")
w.note(50, 690, "Risks: estimates used, open flags, expired certificates.")
w.note(1052, 64, "Award is done; PO hand-off shows as the next stage, on the roadmap (FR-6.3).")
w.note(850, 164, "PDF download and a read-only share link are should-haves (dashed).")
w.save()


# ---------------- Screen flow map ----------------
s = Scene()
s.text(0, 0, "Screen flow: how S1–S12 connect", 32)
s.text(0, 46, "Solid arrows = the demo path (guided tour). Dashed = side trips that return to where you were.", 16, MUTED)
pos = {"S1": (0, 140), "S2": (260, 140), "S3": (520, 140), "S4": (780, 140), "S5": (1040, 140),
       "S6": (1040, 360), "S7": (780, 360), "S8": (520, 360), "S9": (780, 580), "S10": (1040, 580),
       "S11": (520, 580), "S12": (260, 360)}
names = {"S1": "Landing + sign up", "S2": "Workspace frame", "S3": "Context: Need / RFI / RFP",
         "S4": "RFQ draft + rules", "S5": "Send", "S6": "Inbox + upload", "S7": "Matrix + Ask panel",
         "S8": "Source drawer", "S9": "Review queue", "S10": "Clarification email", "S11": "Vendor profile",
         "S12": "Award memo"}
ids = {k: s.box(x, y, 220, 100, f"{k}\n{names[k]}", BLUE_D if k == "S7" else WHITE, 15, sw=2)
       for k, (x, y) in pos.items()}
for a, b, label in [("S1", "S2", "sign up"), ("S2", "S3", "read request"), ("S3", "S4", "draft"),
                    ("S4", "S5", "lock & send"), ("S5", "S6", "fast-forward"), ("S6", "S7", "open comparison"),
                    ("S7", "S9", "review"), ("S9", "S10", "ask vendor"), ("S7", "S12", "recommend award")]:
    s.arrow(ids[a], ids[b], label)
for a, b, label in [("S7", "S8", "click a number"), ("S10", "S6", "reply arrives"),
                    ("S7", "S11", "click vendor"), ("S11", "S10", "ask vendor")]:
    s.arrow(ids[a], ids[b], label, style="dashed")
s.save(os.path.join(OUT, "wire-00-screen-flow.excalidraw"))
