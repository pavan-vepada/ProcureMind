"""The demo's ground truth: RFQ lines, questionnaire, and how each vendor prices.

The box-weight estimate must match lib/engine/weight.ts exactly; tests compare both against the answer key.
"""

FX = 84.0  # ₹ per USD, locked on the RFx

# category: rsc (regular slotted container), heavy (7-ply RSC), tray (die-cut), partition, pad, sheet
_L = [
    # no, description, category, ply, gsm, bf, flute, L, W, H, qty_p1, qty_p2
    (1, "RSC shipper, large (5 L × 4)", "rsc", 5, 150, 22, "BC", 500, 400, 300, 60000, 45000),
    (2, "RSC shipper, medium (2 L × 6)", "rsc", 5, 140, 20, "BC", 400, 300, 250, 52000, 40000),
    (3, "RSC carton, sachet bundle", "rsc", 3, 120, 18, "B", 300, 200, 150, 90000, 70000),
    (4, "Heavy-duty export box", "heavy", 7, 180, 25, "BCB", 600, 400, 400, 12000, 8000),
    (5, "Die-cut tray, 2 L bottles", "tray", 3, 120, 16, "E", 350, 250, 80, 40000, 30000),
    (6, "Partition set 4 × 6", "partition", 3, 120, 16, "B", 380, 280, 200, 25000, 18000),
    (7, "Layer pad 1000 × 1200", "pad", 3, 120, 16, "B", 1200, 1000, 0, 15000, 12000),
    (8, "RSC shipper, 1 L × 12", "rsc", 5, 140, 20, "BC", 360, 270, 230, 70000, 50000),
    (9, "RSC shipper, refill pouches", "rsc", 5, 140, 20, "BC", 420, 320, 280, 58000, 48000),
    (10, "RSC carton, 500 ml × 24", "rsc", 3, 120, 18, "B", 320, 240, 200, 85000, 60000),
    (11, "RSC carton, tablets", "rsc", 3, 120, 18, "B", 250, 180, 120, 95000, 75000),
    (12, "Die-cut tray, 5 L cans", "tray", 5, 140, 20, "BC", 420, 320, 100, 30000, 22000),
    (13, "RSC shipper, gift pack", "rsc", 5, 150, 22, "BC", 450, 350, 300, 20000, 15000),
    (14, "Die-cut display tray", "tray", 3, 120, 16, "E", 400, 300, 90, 35000, 25000),
    (15, "Partition set 3 × 4", "partition", 3, 120, 16, "B", 300, 220, 180, 28000, 20000),
    (16, "Layer pad 800 × 1200", "pad", 3, 120, 16, "B", 1200, 800, 0, 18000, 14000),
    (17, "Heavy-duty drum box", "heavy", 7, 180, 25, "BCB", 500, 500, 600, 6000, 4000),
    (18, "RSC carton, sample kits", "rsc", 3, 120, 18, "B", 220, 160, 100, 40000, 30000),
    (19, "RSC shipper, slim", "rsc", 5, 140, 20, "BC", 480, 220, 300, 45000, 35000),
    (20, "RSC carton, spare parts", "rsc", 3, 120, 18, "B", 280, 200, 200, 30000, 25000),
    (21, "RSC shipper, 5 L × 2", "rsc", 5, 150, 22, "BC", 380, 190, 330, 50000, 40000),
    (22, "Heavy-duty pallet sleeve", "heavy", 7, 180, 25, "BCB", 1000, 800, 500, 3000, 2000),
    (23, "Corrugated sheet 1000 × 800", "sheet", 3, 120, 16, "B", 1000, 800, 0, 20000, 15000),
    (24, "Die-cut mailer box", "tray", 3, 150, 18, "E", 300, 250, 80, 25000, 20000),
    (25, "RSC carton, 1 L bottles × 6", "rsc", 3, 140, 18, "B", 260, 180, 280, 60000, 45000),
    (26, "Partition set 2 × 3", "partition", 3, 120, 16, "B", 240, 170, 200, 30000, 22000),
    (27, "RSC shipper, 2 L × 4", "rsc", 5, 140, 20, "BC", 330, 330, 300, 40000, 30000),
    (28, "Edge-protector sheet 600 × 400", "sheet", 3, 120, 16, "B", 600, 400, 0, 20000, 15000),
    (29, "Heavy-duty RSC, new export line", "heavy", 7, 180, 25, "BCB", 550, 450, 450, 8000, 6000),
    (30, "Partition set 6 × 4, tall", "partition", 3, 140, 18, "B", 420, 300, 300, 15000, 12000),
]

LINES = [
    {"line_no": n, "item_code": f"PM-{n:02d}", "description": d, "category": c, "ply": p, "gsm": g, "bf": bf,
     "flute": f, "length_mm": L, "width_mm": W, "height_mm": H, "qty_p1": q1, "qty_p2": q2,
     "is_new": n in (29, 30)}
    for (n, d, c, p, g, bf, f, L, W, H, q1, q2) in _L
]
LINE = {l["line_no"]: l for l in LINES}


def weight_kg(l) -> float:
    """Estimated weight of one piece: board area × board grammage. Mirrors lib/engine/weight.ts."""
    L, W, H = l["length_mm"], l["width_mm"], l["height_mm"]
    c = l["category"]
    if c in ("rsc", "heavy"):
        area = (2 * (L + W) + 40) * (H + W)
    elif c == "tray":
        area = (L + 2 * H) * (W + 2 * H)
    elif c == "partition":
        area = (L + W) * H * 3
    else:  # pad, sheet
        area = L * W
    ply = l["ply"]
    liners, flutes = (ply + 1) // 2, ply // 2
    board_gsm = l["gsm"] * liners + 120 * 1.4 * flutes
    return area / 1e6 * board_gsm / 1000


def base_price(l) -> float:
    return weight_kg(l) * 41 + 1.5


def is_rsc(l) -> bool:
    return l["category"] == "rsc"


# V2 quotes in USD with a volume tier at 100,000 pieces a year.
V2_TIER_MIN = 100_000
V2_TIER_LINES = [l["line_no"] for l in LINES
                 if l["qty_p1"] < V2_TIER_MIN and l["qty_p2"] < V2_TIER_MIN and l["qty_p1"] + l["qty_p2"] >= V2_TIER_MIN]
V2_GST_LINES = (3, 8)


def v2_prices(line_no, true_inr):
    """(base USD price, tier USD price or None) as printed on V2's PDF."""
    base = round(true_inr / FX, 3)
    tier = round(base * 0.94, 3) if line_no in V2_TIER_LINES else None
    return base, tier


# V4 prices by weight, per product type, on a rate card photographed at an angle.
V4_RATES = {"rsc3": 46, "rsc5": 44, "heavy": 47, "tray": 52, "partition": 50, "pad": 40}
V4_UNREADABLE = "sheet"  # the glare covers this row


def v4_category(l) -> str:
    if l["category"] == "rsc":
        return f"rsc{l['ply']}"
    return l["category"]


# V5: "₹42/kg for the 5-ply, 38 for the 3-ply, rest same as last year, freight extra"
V5_RATES = {5: 42, 3: 38}
V5_FREIGHT = 1.10  # stated in its clarification reply
V5_NEW_LINE_PRICES = {29: round(base_price(LINE[29]) * 1.01, 2), 30: round(base_price(LINE[30]) * 0.99, 2)}

V3_MISSING = (12, 14, 19)

QUESTIONS = [
    {"q_no": 1, "text": "Valid ISO 9001 certificate (attach a copy)", "points": 15, "required": True},
    {"q_no": 2, "text": "FSC chain-of-custody certification", "points": 5, "required": False},
    {"q_no": 3, "text": "BCT test reports for 5- and 7-ply boxes", "points": 15, "required": True},
    {"q_no": 4, "text": "In-house ECT / edge-crush testing", "points": 10, "required": False},
    {"q_no": 5, "text": "Monthly capacity of at least 3 lakh boxes", "points": 10, "required": False},
    {"q_no": 6, "text": "Lead time of 14 days or less", "points": 10, "required": False},
    {"q_no": 7, "text": "No more than 2 quality incidents in the last 12 months", "points": 10, "required": False},
    {"q_no": 8, "text": "Buffer stock offered for top items", "points": 5, "required": False},
    {"q_no": 9, "text": "Delivery to both plants (Pune and Nashik)", "points": 5, "required": False},
    {"q_no": 10, "text": "Two-colour flexo printing capability", "points": 5, "required": False},
    {"q_no": 11, "text": "Paper-mill certificates for raw-material traceability", "points": 5, "required": False},
    {"q_no": 12, "text": "Recycled-content declaration", "points": 5, "required": False},
]

VENDORS = {
    "V1": {"name": "Kaveri Corrugators", "email": "sales@kaveri-corrugators.example"},
    "V2": {"name": "Deccan Boxboard Exports", "email": "quotes@deccan-boxboard.example"},
    "V3": {"name": "Shakti Pack Works", "email": "sales@shakti-packworks.example"},
    "V4": {"name": "Narmada Cartons", "email": "office@narmada-cartons.example"},
    "V5": {"name": "Sahyadri Paperpack", "email": "accounts@sahyadri-paperpack.example"},
}
