"use client";

import { Check, ExternalLink, Mail, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { acceptIssue, editQuote } from "@/app/rfx/actions";
import { getSourceView, type SourcePayload } from "@/app/rfx/source-actions";
import { Badge, Button } from "@/components/ui";
import { PdfPage } from "@/components/pdf-page";
import type { Step } from "@/lib/engine/types";
import { inr } from "@/lib/format";

export type DrawerTarget = {
  quoteId?: string | null;
  issueId?: string | null;
  vendorCode: string;
  lineId?: string | null;
  title?: string;
  value?: number | null;
  steps1?: Step[];
  steps2?: Step[];
  qty?: [number, number];
  issueIds?: string[];
  issueTitles?: string[];
  badges?: string[];
};

const PROV: Record<string, [string, "ok" | "info" | "clar" | "accent"]> = {
  vendor: ["From the vendor's reply", "ok"],
  contract: ["Pulled from last year's contract", "info"],
  clarification: ["Updated from clarification", "clar"],
  manual: ["Entered by buyer", "accent"],
};

/** S8 / Improvement B: the evidence behind a number, its conversion chain and its history.
 *  Mount with a key per target so each opening starts fresh. */
export function SourceDrawer({ rfxId, target, onClose, onAskVendor }: { rfxId: string; target: DrawerTarget; onClose: () => void; onAskVendor: (code: string) => void }) {
  const [data, setData] = useState<SourcePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"source" | "conversion" | "history">("source");
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!target.quoteId && !target.issueId) return;
    getSourceView({ quoteId: target.quoteId ?? undefined, issueId: target.issueId ?? undefined }).then(setData, (e) => setError(String(e)));
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const prov = data?.quote ? PROV[data.quote.provenance] : null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20 backdrop-blur-[1px]" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-[680px] animate-[slidein_.2s_ease] flex-col border-l border-line bg-surface shadow-2xl">
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted">{target.vendorCode}{data?.vendor ? ` · ${data.vendor.name}` : ""}{data?.line ? ` · Line ${data.line.line_no}` : ""}</p>
              <h2 className="truncate text-lg font-semibold">{target.title ?? data?.line?.description ?? "Source"}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {target.value != null && <span className="mr-1 text-lg font-semibold tabular-nums">{inr(target.value)}<span className="text-sm font-normal text-muted"> per piece</span></span>}
                {prov && <Badge tone={prov[1]}>{prov[0]}</Badge>}
                {data?.quote && <Badge tone={data.quote.confidence === "high" ? "ok" : data.quote.confidence === "medium" ? "warn" : "bad"}>confidence: {data.quote.confidence}</Badge>}
                {target.badges?.filter((b) => b !== "contract" && b !== "clarification").map((b) => <Badge key={b} tone={b === "estimate" || b === "freight est." ? "est" : "neutral"}>{b}</Badge>)}
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-panel" aria-label="Close"><X size={18} /></button>
          </div>
          {data?.quote && <p className="mt-2 text-sm"><span className="text-muted">As quoted:</span> <span className="font-medium">{data.quote.quoted}</span>{data.source && <span className="text-muted"> · {data.source.ref}</span>}</p>}
          <div className="mt-3 flex gap-1">
            {(["source", "conversion", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-sm capitalize ${tab === t ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-panel"}`}>{t}</button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {target.issueTitles && target.issueTitles.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {target.issueTitles.map((t, i) => <p key={i} className="rounded-lg bg-warn px-3 py-2 text-sm">⚠ {t}</p>)}
            </div>
          )}
          {error && <p className="rounded-lg bg-bad p-3 text-sm">{error}</p>}
          {!data && !error && (target.quoteId || target.issueId) && <div className="h-80 animate-pulse rounded-lg bg-panel" />}
          {!target.quoteId && !target.issueId && <p className="rounded-lg bg-panel p-4 text-sm text-muted">No value yet for this line. Ask the vendor, or enter a value.</p>}
          {data && tab === "source" && <SourceBody data={data} />}
          {tab === "conversion" && <Conversion steps1={target.steps1 ?? []} steps2={target.steps2 ?? []} qty={target.qty} />}
          {data && tab === "history" && (
            <ol className="space-y-2">
              {data.history.map((h) => (
                <li key={h.id} className={`rounded-lg border p-3 text-sm ${h.current ? "border-accent bg-accent-soft" : "border-line"}`}>
                  <div className="flex items-center justify-between">
                    <span className={h.current ? "font-medium" : "text-muted line-through"}>{h.quoted}</span>
                    <Badge tone={PROV[h.provenance]?.[1] ?? "neutral"}>{PROV[h.provenance]?.[0] ?? h.provenance}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{h.current ? " · current" : " · replaced"}</p>
                </li>
              ))}
              {!data.history.length && <p className="text-sm text-muted">No values yet.</p>}
            </ol>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3">
          {editing ? (
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await editQuote(rfxId, target.vendorCode, target.lineId!, Number(price), "Entered by buyer from the drawer"); if (!r.error) onClose(); }); }}>
              <span className="text-sm text-muted">₹ per piece, before GST, delivered</span>
              <input autoFocus value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} className="h-9 w-28 rounded-lg border border-line px-2 text-right" />
              <Button variant="primary" size="sm" disabled={pending || !(Number(price) > 0)}>Save</Button>
              <Button size="sm" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {target.issueIds && target.issueIds.length > 0 && (
                <Button size="sm" disabled={pending} onClick={() => start(async () => { for (const id of target.issueIds!) await acceptIssue(rfxId, id); onClose(); })}><Check size={14} /> Accept</Button>
              )}
              {target.lineId && <Button size="sm" onClick={() => { setPrice(target.value ? target.value.toFixed(2) : ""); setEditing(true); }}><Pencil size={14} /> Edit</Button>}
              <Button size="sm" onClick={() => onAskVendor(target.vendorCode)}><Mail size={14} /> Ask vendor</Button>
              {data?.attachment && (
                <a href={`/api/files/${data.attachment.id}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                  {data.attachment.filename} <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function Conversion({ steps1, steps2, qty }: { steps1: Step[]; steps2: Step[]; qty?: [number, number] }) {
  if (!steps1.length) return <p className="text-sm text-muted">No conversion: there is no value for this line yet.</p>;
  const same = JSON.stringify(steps1.map((s) => s.value)) === JSON.stringify(steps2.map((s) => s.value));
  const block = (title: string, steps: Step[]) => (
    <div className="rounded-lg border border-line p-3">
      <p className="text-xs font-medium text-muted">{title}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-baseline gap-3 text-sm">
            <span className="w-5 text-xs text-muted">{i + 1}</span>
            <span className="flex-1">
              {s.label}
              {s.note === "estimate" && <Badge tone="est" className="ml-1.5">estimate</Badge>}
              {s.note === "assumption" && <Badge tone="accent" className="ml-1.5">assumption</Badge>}
              {s.note === "unclear" && <Badge tone="warn" className="ml-1.5">unclear</Badge>}
            </span>
            <span className={`tabular-nums ${i === steps.length - 1 ? "font-semibold" : "text-muted"}`}>{inr(s.value)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <div className="space-y-3">
      {same ? block(`Both plants${qty ? ` (${qty[0].toLocaleString("en-IN")} and ${qty[1].toLocaleString("en-IN")} pcs/yr)` : ""}`, steps1) : (
        <>
          {block(`Plant 1 · Pune${qty ? ` · ${qty[0].toLocaleString("en-IN")} pcs/yr` : ""}`, steps1)}
          {block(`Plant 2 · Nashik${qty ? ` · ${qty[1].toLocaleString("en-IN")} pcs/yr` : ""}`, steps2)}
        </>
      )}
      <p className="text-xs text-muted">All math is done by code from the stored value, using the locked basis and your assumptions. The AI only read the number.</p>
    </div>
  );
}

function Mark({ text, snippet }: { text: string; snippet: string }) {
  const s = snippet.replace(/ \(number not found in source\)$/, "");
  const i = s ? text.indexOf(s) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-[#ffe08a] px-0.5 ring-2 ring-[#e03131]">{s}</mark>{text.slice(i + s.length)}</>;
}

function SourceBody({ data }: { data: SourcePayload }) {
  const v = data.view;
  const hl = useRef<HTMLElement>(null);
  useEffect(() => {
    hl.current?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [data]);

  if (v.type === "photo") {
    return (
      <div>
        <div className="relative overflow-hidden rounded-lg border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.url} alt="Vendor's photo" className="block w-full" />
          {v.bbox && (
            <div className="pointer-events-none absolute rounded border-[3px] border-[#e03131] shadow-[0_0_0_9999px_rgba(0,0,0,0.12)]"
              style={{ left: `${v.bbox[0] * 100}%`, top: `${v.bbox[1] * 100}%`, width: `${v.bbox[2] * 100}%`, height: `${v.bbox[3] * 100}%` }} />
          )}
        </div>
        <p className="mt-2 text-sm text-muted">
          Red box: where the price was read{data.quote?.confidence !== "high" ? " (approximate)" : ""}. Read as “{data.source?.snippet}”.
        </p>
      </div>
    );
  }
  if (v.type === "pdf") return <><PdfPage url={v.url} page={v.page} snippet={v.snippet} /><p className="mt-2 text-sm text-muted">Page {v.page}, highlighted: “{v.snippet}”.</p></>;
  if (v.type === "excel") {
    return (
      <div>
        <p className="mb-2 text-sm text-muted">Sheet “{v.sheet}”{data.source?.cell ? `, cell ${data.source.cell.split("!").at(-1)}` : ""}</p>
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-line">
          <table className="text-xs">
            <thead className="sticky top-0 bg-panel text-muted"><tr><th className="w-8 border-r border-line px-1" />{v.columns.map((c) => <th key={c} className="min-w-16 border-r border-line px-2 py-1 font-medium">{c}</th>)}</tr></thead>
            <tbody>
              {v.rows.map((row) => (
                <tr key={row.r} className="border-t border-line">
                  <td className="border-r border-line bg-panel px-1 text-center text-muted">{row.r}</td>
                  {row.cells.map((cell, ci) => {
                    const on = v.highlight?.r === row.r && v.highlight.c === ci;
                    return (
                      <td key={ci} ref={on ? (hl as React.Ref<HTMLTableCellElement>) : undefined}
                        className={`max-w-48 truncate border-r border-line px-2 py-1 ${on ? "bg-[#ffe08a] font-semibold ring-2 ring-inset ring-[#e03131]" : v.highlight?.r === row.r ? "bg-warn/50" : ""}`}>{cell}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (v.type === "word") {
    return (
      <div className="space-y-3 rounded-lg border border-line bg-white p-5 font-serif text-[15px] leading-relaxed shadow-sm">
        {v.paragraphs.map((p, i) => (
          <p key={i} ref={i === v.highlight ? (hl as React.Ref<HTMLParagraphElement>) : undefined} className={i === v.highlight ? "-mx-2 rounded bg-warn/60 px-2" : "text-ink/80"}>
            {i === v.highlight ? <Mark text={p} snippet={v.snippet} /> : p}
          </p>
        ))}
      </div>
    );
  }
  if (v.type === "text") {
    return (
      <div className="rounded-lg border border-line p-4 text-sm">
        <p className="text-xs text-muted">Email · Day {v.day}</p>
        <p className="font-medium">{v.subject}</p>
        <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed"><Mark text={v.body} snippet={v.snippet} /></pre>
      </div>
    );
  }
  if (v.type === "contract") {
    return (
      <div className="rounded-xl border border-[#c9dcf7] bg-info p-5 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted">Enterprise memory · mock contract database</p>
        <p className="mt-1 text-lg font-semibold">Contract #{v.contract_no}</p>
        <p className="text-muted">Valid {v.valid_from} → {v.valid_to}</p>
        <div className="mt-4 rounded-lg bg-surface p-3">
          <p>Line {v.line_no}: {v.description}</p>
          <p className="mt-1 text-lg font-semibold">{inr(v.price)} per piece</p>
        </div>
        <p className="mt-3 text-muted">The vendor wrote “rest same as last year”. This line&apos;s specs match the contract line exactly, so last year&apos;s price was used. Lines that are new or changed are never filled this way.</p>
      </div>
    );
  }
  if (v.type === "manual") return <p className="rounded-lg bg-accent-soft p-4 text-sm">Entered by the buyer: {v.note}</p>;
  return <p className="rounded-lg bg-panel p-4 text-sm text-muted">{data.source ? `Source: ${data.source.ref} · “${data.source.snippet}”` : "No source recorded for this value."}</p>;
}
