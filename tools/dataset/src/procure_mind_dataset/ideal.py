"""What a perfect reading of each vendor reply looks like.

Same shape as the app's extraction output (lib/extract/schema.ts). Used to test the engine against the
answer key, to score live AI extraction, and as the presenter-only saved run.
"""
import random

from .model import (
    LINE, LINES, V2_GST_LINES, V3_MISSING, V4_RATES, V4_UNREADABLE, V5_NEW_LINE_PRICES, V5_RATES, v2_prices,
    v4_category,
)

TIER_MIN = 100_000


def _src(attachment, kind, ref, snippet, **kw):
    return {"attachment": attachment, "kind": kind, "ref": ref, "snippet": snippet,
            "page": kw.get("page"), "cell": kw.get("cell"), "paragraph": kw.get("paragraph"),
            "bbox": kw.get("bbox")}


def _quote(n, price, currency, unit, source, bundle_size=None, gst=False, tiers=None, confidence="high"):
    return {"line_no": n, "vendor_label": LINE[n]["description"], "price": price, "currency": currency,
            "unit": unit, "bundle_size": bundle_size, "gst_included": gst, "tiers": tiers or [],
            "confidence": confidence, "source": source}


def _answers(met):
    return [{"q_no": q, "met": m, "answer": a} for q, (m, a) in met.items()]


def build(prices, v4_truth):
    order = [l["line_no"] for l in LINES]
    random.Random(7).shuffle(order)  # same shuffle as V1's sheet
    v1_row = {n: 6 + i for i, n in enumerate(order)}

    v1 = {
        "vendor_code": "V1",
        "quotes": [_quote(n, round(prices[("V1", n)] * 100), "INR", "bundle",
                          _src("kaveri-quotation.xlsx", "excel", f"Quotation!E{v1_row[n]}",
                               str(round(prices[("V1", n)] * 100)), cell=f"Quotation!E{v1_row[n]}"),
                          bundle_size=100) for n in range(1, 31)],
        "missing_lines": [], "unreadable_lines": [], "rest_from_last_year": False,
        "terms": {"payment_days": 60, "validity_days": 60, "lead_time_days": 14, "freight": "included",
                  "freight_amount": None},
        "discount": None,
        "answers": _answers({1: (True, "ISO 9001 valid until Aug 2027"), 2: (True, "FSC"), 3: (True, "BCT with every lot"),
                             4: (True, "In-house lab"), 5: (True, "4 lakh"), 6: (True, "14 days"), 7: (True, "1"),
                             8: (True, "1 week"), 9: (True, "Yes"), 10: (True, "Yes"), 11: (True, "Yes"), 12: (True, "Yes")}),
        "certificates": [],
    }

    v2_quotes = []
    for n in range(1, 31):
        base, tier = v2_prices(n, prices[("V2", n)])
        gst = n in V2_GST_LINES
        shown = round(base * 1.18, 3) if gst else base
        tiers = [{"min_qty": TIER_MIN, "price": round(tier * 1.18, 3) if gst else tier}] if tier else []
        v2_quotes.append(_quote(n, shown, "USD", "piece",
                                _src("deccan-boxboard-quote.pdf", "pdf", "page 1", f"{shown:.3f}", page=1),
                                gst=gst, tiers=tiers))
    v2 = {
        "vendor_code": "V2", "quotes": v2_quotes, "missing_lines": [], "unreadable_lines": [],
        "rest_from_last_year": False,
        "terms": {"payment_days": 60, "validity_days": 90, "lead_time_days": 21, "freight": "included",
                  "freight_amount": None},
        "discount": {"pct": 5, "min_qty": 50000,
                     "condition": "An additional 5% volume discount applies on orders above 50,000 pcs per item.",
                     "scope_clear": False},
        "answers": _answers({1: (True, "Valid until Jan 2027"), 2: (True, "Yes"), 3: (True, "External lab"),
                             4: (False, "Outsourced"), 5: (True, "6.5 lakh"), 6: (False, "21 days"), 7: (True, "2"),
                             8: (False, "Not offered"), 9: (True, "Yes"), 10: (True, "Yes"), 11: (True, "Yes"),
                             12: (True, "Yes")}),
        "certificates": [],
    }

    v3 = {
        "vendor_code": "V3",
        "quotes": [_quote(n, prices[("V3", n)], "INR", "piece",
                          _src("shakti-quote.docx", "word", "paragraph", f"Rs. {prices[('V3', n)]:,.2f}"))
                   for n in range(1, 31) if n not in V3_MISSING],
        "missing_lines": list(V3_MISSING), "unreadable_lines": [], "rest_from_last_year": False,
        "terms": {"payment_days": 30, "validity_days": 60, "lead_time_days": 10, "freight": "included",
                  "freight_amount": None},
        "discount": None,
        "answers": _answers({1: (True, "Valid until May 2027"), 2: (False, "Not FSC"), 3: (False, "Not available"),
                             4: (False, "No ECT tester"), 5: (False, "2.5 lakh"), 6: (True, "10 days"), 7: (False, "3"),
                             8: (True, "Yes"), 9: (True, "Yes"), 10: (True, "Yes"), 11: (True, "Yes"), 12: (True, "Yes")}),
        "certificates": [],
    }

    v4_quotes, v4_unreadable = [], []
    for l in LINES:
        cat = v4_category(l)
        if cat == V4_UNREADABLE:
            v4_unreadable.append(l["line_no"])
            continue
        v4_quotes.append(_quote(l["line_no"], V4_RATES[cat], "INR", "kg",
                                _src("narmada-rate-card.jpg", "photo", "photo region", f"Rs {V4_RATES[cat]} / kg",
                                     bbox=v4_truth[cat]),
                                confidence="medium" if cat == "pad" else "high"))
    v4 = {
        "vendor_code": "V4", "quotes": v4_quotes, "missing_lines": [], "unreadable_lines": v4_unreadable,
        "rest_from_last_year": False,
        "terms": {"payment_days": 45, "validity_days": 30, "lead_time_days": 7, "freight": "included",
                  "freight_amount": None},
        "discount": None,
        "answers": _answers({1: (True, "Certificate attached"), 2: (False, "No FSC"), 3: (True, "Yes"),
                             4: (True, "In-house"), 5: (True, "3 lakh"), 6: (True, "7 days"), 7: (True, "2"),
                             8: (True, "Stock point in Plant 2"), 9: (True, "Yes"), 10: (False, "No"),
                             11: (True, "Yes"), 12: (False, "No")}),
        "certificates": [{"name": "ISO 9001:2015", "valid_until": "2026-03-31",
                          "source": _src("narmada-iso-9001.pdf", "pdf", "page 1", "Valid until: 31 March 2026", page=1)}],
    }

    rsc = [l["line_no"] for l in LINES if l["category"] == "rsc"]
    v5 = {
        "vendor_code": "V5",
        "quotes": [_quote(n, V5_RATES[LINE[n]["ply"]], "INR", "kg",
                          _src(None, "text", "email body",
                               "₹42/kg for the 5-ply" if LINE[n]["ply"] == 5 else "38 for the 3-ply"))
                   for n in rsc],
        "missing_lines": [], "unreadable_lines": [], "rest_from_last_year": True,
        "terms": {"payment_days": 60, "validity_days": None, "lead_time_days": 12, "freight": "extra",
                  "freight_amount": None},
        "discount": None,
        "answers": _answers({1: (True, "ISO valid till Feb 2027"), 2: (True, "FSC"), 3: (True, "Every lot"),
                             4: (True, "In-house"), 5: (True, "3.5 lakh"), 6: (True, "12 days"), 7: (True, "0"),
                             8: (True, "Yes"), 9: (True, "Yes"), 10: (True, "Two colours"), 11: (False, "Not shared"),
                             12: (True, "Declared")}),
        "certificates": [],
    }

    clar_v3 = {
        "vendor_code": "V3",
        "quotes": [_quote(n, prices[("V3", n)], "INR", "piece",
                          _src(None, "text", "email body", f"Rs. {prices[('V3', n)]:,.2f}")) for n in V3_MISSING],
        "missing_lines": [], "unreadable_lines": [], "rest_from_last_year": False,
        "terms": {"payment_days": 60, "validity_days": None, "lead_time_days": None, "freight": None,
                  "freight_amount": None},
        "discount": None, "answers": [], "certificates": [],
    }
    clar_v5 = {
        "vendor_code": "V5",
        "quotes": [_quote(n, V5_NEW_LINE_PRICES[n], "INR", "piece",
                          _src(None, "text", "email body", f"Rs {V5_NEW_LINE_PRICES[n]:,.2f}")) for n in (29, 30)],
        "missing_lines": [], "unreadable_lines": [], "rest_from_last_year": False,
        "terms": {"payment_days": None, "validity_days": None, "lead_time_days": None, "freight": "extra",
                  "freight_amount": 1.10},
        "discount": None, "answers": [], "certificates": [],
    }
    return {"replies": [v1, v2, v3, v4, v5], "clarifications": [clar_v3, clar_v5]}
