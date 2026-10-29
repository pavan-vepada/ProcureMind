"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Notice } from "@/lib/data";

const SEEN_KEY = "pm-notices-seen";
const when = (iso: string) => {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.round(h)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Replies read and suppliers' answers, newest first. The dot shows anything newer than the last look. */
export function Notifications({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  // Browser storage is read after mount, so the server render and the first client render match.
  useEffect(() => {
    const t = setTimeout(() => setSeen(readSeen()), 0);
    return () => clearTimeout(t);
  }, []);
  const latest = notices[0]?.at ?? "";
  const unread = seen !== null && latest > seen ? notices.filter((n) => n.at > seen).length : 0;

  function toggle() {
    if (!open && latest) {
      try {
        localStorage.setItem(SEEN_KEY, latest);
      } catch {
        // Private mode: the dot simply stays.
      }
      setSeen(latest);
    }
    setOpen(!open);
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-ink-soft hover:bg-panel">
        <Bell size={18} strokeWidth={1.8} />
        {unread > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-96 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</p>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {notices.map((n) => (
              <li key={n.id}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-panel">
                  <span className="block text-sm text-ink">{n.text}</span>
                  <span className="mt-0.5 block text-xs text-muted">{n.detail} · {when(n.at)}</span>
                </Link>
              </li>
            ))}
            {!notices.length && <li className="px-4 py-6 text-center text-sm text-muted">Nothing new.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
