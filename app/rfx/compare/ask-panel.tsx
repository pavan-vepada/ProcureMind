"use client";

import { Bookmark, BookmarkCheck, ChevronDown, FileCheck2, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { clearChat, deleteScenario, recommendAward, saveScenario } from "@/app/rfx/actions";
import { Badge, Button, Dots } from "@/components/ui";
import type { ScenarioResult } from "@/lib/engine/scenario";
import { inr, money, pct } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";
import type { CompareData } from "./data";

const SUGGESTIONS = [
  "Split the award: cheapest per line, only vendors who passed the questionnaire",
  "What if we combine both plants' volumes?",
  "What if Kaveri (V1) matches the lowest price on the 5-ply lines?",
  "Which vendors still have open issues?",
  "Now leave out the expensive one",
];
const THINKING = ["Interpreting your question", "Computing exactly (code, not AI)", "Writing the answer"];

export function AskPanel({ data, onOpenLine }: { data: CompareData; onOpenLine: (lineNo: number, vendor: string) => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(data.chat);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const ready = data.vendors.some((v) => v.processed);

  // Take the server's conversation whenever it refreshes.
  const [serverChat, setServerChat] = useState(data.chat);
  if (data.chat !== serverChat) {
    setServerChat(data.chat);
    setMessages(data.chat);
  }
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, THINKING.length - 1)), 2200);
    return () => clearInterval(t);
  }, [pending]);

  async function ask(q: string) {
    if (!q.trim() || pending) return;
    setError(null);
    setPhase(0);
    setPending(true);
    setText("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: q, payload: null, created_at: new Date().toISOString() }]);
    const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Something went wrong.");
    else setMessages((m) => [...m, body.message]);
    setPending(false);
    router.refresh();
  }

  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.content));
  return (
    <aside className="flex h-[calc(100vh-150px)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-line bg-panel xl:sticky xl:top-4">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={16} className="text-accent" /> Ask about these quotes</h2>
        {messages.length > 0 && <button onClick={() => clearChat()} className="text-xs text-muted hover:text-ink">Clear</button>}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!messages.length && (
          <p className="text-sm text-muted">
            Ask in plain words. The AI turns your question into a calculation; <strong className="text-ink">code does the math</strong> and shows its working.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="ml-8 rounded-xl rounded-br-sm bg-accent-soft px-3 py-2 text-sm">{m.content}</div>
          ) : (
            <AnswerCard key={m.id} m={m} scenarios={data.scenarios} onAsk={ask} onOpenLine={onOpenLine} />
          ),
        )}
        {pending && (
          <div className="rounded-xl border border-line bg-surface p-3 text-sm">
            {THINKING.map((t, i) => (
              <p key={t} className={i < phase ? "text-[#15803d]" : i === phase ? "text-accent" : "text-muted"}>
                {i < phase ? "✓" : i === phase ? "›" : "·"} {t} {i === phase && <Dots />}
              </p>
            ))}
          </div>
        )}
        {error && <p className="rounded-lg bg-bad px-3 py-2 text-sm">{error}</p>}
        <div ref={end} />
      </div>

      <div className="border-t border-line bg-surface p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !asked.has(s)).slice(0, 3).map((s) => (
            <button key={s} disabled={pending || !ready} onClick={() => ask(s)}
              className="rounded-full border border-[#c7d2fe] bg-accent-soft px-2.5 py-1 text-left text-xs text-accent transition hover:bg-[#e0e7ff] disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={!ready} placeholder={ready ? "Type a question (optional)" : "Waiting for the first reply to be read…"}
            className="h-10 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-accent" />
          <Button variant="primary" disabled={pending || !text.trim()}><Send size={15} /></Button>
        </form>
        <SavedScenarios scenarios={data.scenarios} hasMemo={data.hasMemo} />
      </div>
    </aside>
  );
}

function AnswerCard({ m, scenarios, onAsk, onOpenLine }: { m: ChatMessage; scenarios: CompareData["scenarios"]; onAsk: (q: string) => void; onOpenLine: (n: number, v: string) => void }) {
  const p = m.payload;
  return (
    <div className="rounded-xl rounded-bl-sm border border-line bg-surface p-3 text-sm">
      <p className="leading-relaxed">{m.content}</p>
      {p?.kind === "clarify" && (
        <div className="mt-2 flex flex-col gap-1.5">
          {p.choices?.map((c) => <button key={c} onClick={() => onAsk(c)} className="rounded-lg border border-[#c7d2fe] bg-accent-soft px-3 py-1.5 text-left text-accent hover:bg-[#e0e7ff]">{c}</button>)}
        </div>
      )}
      {p?.table && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-muted"><tr>{p.table.columns.map((c) => <th key={c} className="py-1 pr-2 font-medium">{c}</th>)}</tr></thead>
          <tbody>{p.table.rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="py-1 pr-2 align-top">{c}</td>)}</tr>)}</tbody>
        </table>
      )}
      {p?.kind === "answer" && p.result && <ScenarioCard r={p.result} previousTotal={p.previousTotal ?? null} checked={!!p.explanationChecked} scenarios={scenarios} onOpenLine={onOpenLine} />}
    </div>
  );
}

function ScenarioCard({ r, previousTotal, checked, scenarios, onOpenLine }: { r: ScenarioResult; previousTotal: number | null; checked: boolean; scenarios: CompareData["scenarios"]; onOpenLine: (n: number, v: string) => void }) {
  const [working, setWorking] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(r.name);
  const [pending, start] = useTransition();
  const saved = scenarios.find((s) => JSON.stringify(s.spec) === JSON.stringify(r.spec));
  const delta = previousTotal !== null ? r.total - previousTotal : null;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between rounded-lg bg-panel px-3 py-2">
        <span className="text-xs text-muted">Total</span>
        <span className="text-lg font-semibold tabular-nums">{money(r.total)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
        {r.savings_vs_single !== null && r.cheapest_single && <Badge tone="ok">{money(r.savings_vs_single)} below cheapest single vendor ({r.cheapest_single.code})</Badge>}
        {r.last_year && <Badge tone="info">{pct(r.last_year.pct)} vs last year</Badge>}
        {delta !== null && Math.abs(delta) >= 1 && <Badge tone={delta < 0 ? "ok" : "warn"}>{delta < 0 ? "▼" : "▲"} {money(Math.abs(delta))} vs previous answer</Badge>}
        {r.tier_lines.length > 0 && <Badge tone="accent">volume tier on {r.tier_lines.length} lines</Badge>}
      </div>

      <div className="mt-2 space-y-1">
        {r.by_vendor.map((v) => (
          <div key={v.code} className="text-xs">
            <div className="flex justify-between"><span><strong>{v.code}</strong> {v.name} · {v.lines.length} lines</span><span className="tabular-nums">{money(v.value)}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-panel"><div className="h-full rounded-full bg-accent/70" style={{ width: `${v.share * 100}%` }} /></div>
          </div>
        ))}
        {r.excluded.length > 0 && <p className="pt-1 text-xs text-muted">Excluded: {r.excluded.map((e) => `${e.code} (${e.reason})`).join("; ")}</p>}
        {r.lines_uncovered.length > 0 && <p className="text-xs text-[#b45309]">No eligible quote for lines {r.lines_uncovered.join(", ")}</p>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={() => setWorking(!working)} className="flex items-center gap-1 text-xs font-medium text-accent">Show working <ChevronDown size={13} className={working ? "rotate-180" : ""} /></button>
        <span className={`flex items-center gap-1 text-[11px] ${checked ? "text-[#15803d]" : "text-muted"}`}><ShieldCheck size={12} />{checked ? "every number checked against the result" : "summary written by code"}</span>
      </div>
      {working && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-line p-2.5 text-xs">
          <p><span className="text-muted">Data:</span> {r.working.data}</p>
          {r.working.filters.map((f) => <p key={f}><span className="text-muted">Filter:</span> {f}</p>)}
          <p><span className="text-muted">Rule:</span> {r.working.rule}</p>
          <p><span className="text-muted">Formula:</span> {r.working.formula}</p>
          <div className="max-h-56 overflow-y-auto">
            <table className="mt-1 w-full">
              <thead className="sticky top-0 bg-surface text-left text-muted"><tr><th className="py-0.5 font-medium">Line</th><th className="font-medium">Vendor</th><th className="text-right font-medium">₹/pc</th><th className="text-right font-medium">Total</th></tr></thead>
              <tbody>
                {r.rows.map((x) => (
                  <tr key={x.line_no} onClick={() => x.vendor && onOpenLine(x.line_no, x.vendor)} className="cursor-pointer border-t border-line hover:bg-accent-soft">
                    <td className="py-0.5">{x.line_no}{x.matched ? " ★" : ""}{r.tier_lines.includes(x.line_no) ? " ⇣" : ""}</td>
                    <td>{x.vendor ?? "—"}</td>
                    <td className="text-right tabular-nums underline decoration-dotted">{x.unit_price ? inr(x.unit_price) : "—"}</td>
                    <td className="text-right tabular-nums">{x.total ? money(x.total) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted">Click a line to see the vendor&apos;s own words. ⇣ = volume tier · ★ = price matched</p>
        </div>
      )}
      <div className="mt-2">
        {saved ? (
          <span className="flex items-center gap-1 text-xs text-[#15803d]"><BookmarkCheck size={13} /> Saved as “{saved.name}”</span>
        ) : naming ? (
          <form onSubmit={(e) => { e.preventDefault(); start(async () => { await saveScenario(r.spec, name); setNaming(false); }); }} className="flex gap-1.5">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-8 flex-1 rounded-md border border-line px-2 text-xs" />
            <Button size="sm" variant="primary" disabled={pending}>Save</Button>
          </form>
        ) : (
          <Button size="sm" onClick={() => setNaming(true)}><Bookmark size={13} /> Save as scenario</Button>
        )}
      </div>
    </div>
  );
}

function SavedScenarios({ scenarios, hasMemo }: { scenarios: CompareData["scenarios"]; hasMemo: boolean }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  if (!scenarios.length) return null;
  return (
    <div className="mt-3 border-t border-line pt-2">
      <p className="mb-1.5 text-xs font-medium text-muted">Saved scenarios</p>
      <div className="max-h-40 space-y-1.5 overflow-y-auto">
        {[...scenarios].reverse().map((s, i) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${i === 0 ? "border-accent bg-accent-soft" : "border-line"}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-muted tabular-nums">{money(s.total)}</p>
            </div>
            <button onClick={() => deleteScenario(s.id)} className="text-muted hover:text-ink" title="Delete"><Trash2 size={12} /></button>
            <Button size="sm" variant={i === 0 ? "primary" : "secondary"} disabled={pending} onClick={() => { setWhich(s.id); start(() => recommendAward(s.id)); }}>
              <FileCheck2 size={13} /> {pending && which === s.id ? "Building memo…" : hasMemo ? "Re-recommend" : "Recommend award"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
