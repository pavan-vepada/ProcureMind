"""Writes each vendor's reply in its own messy format, plus the buyer's volume sheet."""
import io
import random
from pathlib import Path

from docx import Document
from docx.shared import Pt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .model import (
    FX, LINE, LINES, V2_GST_LINES, V2_TIER_LINES, V3_MISSING, V4_RATES, V5_NEW_LINE_PRICES, VENDORS, v2_prices,
)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def size(l):
    h = f" × {l['height_mm']}" if l["height_mm"] else ""
    return f"{l['length_mm']} × {l['width_mm']}{h}"


def inr(x):
    return f"{x:,.2f}"


def write_all(out: Path, prices, contracts):
    volume_sheet(out / "volume-sheet.xlsx")
    replies = [
        v1_excel(out / "kaveri-quotation.xlsx", prices),
        v2_pdf(out / "deccan-boxboard-quote.pdf", prices),
        v3_word(out / "shakti-quote.docx", prices),
        v4_photo(out / "narmada-rate-card.jpg", out / "narmada-iso-9001.pdf"),
        v5_email(),
    ]
    clarifications = [
        {
            "vendor_code": "V3",
            "subject": "RE: RFQ-2026-014 · two items to complete your quote",
            "body": (
                "Dear Pavan,\n\nFurther to your mail, please find our rates for the remaining items:\n\n"
                f"Item 12 (die-cut tray for 5 L cans): Rs. {inr(prices[('V3', 12)])} per piece\n"
                f"Item 14 (die-cut display tray): Rs. {inr(prices[('V3', 14)])} per piece\n"
                f"Item 19 (slim 5-ply shipper): Rs. {inr(prices[('V3', 19)])} per piece\n\n"
                "We also agree to 60 days payment terms.\n\nRegards,\nRamesh Kulkarni\nShakti Pack Works"
            ),
        },
        {
            "vendor_code": "V5",
            "subject": "RE: RFQ-2026-014 · freight and the two new items",
            "body": (
                "Hi Pavan,\n\nFreight to both plants (Pune and Nashik) will be Rs 1.10 per piece on all items.\n\n"
                "For the two new items:\n"
                f"- Heavy-duty export RSC, item 29: Rs {inr(V5_NEW_LINE_PRICES[29])} per piece\n"
                f"- Tall 6 x 4 partition set, item 30: Rs {inr(V5_NEW_LINE_PRICES[30])} per piece\n\n"
                "All other rates as in my earlier mail.\n\nThanks,\nSuresh Patil\nSahyadri Paperpack"
            ),
        },
    ]
    return {"replies": replies, "clarifications": clarifications}


# ---------------- Buyer's volume sheet (attached to the internal request) ----------------

def volume_sheet(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Volumes"
    ws.append(["Item code", "Description", "Ply", "Top GSM", "BF", "Flute", "L mm", "W mm", "H mm",
               "Plant 1 (Pune) pcs/yr", "Plant 2 (Nashik) pcs/yr", "Note"])
    for l in LINES:
        ws.append([l["item_code"], l["description"], l["ply"], l["gsm"], l["bf"], l["flute"], l["length_mm"],
                   l["width_mm"], l["height_mm"] or None, l["qty_p1"], l["qty_p2"],
                   "New item this year" if l["is_new"] else None])
    for c in ws[1]:
        c.font = Font(bold=True)
    ws.column_dimensions["B"].width = 34
    wb.save(path)


# ---------------- V1: Excel in its own layout, "per box" = bundle of 100 ----------------

def v1_name(l):
    kind = {"rsc": "Shipper" if l["ply"] == 5 else "Ctn", "heavy": "HD Box", "tray": "Tray DC",
            "partition": "Partn", "pad": "Pad", "sheet": "Sheet"}[l["category"]]
    return f"{kind} {l['ply']}P {l['length_mm']}x{l['width_mm']}" + (f"x{l['height_mm']}" if l["height_mm"] else "")


def v1_excel(path, prices):
    wb = Workbook()
    ws = wb.active
    ws.title = "Quotation"
    ws.merge_cells("A1:F1")
    ws["A1"] = "KAVERI CORRUGATORS · QUOTATION"
    ws["A1"].font = Font(bold=True, size=14)
    ws["A2"] = "Ref: your RFQ-2026-014 · Sunrise Consumer Goods"
    ws.merge_cells("A3:F3")
    ws["A3"] = "All rates are per box (1 box = bundle of 100 pcs). Freight included to both plants. GST 18% extra."
    ws["A3"].font = Font(italic=True)
    ws.append([])
    header = ["S.No", "Item", "Size (mm)", "Ply / GSM", "Rate per box (₹)", "Remarks"]
    ws.append(header)
    for c in ws[5]:
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="DDEBF7")
    order = [l["line_no"] for l in LINES]
    random.Random(7).shuffle(order)
    for i, n in enumerate(order, start=1):
        l = LINE[n]
        bundle = round(prices[("V1", n)] * 100)
        ws.append([i, v1_name(l), size(l).replace(" ", ""), f"{l['ply']} / {l['gsm']}", bundle,
                   "Printing extra" if i % 9 == 0 else None])
    r = ws.max_row + 2
    for k, v in [("Payment terms", "60 days from invoice"), ("Validity", "60 days"),
                 ("Lead time", "14 days from PO"), ("Delivery", "Freight included, Pune and Nashik")]:
        ws.cell(row=r, column=1, value=k).font = Font(bold=True)
        ws.cell(row=r, column=3, value=v)
        r += 1
    for col, w in zip("ABCDEF", (6, 26, 16, 10, 16, 16)):
        ws.column_dimensions[col].width = w

    qs = wb.create_sheet("Compliance")
    qs.append(["Q", "Requirement", "Our response"])
    for row in [
        (1, "ISO 9001", "Yes, certified. Valid until Aug 2027 (copy available)"),
        (2, "FSC", "Yes, FSC chain of custody"),
        (3, "BCT reports", "Yes, BCT report with every lot for 5 and 7 ply"),
        (4, "ECT in-house", "Yes, in-house lab"),
        (5, "Monthly capacity", "4 lakh boxes per month"),
        (6, "Lead time", "14 days"),
        (7, "Quality incidents (12 months)", "1"),
        (8, "Buffer stock", "Yes, 1 week for top 10 items"),
        (9, "Both plants", "Yes"),
        (10, "2-colour flexo printing", "Yes"),
        (11, "Paper mill certificates", "Yes, with every invoice"),
        (12, "Recycled content", "Yes, declared on each batch (approx. 70%)"),
    ]:
        qs.append(list(row))
    qs.column_dimensions["B"].width = 30
    qs.column_dimensions["C"].width = 48
    wb.save(path)
    return {
        "vendor_code": "V1", "day": 2, "subject": "RE: RFQ-2026-014 · Quotation from Kaveri Corrugators",
        "body": "Dear Pavan,\n\nPlease find our quotation attached in our standard format.\n\nRegards,\nAnil Shetty\nKaveri Corrugators",
        "attachments": [{"filename": path.name, "kind": "excel",
                         "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}],
    }


# ---------------- V2: PDF letterhead, USD, tiers, discount footnote, GST on 2 lines ----------------

def v2_pdf(path, prices):
    styles = getSampleStyleSheet()
    small = styles["BodyText"].clone("small", fontSize=8, leading=10)
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=14 * mm, bottomMargin=14 * mm)
    story = [
        Paragraph("<font size=16 color='#0b3d6b'><b>DECCAN BOXBOARD EXPORTS PVT. LTD.</b></font>", styles["Title"]),
        Paragraph("Export Oriented Unit · MIDC Chakan, Pune · quotes@deccan-boxboard.example", small),
        Spacer(1, 6 * mm),
        Paragraph("<b>Quotation DBE/Q/2026/0412</b> against RFQ-2026-014, Sunrise Consumer Goods", styles["BodyText"]),
        Paragraph("Prices in US Dollars per piece, DAP Plant 1 (Pune) and Plant 2 (Nashik).", small),
        Spacer(1, 4 * mm),
    ]
    rows = [["Sr", "Description", "Size (mm)", "Ply", "Unit price\n(USD)*", "≥100,000 pcs/yr\n(USD)", "Note"]]
    for l in LINES:
        n = l["line_no"]
        base, tier = v2_prices(n, prices[("V2", n)])
        gst = n in V2_GST_LINES
        shown = round(base * 1.18, 3) if gst else base
        tier_shown = (round(tier * 1.18, 3) if gst else tier) if tier else None
        rows.append([str(n), f"{l['ply']} Ply {l['description'].split(',')[0]}", size(l), str(l["ply"]),
                     f"{shown:.3f}", f"{tier_shown:.3f}" if tier_shown else "—", "incl. 18% GST" if gst else ""])
    t = Table(rows, colWidths=[8 * mm, 58 * mm, 30 * mm, 9 * mm, 20 * mm, 24 * mm, 24 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 7.5),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 7.5),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef6")),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#b8c4d3")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story += [t, Spacer(1, 3 * mm),
              Paragraph("* An additional 5% volume discount applies on orders above 50,000 pcs per item.", small),
              Paragraph(f"Exchange rate reference: RBI reference rate on date of invoice (indicative INR {FX:.2f}).", small),
              PageBreak(),
              Paragraph("<b>Commercial terms</b>", styles["Heading3"]),
              Paragraph("Payment: 60 days from invoice · Validity: 90 days · Lead time: 21 days from PO · "
                        "Delivery: DAP both plants, freight included.", styles["BodyText"]),
              Spacer(1, 4 * mm),
              Paragraph("<b>Supplier questionnaire</b>", styles["Heading3"])]
    answers = [
        ("1", "ISO 9001", "Certified, valid until January 2027"),
        ("2", "FSC", "Yes"),
        ("3", "BCT test reports", "Yes, through NABL-accredited external lab"),
        ("4", "ECT in-house", "No, outsourced to external lab"),
        ("5", "Monthly capacity", "6.5 lakh boxes"),
        ("6", "Lead time", "21 days"),
        ("7", "Quality incidents, last 12 months", "2"),
        ("8", "Buffer stock", "Not offered"),
        ("9", "Delivery to both plants", "Yes"),
        ("10", "2-colour flexo printing", "Yes"),
        ("11", "Paper mill certificates", "Yes"),
        ("12", "Recycled content declaration", "Yes"),
    ]
    q = Table([["Q", "Item", "Response"]] + [list(a) for a in answers], colWidths=[10 * mm, 60 * mm, 100 * mm])
    q.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 8.5),
                           ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.5),
                           ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#b8c4d3"))]))
    story.append(q)
    doc.build(story)
    return {
        "vendor_code": "V2", "day": 4, "subject": "Quotation DBE/Q/2026/0412 · RFQ-2026-014",
        "body": "Dear Sir,\n\nPlease find attached our best quotation. Kindly note our prices are in USD as we are an export unit.\n\nBest regards,\nMeera Joshi\nDeccan Boxboard Exports",
        "attachments": [{"filename": path.name, "kind": "pdf", "mime": "application/pdf"}],
    }


# ---------------- V3: Word, prose, 27 of 30 lines, 30-day terms, fails questionnaire ----------------

def v3_word(path, prices):
    doc = Document()
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(11)
    doc.add_paragraph("SHAKTI PACK WORKS").runs[0].bold = True
    doc.add_paragraph("Plot 14, Ranjangaon MIDC · sales@shakti-packworks.example")
    doc.add_paragraph("To: Pavan, Procurement, Sunrise Consumer Goods\nSub: Our offer against RFQ-2026-014")
    doc.add_paragraph("Dear Pavan ji, thank you for considering us. We are pleased to offer as follows. "
                      "All prices are per piece, ex-GST, delivered to both your plants.")

    groups = [
        ("For the 5-ply shippers", [n for n in range(1, 31) if LINE[n]["category"] == "rsc" and LINE[n]["ply"] == 5]),
        ("For the 3-ply cartons", [n for n in range(1, 31) if LINE[n]["category"] == "rsc" and LINE[n]["ply"] == 3]),
        ("For the heavy-duty 7-ply items", [n for n in range(1, 31) if LINE[n]["category"] == "heavy"]),
        ("Coming to the trays and mailers", [n for n in range(1, 31) if LINE[n]["category"] == "tray"]),
        ("For partitions", [n for n in range(1, 31) if LINE[n]["category"] == "partition"]),
        ("Pads and sheets", [n for n in range(1, 31) if LINE[n]["category"] in ("pad", "sheet")]),
    ]
    for intro, nums in groups:
        parts = [f"the {LINE[n]['description'].split(',')[-1].strip().split('(')[0].strip()} "
                 f"({size(LINE[n]).replace(' × ', ' x ')}) at Rs. {inr(prices[('V3', n)])}"
                 for n in nums if n not in V3_MISSING]
        if parts:
            doc.add_paragraph(f"{intro}: " + "; ".join(parts) + ".")
    doc.add_paragraph("Payment terms: 30 days from date of invoice. Offer valid for 60 days. "
                      "Delivery within 10 days of PO, freight included to both plants.")
    doc.add_paragraph(
        "On your questionnaire: we hold ISO 9001 certification valid until May 2027. We are not FSC certified. "
        "BCT test reports are not available at present; we can arrange testing through a partner lab on request. "
        "We do not have an ECT tester in-house. Our capacity is about 2.5 lakh boxes a month. We had 3 quality "
        "complaints in the last year, all closed. We can keep buffer stock for your top items, supply both plants, "
        "print two colours, share paper mill certificates and declare recycled content.")
    doc.add_paragraph("Looking forward to your valued order.\n\nRamesh Kulkarni\nShakti Pack Works")
    doc.save(path)
    return {
        "vendor_code": "V3", "day": 5, "subject": "Offer against RFQ-2026-014",
        "body": "Dear Pavan ji,\n\nOur offer is attached as a Word document.\n\nRamesh Kulkarni",
        "attachments": [{"filename": path.name, "kind": "word",
                         "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}],
    }


# ---------------- V4: angled phone photo of a per-kg rate card, glare over one row ----------------

V4_ROWS = [
    ("3 Ply RSC cartons", "rsc3"),
    ("5 Ply RSC shippers", "rsc5"),
    ("7 Ply heavy duty boxes", "heavy"),
    ("Die-cut trays & mailers", "tray"),
    ("Partitions", "partition"),
    ("Layer pads", "pad"),
    ("Sheets & edge protectors", "sheet"),
]


def _solve(a, b):
    """Gaussian elimination for the 8×8 homography system."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c:
                f = m[r][c] / m[c][c]
                m[r] = [x - f * y for x, y in zip(m[r], m[c])]
    return [m[i][n] / m[i][i] for i in range(n)]


def _homography(src, dst):
    """Coefficients mapping src points to dst points (PIL PERSPECTIVE order)."""
    a, b = [], []
    for (x, y), (u, v) in zip(src, dst):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return _solve(a, b)


def _apply(h, x, y):
    d = h[6] * x + h[7] * y + 1
    return (h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d


def v4_photo(path, cert_path):
    pw, ph = 1400, 1000
    paper = Image.new("RGB", (pw, ph), (250, 248, 240))
    d = ImageDraw.Draw(paper)
    f_title = ImageFont.truetype(FONT_BOLD, 54)
    f_sub = ImageFont.truetype(FONT, 28)
    f_row = ImageFont.truetype(FONT, 38)
    d.text((80, 60), "NARMADA CARTONS", font=f_title, fill=(25, 40, 90))
    d.text((80, 135), "Rate card · corrugated packaging 2026-27", font=f_sub, fill=(60, 60, 60))
    d.text((80, 175), "Rates per kg · delivered Nashik / Pune · GST extra", font=f_sub, fill=(60, 60, 60))
    d.line((80, 225, pw - 80, 225), fill=(40, 40, 40), width=3)
    regions = {}
    y = 255
    for label, cat in V4_ROWS:
        rate = V4_RATES.get(cat, 38)
        d.text((90, y), label, font=f_row, fill=(20, 20, 20))
        x = 90 + d.textlength(label, font=f_row) + 16
        while x < 1060:
            d.text((x, y), ".", font=f_row, fill=(120, 120, 120))
            x += 18
        d.text((1080, y), f"Rs {rate} / kg", font=f_row, fill=(20, 20, 20))
        regions[cat] = (80, y - 8, pw - 80, y + 52)
        y += 85
    d.line((80, y + 5, pw - 80, y + 5), fill=(40, 40, 40), width=2)
    d.text((90, y + 25), "Payment 45 days · Validity 30 days · Lead time 7 days", font=f_sub, fill=(40, 40, 40))

    # Place the paper at an angle on a desk.
    ow, oh = 1600, 1200
    corners_paper = [(0, 0), (pw, 0), (pw, ph), (0, ph)]
    corners_photo = [(250, 150), (1390, 185), (1500, 1050), (130, 1010)]
    inv = _homography(corners_photo, corners_paper)  # PIL wants output → input
    fwd = _homography(corners_paper, corners_photo)
    desk = Image.new("RGB", (ow, oh), (92, 78, 66))
    warped = paper.transform((ow, oh), Image.Transform.PERSPECTIVE, inv, Image.Resampling.BICUBIC)
    mask = Image.new("L", (pw, ph), 255).transform((ow, oh), Image.Transform.PERSPECTIVE, inv)
    desk.paste(warped, (0, 0), mask)

    # Glare over the sheets row: blown out over the price, fading towards the label.
    gx0, gy0, gx1, gy1 = regions["sheet"]
    cx, cy = _apply(fwd, 1060, (gy0 + gy1) / 2)
    glare = Image.new("L", (ow, oh), 0)
    gd = ImageDraw.Draw(glare)
    for r, a in ((300, 140), (230, 215), (170, 255)):
        gd.ellipse((cx - r * 1.5, cy - r * 0.42, cx + r * 1.5, cy + r * 0.42), fill=a)
    glare = ImageChops.multiply(glare.filter(ImageFilter.GaussianBlur(22)), mask)
    desk = Image.composite(Image.new("RGB", (ow, oh), (255, 255, 252)), desk, glare)

    noise = Image.effect_noise((ow, oh), 18).convert("RGB")
    desk = Image.blend(desk, noise, 0.06).filter(ImageFilter.GaussianBlur(1.1))
    buf = io.BytesIO()
    desk.save(buf, "JPEG", quality=72)
    path.write_bytes(buf.getvalue())

    truth = {}
    for cat, (x0, y0, x1, y1) in regions.items():
        pts = [_apply(fwd, x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        truth[cat] = [round(min(xs) / ow, 4), round(min(ys) / oh, 4),
                      round((max(xs) - min(xs)) / ow, 4), round((max(ys) - min(ys)) / oh, 4)]

    iso_certificate(cert_path)
    return {
        "vendor_code": "V4", "day": 6, "subject": "Rates - Narmada Cartons",
        "body": (
            "Pavan sir,\n\nPhoto of our rate card attached, rates per kg as usual. ISO certificate also attached.\n\n"
            "Your questions: ISO 9001 certified (copy attached). No FSC. BCT reports yes, ECT testing in-house. "
            "Capacity 3 lakh boxes per month. Lead time 7 days. 2 complaints last year. We can run a stock point "
            "inside Plant 2. Supply to both plants yes. Printing no. Mill certificates yes. Recycled declaration no.\n\n"
            "Payment 45 days.\n\nRegards\nVikas Narmada"
        ),
        "attachments": [
            {"filename": path.name, "kind": "photo", "mime": "image/jpeg"},
            {"filename": cert_path.name, "kind": "certificate", "mime": "application/pdf"},
        ],
        "truth_regions": truth,
    }


def iso_certificate(path):
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=A4, topMargin=40 * mm)
    doc.build([
        Paragraph("<b>CERTIFICATE OF REGISTRATION</b>", styles["Title"]),
        Spacer(1, 10 * mm),
        Paragraph("This is to certify that the quality management system of", styles["BodyText"]),
        Paragraph("<b>NARMADA CARTONS</b>, Plot 22, Ambad MIDC, Nashik", styles["Heading2"]),
        Paragraph("has been assessed and found to conform to the requirements of", styles["BodyText"]),
        Paragraph("<b>ISO 9001:2015</b>", styles["Heading2"]),
        Paragraph("Scope: manufacture of corrugated boxes, trays and partitions.", styles["BodyText"]),
        Spacer(1, 10 * mm),
        Paragraph("Certificate no. QMS/NC/2023/1187", styles["BodyText"]),
        Paragraph("Issued: 01 April 2023 · <b>Valid until: 31 March 2026</b>", styles["BodyText"]),
    ])


# ---------------- V5: plain email ----------------

def v5_email():
    return {
        "vendor_code": "V5", "day": 9, "subject": "RE: RFQ-2026-014",
        "body": (
            "Hi Pavan,\n\n₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra. "
            "Per-kg rates are for the RSC boxes; everything else as per our contract 2025-V5.\n\n"
            "ISO 9001 and FSC certified (certificates on file with you, ISO valid till Feb 2027). BCT reports with "
            "every lot and we test ECT in-house. Capacity 3.5 lakh boxes a month, lead time 12 days, zero quality "
            "complaints this year. Buffer stock and both plants as today. We print up to two colours. Recycled "
            "content declared; mill certificates not usually shared. Payment 60 days is fine.\n\n"
            "Thanks,\nSuresh Patil\nSahyadri Paperpack"
        ),
        "attachments": [],
    }
