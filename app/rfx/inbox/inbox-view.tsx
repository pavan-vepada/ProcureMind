"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, FileSpreadsheet, FileText, FileType2, Image as ImageIcon, Mail, Paperclip, RotateCcw, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { newUploadPath, registerUpload } from "@/app/rfx/actions";
import { NextAction } from "@/components/next-action";
import { Badge, Button, Card, Dots, PageHeader, Progress } from "@/components/ui";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Attachment, Message, Rfx, Run, VendorRecord } from "@/lib/types";

const ICON = { excel: FileSpreadsheet, pdf: FileText, word: FileType2, photo: ImageIcon, certificate: FileText, text: Mail };
const LABEL = { excel: "Excel", pdf: "PDF", word: "Word", photo: "Photo", certificate: "Certificate", text: "Email text" };

type Props = { rfx: Rfx; userId: string; vendors: VendorRecord[]; messages: Message[]; attachments: Attachment[]; runs: Run[]; savedRun: boolean };

export function InboxView({ rfx, userId, vendors, messages, attachments, runs: initialRuns, savedRun }: Props) {
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const started = useRef(new Set<string>());
  const doneSeen = useRef(new Set(initialRuns.filter((r) => r.status === "done").map((r) => r.id)));
  const [now, setNow] = useState(() => Date.now());
  const [uploadVendor, setUploadVendor] = useState<string>("V1");
  const uploadRef = useRef<HTMLDivElement>(null);

  // Take the server's runs whenever the page refreshes, keeping optimistic state.
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

  // Processing starts by itself when replies land (FR-3.1), all at once.
  useEffect(() => {
    for (const r of runs) if (r.status === "queued" && !started.current.has(r.id)) process(r.id);
  }, [runs, process]);

  // Live progress: poll while anything is in flight (FR-3.2).
  const active = runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      setNow(Date.now());
      const res = await fetch("/api/runs", { cache: "no-store" });
      if (!res.ok) return;
      const { runs: fresh } = (await res.json()) as { runs: Run[] };
      setRuns((r) => mergeRuns(r, fresh));
      if (fresh.some((x) => x.status === "done" && !doneSeen.current.has(x.id))) {
        fresh.filter((x) => x.status === "done").forEach((x) => doneSeen.current.add(x.id));
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [active, router]);

  const done = runs.filter((r) => r.status === "done").length;
  const vendorOf = (id: string | null) => vendors.find((v) => v.id === id);

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={messages.length ? `Demo clock: Day ${rfx.demo_day} · ${messages.length} repl${messages.length === 1 ? "y" : "ies"} · ${done} read` : "No replies yet"}
      />
      {savedRun && (
        <div className="mb-4 rounded-xl border border-[#c9dcf7] bg-info px-4 py-2.5 text-sm">
          <strong>Showing saved run.</strong> Presenter fallback: seeded replies use a recorded reading instead of calling the AI live.
        </div>
      )}
      {!savedRun && messages.length > 0 && messages.every((m) => m.kind !== "upload") && rfx.demo_day === 9 && done === 0 && (
        <div className="mb-4 rounded-xl border border-[#c9dcf7] bg-info px-4 py-2.5 text-sm">⏩ Fast-forwarded to Day 9 · {messages.length} replies received · the AI is reading all of them at once</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
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
          {!messages.length && (
            <Card className="p-10 text-center text-muted">
              No replies yet. {rfx.sent_at ? <Link href="/rfx/send" className="text-accent">Fast-forward the demo clock</Link> : <>Send the RFQ first, or upload a quote on the right.</>}
            </Card>
          )}
        </div>

        <div ref={uploadRef}>
          <UploadPanel userId={userId} vendors={vendors} vendorCode={uploadVendor} setVendorCode={setUploadVendor}
            onQueued={(runId) => { router.refresh(); setRuns((r) => [...r, { id: runId, status: "queued" } as Run]); }}
            disabled={!rfx.drafted_at} />
        </div>
      </div>

      <NextAction href={done ? "/rfx/compare" : undefined} label="Open comparison"
        note={done ? (active ? "The comparison fills in as the others finish." : undefined) : "Available as soon as the first reply is read."} />
    </>
  );
}

function mergeRuns(current: Run[], incoming: Run[]): Run[] {
  const map = new Map(current.map((r) => [r.id, r]));
  for (const r of incoming) {
    const c = map.get(r.id);
    // Keep the optimistic "running" state until the server catches up.
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
  const tone = status === "failed" ? "border-[#f6caca] bg-bad/40" : status === "done" ? "border-line" : "border-[#c7d2fe]";

  return (
    <Card className={`animate-[fadein_.35s_ease] p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status === "done" ? "bg-ok text-[#15803d]" : status === "failed" ? "bg-bad text-[#b91c1c]" : "bg-accent-soft text-accent"}`}>
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{vendor ? `${vendor.code} · ${vendor.name}` : "Unknown sender"}</span>
            <Badge>{LABEL[kind]}</Badge>
            {m.kind === "clarification_reply" && <Badge tone="clar">clarification reply</Badge>}
            {m.kind === "upload" && <Badge tone="accent">uploaded</Badge>}
            {m.late && <Badge tone="warn">LATE</Badge>}
            <span className="ml-auto text-xs text-muted">Day {m.day}</span>
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
              <p className="flex items-center gap-1.5 text-sm text-[#15803d]">
                <CheckCircle2 size={15} /> {run?.step ?? "Read"}
                {run?.summary?.issues ? <span className="text-muted">· {run.summary.issues} item{run.summary.issues > 1 ? "s" : ""} to look at</span> : null}
                {run?.summary?.seconds ? <span className="text-muted">· {run.summary.seconds}s</span> : null}
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
                  <Link href={`/rfx/vendors/${vendor?.code ?? ""}`} className="inline-flex h-8 items-center rounded-lg px-3 text-sm text-muted hover:bg-panel">Ask vendor</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function UploadPanel({ userId, vendors, vendorCode, setVendorCode, onQueued, disabled }: {
  userId: string; vendors: VendorRecord[]; vendorCode: string; setVendorCode: (c: string) => void; onQueued: (runId: string) => void; disabled: boolean;
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
        res = await registerUpload({ vendorCode, text });
      } else {
        if (!file) throw new Error("Choose a file first.");
        if (file.size > 10 * 1024 * 1024) throw new Error("That file is over 10 MB. Try a smaller file or a photo.");
        const path = await newUploadPath(file.name);
        if (!path.startsWith(`${userId}/`)) throw new Error("Upload failed. Try again.");
        const up = await createBrowserSupabase().storage.from("uploads").upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
        res = await registerUpload({ vendorCode, path, filename: file.name, mime: file.type || "application/octet-stream", size: file.size });
      }
      if (res.error) throw new Error(res.error);
      setMsg({ ok: true, text: "Received. Reading it now." });
      setFile(null);
      setText("");
      onQueued(res.runId!);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed" });
    }
    setBusy(false);
  }

  return (
    <Card className="sticky top-4 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><UploadCloud size={17} /> Upload a reply</h2>
      <p className="mt-1 text-xs text-muted">Test it with your own quote. Excel, PDF, Word, a photo, or pasted email text.</p>
      <label className="mt-3 block text-sm">
        <span className="text-muted">From vendor</span>
        <select value={vendorCode} onChange={(e) => setVendorCode(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-line bg-surface px-2">
          {vendors.map((v) => <option key={v.id} value={v.code}>{v.code} · {v.name}</option>)}
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
          <span className="mt-1 text-xs text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : "Up to 10 MB · 20 files per account"}</span>
          <input type="file" className="hidden" accept=".xlsx,.pdf,.docx,.jpg,.jpeg,.png,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="e.g. “₹21 per box for item 3, rest as per our earlier quote…”"
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
