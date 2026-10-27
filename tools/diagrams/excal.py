"""Tiny helper to generate .excalidraw scene files."""
import json
import random
import textwrap

INK = "#1e1e1e"
MUTED = "#495057"
BLUE = "#d0ebff"
BLUE_D = "#a5d8ff"
GREEN = "#d3f9d8"
YELLOW = "#fff3bf"
RED = "#ffe3e3"
PURPLE = "#e5dbff"
ORANGE = "#ffe8cc"
GRAY = "#f1f3f5"
WHITE = "#ffffff"

CHAR_W = 0.55  # average glyph width as a fraction of font size (font family 2)
LINE_H = 1.25


def _rid():
    return "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(16))


def wrap(text, width_px, size):
    per_line = max(8, int((width_px - 16) / (size * CHAR_W)))
    out = []
    for para in text.split("\n"):
        out.extend(textwrap.wrap(para, per_line) or [""])
    return out


def text_height(text, width_px, size):
    return len(wrap(text, width_px, size)) * size * LINE_H


class Scene:
    def __init__(self):
        self.els = []
        self.by_id = {}

    def _base(self, typ, x, y, w, h, **kw):
        el = {
            "id": kw.pop("id", None) or _rid(), "type": typ,
            "x": x, "y": y, "width": w, "height": h, "angle": 0,
            "strokeColor": kw.pop("stroke", INK),
            "backgroundColor": kw.pop("bg", "transparent"),
            "fillStyle": "solid", "strokeWidth": kw.pop("sw", 1),
            "strokeStyle": kw.pop("style", "solid"), "roughness": kw.pop("rough", 1),
            "opacity": 100, "groupIds": [], "frameId": None,
            "roundness": kw.pop("roundness", {"type": 3}),
            "seed": random.randint(1, 2**31), "version": 1,
            "versionNonce": random.randint(1, 2**31), "isDeleted": False,
            "boundElements": [], "updated": 1, "link": None, "locked": False,
        }
        el.update(kw)
        self.els.append(el)
        self.by_id[el["id"]] = el
        return el

    def _text_el(self, x, y, w, h, text, size, color, align, valign, container=None):
        lines = wrap(text, w, size) if container else text.split("\n")
        body = "\n".join(lines)
        return self._base(
            "text", x, y, w, h, stroke=color, roundness=None,
            text=body, originalText=body, fontSize=size, fontFamily=2,
            textAlign=align, verticalAlign=valign, containerId=container,
            lineHeight=LINE_H, baseline=int(size * 0.9), autoResize=True,
        )

    def text(self, x, y, text, size=16, color=INK, align="left"):
        lines = text.split("\n")
        w = max(len(l) for l in lines) * size * CHAR_W
        h = len(lines) * size * LINE_H
        return self._text_el(x, y, w, h, text, size, color, align, "top")["id"]

    def box(self, x, y, w, h, text="", bg=WHITE, size=14, shape="rectangle",
            stroke=INK, style="solid", align="center", valign="middle", sw=1):
        rect = self._base(shape, x, y, w, h, bg=bg, stroke=stroke, style=style, sw=sw,
                          roundness={"type": 3} if shape == "rectangle" else {"type": 2})
        if text:
            inner_w = w - 16 if shape == "rectangle" else w * 0.65
            th = text_height(text, inner_w + 16, size)
            t = self._text_el(x + (w - inner_w) / 2, y + (h - th) / 2, inner_w, th,
                              text, size, INK, align, valign, container=rect["id"])
            rect["boundElements"].append({"type": "text", "id": t["id"]})
        return rect["id"]

    def line(self, x1, y1, x2, y2, color=MUTED, style="dashed"):
        self._base("line", x1, y1, x2 - x1, y2 - y1, stroke=color, style=style,
                   roundness=None, points=[[0, 0], [x2 - x1, y2 - y1]],
                   lastCommittedPoint=None, startBinding=None, endBinding=None,
                   startArrowhead=None, endArrowhead=None)

    def arrow(self, a, b, label=None, style="solid", color=INK, side=None):
        A, B = self.by_id[a], self.by_id[b]
        if side == "below":
            return self._arrow_below(A, B, label, style, color)
        acx, acy = A["x"] + A["width"] / 2, A["y"] + A["height"] / 2
        bcx, bcy = B["x"] + B["width"] / 2, B["y"] + B["height"] / 2
        horizontal = side == "h" or (side is None and abs(bcx - acx) > abs(bcy - acy) * 0.6)
        if horizontal:
            if bcx >= acx:
                sx, ex = A["x"] + A["width"], B["x"]
            else:
                sx, ex = A["x"], B["x"] + B["width"]
            sy, ey = acy, bcy
        else:
            if bcy >= acy:
                sy, ey = A["y"] + A["height"], B["y"]
            else:
                sy, ey = A["y"], B["y"] + B["height"]
            sx, ex = acx, bcx
        gap = 4
        arr = self._base(
            "arrow", sx, sy, ex - sx, ey - sy, stroke=color, style=style,
            roundness={"type": 2}, points=[[0, 0], [ex - sx, ey - sy]],
            lastCommittedPoint=None,
            startBinding={"elementId": a, "focus": 0, "gap": gap},
            endBinding={"elementId": b, "focus": 0, "gap": gap},
            startArrowhead=None, endArrowhead="arrow", elbowed=False,
        )
        A["boundElements"].append({"type": "arrow", "id": arr["id"]})
        B["boundElements"].append({"type": "arrow", "id": arr["id"]})
        if label:
            size = 13
            lines = label.split("\n")
            w = max(len(l) for l in lines) * size * CHAR_W
            h = len(lines) * size * LINE_H
            t = self._text_el(sx + (ex - sx) / 2 - w / 2, sy + (ey - sy) / 2 - h / 2, w, h,
                              label, size, color, "center", "middle", container=arr["id"])
            t["text"] = t["originalText"] = label
            arr["boundElements"].append({"type": "text", "id": t["id"]})
        return arr["id"]

    def _arrow_below(self, A, B, label, style, color, drop=10):
        """Elbow route: down from A's bottom, across, up into B's bottom."""
        sx, sy = A["x"] + A["width"] / 2, A["y"] + A["height"]
        ex, ey = B["x"] + B["width"] / 2, B["y"] + B["height"]
        low = max(sy, ey) + drop
        pts = [[0, 0], [0, low - sy], [ex - sx, low - sy], [ex - sx, ey - sy]]
        arr = self._base(
            "arrow", sx, sy, abs(ex - sx), low - min(sy, ey), stroke=color, style=style,
            roundness=None, points=pts, lastCommittedPoint=None,
            startBinding={"elementId": A["id"], "focus": 0, "gap": 4},
            endBinding={"elementId": B["id"], "focus": 0, "gap": 4},
            startArrowhead=None, endArrowhead="arrow", elbowed=False,
        )
        A["boundElements"].append({"type": "arrow", "id": arr["id"]})
        B["boundElements"].append({"type": "arrow", "id": arr["id"]})
        if label:
            self.text(sx + (ex - sx) / 2 - 60, low + 6, label.replace("\n", " "), 13, color)
        return arr["id"]

    def save(self, path):
        doc = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
               "elements": self.els,
               "appState": {"viewBackgroundColor": "#ffffff", "gridSize": None},
               "files": {}}
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=1)


# ---------- layouts ----------

def journey_map(s, x0, y0, title, subtitle, lanes, stages, lane_colors,
                col_w=270, label_w=170, size=14):
    """Columns = stages, rows = lanes. stages: [(name, [cell text per lane])]."""
    s.text(x0, y0, title, 32)
    s.text(x0, y0 + 46, subtitle, 16, MUTED)
    y = y0 + 100
    head_h = 64
    gap = 10
    # stage headers with arrows
    heads = []
    for i, (name, _) in enumerate(stages):
        hx = x0 + label_w + gap + i * (col_w + gap)
        heads.append(s.box(hx, y, col_w, head_h, f"{i + 1}. {name}", BLUE_D, 16, sw=2))
    for a, b in zip(heads, heads[1:]):
        s.arrow(a, b)
    y += head_h + gap
    for li, lane in enumerate(lanes):
        row_h = max(text_height(cells[li], col_w, size) for _, cells in stages) + 28
        row_h = max(row_h, 70)
        s.box(x0, y, label_w, row_h, lane, GRAY, 15, sw=2)
        for i, (_, cells) in enumerate(stages):
            cx = x0 + label_w + gap + i * (col_w + gap)
            s.box(cx, y, col_w, row_h, cells[li], lane_colors[li], size, align="left")
        y += row_h + gap
    return y


def swimlane(s, x0, y0, title, subtitle, lanes, nodes, edges, lane_colors,
             col_w=230, node_w=200, node_h=110, lane_h=170, label_w=160, size=14):
    """nodes: {id: (lane, col, text, shape)}; edges: [(a, b, label, style)]."""
    s.text(x0, y0, title, 32)
    s.text(x0, y0 + 46, subtitle, 16, MUTED)
    y = y0 + 100
    ncols = max(n[1] for n in nodes.values()) + 1
    width = label_w + ncols * col_w + 20
    for li, lane in enumerate(lanes):
        ly = y + li * lane_h
        s.box(x0, ly, label_w, lane_h - 10, lane, GRAY, 16, sw=2)
        s.box(x0 + label_w + 10, ly, width - label_w - 10, lane_h - 10, "",
              lane_colors[li], style="dashed", stroke="#adb5bd")
    ids = {}
    for key, (lane, col, text, shape) in nodes.items():
        nx = x0 + label_w + 20 + col * col_w + (col_w - node_w) / 2
        ny = y + lane * lane_h + (lane_h - 10 - node_h) / 2
        bg = YELLOW if shape == "diamond" else WHITE
        w = node_w + 30 if shape == "diamond" else node_w
        h = node_h + 30 if shape == "diamond" else node_h
        ids[key] = s.box(nx - (w - node_w) / 2, ny - (h - node_h) / 2, w, h, text, bg, size,
                         shape=shape, sw=2 if shape != "rectangle" else 1)
    for e in edges:
        a, b, label, style = e[:4]
        side = e[4] if len(e) > 4 else None
        s.arrow(ids[a], ids[b], label, style or "solid", side=side)
    return y + len(lanes) * lane_h
