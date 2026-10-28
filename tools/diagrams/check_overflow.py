"""Report boxes whose wrapped text is taller than the box. Usage: python3 check_overflow.py <files...>"""
import json
import sys

for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as f:
        els = {e["id"]: e for e in json.load(f)["elements"]}
    for e in els.values():
        box = els.get(e.get("containerId"))
        if e["type"] == "text" and box and box["type"] != "arrow" and e["height"] > box["height"] + 1:
            print(path, round(box["height"]), round(e["height"]), repr(e["text"][:60]))
