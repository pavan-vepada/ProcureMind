"""Phase 4 wireframes: one .excalidraw file per screen (S1–S12) plus a screen-flow map."""
import os
import random
import sys

from excal import Scene, text_height, MUTED

random.seed(11)
OUT = sys.argv[1]

W, H = 1440, 900          # screen frame
OY = 100                  # frame top (title + subtitle sit above it)
NOTE_X = W + 60           # sticky-note column to the right of the frame

# Palette: calm neutrals, soft tints for meaning, one energetic accent for the next action.
INK = "#1f2328"
LINE = "#d0d7de"          # hairline borders
SURFACE = "#ffffff"
PANEL = "#f6f8fa"         # top bar, side panels, table headers
ACCENT = "#4f46e5"        # the one highlighted next action, progress, current stage
ACCENT_SOFT = "#eef2ff"   # selected tab / item, current stage, the user's own questions
OK = "#e6f6ec"            # done, cheapest valid, pass
WARN = "#fff4d6"          # needs a look
BAD = "#fde8e8"           # missing, fails
INFO = "#e8f1fd"          # from contract, information
EST = "#f1ecfd"           # estimate, AI at work
CLAR = "#e3f6f5"          # updated from clarification
PHOTO = "#eceff3"
RED_INK = "#e03131"       # bounding box on a photo
NOTE = "#fff9db"          # annotation sticky notes (not part of the UI)
MARK = "#f76707"          # annotation markers (not part of the UI)
WHITE_INK = "#ffffff"

STAGES = ["Need", "RFI", "RFP", "RFQ", "Replies", "Analysis", "Award", "PO"]
TOUR = ["See the request", "Draft the RFQ", "Lock rules & send", "Fast-forward 9 days",
        "Compare quotes", "Check a source", "Ask a vendor", "Ask a what-if",
        "Combine volumes", "Recommend award"]


class Wire:
    def __init__(self, slug, title, subtitle):
        self.s = Scene()
        self.file = f"wire-{slug}.excalidraw"
        self.n = 0
        self.notes = []
        self.s.text(0, 0, title, 32, INK)
        self.s.text(0, 46, subtitle, 16, MUTED)
        self.s.box(0, OY, W, H, "", SURFACE, stroke=LINE, rough=0)

    # all coordinates below are relative to the frame's top-left corner
    def box(self, x, y, w, h, text="", bg=SURFACE, size=13, **kw):
        kw.setdefault("stroke", LINE)
        kw.setdefault("rough", 0)
        kw.setdefault("color", INK)
        return self.s.box(x, OY + y, w, h, text, bg, size, **kw)

    def text(self, x, y, text, size=13, color=INK):
        return self.s.text(x, OY + y, text, size, color)

    def btn(self, x, y, w, text, bg=SURFACE, h=34, **kw):
        return self.box(x, y, w, h, text, bg, 13, **kw)

    def primary(self, x, y, w, text, h=46, size=15):
        """The energetic button: only ever one per screen."""
        return self.box(x, y, w, h, text, ACCENT, size, stroke=ACCENT, color=WHITE_INK)

    def next_btn(self, label, x=900, y=836, w=260):
        return self.primary(x, y, w, label + "  →")

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
                bg = PANEL if r == 0 else fills.get((r, c), SURFACE)
                self.box(cx, y + r * row_h, wd, row_h, cell, bg, size, align="left")
                cx += wd
        return y + len(rows) * row_h

    def note(self, x, y, text):
        """Numbered marker on the screen plus a matching sticky note beside the frame."""
        self.n += 1
        self.box(x - 14, y - 14, 28, 28, str(self.n), MARK, 13, shape="ellipse",
                 stroke=MARK, color=WHITE_INK)
        self.notes.append(f"{self.n}. {text}")

    def progress(self, x, y, w, p):
        self.box(x, y, w, 8, "", PANEL)
        self.box(x, y, w * p, 8, "", ACCENT, stroke=ACCENT)

    def shell(self, stage, tour_step, view=None, tour_open=True):
        """The S2 frame around every workspace screen: top bar, lifecycle strip, guided tour."""
        self.box(0, 0, W, 52, "", PANEL)
        self.text(20, 14, "Procure Mind V2.0", 20)
        self.text(260, 17, "RFx-2026-014 · Corrugated packaging for both plants · "
                           "Sunrise Consumer Goods", 14, MUTED)
        self.btn(1110, 9, 110, "↺ Reset demo")
        self.btn(1230, 9, 190, "Pavan ▾  (log out)")
        for i, name in enumerate(STAGES):
            if i < stage:
                bg, label, kw = OK, f"{name} ✓", {}
            elif i == stage:
                bg, label, kw = ACCENT_SOFT, f"● {name}", {"stroke": ACCENT, "sw": 2}
            else:
                bg, label, kw = SURFACE, name, {"style": "dashed"}
            if name == "PO":
                label += " (roadmap)"
            if i == view:
                label += " · viewing"
                kw.update(stroke=INK, sw=2)
            self.box(20 + i * 172, 64, 165, 40, label, bg, 14, **kw)
        if not tour_open:
            self.box(1392, 120, 44, 160, "Tour ▸", PANEL, 12)
            return
        self.box(1180, 120, 240, 700, "", PANEL)
        self.text(1194, 132, f"Guided tour · {tour_step + 1} of 10", 14)
        self.text(1194, 154, "Hide ✕", 12, MUTED)
        for i, step in enumerate(TOUR):
            mark = "✓" if i < tour_step else ("▶" if i == tour_step else "○")
            kw = {"stroke": ACCENT, "sw": 2} if i == tour_step else {}
            self.box(1194, 186 + i * 52, 212, 42, f"{mark} {i + 1}. {step}",
                     ACCENT_SOFT if i == tour_step else SURFACE, 13, align="left", **kw)

    def save(self):
        self.s.text(NOTE_X, OY - 30, "Notes", 20, INK)
        y = OY
        for t in self.notes:
            h = text_height(t, 380, 14) + 24
            self.s.box(NOTE_X, y, 380, h, t, NOTE, 14, align="left", stroke=LINE, rough=0)
            y += h + 12
        self.s.save(os.path.join(OUT, self.file))


# ---------------- S1: Landing + sign up ----------------
w = Wire("01-landing", "S1 · Landing + sign up / log in",
         "The public link. First thing a reviewer sees (J1, J2).")
w.box(0, 0, W, 52, "", PANEL)
w.text(20, 14, "Procure Mind V2.0", 20)
w.btn(1300, 9, 120, "Log in")
w.text(80, 130, "Kill the quote spreadsheet.", 40)
w.text(80, 190, "An AI co-pilot drafts your RFQ, reads whatever vendors send back,\n"
                "and turns it into one comparison you can question, all the way to an award memo.", 18, MUTED)
a = w.box(80, 300, 220, 150, "1. Vendors reply any way they like\nExcel · PDF · Word · phone photo · email", INFO, 14)
b = w.box(360, 300, 220, 150, "2. One comparison\nEvery number converted and traced to its source", OK, 14)
c = w.box(640, 300, 220, 150, "3. Ask and award\nWhat-ifs in plain words, then a defensible memo", EST, 14)
w.s.arrow(a, b, color=MUTED)
w.s.arrow(b, c, color=MUTED)
w.text(80, 490, "Try it on a ready-made demo: 5 vendors, 30 box sizes, every messy format.", 15, MUTED)
w.box(960, 120, 400, 520, "", SURFACE)
w.text(990, 145, "Create your account", 22)
w.btn(990, 200, 340, "G   Continue with Google", h=44)
w.text(1150, 262, "or", 13, MUTED)
w.box(990, 290, 340, 40, "Email", SURFACE, 13, align="left")
w.box(990, 345, 340, 40, "Password", SURFACE, 13, align="left")
w.primary(990, 410, 340, "Sign up and open the demo", h=50)
w.text(990, 480, "Already have an account? Log in", 13, MUTED)
w.text(990, 510, "No email verification. You land inside\nyour own copy of the demo.", 12, MUTED)
w.note(80, 130, "The pitch is readable in 5 seconds (J2-1): one line plus a 3-step picture.")
w.note(990, 200, "Google one-click, or email + password on the same screen (FR-0.2). No verification email in the demo.")
w.note(990, 410, "The only highlighted button. After sign-up the server copies the demo data into this account and opens S2 (FR-0.4).")
w.note(1300, 9, "Returning users log in and land exactly where they left off (FR-0.7).")
w.save()


# ---------------- S2: RFx workspace (the frame) ----------------
w = Wire("02-workspace", "S2 · RFx workspace: the frame around every screen",
         "What a new user sees right after sign-up. The top bar, strip, tour and next button wrap S3–S12.")
w.shell(stage=3, tour_step=0)
w.box(20, 120, 1140, 96, "", SURFACE)
w.text(40, 134, "Welcome, Pavan. This is your own copy of the demo RFx.", 20)
w.text(40, 168, "Plant Operations needs new shipper boxes for both plants. Follow the tour on the right, "
                "or click the highlighted button\nat the bottom of each screen.", 14, MUTED)
for i, t in enumerate(["Stage\nRFQ, not drafted yet", "Vendors\n5 shortlisted from 12 (RFI)",
                       "Line items\n30 to be drafted", "Replies\n0 of 5 · due Day 7"]):
    w.box(20 + i * 290, 236, 270, 90, t, ACCENT_SOFT if i == 0 else SURFACE, 15)
w.box(20, 350, 700, 300, "Activity\n\n• Day −30 · Internal request from Plant Operations\n"
                         "• RFI: 12 vendors asked, 5 shortlisted\n• RFP: 5 proposals summarised\n"
                         "• Next: read the request, then draft the RFQ with the co-pilot", SURFACE, 14, align="left")
w.box(740, 350, 420, 300, "Your demo copy\n\nEverything you do here is private to your account and saved as you go.\n\n"
                          "↺ Reset demo puts it back to the start so you can replay the story.", INFO, 14, align="left")
w.next_btn("Read the internal request")
w.note(240, 14, "This frame (top bar, lifecycle strip, tour, next button) wraps every screen S3–S12.")
w.note(20, 64, "Lifecycle strip (FR-1.1): green = done, indigo = where the RFx is now, dashed = later. "
               "Every chip is clickable. Need, RFI and RFP start done because they are seeded context.")
w.note(1180, 120, "Guided tour (FR-0.6): one step at a time, each pointing at exactly one control. "
                  "Can be hidden and picked up again.")
w.note(900, 836, "One energetic next-action button on every screen (principle 2). Its label follows the story.")
w.note(1110, 9, "Reset demo (FR-0.5): asks 'Start over?', then restores the starting data.")
w.save()


# ---------------- S3: Context ----------------
w = Wire("03-context", "S3 · Context: internal request, RFI results, RFP summaries",
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
fills = {(r, 5): OK for r in range(1, 6)}
w.table(20, 160, [40, 200, 90, 70, 150, 120, 460], rows, fills=fills)
w.text(20, 424, "… 5 more vendors, not shortlisted", 13, MUTED)
w.box(20, 470, 550, 330, "When you click Need on the strip\n\nInternal request email\nFrom: Plant Operations · Day −30\n"
                         "“We need new shipper boxes and inner packaging for both plants, starting next quarter…”\n\n"
                         "Annual volumes per plant attached", SURFACE, 13, align="left", style="dashed")
w.box(590, 470, 570, 330, "When you click RFP on the strip\n\nOne card per shortlisted vendor:\n"
                          "V1 · how they will supply two plants, quality testing, buffer stock (one paragraph)\n"
                          "V2 …   V3 …   V4 …   V5 …\n\nEach card links to the vendor profile (S11)",
      SURFACE, 13, align="left", style="dashed")
w.next_btn("Draft RFQ with co-pilot")
w.note(20, 124, "Seeded and read-only (FR-1.2). The co-pilot reads all of it to draft the RFQ.")
w.note(192, 64, "The chip being viewed gets a dark outline; the indigo chip still shows where the RFx really is.")
w.note(20, 470, "Need and RFP use the same page layout with different content; the strip is the navigation.")
w.save()


# ---------------- S4: RFQ draft ----------------
w = Wire("04-rfq-draft", "S4 · RFQ draft (co-pilot) with the evaluation-rules panel",
         "The co-pilot drafts 30 lines, the questionnaire and terms. The buyer edits, locks the rules, sends.")
w.shell(stage=3, tour_step=1)
w.text(20, 124, "RFQ draft", 20)
w.box(150, 120, 330, 32, "✦ Co-pilot drafting… 18 of 30 lines", EST, 13)
w.progress(150, 156, 330, 0.6)
w.btn(20, 166, 150, "Line items (30)", ACCENT_SOFT)
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
w.table(20, 210, [36, 250, 44, 54, 44, 50, 130, 80, 80], rows, fills={(2, 7): WARN})
w.text(20, 506, "+ 22 more lines", 13, MUTED)
w.btn(20, 540, 150, "⬇ RFQ PDF")
w.btn(180, 540, 220, "⬇ Excel response template")
w.box(20, 600, 768, 200, "Terms (drafted)\nPayment 60 days · Delivery to Plant 1 and Plant 2, freight paid to plant · "
                         "Quote valid 90 days · Response due Day 7\n\nQuestionnaire (12)\nISO 9001 certificate · FSC · "
                         "BCT/ECT test reports · monthly capacity · lead time · quality incidents (last 12 months) …",
      SURFACE, 13, align="left")
w.box(810, 120, 350, 540, "", PANEL)
w.text(826, 132, "Evaluation rules", 18)
w.text(826, 158, "Locked before sending. Quoted in the award memo.", 12, MUTED)
w.box(826, 190, 318, 150, "Questionnaire pass rules\n☑ Valid ISO 9001 certificate\n☑ BCT test reports provided\n"
                          "☑ Score ≥ 70%", SURFACE, 13, align="left")
w.box(826, 355, 318, 200, "Comparison basis\n• ₹ per piece\n• Before GST\n• Delivered to each plant\n"
                          "• 1 USD = ₹84.00, as of today ✎\n• Price tier = each plant's own volume",
      SURFACE, 13, align="left")
w.box(826, 570, 318, 70, "🔓 Not locked yet", SURFACE, 14)
w.next_btn("Lock rules & send")
w.note(150, 120, "The draft streams in line by line (principle 4). If the AI is down, a prepared draft appears, "
                 "labelled 'Prepared draft (AI unavailable)'.")
w.note(628, 274, "Click any cell to edit it in place (FR-1.4).")
w.note(810, 120, "Lock rules & send freezes these rules with a timestamp (FR-1.7), so nobody can say the "
                 "goalposts moved after prices were seen.")
w.note(20, 540, "The documents vendors receive (FR-1.8).")
w.save()


# ---------------- S5: Send ----------------
w = Wire("05-send", "S5 · Send: the 5 outgoing emails and vendor statuses",
         "Right after Lock rules & send. Sending is simulated inside the app.")
w.shell(stage=4, tour_step=3)
w.box(20, 120, 1140, 44, "✓ Rules locked Day 0, 10:01 · RFQ sent to 5 vendors (simulated email) · Replies due Day 7",
      OK, 14)
w.text(20, 182, "Outgoing emails", 16)
for i in range(5):
    w.box(20, 210 + i * 70, 380, 60, f"To: V{i + 1} · sales@vendor{i + 1}.example\n"
                                     "RFQ-2026-014 · 2 attachments · Sent ✓",
          ACCENT_SOFT if i == 0 else SURFACE, 13, align="left")
w.box(420, 182, 740, 420, "To: sales@vendor1.example\nSubject: RFQ-2026-014 · Corrugated packaging for both plants, "
                          "quote by Day 7\n\nDear Vendor 1,\nPlease quote for the 30 items in the attached RFQ. You can "
                          "use the Excel template, or reply in any format you prefer.\n…\n"
                          "Regards, Pavan · Sunrise Consumer Goods\n\n📎 RFQ-2026-014.pdf    📎 Response-template.xlsx",
      SURFACE, 13, align="left")
rows = [["Vendor", "Status", "Sent", "Reply"]] + [[f"V{i}", "Sent", "Day 0, 10:02", "—"] for i in range(1, 6)]
w.table(420, 620, [150, 150, 200, 240], rows, row_h=28)
w.next_btn("Fast-forward 9 days")
w.note(20, 120, "Simulated send (D3, risk R6): nothing leaves the app.")
w.note(420, 182, "Each vendor gets the RFQ PDF and the Excel template, and is told any format is fine.")
w.note(420, 620, "Vendor status moves Sent → Replied → Clarification requested.")
w.note(900, 836, "Jumps the demo clock 9 days and drops the 5 seeded replies into the inbox (FR-2.2).")
w.save()


# ---------------- S6: Inbox ----------------
w = Wire("06-inbox", "S6 · Inbox: replies, live progress per vendor, upload a reply",
         "After Fast-forward. Every reply starts processing on its own, all five at once.")
w.shell(stage=4, tour_step=3)
w.box(20, 120, 1140, 44, "⏩ Fast-forwarded to Day 9 · 5 replies received · reading them now", INFO, 14)
cards = [("V1", "Excel", 2, "", "✓ Done · 30 of 30 lines found", 1.0, OK),
         ("V2", "PDF", 4, "", "Converting… USD → ₹, applying tiers (22 of 30)", 0.75, SURFACE),
         ("V3", "Word", 5, "", "Matching lines… 27 of 30 found", 0.6, SURFACE),
         ("V4", "Photo", 6, "", "Reading the photo… 1 region hard to read", 0.35, SURFACE),
         ("V5", "Email text", 9, "  · LATE", "Finding prices… looking up last year's contract", 0.2, SURFACE)]
for i, (v, fmt, day, late, prog, p, bg) in enumerate(cards):
    y = 180 + i * 102
    w.box(20, y, 720, 92, f"{v} · {fmt} · arrived Day {day}{late}\n{prog}", bg, 14, align="left")
    w.progress(560, y + 62, 160, p)
w.box(20, 690, 720, 92, "Unknown sender · quotes@newbox.example · Day 8\nWho is this from?  [ Pick a vendor ▾ ]",
      WARN, 14, align="left", style="dashed")
w.box(760, 180, 400, 260, "⬆ Upload a reply\n\nDrag a file here, or paste email text\nExcel · PDF · Word · image\n\n"
                          "From vendor: [ V1 ▾ ]\n\nUp to 10 MB per file · 20 files per account",
      SURFACE, 14, style="dashed")
w.box(760, 460, 400, 140, "Example: a reply that failed\n✕ V4 photo: too blurry to read the prices\n\n"
                          "[ Retry ]  [ Upload a clearer file ]  [ Ask vendor ]", BAD, 13, align="left")
w.box(760, 620, 400, 100, "Presenter-only fallback\nBanner at the top: “Showing saved run” when the AI is slow "
                          "on demo day", INFO, 13, align="left", style="dashed")
w.next_btn("Open comparison")
w.note(20, 180, "Processing starts when a reply lands (FR-3.1). Each card says what it is doing, in plain words, "
                "with counts (FR-3.2). No bare spinners.")
w.note(20, 588, "Replies after the due date get a LATE badge (FR-2.5, should-have).")
w.note(20, 690, "Unknown sender: the buyer picks the vendor (FR-2.3, should-have).")
w.note(760, 180, "Reviewers can test their own file here (FR-2.4). Unusual files (too big, password-protected, "
                 "not a quote) get a plain message with the limits.")
w.note(760, 460, "One failed file never stops the others, and always offers a fix (FR-3.11).")
w.note(760, 620, "If the AI is slow on the day, the presenter can switch to the saved run; the app says so (J5).")
w.note(900, 836, "Enabled as soon as the first vendor is done; the matrix fills in as the others finish (FR-4.2).")
w.save()


# ---------------- S7: Comparison matrix + Ask panel ----------------
LEGEND = [("Cheapest valid", OK, 120), ("Needs a look", WARN, 115), ("Missing / fails", BAD, 125),
          ("From contract", INFO, 120), ("Estimate", EST, 90), ("Updated from clarification", CLAR, 200)]


def legend(w, x, y):
    w.text(x, y + 8, "Legend:", 13)
    x += 60
    for label, col, wd in LEGEND:
        w.box(x, y, wd, 30, label, col, 12)
        x += wd + 8


w = Wire("07-matrix", "S7 · Comparison matrix with the Ask panel, badge legend and assumptions",
         "The heart of the product. The tour shrinks to a tab to make room for the Ask panel.")
w.shell(stage=5, tour_step=4, tour_open=False)
w.btn(20, 120, 120, "Normalized", ACCENT_SOFT)
w.btn(140, 120, 110, "As quoted")
w.btn(270, 120, 250, "⚠ 9 items need a look → Review", WARN)
w.box(20, 164, 1040, 40, "Assumptions:   1 USD = ₹84.00 ✎    ·    V5 freight estimate ₹1.20 per piece ✎    ·    "
                         "Box weights from specs (estimate) ✎", PANEL, 13, align="left")
legend(w, 20, 214)
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
fills = {(1, 5): WARN, (1, 6): WARN, (1, 7): WARN, (3, 5): BAD, (3, 6): BAD, (4, 5): WARN,
         (5, 7): OK, (5, 6): EST, (6, 3): OK, (6, 6): EST, (6, 7): EST,
         (7, 7): OK, (7, 6): WARN, (8, 4): OK, (8, 5): BAD, (8, 6): EST, (8, 7): INFO,
         (9, 4): OK, (9, 6): EST, (9, 7): BAD}
w.table(20, 256, [32, 206, 92, 142, 142, 142, 142, 142], rows, row_h=36, size=11, fills=fills)
w.text(20, 624, "… 25 more lines (scroll).  * total excludes missing lines", 12, MUTED)
w.box(20, 656, 640, 110, "Hovering V1 · line 2 shows its conversion chain:\n"
                         "₹1,850 per box → 1 box = 100 pieces → ₹18.50 per piece → no discount → freight included "
                         "→ ₹18.50 delivered, before GST", SURFACE, 12, align="left", stroke=INK)
w.box(1070, 120, 310, 700, "", PANEL)
w.text(1084, 132, "Ask about these quotes", 16)
for i, q in enumerate(["Split award: cheapest per line, only vendors who passed the questionnaire",
                       "What if we combine both plants' volumes?",
                       "What if V1 matches the lowest 5-ply prices?",
                       "Which vendors still have open issues?"]):
    w.box(1084, 166 + i * 50, 282, 44, q, SURFACE, 12)
w.box(1140, 376, 226, 44, "Split award… passed the questionnaire", ACCENT_SOFT, 12)
w.box(1084, 430, 282, 200, "Award by line to V2, V5 and V1. V3 fails the questionnaire; V4 fails the ISO rule.\n"
                           "Total ₹1.19 Cr, ₹5.0 L below the cheapest single vendor.\n\n[ table: vendor · lines · value ]",
      SURFACE, 12, align="left")
w.btn(1084, 640, 140, "Save as scenario")
w.btn(1230, 640, 136, "Show working ▾")
w.box(1084, 760, 282, 44, "Type a question (optional)", SURFACE, 12, align="left")
w.next_btn("Review 9 items", x=780)
w.note(20, 120, "Switch between normalized and as-quoted values (FR-4.4).")
w.note(270, 120, "Flags sit on the matrix and never block it (principle 3). The count opens the review queue (S9).")
w.note(20, 164, "Change an assumption once and every number, total and answer updates (FR-4.5).")
w.note(80, 214, "The badge legend is always visible (FR-4.12).")
w.note(20, 292, "Vendor summary rows: lines quoted, total, questionnaire result, terms (FR-4.1, FR-4.6).")
w.note(20, 656, "Hover any cell for its conversion chain; click it to open the source drawer (S8).")
w.note(1070, 120, "Ask panel beside the matrix (FR-5.1). Chips mean no typing (principle 8). The second state of "
                  "this panel (follow-ups, working, scenarios, award) is S7b.")
w.note(1392, 120, "The tour shrinks to a tab on this screen.")
w.save()


# ---------------- S7b: Ask panel, scenarios and award (second state of S7) ----------------
w = Wire("07b-ask-and-award", "S7b · Matrix, second state: what-ifs, scenarios and Recommend award",
         "Later in the story: V3's clarification has landed, the buyer asks follow-ups and saves scenarios (J1-9, J3-8, J4).")
w.shell(stage=5, tour_step=8, tour_open=False)
legend(w, 20, 120)
rows = [["#", "Line item", "V1", "V2", "V3", "V4", "V5"],
        ["", "Lines quoted", "30 / 30", "30 / 30", "30 / 30 ✓", "28 / 30", "30 / 30"],
        ["", "Payment", "60 d", "60 d", "60 d ✓", "45 d", "60 d"],
        ["12", "Die-cut tray 3-ply", "₹11.30", "₹10.95", "₹11.60 updated Day 11", "₹12.40 est.", "₹11.80"],
        ["14", "Die-cut tray 5-ply", "₹15.20", "₹14.70", "₹15.05 updated Day 11", "₹16.10 est.", "₹15.40"],
        ["19", "RSC shipper, slim 5-ply", "₹22.40", "₹21.90", "₹22.10 updated Day 11", "₹23.30 est.", "₹22.80"]]
fills = {(1, 4): CLAR, (2, 4): CLAR, (3, 4): CLAR, (4, 4): CLAR, (5, 4): CLAR,
         (3, 3): OK, (4, 3): OK, (5, 3): OK, (3, 5): EST, (4, 5): EST, (5, 5): EST}
w.table(20, 166, [30, 170, 84, 84, 104, 84, 84], rows, row_h=40, size=11, fills=fills)
w.box(20, 420, 640, 110, "V3's clarification reply (Day 11) filled lines 12, 14, 19 and accepted 60-day terms. "
                         "Only those cells changed; the old values stay in each cell's History.\n"
                         "If anything were still open, Ask vendor would draft a follow-up listing only what remains.",
      CLAR, 13, align="left")
w.text(20, 556, "Saved scenarios", 16)
w.box(20, 590, 410, 60, "① Split, passing vendors\n₹1.19 Cr · saved 11:02", SURFACE, 13, align="left")
w.btn(440, 603, 220, "Recommend award")
w.box(20, 660, 410, 60, "② Split, passing vendors, combined volumes\n₹1.16 Cr · saved 11:05",
      ACCENT_SOFT, 13, align="left")
w.primary(440, 670, 220, "Recommend award  →", h=40, size=14)

w.box(680, 120, 700, 700, "", PANEL)
w.text(696, 132, "Ask about these quotes", 16)
w.box(980, 164, 384, 34, "Split award: cheapest per line, only passing vendors", ACCENT_SOFT, 12)
w.box(696, 206, 668, 200, "Award by line to V2, V5 and V1. Total ₹1.19 Cr, ₹5.0 L below the cheapest single vendor.\n\n"
                          "Show working ▴\n"
                          "Data used: 30 lines × 5 vendors, normalized values\n"
                          "Filter: questionnaire rules locked Day 0 → V3 (score 58%) and V4 (ISO expired) left out\n"
                          "Rule: for each line, lowest ₹ per piece delivered among V1, V2, V5\n"
                          "Formula: Σ (Plant 1 qty + Plant 2 qty) × chosen price\n"
                          "[ Saved as scenario ① ✓ ]", SURFACE, 12, align="left")
w.box(980, 416, 384, 34, "What if we combine both plants' volumes?", ACCENT_SOFT, 12)
w.box(696, 458, 668, 130, "Combined volumes move V2 into its higher price tier on 6 lines.\n"
                          "Total ₹1.16 Cr, ₹3.0 L less than the previous answer.\n"
                          "[ table: line · before · after · tier ]      [ Show working ▾ ]   [ Saved as scenario ② ✓ ]",
      SURFACE, 12, align="left")
w.box(980, 598, 384, 34, "Now leave out the expensive one", ACCENT_SOFT, 12)
w.box(696, 640, 668, 96, "Which vendor do you mean?", SURFACE, 12, align="left")
w.btn(712, 690, 300, "V1 · highest total among passing")
w.btn(1022, 690, 326, "V5 · highest price on 5-ply lines")
w.box(696, 752, 668, 44, "Type a question (optional)", SURFACE, 12, align="left")
w.note(20, 166, "J3 closed: V3's three missing cells and its terms update in place with the teal "
                "'Updated from clarification' badge (FR-4.8).")
w.note(696, 206, "Show working, opened: data, filters, rule and formula (FR-5.5). Every ₹ in an answer is "
                 "clickable to its source (FR-5.4).")
w.note(696, 458, "Follow-up keeps context and compares with the previous answer (FR-5.3, FR-4.10 tiers, J4-5).")
w.note(696, 640, "Ambiguous question: one short clarifying question with clickable choices, never a guess (FR-5.6).")
w.note(20, 556, "Saved scenarios with Recommend award on each (FR-5.7, FR-6.1). The latest one carries the "
                "energetic button; it opens the memo (S12).")
w.save()


# ---------------- S8: Source drawer ----------------
w = Wire("08-source-drawer", "S8 · Source drawer (slides over the matrix)",
         "Opened by clicking any number. Shown here: V4's price, read from an angled phone photo.")
w.shell(stage=5, tour_step=5, tour_open=False)
w.box(20, 120, 700, 700, "Comparison matrix (dimmed behind the drawer)", PANEL, 16, style="dashed")
w.box(740, 120, 640, 700, "", SURFACE, stroke=INK)
w.text(760, 132, "V4 · Line 2 · RSC shipper, medium 5-ply", 16)
w.text(760, 158, "₹21.78 per piece · estimate · confidence: medium", 14, MUTED)
w.btn(1330, 128, 36, "✕")
w.btn(760, 188, 100, "Source", ACCENT_SOFT)
w.btn(864, 188, 120, "Conversion")
w.btn(988, 188, 90, "History")
photo = w.box(780, 240, 380, 300, "RATE CARD 2026\n\n3 Ply 300x200x150 ..... Rs 46/kg\n5 Ply 400x300x250 ..... Rs 44/kg\n"
                                  "5 Ply 500x400x300 ..... Rs 42/kg\n\n7 Ply 600x400x400 ..... Rs ██\n"
                                  "Pads / sheets ......... Rs ██", PHOTO, 13, align="left")
w.rotate(photo, -0.06)
w.box(796, 312, 330, 30, "", "transparent", stroke=RED_INK, sw=3)
w.box(970, 430, 180, 80, "glare: unreadable", SURFACE, 12, style="dashed", stroke=RED_INK)
w.text(780, 556, "Red box: where the price was read (approximate).\nRead as: “5 Ply 400x300x250 … Rs 44/kg”", 12, MUTED)
w.box(1180, 240, 190, 300, "Conversion\n\n₹44 per kg\n× 0.495 kg box weight (estimate from GSM × board area ✎)\n"
                           "= ₹21.78 per piece\nGST: not included ✓\nFreight: included ✓", EST, 12, align="left")
w.btn(780, 600, 110, "✓ Accept")
w.btn(900, 600, 110, "✎ Edit")
w.btn(1020, 600, 140, "✉ Ask vendor")
w.text(780, 656, "Other sources open the same way:", 13)
for i, t in enumerate(["PDF (V2)\nPage 2, footnote highlighted: “*5% volume discount…”",
                       "Excel (V1)\nSheet ‘Quote’, cell D14 highlighted",
                       "Email (V5)\nPhrase highlighted: “₹42/kg for the 5-ply”"]):
    w.box(780 + i * 196, 680, 186, 120, t, SURFACE, 12, style="dashed")
w.next_btn("Close and review flags", x=420)
w.note(740, 120, "Any number in the matrix, an answer or the memo opens this drawer (FR-4.9).")
w.note(780, 240, "The vendor's actual photo with a box around where the number was read. Labelled approximate "
                 "when confidence is low (risk R12).")
w.note(970, 430, "Planted trap: the glare region is flagged as unreadable, never guessed.")
w.note(1180, 240, "Every conversion step. The box-weight estimate is editable (risk R4).")
w.note(780, 600, "The fix sits right next to the evidence (principle 5).")
w.note(988, 188, "History lists earlier values of this cell, e.g. before a clarification or a manual edit (FR-3.9).")
w.save()


# ---------------- S9: Review queue ----------------
w = Wire("09-review-queue", "S9 · Review queue",
         "Every flag in one list, each beside its source, each with its fix. Never blocks the matrix.")
w.shell(stage=5, tour_step=6)
w.text(20, 124, "Review queue · 9 items need a look", 20)
w.btn(20, 160, 300, "✓ Accept all high-confidence (2)", OK)
w.btn(340, 160, 60, "All", ACCENT_SOFT)
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
conf = {"High": OK, "Medium": WARN, "Low": BAD}
fills = {(r, 4): conf[row[4]] for r, row in enumerate(rows) if row[4] in conf}
w.table(20, 210, [130, 60, 280, 170, 100, 390], rows, row_h=40, fills=fills)
w.box(20, 630, 1140, 180, "Recent changes · undo any of them\n\n"
                          "• You accepted V1 mapping “Shipper 5P Lg” → line 1 · 10:42 · [Undo]\n"
                          "• You set V5 freight estimate ₹1.20 per piece · 10:40 · [Undo]", SURFACE, 13, align="left")
w.next_btn("Ask V3 to fill gaps", x=880, y=836, w=280)
w.note(20, 160, "Clears the easy ones in one click (FR-4.3). Only real issues stay.")
w.note(20, 210, "Each row shows its source; clicking it opens the source drawer (S8).")
w.note(20, 370, "Ask vendor collects all of a vendor's open items into one email (S10).")
w.note(20, 630, "Every manual change is logged and can be undone (FR-4.13).")
w.save()


# ---------------- S10: Clarification composer ----------------
w = Wire("10-clarification", "S10 · Clarification email composer",
         "Opened from Ask vendor (matrix, review queue or vendor profile). The closed loop, Improvement A.")
w.shell(stage=5, tour_step=6)
w.box(20, 120, 1140, 700, "Review queue (dimmed)", PANEL, 16, style="dashed")
w.box(120, 150, 940, 640, "", SURFACE, stroke=INK)
w.text(140, 166, "Ask vendor for clarification", 20)
w.text(140, 206, "Vendors with open items", 13, MUTED)
for i, t in enumerate(["V3 · 2 open", "V5 · 2 open", "V4 · 2 open", "V2 · 1 open"]):
    w.box(140, 230 + i * 52, 200, 44, t, ACCENT_SOFT if i == 0 else SURFACE, 13)
w.box(360, 206, 680, 380, "To: sales@vendor3.example\nSubject: RFQ-2026-014 · two items to complete your quote\n\n"
                          "Dear Vendor 3,\nThank you for your quote. To include it fully in our evaluation, please:\n"
                          "1. Quote lines 12, 14 and 19, which were missing.\n"
                          "2. Confirm whether you can offer 60-day payment terms (you quoted 30).\n\n"
                          "Reply directly to this email and we will update your quote automatically.\nRegards, Pavan",
      SURFACE, 13, align="left")
w.text(360, 600, "Included:   ☑ Missing lines 12, 14, 19     ☑ Payment terms 30 vs 60 days", 13)
w.btn(720, 636, 120, "Cancel")
w.primary(860, 630, 180, "Send (simulated)")
w.box(140, 700, 900, 76, "After sending: V3's status becomes Clarification requested. Its seeded reply lands in the "
                         "inbox, is read automatically, and only the 3 missing cells fill in, badged "
                         "[Updated from clarification, Day 11]. See S7b.", CLAR, 13, align="left")
w.note(360, 206, "One consolidated email per vendor, drafted from its open items (FR-4.7). Fully editable.")
w.note(140, 230, "Pick another vendor to draft its email. V5's covers the freight amount and the 2 new lines.")
w.note(360, 600, "Untick an item to leave it out.")
w.note(860, 630, "Simulated send. The loop closes when the reply arrives (FR-4.8); old values stay in history.")
w.save()


# ---------------- S11: Vendor profile ----------------
w = Wire("11-vendor-profile", "S11 · Vendor profile",
         "Opened by clicking a vendor's column header or name anywhere. Shown here: V3.")
w.shell(stage=5, tour_step=6)
w.text(20, 124, "V3 · Vendor 3", 22)
w.box(200, 120, 240, 32, "Clarification requested", CLAR, 13)
steps = ["RFI ✓ shortlisted", "RFP ✓ proposal", "RFQ sent Day 0", "Replied Day 5", "Clarification asked Day 9",
         "Reply Day 11"]
ids = [w.box(20 + i * 190, 170, 170, 40, t, OK if i < 5 else SURFACE, 12, style="solid" if i < 5 else "dashed")
       for i, t in enumerate(steps)]
for p, q in zip(ids, ids[1:]):
    w.s.arrow(p, q, color=MUTED)
w.box(20, 230, 540, 150, "RFP summary\nSupplies both plants from one unit, 140 km from Plant 1. In-house BCT testing "
                         "on request. Offers 2 weeks' buffer stock at its warehouse.", SURFACE, 13, align="left")
w.box(20, 395, 540, 200, "Commercial terms\nPayment: 30 days ⚠ (requested 60)\nQuote validity: 60 days\n"
                         "Lead time: 10 days\nFreight: included to both plants", SURFACE, 13, align="left")
w.box(20, 610, 540, 200, "Replies and files\n• Day 5 · quote.docx (Word) · 27 of 30 lines\n"
                         "• Day 9 · clarification sent\n• Day 11 · reply email · 3 lines, 60-day terms",
      SURFACE, 13, align="left")
rows = [["Questionnaire · Fail 58% (rule: ≥ 70%)", "Answer", "Result"],
        ["ISO 9001 certificate", "Valid to 2027-05", "✓ Pass"],
        ["FSC certified", "No", "—"],
        ["BCT test reports", "Not provided", "✕ Fail"],
        ["Monthly capacity", "2.5 L boxes", "—"],
        ["Quality incidents (12 months)", "3", "—"],
        ["… 6 more", "", ""]]
w.table(580, 230, [300, 150, 130], rows, fills={(1, 2): OK, (3, 2): BAD})
w.box(580, 470, 580, 100, "Certificates\nISO 9001 · valid to 2027-05 ✓\nFSC · none", SURFACE, 13, align="left")
w.box(580, 585, 580, 140, "Open items (2)\n• Lines 12, 14, 19 missing\n• Payment terms 30 vs 60 days",
      WARN, 13, align="left")
w.btn(1000, 740, 160, "✉ Ask vendor")
w.next_btn("Back to comparison", x=620)
w.note(20, 170, "Status timeline for this vendor across the whole lifecycle.")
w.note(580, 230, "Pass or fail against the rules locked before sending (FR-4.6).")
w.note(580, 585, "The same open items and Ask vendor action as in the matrix and review queue.")
w.save()


# ---------------- S12: Award memo ----------------
w = Wire("12-award-memo", "S12 · Award memo",
         "Generated from a saved scenario with Recommend award. All figures in these wireframes are illustrative.")
w.shell(stage=7, tour_step=9)
w.box(20, 120, 1140, 700, "", SURFACE)
w.text(50, 136, "Award recommendation · RFx-2026-014 Corrugated packaging", 22)
w.text(50, 170, "Prepared by Pavan · Day 11 · Scenario ②: “Split, passing vendors, combined volumes”", 13, MUTED)
w.btn(850, 164, 130, "⬇ PDF (later)", style="dashed", h=30)
w.btn(990, 164, 150, "🔗 Share (later)", style="dashed", h=30)
for i, t in enumerate(["Total award value\n₹1.16 Cr per year", "Saving vs last year\n₹9.4 L (7.5%)",
                       "Saving vs cheapest single vendor\n₹8.0 L"]):
    w.box(50 + i * 365, 206, 345, 80, t, OK if i == 0 else SURFACE, 15)
rows = [["Vendor", "Lines awarded", "Annual value", "Share"],
        ["V2", "1, 4, 7, 9 … (14 lines)", "₹0.58 Cr", "50%"],
        ["V5", "2, 3, 12 … (10 lines)", "₹0.37 Cr", "32%"],
        ["V1", "5, 6, 29 … (6 lines)", "₹0.21 Cr", "18%"],
        ["V3, V4", "None: V3 failed the questionnaire; V4's ISO 9001 expired", "—", "—"]]
w.table(50, 300, [180, 500, 200, 200], rows)
w.box(50, 480, 530, 190, "Why this award\nCheapest valid price on each line among vendors that passed the "
                         "questionnaire. Combining both plants' volumes moves V2 into its higher tier on 6 lines.\n\n"
                         "(The AI writes these sentences; every figure comes from the calculation.)",
      SURFACE, 13, align="left")
w.box(600, 480, 530, 190, "Evaluation rules used (locked Day 0, 10:01)\nPass: valid ISO 9001, BCT reports, score ≥ 70%\n"
                          "Basis: ₹ per piece, before GST, delivered, 1 USD = ₹84.00, tier by volume",
      INFO, 13, align="left")
w.box(50, 690, 1080, 110, "Risks and assumptions\n• V5 freight is a buyer estimate (₹1.20 per piece), not quoted\n"
                          "• Per-kg prices converted with estimated box weights\n"
                          "• V4 excluded: ISO 9001 expired · no open flags on awarded lines", WARN, 13, align="left")
w.next_btn("Replay the demo (Reset)", y=836)
w.note(50, 206, "Every ₹ figure is clickable to its source (FR-6.2), for the CFO's audit (J4-7).")
w.note(50, 480, "AI writes only the connecting sentences; code supplies every number and checks them.")
w.note(600, 480, "The rules locked before sending, quoted back.")
w.note(50, 690, "Risks: estimates used, open flags, expired certificates.")
w.note(1052, 64, "Award is done; PO hand-off shows as the next stage, on the roadmap (FR-6.3).")
w.note(850, 164, "PDF download and a read-only share link are should-haves (dashed).")
w.save()


# ---------------- Screen flow map ----------------
s = Scene()
s.text(0, 0, "Screen flow: how S1–S12 connect", 32, INK)
s.text(0, 46, "Solid arrows = the demo path (guided tour). Dashed = side trips that return to where you were.", 16, MUTED)
pos = {"S1": (0, 140), "S2": (260, 140), "S3": (520, 140), "S4": (780, 140), "S5": (1040, 140),
       "S6": (1040, 360), "S7": (780, 360), "S8": (520, 360), "S7b": (780, 580), "S9": (1040, 580),
       "S10": (1040, 800), "S11": (520, 800), "S12": (260, 580)}
names = {"S1": "Landing + sign up", "S2": "Workspace frame", "S3": "Context: Need / RFI / RFP",
         "S4": "RFQ draft + rules", "S5": "Send", "S6": "Inbox + upload", "S7": "Matrix + Ask panel",
         "S7b": "Ask: what-ifs, scenarios", "S8": "Source drawer", "S9": "Review queue",
         "S10": "Clarification email", "S11": "Vendor profile", "S12": "Award memo"}
ids = {k: s.box(x, y, 220, 100, f"{k}\n{names[k]}", ACCENT_SOFT if k in ("S7", "S7b") else SURFACE, 15,
                stroke=ACCENT if k in ("S7", "S7b") else LINE, rough=0)
       for k, (x, y) in pos.items()}
for a, b, label in [("S1", "S2", "sign up"), ("S2", "S3", "read request"), ("S3", "S4", "draft"),
                    ("S4", "S5", "lock & send"), ("S5", "S6", "fast-forward"), ("S6", "S7", "open comparison"),
                    ("S7", "S9", "review"), ("S9", "S10", "ask vendor"), ("S7", "S7b", "ask what-ifs"),
                    ("S7b", "S12", "recommend award")]:
    s.arrow(ids[a], ids[b], label, color=INK)
for a, b, label in [("S7", "S8", "click a number"), ("S10", "S6", "reply arrives"),
                    ("S7", "S11", "click vendor"), ("S11", "S10", "ask vendor"), ("S12", "S8", "click a ₹")]:
    s.arrow(ids[a], ids[b], label, style="dashed", color=MUTED)
s.save(os.path.join(OUT, "wire-00-screen-flow.excalidraw"))
