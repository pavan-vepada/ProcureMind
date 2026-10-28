"""Generates the Procure Mind demo dataset.

Writes sample-data/demo.json (RFQ lines, questionnaire, contracts, vendor messages, answer key)
and sample-data/files/* (the vendor replies in Excel, PDF, Word, phone photo and email text).

Usage (from tools/dataset):  uv run procure-mind-dataset ../../sample-data
"""
import json
import random
import sys
from pathlib import Path

from . import extra, files, ideal
from .model import FX, LINES, QUESTIONS, base_price, weight_kg


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "../../sample-data").resolve()
    (out / "files").mkdir(parents=True, exist_ok=True)
    rng = random.Random(2026)

    prices = build_prices(rng)
    contracts = build_contracts()
    replies = files.write_all(out / "files", prices, contracts)
    v4_truth = next(r for r in replies["replies"] if r["vendor_code"] == "V4").pop("truth_regions")

    demo = {
        "fx_rate": FX,
        "lines": [line_json(l) for l in LINES],
        "questions": QUESTIONS,
        "contracts": contracts,
        "replies": replies["replies"],
        "clarification_replies": replies["clarifications"],
        "ideal_extraction": ideal.build(prices, v4_truth),
        "answer_key": answer_key(prices, contracts),
    }
    (out / "demo.json").write_text(json.dumps(demo, indent=1, ensure_ascii=False), encoding="utf-8")

    codes = {"launch": "RFX-2026-021", "export": "RFX-2026-017", "inner": "RFX-2026-009", "buffer": "RFX-2026-019"}
    extras = extra.build(out / "files", codes)
    (out / "extra.json").write_text(json.dumps(extras, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote demo.json, extra.json ({', '.join(extras)}) and {len(list((out / 'files').iterdir()))} files")


def line_json(l):
    return {**l, "est_weight_kg": round(weight_kg(l), 4), "spec_key": spec_key(l)}


def spec_key(l):
    return f"{l['category']}|{l['ply']}|{l['gsm']}|{l['length_mm']}x{l['width_mm']}x{l['height_mm']}"


def build_prices(rng):
    """The true price per piece (₹, pre-GST, delivered) each vendor offers, before encoding traps."""
    prices = {}
    for l in LINES:
        b = base_price(l)
        n = l["line_no"]
        prices[("V1", n)] = round(b * 1.00 * rng.uniform(0.95, 1.05) * 100) / 100  # bundle price is whole ₹
        prices[("V2", n)] = b * 0.985 * rng.uniform(0.95, 1.04)
        prices[("V3", n)] = round(b * 0.93 * rng.uniform(0.96, 1.03), 2)
    return prices


def build_contracts():
    """Last year's contracts. V5 covered everything that existed last year; V4 the inner packaging."""
    v5 = [{"line_no": l["line_no"], "spec_key": spec_key(l), "description": l["description"],
           "price": round(base_price(l) * 1.05, 2), "unit": "piece"}
          for l in LINES if not l.get("is_new")]
    v4 = [{"line_no": l["line_no"], "spec_key": spec_key(l), "description": l["description"],
           "price": round(base_price(l) * 1.07, 2), "unit": "piece"}
          for l in LINES if l["category"] in ("tray", "partition") and not l.get("is_new")]
    return [
        {"vendor_code": "V5", "contract_no": "2025-V5", "valid_from": "2025-04-01", "valid_to": "2026-03-31", "lines": v5},
        {"vendor_code": "V4", "contract_no": "2025-V4", "valid_from": "2025-04-01", "valid_to": "2026-03-31", "lines": v4},
    ]


def answer_key(prices, contracts):
    """Correct normalized ₹/piece per plant, after the clarification replies, at default assumptions
    (V2's conditional 5% discount not applied, GST removed, V5 freight as stated in its clarification)."""
    from .model import (V2_GST_LINES, V2_TIER_MIN, V4_RATES, V4_UNREADABLE, V5_FREIGHT, V5_NEW_LINE_PRICES,
                        V5_RATES, is_rsc, v2_prices, v4_category)
    v5_contract = {c["line_no"]: c["price"] for c in contracts[0]["lines"]}
    key = []
    for l in LINES:
        n = l["line_no"]
        w = weight_kg(l)
        row = {"line_no": n, "vendors": {}}
        usd_base, usd_tier = v2_prices(n, prices[("V2", n)])
        if n in V2_GST_LINES:  # the PDF prints GST-inclusive prices, rounded; work back from what is printed
            usd_base = round(usd_base * 1.18, 3) / 1.18
            usd_tier = round(usd_tier * 1.18, 3) / 1.18 if usd_tier is not None else None
        for plant, qty in (("p1", l["qty_p1"]), ("p2", l["qty_p2"])):
            usd = usd_tier if usd_tier is not None and qty >= V2_TIER_MIN else usd_base
            cat = v4_category(l)
            if l.get("is_new"):
                v5 = V5_NEW_LINE_PRICES[n]
            else:
                v5 = w * V5_RATES[l["ply"]] if is_rsc(l) else v5_contract[n]
            values = {
                "V1": prices[("V1", n)],
                "V2": usd * FX,
                "V3": prices[("V3", n)],
                "V4": None if cat == V4_UNREADABLE else w * V4_RATES[cat],
                "V5": v5 + V5_FREIGHT,
            }
            for v, p in values.items():
                row["vendors"].setdefault(v, {})[plant] = None if p is None else round(p, 2)
        key.append(row)
    return key
