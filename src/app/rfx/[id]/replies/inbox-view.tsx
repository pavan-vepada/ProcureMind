"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, FileType2, Image as ImageIcon, Inbox, Mail, Paperclip, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { addSampleReplies, markStage, newUploadPath, registerUpload } from "@/app/rfx/actions";
import { Badge, Button, ButtonLink, Card, Dots, Progress } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Attachment, Message, Rfx, Run, VendorRecord } from "@/lib/types";

const ICON = { excel: FileSpreadsheet, pdf: FileText, word: FileType2, photo: ImageIcon, certificate: FileText, text: Mail };
const LABEL = { excel: "Excel", pdf: "PDF", word: "Word", photo: "Photo", certificate: "Certificate", text: "Email" };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Props = { rfx: Rfx; userId: string; vendors: VendorRecord[]; messages: Message[]; attachments: Attachment[]; runs: Run[]; savedRun: boolean; samplesLeft: number };

export function InboxView({ rfx, userId, vendors, messages, attachments, runs: initialRuns, savedRun, samplesLeft }: Props) {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const started = useRef(new Set<string>());
  const doneSeen = useRef(new Set(initialRuns.filter((r) => r.status === "done").map((r) => r.id)));
  const [now, setNow] = useState(() => Date.now());
  const [uploadVendor, setUploadVendor] = useState<string>(vendors.find((v) => v.status === "sent")?.code ?? vendors[0]?.code ?? "V1");
  const [adding, startAdding] = useTransition();
  const uploadRef = useRef<HTMLDivElement>(null);

  const [serverRuns, setServerRuns] = useState(initialRuns);
  if (initialRuns !== serverRuns) {
    setServerRuns(initialRuns);
    setRuns((r) => mergeRuns(r, initialRuns));
  }

  const process = useCallback((id: string) => {
    started.current.add(id);
    setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, status: "running", step: "Starting…", progress: 4, started_at: new Date().toISOString(), error: null } : r)));
    void fetch(`/api/runs/${id}/process`, { method: "POST", body: JSON.stringify({ savedRun }) }).then(() => router.refresh());
  }, [router, savedRun]);

  // Replies are read as soon as they land (FR-3.1), all at once.
  useEffect(() => {
    for (const r of runs) if (r.status === "queued" && !started.current.has(r.id)) process(r.id);
  }, [runs, process]);

  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      setNow(Date.now());
      const res = await fetch(`/api/runs?rfx=${rfx.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const { runs: fresh } = (await res.json()) as { runs: Run[] };
      setRuns((r) => mergeRuns(r, fresh));
      if (fresh.some((x) => x.status === "done" && !doneSeen.current.has(x.id))) {
        fresh.filter((x) => x.status === "done").forEach((x) => doneSeen.current.add(x.id));
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [active, router, rfx.id]);

  const done = runs.filter((r) => r.status === "done").length;
  const vendorOf = (id: string | null) => vendors.find((v) => v.id === id);
  const waiting = vendors.filter((v) => !messages.some((m) => m.vendor_id === v.id));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {savedRun && (
          <div className="rounded-xl border border-[#c9dcf7] bg-info px-4 py-2.5 text-sm">
            <strong>Presenter mode: recorded reading.</strong> Sample replies use a recorded AI reading instead of a live call. Add <code>?savedRun=0</code> to the address to switch back.
          </div>
        )}
        {active && (
          <div className="flex items-center gap-2 rounded-xl border border-[#c7d2fe] bg-accent-soft px-4 py-2.5 text-sm">
            <Sparkles size={15} className="text-accent" /> The AI is reading {runs.filter((r) => r.status === "queued" || r.status === "running").length} repl{runs.filter((r) => r.status === "queued" || r.status === "running").length > 1 ? "ies" : "y"} in parallel. You can leave this page; it keeps going.
          </div>
        )}

        {messages.map((m) => {
          const v = vendorOf(m.vendor_id);
          const run = runs.find((r) => r.message_id === m.id);
          const files = attachments.filter((a) => a.message_id === m.id);
          return (
            <MessageCard key={m.id} m={m} vendor={v} run={run} files={files} now={now}
              onRetry={() => run && process(run.id)}
              onUpload={() => { setUploadVendor(v?.code ?? "V1"); uploadRef.current?.scrollIntoView({ behavior: "smooth" }); }} />
          );
        })}

        {waiting.length > 0 && rfx.sent_at && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold">Waiting for {waiting.length} vendor{waiting.length > 1 ? "s" : ""}</h3>
            <ul className="mt-2 divide-y divide-line text-sm">
              {waiting.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2">
                  <span>{v.name} <span className="text-muted">· {v.email}</span></span>
                  <Badge tone="info">Invited</Badge>
                </li>
              ))}
            </ul>
            {samplesLeft > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-panel px-3 py-2.5 text-sm">
                <span className="text-muted">This is a sample RFx: the remaining vendors have sample replies ready.</span>
                <Button size="sm" variant="soft" disabled={adding} onClick={() => startAdding(async () => { await addSampleReplies(rfx.id); router.refresh(); })}>
                  <Inbox size={14} /> {adding ? "Bringing them in…" : `Add ${samplesLeft} sample repl${samplesLeft > 1 ? "ies" : "y"}`}
                </Button>
              </div>
            )}
          </Card>
        )}

        {!messages.length && !rfx.sent_at && (
          <Card className="p-10 text-center text-muted">The RFQ hasn&apos;t been sent yet. <Link href={`/rfx/${rfx.id}/rfq`} className="text-accent hover:underline">Open the RFQ</Link></Card>
        )}

        {done > 0 && (
          <div className="flex items-center justify-end gap-3 pt-2">
            {active && <span className="text-sm text-muted">The comparison fills in as the others finish.</span>}
            <ButtonLink href={`/rfx/${rfx.id}/compare`} variant="primary" onClick={() => void markStage(rfx.id, "analysis")}>Open comparison</ButtonLink>
          </div>
        )}
      </div>

      <div ref={uploadRef}>
        <UploadPanel rfxId={rfx.id} userId={userId} vendors={vendors} vendorCode={uploadVendor} setVendorCode={setUploadVendor}
          onQueued={(runId) => { router.refresh(); setRuns((r) => [...r, { id: runId, status: "queued" } as Run]); }}
          disabled={!rfx.drafted_at} />
      </div>
    </div>
  );
}

function mergeRuns(current: Run[], incoming: Run[]): Run[] {
  const map = new Map(current.map((r) => [r.id, r]));
  for (const r of incoming) {
    const c = map.get(r.id);
    map.set(r.id, c && c.status === "running" && r.status === "queued" ? c : { ...c, ...r });
  }
  return [...map.values()];
}

function MessageCard({ m, vendor, run, files, now, onRetry, onUpload }: {
  m: Message; vendor?: VendorRecord; run?: Run; files: Attachment[]; now: number; onRetry: () => void; onUpload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const main = files.find((f) => f.kind !== "certificate");
  const kind = main?.kind ?? "text";
  const Icon = ICON[kind];
  const status = run?.status ?? "done";
  const elapsed = run?.started_at && status === "running" ? Math.max(0, Math.round((now - Date.parse(run.started_at)) / 1000)) : null;
  const tone = status === "failed" ? "border-[#f6caca]" : status === "done" ? "border-line" : "border-[#c7d2fe] shadow-sm";

  return (
    <Card className={`animate-[fadein_.35s_ease] p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status === "done" ? "bg-ok text-[#15803d]" : status === "failed" ? "bg-bad text-[#b91c1c]" : "bg-accent-soft text-accent"}`}>
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{vendor ? vendor.name : "Unknown sender"}</span>
            <Badge>{LABEL[kind]}</Badge>
            {m.kind === "clarification_reply" && <Badge tone="clar">clarification reply</Badge>}
            {m.kind === "upload" && <Badge tone="accent">uploaded</Badge>}
            {m.late && <Badge tone="warn">late</Badge>}
            <span className="ml-auto text-xs text-muted">{when(m.received_at)}</span>
          </div>
          <button onClick={() => setOpen(!open)} className="mt-0.5 flex items-center gap-1 text-left text-sm text-muted hover:text-ink">
            {m.subject} <ChevronDown size={14} className={open ? "rotate-180" : ""} />
          </button>
          {open && <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-panel p-3 font-sans text-sm">{m.body || "(no text)"}</pre>}
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <a key={f.id} href={`/api/files/${f.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:bg-panel hover:text-ink">
                  <Paperclip size={11} /> {f.filename}
                </a>
              ))}
            </div>
          )}

          <div className="mt-3">
            {status === "done" && (
              <p className="flex flex-wrap items-center gap-1.5 text-sm text-[#15803d]">
                <CheckCircle2 size={15} /> {run?.step?.replace(/^Done · /, "Read · ") ?? "Read"}
                {run?.summary?.issues ? <span className="text-muted">· {run.summary.issues} item{run.summary.issues > 1 ? "s" : ""} to look at</span> : null}
              </p>
            )}
            {(status === "queued" || status === "running") && (
              <div>
                <p className="flex items-center gap-2 text-sm">
                  <span className="text-accent">{run?.step ?? "Waiting to start"}</span>
                  {elapsed !== null && elapsed > 3 && <span className="text-xs text-muted">{elapsed}s</span>}
                  <Dots />
                </p>
                <Progress value={run?.progress ?? 3} className="mt-2" />
              </div>
            )}
            {status === "failed" && (
              <div>
                <p className="flex items-center gap-1.5 text-sm text-[#b91c1c]"><AlertTriangle size={15} /> {run?.error ?? "Couldn't read this reply."}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={onRetry}><RotateCcw size={13} /> Retry</Button>
                  <Button size="sm" onClick={onUpload}><UploadCloud size={13} /> Upload a clearer file</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function UploadPanel({ rfxId, userId, vendors, vendorCode, setVendorCode, onQueued, disabled }: {
  rfxId: string; userId: string; vendors: VendorRecord[]; vendorCode: string; setVendorCode: (c: string) => void; onQueued: (runId: string) => void; disabled: boolean;
}) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [drag, setDrag] = useState(false);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      let res;
      if (mode === "text") {
        res = await registerUpload(rfxId, { vendorCode, text });
      } else {
        if (!file) throw new Error("Choose a file first.");
        if (file.size > 10 * 1024 * 1024) throw new Error("That file is over 10 MB. Try a smaller file or a photo.");
        const path = await newUploadPath(file.name);
        if (!path.startsWith(`${userId}/`)) throw new Error("Upload failed. Try again.");
        const up = await createBrowserSupabase().storage.from("uploads").upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
        res = await registerUpload(rfxId, { vendorCode, path, filename: file.name, mime: file.type || "application/octet-stream", size: file.size });
      }
      if (res.error) throw new Error(res.error);
      setMsg({ ok: true, text: "Received. The AI is reading it now." });
      setFile(null);
      setText("");
      onQueued(res.runId!);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    }
    setBusy(false);
  }

  return (
    <Card className="sticky top-20 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><UploadCloud size={17} /> Add a reply</h2>
      <p className="mt-1 text-xs text-muted">Got a quote by email or WhatsApp? Drop the file here, in any format, or paste the email text.</p>
      <label className="mt-3 block text-sm">
        <span className="text-muted">From vendor</span>
        <select value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2">
          {vendors.map((v) => <option key={v.id} value={v.code}>{v.name}</option>)}
        </select>
      </label>
      <div className="mt-3 flex gap-1 rounded-lg bg-panel p-1 text-sm">
        {(["file", "text"] as const).map((k) => (
          <button key={k} onClick={() => setMode(k)} className={`flex-1 rounded-md py-1 ${mode === k ? "bg-surface font-medium shadow-sm" : "text-muted"}`}>{k === "file" ? "File" : "Paste email"}</button>
        ))}
      </div>
      {mode === "file" ? (
        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0] ?? null); }}
          className={`mt-3 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition ${drag ? "border-accent bg-accent-soft" : "border-line hover:bg-panel"}`}
        >
          <UploadCloud className="text-muted" />
          <span className="mt-2 font-medium">{file ? file.name : "Drag a file here or click to choose"}</span>
          <span className="mt-1 text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : "Excel, PDF, Word or a photo · up to 10 MB"}</span>
          <input type="file" className="hidden" accept=".xlsx,.pdf,.docx,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Paste the vendor's email, e.g. “₹21 per box for item 3, rest as per our earlier quote…”"
          className="mt-3 w-full rounded-xl border border-line p-3 text-sm outline-none focus:border-accent" />
      )}
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-ok" : "bg-bad"}`}>{msg.text}</p>}
      <Button variant="secondary" className="mt-3 w-full" disabled={busy || disabled || (mode === "file" ? !file : text.trim().length < 5)} onClick={submit}>
        {busy ? <>Uploading <Dots /></> : "Read this reply"}
      </Button>
      {disabled && <p className="mt-2 text-xs text-muted">Draft the RFQ first, so there are lines to match against.</p>}
    </Card>
  );
}
