"use client";

import { ChevronDown, LogOut, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { logOut } from "@/app/auth-actions";
import { restoreSampleWorkspace } from "@/app/rfx/actions";

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initial = email[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{initial}</span>
        <span className="hidden max-w-56 truncate text-muted md:inline">{email}</span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <p className="border-b border-line px-4 py-3 text-xs text-muted">Signed in as<br /><span className="text-sm text-ink">{email}</span></p>
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Restore the sample sourcing events? Your changes and any RFx you created will be removed.")) start(() => restoreSampleWorkspace());
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-panel disabled:opacity-60"
          >
            <RotateCcw size={15} /> {pending ? "Restoring…" : "Restore sample workspace"}
          </button>
          <form action={logOut}>
            <button className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-panel"><LogOut size={15} /> Log out</button>
          </form>
        </div>
      )}
    </div>
  );
}
