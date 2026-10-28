"use client";

import { useEffect, useRef, useState } from "react";

type Box = { left: number; top: number; width: number; height: number };
const norm = (s: string) => s.replace(/[\s,₹$]/g, "").toLowerCase();

/** Renders one page of the vendor's original PDF and highlights the text the value was read from. */
export function PdfPage({ url, page, snippet }: { url: string; page: number; snippet: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url });
        const doc = await task.promise;
        const p = await doc.getPage(Math.min(page, doc.numPages));
        const width = canvas.current?.parentElement?.clientWidth ?? 560;
        const scale = width / p.getViewport({ scale: 1 }).width;
        const vp = p.getViewport({ scale });
        const c = canvas.current;
        if (!c || cancelled) return;
        const ratio = window.devicePixelRatio || 1;
        c.width = vp.width * ratio;
        c.height = vp.height * ratio;
        c.style.width = `${vp.width}px`;
        c.style.height = `${vp.height}px`;
        await p.render({ canvas: c, viewport: vp, transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }).promise;
        setSize({ w: vp.width, h: vp.height });

        const target = norm(snippet);
        const content = await p.getTextContent();
        const found: Box[] = [];
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const s = norm(item.str);
          if (!target || !(s === target || (target.length >= 4 && s.includes(target)) || (s.length >= 4 && target.includes(s)))) continue;
          const [, , , , x, y] = pdfjs.Util.transform(vp.transform, item.transform);
          const h = item.height * scale;
          found.push({ left: x - 3, top: y - h - 2, width: item.width * scale + 6, height: h + 5 });
        }
        if (!cancelled) setBoxes(found.slice(0, 3));
        await task.destroy();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't render the PDF");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, page, snippet]);

  if (error) return <p className="rounded-lg bg-bad p-3 text-sm">Couldn&apos;t show the PDF here. <a href={url} target="_blank" className="underline">Open the original</a>.</p>;
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      <canvas ref={canvas} className="block" />
      {size &&
        boxes.map((b, i) => (
          <div key={i} className="pointer-events-none absolute rounded-sm border-2 border-[#e03131] bg-[#e03131]/10" style={{ left: b.left, top: b.top, width: b.width, height: b.height }} />
        ))}
      {!size && <div className="h-96 animate-pulse bg-panel" />}
    </div>
  );
}
