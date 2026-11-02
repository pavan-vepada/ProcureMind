"use client";

import { LogOut, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { logOut } from "@/app/auth-actions";
import { restoreSampleWorkspace } from "@/app/rfx/actions";

export function AccountMenu({ name, email, slim = false }: { name: string; email: string; slim?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initials = name.slice(0, 1).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-label={slim ? `Account: ${name}` : undefined} aria-expanded={open}
        className={`flex items-center gap-2.5 rounded-md text-left hover:bg-surface/70 ${slim ? "p-1" : "w-full border-t border-[#ddd9ce] px-2 pt-3 pb-1"}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials}</span>
        {!slim && (
          <span className="min-w-0 text-[13px] leading-[17px]">
            <span className="block font-semibold text-ink">{name}</span>
            <span className="block truncate text-muted">Category buyer · Packaging</span>
          </span>
        )}
      </button>
      {open && (
        <div className={`absolute bottom-full z-40 mb-2 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-lg ${slim ? "left-0" : "left-0"}`}>
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
