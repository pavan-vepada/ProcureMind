"""The other sample RFx in a buyer's workspace, each with its own lines, vendors, files and traps.

Writes seed/extra.json and seed/files/<dataset>-*. Each vendor reply comes with its ideal extraction (the same
shape as the app's AI extraction), so the app can show these RFx already analysed without calling the AI.
"""
import io
import random
from pathlib import Path

from docx import Document
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .files import FONT, FONT_BOLD, _apply, _homography, iso_certificate, size
from .model import FX, LINE, QUESTIONS, base_price, weight_kg

POOL = {
    "kaveri": ("Kaveri Corrugators", "sales@kaveri-corrugators.example", "Anil Shetty"),
    "deccan": ("Deccan Boxboard Exports", "quotes@deccan-boxboard.example", "Meera Joshi"),
    "shakti": ("Shakti Pack Works", "sales@shakti-packworks.example", "Ramesh Kulkarni"),
    "narmada": ("Narmada Cartons", "office@narmada-cartons.example", "Vikas Narmada"),
    "sahyadri": ("Sahyadri Paperpack", "accounts@sahyadri-paperpack.example", "Suresh Patil"),
    "godavari": ("Godavari Packaging Industries", "rfq@godavari-pack.example", "Farah Siddiqui"),
    "konkan": ("Konkan Corrugated", "sales@konkan-corrugated.example", "Nikhil Desai"),
    "tapi": ("Tapi Cartons", "quotes@tapi-cartons.example", "Jignesh Mehta"),
    "vindhya": ("Vindhya Box Co.", "sales@vindhya-box.example", "Priya Chauhan"),
}

TIER_MIN = 100_000

# Questionnaire profiles: which of the 12 questions a vendor meets.
GOOD = {q: True for q in range(1, 13)}
OK = {**GOOD, 4: False, 8: False, 10: False}           # passes (score 80)
NO_BCT = {**GOOD, 3: False, 4: False, 5: False}         # fails a required question


def _lines(numbers, scale, prefix):
    out = []
    for i, n in enumerate(numbers, start=1):
        l = dict(LINE[n])
        l.update(line_no=i, item_code=f"{prefix}-{i:02d}", qty_p1=int(round(l["qty_p1"] * scale, -3)) or 1000,
                 qty_p2=int(round(l["qty_p2"] * scale, -3)) or 1000, is_new=False)
        l["spec_key"] = f"{l['category']}|{l['ply']}|{l['gsm']}|{l['length_mm']}x{l['width_mm']}x{l['height_mm']}"
        l["est_weight_kg"] = round(weight_kg(l), 4)
        out.append(l)
    return out


DATASETS = [
    {
        "key": "launch", "title": "Shippers and trays for the detergent launch", "category": "Corrugated packaging",
        "lines": _lines([1, 2, 3, 5, 6, 8, 10, 11, 14, 15, 19, 25], 0.5, "DL"),
        "request": {
            "from": "Rohan Iyer, New Product Launch team", "day": -12,
            "subject": "Packaging for the liquid detergent launch",
            "body": "Hi Pavan,\n\nWe launch the 1 L and 2 L liquid detergent range in the next quarter from both plants. "
                    "We need shipper boxes, trays and partitions for the first year; volumes are in the attached sheet.\n\n"
                    "Quality wants valid ISO 9001 and BCT test reports for every 5-ply supplier. Payment 60 days as usual.\n\n"
                    "Thanks,\nRohan",
        },
        "vendors": [
            ("kaveri", "excel", {"factor": 1.01, "bundle": 50, "answers": GOOD, "payment": 60, "lead": 14}),
            ("godavari", "pdf", {"factor": 0.97, "currency": "INR", "unit": "per_1000", "gst_lines": [4, 9], "answers": NO_BCT, "payment": 60, "lead": 18}),
            ("konkan", "word", {"factor": 0.99, "missing": [], "answers": OK, "payment": 60, "lead": 12}),
            ("narmada", "photo", {"factor": 1.0, "glare": None, "expired": False, "answers": OK, "payment": 45, "lead": 7}),
            ("sahyadri", "email", {"factor": 0.98, "freight_extra": False, "answers": GOOD, "payment": 60, "lead": 12}),
        ],
        "rfp_notes": {
            "kaveri": "Supplies both plants by road; in-house BCT lab; one week of buffer stock.",
            "godavari": "Large converter in Aurangabad; prices per thousand; testing outsourced.",
            "konkan": "Mid-size unit near Plant 1; quick turnaround on die-cut trays.",
            "narmada": "Next to Plant 2; prices by weight; can run a stock point inside the plant.",
            "sahyadri": "Current shipper supplier; offers launch support for new SKUs.",
        },
    },
    {
        "key": "export", "title": "Heavy-duty export cartons", "category": "Corrugated packaging",
        "lines": _lines([1, 4, 9, 13, 17, 19, 21, 22, 27, 29], 0.6, "EX"),
        "request": {
            "from": "Kavita Rao, Export Logistics", "day": -25,
            "subject": "Export-grade cartons for the Middle East orders",
            "body": "Pavan,\n\nThe Middle East distributor orders need stronger 5- and 7-ply cartons and pallet sleeves. "
                    "Volumes for the next 12 months are attached. Please make sure suppliers can certify BCT for 7-ply.\n\nKavita",
        },
        "vendors": [
            ("deccan", "pdf", {"factor": 0.98, "currency": "USD", "unit": "piece", "tiers": True, "gst_lines": [], "discount": False, "answers": OK, "payment": 60, "lead": 21}),
            ("kaveri", "excel", {"factor": 1.02, "bundle": 100, "answers": GOOD, "payment": 60, "lead": 14}),
            ("tapi", "email", {"factor": 0.95, "freight_extra": True, "answers": OK, "payment": 45, "lead": 10}),
            ("vindhya", "word", {"factor": 0.96, "missing": [3, 8], "answers": NO_BCT, "payment": 30, "lead": 15}),
        ],
        "rfp_notes": {
            "deccan": "Export-oriented unit; quotes in USD; volume tiers on high runners.",
            "kaveri": "7-ply capable; supplies both plants; in-house testing.",
            "tapi": "Surat-based; competitive on heavy-duty boxes; freight charged separately.",
            "vindhya": "New supplier; strong on pallet sleeves; testing through a partner lab.",
        },
    },
    {
        "key": "inner", "title": "Inner packaging renewal: trays, partitions and pads", "category": "Corrugated packaging",
        "lines": _lines([5, 6, 7, 12, 14, 15, 16, 23, 24, 26], 1.0, "IP"),
        "request": {
            "from": "Anita Rao, Plant Operations", "day": -60,
            "subject": "Renewal of inner packaging contract",
            "body": "Hi Pavan,\n\nThe inner packaging contract (trays, partitions, pads) ends next month. "
                    "Please run the renewal for both plants at the volumes in the attached sheet.\n\nAnita",
        },
        "vendors": [
            ("narmada", "excel", {"factor": 0.97, "bundle": None, "answers": OK, "payment": 45, "lead": 7}),
            ("shakti", "word", {"factor": 0.95, "missing": [], "answers": OK, "payment": 60, "lead": 10}),
            ("godavari", "pdf", {"factor": 1.0, "currency": "INR", "unit": "piece", "gst_lines": [], "answers": GOOD, "payment": 60, "lead": 18}),
        ],
        "contract_vendor": "narmada",
        "rfp_notes": {
            "narmada": "Current inner-packaging supplier; stock point inside Plant 2.",
            "shakti": "Low prices on trays; smaller capacity.",
            "godavari": "Large converter; consistent quality record.",
        },
    },
    {
        "key": "buffer", "title": "Q3 capacity buffer: regular shippers", "category": "Corrugated packaging",
        "lines": _lines([2, 3, 8, 10, 11, 18, 20, 27], 0.3, "BF"),
        "request": {
            "from": "Anita Rao, Plant Operations", "day": -3,
            "subject": "Buffer stock of shippers for the festive season",
            "body": "Pavan,\n\nFestive-season demand is 30% above plan. We need a second source for the regular shippers "
                    "for Q3 only, at the volumes in the attached sheet. Speed matters more than a long contract.\n\nAnita",
        },
        "vendors": [
            ("kaveri", "excel", {"factor": 1.03, "bundle": 100, "answers": GOOD, "payment": 60, "lead": 14}),
            ("sahyadri", "email", {"factor": 0.99, "freight_extra": True, "answers": GOOD, "payment": 60, "lead": 12}),
            ("konkan", "pdf", {"factor": 0.98, "currency": "INR", "unit": "piece", "gst_lines": [2], "answers": OK, "payment": 60, "lead": 9}),
        ],
        "rfp_notes": {
            "kaveri": "Can add a second shift for festive volumes.",
            "sahyadri": "Current supplier; limited spare capacity in Q3.",
            "konkan": "Spare capacity available from August.",
        },
    },
]


# ---------------- helpers ----------------

def _src(attachment, kind, ref, snippet, **kw):
    return {"attachment": attachment, "kind": kind, "ref": ref, "snippet": snippet, "page": kw.get("page"),
            "cell": kw.get("cell"), "paragraph": kw.get("paragraph"), "bbox": kw.get("bbox")}


def _quote(l, price, currency, unit, source, bundle_size=None, gst=False, tiers=None, confidence="high"):
    return {"line_no": l["line_no"], "vendor_label": l["description"], "price": price, "currency": currency, "unit": unit,
            "bundle_size": bundle_size, "gst_included": gst, "tiers": tiers or [], "confidence": confidence, "source": source}


def _answers(met, lead, cert_until):
    texts = {
        1: f"ISO 9001 certified, valid until {cert_until}" if met[1] else "Certification in progress",
        2: "FSC certified" if met[2] else "Not FSC certified",
        3: "BCT report with every lot" if met[3] else "BCT reports not available at present",
        4: "ECT tested in-house" if met[4] else "No in-house ECT tester",
        5: "4 lakh boxes per month" if met[5] else "2 lakh boxes per month",
        6: f"{lead} days" if met[6] else "21 days",
        7: "1 complaint in the last year" if met[7] else "4 complaints in the last year",
        8: "Buffer stock offered" if met[8] else "No buffer stock",
        9: "Supply to both plants" if met[9] else "Plant 1 only",
        10: "Two-colour flexo printing" if met[10] else "No printing",
        11: "Mill certificates shared with every lot" if met[11] else "Mill certificates not shared",
        12: "Recycled content declared" if met[12] else "No declaration",
    }
    return [{"q_no": q, "met": met[q], "answer": texts[q]} for q in range(1, 13)], texts


def _terms(o, freight="included", amount=None):
    return {"payment_days": o["payment"], "validity_days": 60, "lead_time_days": o["lead"], "freight": freight, "freight_amount": amount}


def _short(l):
    kind = {"rsc": "Shipper" if l["ply"] == 5 else "Carton", "heavy": "HD box", "tray": "Tray", "partition": "Partition",
            "pad": "Pad", "sheet": "Sheet"}[l["category"]]
    return f"{kind} {l['ply']}P {l['length_mm']}x{l['width_mm']}" + (f"x{l['height_mm']}" if l["height_mm"] else "")


# ---------------- writers: each returns (reply meta, ideal extraction) ----------------

def w_excel(path, ds, v, o, lines, prices):
    name, email, person = POOL[v]
    bundle = o.get("bundle")
    wb = Workbook()
    ws = wb.active
    ws.title = "Quote"
    ws["A1"] = f"{name.upper()} · PRICE OFFER"
    ws["A1"].font = Font(bold=True, size=13)
    ws["A2"] = (f"Rates per box (1 box = {bundle} pcs)." if bundle else "Rates per piece.") + " Delivered to both plants. GST extra."
    ws.append([])
    ws.append(["#", "Item", "Size (mm)", "Ply/GSM", f"Rate per {'box' if bundle else 'pc'} (₹)"])
    for c in ws[4]:
        c.font = Font(bold=True)
        c.fill = PatternFill("solid", fgColor="E2EFDA")
    order = list(range(len(lines)))
    random.Random(hash(ds["key"]) % 1000).shuffle(order)
    quotes = []
    for i, idx in enumerate(order, start=1):
        l = lines[idx]
        p = prices[l["line_no"]]
        shown = round(p * bundle) if bundle else round(p, 2)
        ws.append([i, _short(l), size(l).replace(" ", ""), f"{l['ply']}/{l['gsm']}", shown])
        cell = f"Quote!E{4 + i}"
        quotes.append(_quote(l, shown, "INR", "bundle" if bundle else "piece", _src(path.name, "excel", cell, str(shown), cell=cell),
                             bundle_size=bundle))
    r = ws.max_row + 2
    for k, val in [("Payment", f"{o['payment']} days"), ("Lead time", f"{o['lead']} days"), ("Validity", "60 days")]:
        ws.cell(row=r, column=1, value=k).font = Font(bold=True)
        ws.cell(row=r, column=3, value=val)
        r += 1
    answers, texts = _answers(o["answers"], o["lead"], "Mar 2028")
    qs = wb.create_sheet("Compliance")
    qs.append(["Q", "Requirement", "Response"])
    for q in QUESTIONS:
        qs.append([q["q_no"], q["text"], texts[q["q_no"]]])
    ws.column_dimensions["B"].width = 26
    qs.column_dimensions["B"].width = 50
    qs.column_dimensions["C"].width = 40
    wb.save(path)
    meta = {"subject": f"Quotation · {ds['code']}", "body": f"Dear Pavan,\n\nOur price offer is attached.\n\nRegards,\n{person}\n{name}",
            "attachments": [{"filename": path.name, "kind": "excel", "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}]}
    return meta, {"quotes": quotes, "terms": _terms(o), "answers": answers,
                  "certificates": [{"name": "ISO 9001", "valid_until": "2028-03-31", "source": _src(path.name, "excel", "Compliance!C2", texts[1], cell="Compliance!C2")}] if o["answers"][1] else []}


def w_pdf(path, ds, v, o, lines, prices):
    name, email, person = POOL[v]
    styles = getSampleStyleSheet()
    small = styles["BodyText"].clone("small", fontSize=8, leading=10)
    cur, unit = o["currency"], o["unit"]
    gst = set(o.get("gst_lines", []))
    head = f"Unit price ({cur}{' / 1,000 pcs' if unit == 'per_1000' else ' / pc'})"
    rows = [["Sr", "Description", "Size (mm)", "Ply", head, f"≥{TIER_MIN:,} pcs/yr" if o.get("tiers") else "", "Note"]]
    quotes = []
    for l in lines:
        p = prices[l["line_no"]]
        if cur == "USD":
            base = round(p / FX, 3)
        elif unit == "per_1000":
            base = round(p * 1000)
        else:
            base = round(p, 2)
        tier_ok = o.get("tiers") and l["qty_p1"] < TIER_MIN and l["qty_p2"] < TIER_MIN and l["qty_p1"] + l["qty_p2"] >= TIER_MIN
        tier = (round(base * 0.94, 3) if cur == "USD" else round(base * 0.94, 2)) if tier_ok else None
        is_gst = l["line_no"] in gst
        shown = round(base * 1.18, 3 if cur == "USD" else 2) if is_gst else base
        tier_shown = (round(tier * 1.18, 3 if cur == "USD" else 2) if is_gst else tier) if tier else None
        fmt = (lambda x: f"{x:.3f}") if cur == "USD" else ((lambda x: f"{x:,.0f}") if unit == "per_1000" else (lambda x: f"{x:,.2f}"))
        rows.append([str(l["line_no"]), f"{l['ply']} Ply {l['description'].split(',')[0]}", size(l), str(l["ply"]), fmt(shown),
                     fmt(tier_shown) if tier_shown else ("—" if o.get("tiers") else ""), "incl. 18% GST" if is_gst else ""])
        quotes.append(_quote(l, shown, cur, unit, _src(path.name, "pdf", "page 1", fmt(shown), page=1), gst=is_gst,
                             tiers=[{"min_qty": TIER_MIN, "price": tier_shown}] if tier_shown else []))
    t = Table(rows, colWidths=[8 * mm, 58 * mm, 30 * mm, 9 * mm, 28 * mm, 22 * mm, 22 * mm], repeatRows=1)
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 7.5), ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 7.5),
                           ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#efe9f6")),
                           ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#c4b8d6"))]))
    answers, texts = _answers(o["answers"], o["lead"], "Dec 2027")
    q = Table([["Q", "Requirement", "Response"]] + [[str(x["q_no"]), x["text"][:48], texts[x["q_no"]]] for x in QUESTIONS],
              colWidths=[10 * mm, 80 * mm, 80 * mm])
    q.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Helvetica", 8), ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#c4b8d6"))]))
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=14 * mm, rightMargin=14 * mm, topMargin=14 * mm)
    doc.build([Paragraph(f"<font size=15 color='#4b2a7b'><b>{name.upper()}</b></font>", styles["Title"]),
               Paragraph(f"{email} · Quotation against {ds['code']}", small), Spacer(1, 5 * mm),
               Paragraph(f"Prices in {'US Dollars' if cur == 'USD' else 'Indian Rupees'}, delivered to both plants.", small),
               Spacer(1, 3 * mm), t, Spacer(1, 3 * mm),
               Paragraph(f"Payment {o['payment']} days · Lead time {o['lead']} days · Validity 60 days.", small),
               PageBreak(), Paragraph("<b>Supplier questionnaire</b>", styles["Heading3"]), q])
    meta = {"subject": f"Offer {ds['code']} · {name}", "body": f"Dear Sir,\n\nPlease find our quotation attached.\n\nBest regards,\n{person}",
            "attachments": [{"filename": path.name, "kind": "pdf", "mime": "application/pdf"}]}
    return meta, {"quotes": quotes, "terms": _terms(o), "answers": answers,
                  "certificates": [{"name": "ISO 9001", "valid_until": "2027-12-31", "source": _src(path.name, "pdf", "page 2", texts[1], page=2)}] if o["answers"][1] else []}


def w_word(path, ds, v, o, lines, prices):
    name, email, person = POOL[v]
    doc = Document()
    doc.add_paragraph(name.upper()).runs[0].bold = True
    doc.add_paragraph(f"Sub: Our offer against {ds['code']}")
    doc.add_paragraph("Dear Pavan, we are pleased to offer as follows. All prices are per piece, ex-GST, delivered to both plants.")
    missing = set(o.get("missing", []))
    quotes = []
    chunks = [lines[i:i + 4] for i in range(0, len(lines), 4)]
    for chunk in chunks:
        parts = []
        for l in chunk:
            if l["line_no"] in missing:
                continue
            p = round(prices[l["line_no"]], 2)
            parts.append(f"the {l['description'].split(',')[0].lower()} ({size(l).replace(' × ', ' x ')}) at Rs. {p:,.2f}")
            quotes.append(_quote(l, p, "INR", "piece", _src(path.name, "word", "paragraph", f"Rs. {p:,.2f}")))
        if parts:
            doc.add_paragraph("We can supply " + "; ".join(parts) + ".")
    doc.add_paragraph(f"Payment terms: {o['payment']} days from invoice. Delivery within {o['lead']} days of PO, freight included.")
    answers, texts = _answers(o["answers"], o["lead"], "Jun 2027")
    doc.add_paragraph("On your questionnaire: " + ". ".join(texts[q] for q in range(1, 13)) + ".")
    doc.add_paragraph(f"Regards,\n{person}\n{name}")
    doc.save(path)
    meta = {"subject": f"Offer against {ds['code']}", "body": f"Dear Pavan,\n\nOur offer is attached as a Word document.\n\n{person}",
            "attachments": [{"filename": path.name, "kind": "word", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}]}
    return meta, {"quotes": quotes, "terms": _terms(o), "answers": answers, "missing_lines": sorted(missing),
                  "certificates": [{"name": "ISO 9001", "valid_until": "2027-06-30", "source": _src(path.name, "word", "paragraph", texts[1])}] if o["answers"][1] else []}


PHOTO_LABEL = {"rsc3": "3 Ply RSC cartons", "rsc5": "5 Ply RSC shippers", "heavy": "7 Ply heavy duty boxes",
               "tray": "Die-cut trays & mailers", "partition": "Partitions", "pad": "Layer pads", "sheet": "Sheets & edge protectors"}
PHOTO_RATE = {"rsc3": 45, "rsc5": 43, "heavy": 46, "tray": 51, "partition": 49, "pad": 39, "sheet": 37}


def _cat(l):
    return f"rsc{l['ply']}" if l["category"] == "rsc" else l["category"]


def w_photo(path, ds, v, o, lines, prices):
    name, email, person = POOL[v]
    cats = []
    for l in lines:
        if _cat(l) not in cats:
            cats.append(_cat(l))
    pw, ph = 1400, 220 + 85 * len(cats) + 140
    paper = Image.new("RGB", (pw, ph), (250, 248, 240))
    d = ImageDraw.Draw(paper)
    f_row = ImageFont.truetype(FONT, 38)
    d.text((80, 50), name.upper(), font=ImageFont.truetype(FONT_BOLD, 50), fill=(25, 40, 90))
    d.text((80, 120), "Rates per kg · delivered · GST extra", font=ImageFont.truetype(FONT, 28), fill=(60, 60, 60))
    d.line((80, 170, pw - 80, 170), fill=(40, 40, 40), width=3)
    regions, y = {}, 200
    for c in cats:
        d.text((90, y), PHOTO_LABEL[c], font=f_row, fill=(20, 20, 20))
        x = 90 + d.textlength(PHOTO_LABEL[c], font=f_row) + 16
        while x < 1060:
            d.text((x, y), ".", font=f_row, fill=(120, 120, 120))
            x += 18
        d.text((1080, y), f"Rs {PHOTO_RATE[c]} / kg", font=f_row, fill=(20, 20, 20))
        regions[c] = (80, y - 8, pw - 80, y + 52)
        y += 85
    d.text((90, y + 25), f"Payment {o['payment']} days · Lead time {o['lead']} days", font=ImageFont.truetype(FONT, 28), fill=(40, 40, 40))
    ow, oh = 1600, int(ph * 1.15) + 160
    src = [(0, 0), (pw, 0), (pw, ph), (0, ph)]
    dst = [(230, 120), (1380, 150), (1480, oh - 110), (120, oh - 150)]
    inv, fwd = _homography(dst, src), _homography(src, dst)
    desk = Image.new("RGB", (ow, oh), (96, 84, 70))
    mask = Image.new("L", (pw, ph), 255).transform((ow, oh), Image.Transform.PERSPECTIVE, inv)
    desk.paste(paper.transform((ow, oh), Image.Transform.PERSPECTIVE, inv, Image.Resampling.BICUBIC), (0, 0), mask)
    glare_cat = o.get("glare")
    if glare_cat in regions:
        gx0, gy0, gx1, gy1 = regions[glare_cat]
        cx, cy = _apply(fwd, 1060, (gy0 + gy1) / 2)
        glare = Image.new("L", (ow, oh), 0)
        gd = ImageDraw.Draw(glare)
        for r, a in ((300, 140), (230, 215), (170, 255)):
            gd.ellipse((cx - r * 1.5, cy - r * 0.42, cx + r * 1.5, cy + r * 0.42), fill=a)
        glare = ImageChops.multiply(glare.filter(ImageFilter.GaussianBlur(22)), mask)
        desk = Image.composite(Image.new("RGB", (ow, oh), (255, 255, 252)), desk, glare)
    desk = Image.blend(desk, Image.effect_noise((ow, oh), 18).convert("RGB"), 0.05).filter(ImageFilter.GaussianBlur(1.0))
    buf = io.BytesIO()
    desk.save(buf, "JPEG", quality=74)
    path.write_bytes(buf.getvalue())

    def bbox(c):
        x0, y0, x1, y1 = regions[c]
        pts = [_apply(fwd, x, yy) for x, yy in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return [round(min(xs) / ow, 4), round(min(ys) / oh, 4), round((max(xs) - min(xs)) / ow, 4), round((max(ys) - min(ys)) / oh, 4)]

    quotes, unreadable = [], []
    for l in lines:
        c = _cat(l)
        if c == glare_cat:
            unreadable.append(l["line_no"])
            continue
        quotes.append(_quote(l, PHOTO_RATE[c], "INR", "kg", _src(path.name, "photo", "photo region", f"Rs {PHOTO_RATE[c]} / kg", bbox=bbox(c))))
    cert_name = path.with_name(path.stem.replace("rate-card", "iso-9001") + ".pdf")
    cert_until = "2026-03-31" if o.get("expired") else "2027-09-30"
    iso_certificate(cert_name)
    if not o.get("expired"):  # the shared certificate writer prints the expired date; overwrite for a valid one
        _valid_certificate(cert_name, name, cert_until)
    answers, texts = _answers(o["answers"], o["lead"], "the attached certificate")
    meta = {"subject": f"Rates - {name}", "body": f"Pavan sir,\n\nPhoto of our rate card attached, rates per kg. ISO certificate attached.\n\n"
                                                   f"Your questions: {'. '.join(texts[q] for q in range(1, 13))}.\n\nRegards\n{person}",
            "attachments": [{"filename": path.name, "kind": "photo", "mime": "image/jpeg"},
                            {"filename": cert_name.name, "kind": "certificate", "mime": "application/pdf"}]}
    return meta, {"quotes": quotes, "unreadable_lines": unreadable, "terms": _terms(o), "answers": answers,
                  "certificates": [{"name": "ISO 9001:2015", "valid_until": cert_until, "source": _src(cert_name.name, "pdf", "page 1", "Valid until", page=1)}]}


def _valid_certificate(path, name, until):
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(path), pagesize=A4, topMargin=40 * mm)
    doc.build([Paragraph("<b>CERTIFICATE OF REGISTRATION</b>", styles["Title"]), Spacer(1, 10 * mm),
               Paragraph(f"<b>{name.upper()}</b>", styles["Heading2"]),
               Paragraph("conforms to the requirements of <b>ISO 9001:2015</b>", styles["BodyText"]), Spacer(1, 10 * mm),
               Paragraph(f"Issued: 01 October 2024 · <b>Valid until: {until}</b>", styles["BodyText"])])


def w_email(path, ds, v, o, lines, prices):
    name, email, person = POOL[v]
    rows, quotes = [], []
    for l in lines:
        p = round(prices[l["line_no"]], 2)
        rows.append(f"Item {l['line_no']} ({l['description'].split(',')[0]}): Rs {p:,.2f}")
        quotes.append(_quote(l, p, "INR", "piece", _src(None, "text", "email body", f"Rs {p:,.2f}")))
    answers, texts = _answers(o["answers"], o["lead"], "Jan 2028")
    freight = "freight extra at actuals" if o.get("freight_extra") else "freight included to both plants"
    body = (f"Hi Pavan,\n\nOur rates per piece, ex-GST, {freight}:\n\n" + "\n".join(rows) +
            f"\n\nPayment {o['payment']} days, lead time {o['lead']} days. {'. '.join(texts[q] for q in range(1, 13))}.\n\nThanks,\n{person}\n{name}")
    meta = {"subject": f"RE: {ds['code']}", "body": body, "attachments": []}
    return meta, {"quotes": quotes, "terms": _terms(o, "extra" if o.get("freight_extra") else "included"), "answers": answers,
                  "certificates": [{"name": "ISO 9001", "valid_until": "2028-01-31", "source": _src(None, "text", "email body", texts[1])}] if o["answers"][1] else []}


WRITERS = {"excel": (w_excel, "xlsx"), "pdf": (w_pdf, "pdf"), "word": (w_word, "docx"), "photo": (w_photo, "jpg"), "email": (w_email, None)}


def build(out_files: Path, codes: dict):
    result = {}
    for ds in DATASETS:
        ds = {**ds, "code": codes[ds["key"]]}
        rng = random.Random(ds["key"])
        vendors, replies, ideal = [], [], []
        for i, (v, fmt, o) in enumerate(ds["vendors"], start=1):
            code = f"V{i}"
            name, email, _ = POOL[v]
            prices = {l["line_no"]: base_price(l) * o["factor"] * rng.uniform(0.95, 1.05) for l in ds["lines"]}
            writer, ext = WRITERS[fmt]
            fname = f"{ds['key']}-{v}-{'rate-card' if fmt == 'photo' else 'quote'}.{ext}" if ext else None
            meta, x = writer(out_files / fname if fname else None, ds, v, o, ds["lines"], prices)
            vendors.append({"code": code, "name": name, "email": email, "reply_format": fmt, "rfi_note": ds["rfp_notes"][v],
                            "rfp_summary": ds["rfp_notes"][v]})
            replies.append({"vendor_code": code, "day": 2 + i * 2, **meta})
            ideal.append({"vendor_code": code, "quotes": x["quotes"], "missing_lines": x.get("missing_lines", []),
                          "unreadable_lines": x.get("unreadable_lines", []), "rest_from_last_year": False, "terms": x["terms"],
                          "discount": None, "answers": x["answers"], "certificates": x["certificates"]})
        contracts = []
        if ds.get("contract_vendor"):
            code = next(f"V{i}" for i, (v, _, _) in enumerate(ds["vendors"], start=1) if v == ds["contract_vendor"])
            contracts.append({"vendor_code": code, "contract_no": f"2025-{code}-{ds['key'][:3].upper()}", "valid_from": "2025-04-01",
                              "valid_to": "2026-03-31",
                              "lines": [{"line_no": l["line_no"], "spec_key": l["spec_key"], "description": l["description"],
                                         "price": round(base_price(l) * 1.06, 2), "unit": "piece"} for l in ds["lines"]]})
        result[ds["key"]] = {
            "key": ds["key"], "code": ds["code"], "title": ds["title"], "category": ds["category"], "lines": ds["lines"],
            "request": ds["request"], "vendors": vendors, "contracts": contracts, "replies": replies, "ideal": ideal,
            "rfi": [{"vendor_name": vv["name"], "iso_9001": True, "fsc": True, "monthly_capacity": "3.0 L boxes", "shortlisted": True,
                     "reason": ds["rfp_notes"][v]} for vv, (v, _, _) in zip(vendors, ds["vendors"])],
        }
    return result
