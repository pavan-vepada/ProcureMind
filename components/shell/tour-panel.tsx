"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { setTourHidden } from "@/app/rfx/actions";
import { TOUR, TOUR_STEPS, tourState } from "@/lib/lifecycle";

const WIDE = ["/rfx/compare"];

/** FR-0.6: the guided tour. Hidden on request (saved); shrinks to a tab on wide screens. */
export function TourPanel({ step, hidden }: { step: number; hidden: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const compact = hidden || (WIDE.some((w) => pathname.startsWith(w)) && !open);

  if (compact) {
    return (
      <button
        onClick={() => (hidden ? start(() => setTourHidden(false)) : setOpen(true))}
        className="sticky top-4 h-fit self-start rounded-lg border border-line bg-panel px-1.5 py-4 text-xs text-muted [writing-mode:vertical-rl] hover:bg-accent-soft hover:text-accent"
        title="Show the guided tour"
      >
        Tour {Math.min(step + 1, TOUR.length)}/{TOUR.length} ▸
      </button>
    );
  }

  const done = step >= TOUR.length;
  return (
    <aside className="sticky top-4 h-fit w-64 shrink-0 self-start rounded-xl border border-line bg-panel p-3">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">{done ? "Tour complete 🎉" : `Guided tour · ${step + 1} of ${TOUR.length}`}</h2>
        <button onClick={() => (open ? setOpen(false) : start(() => setTourHidden(true)))} className="text-xs text-muted hover:text-ink">
          Hide ✕
        </button>
      </div>
      <ol className="space-y-1.5">
        {TOUR.map((label, i) => {
          const state = tourState(step, i);
          const current = state === "current";
          return (
            <li key={label}>
              <Link
                href={TOUR_STEPS[i].href}
                className={`block rounded-lg border px-3 py-2 text-[13px] transition ${
                  current ? "border-2 border-accent bg-accent-soft font-medium" : `border-line bg-surface hover:border-[#c7d2fe] ${state === "done" ? "text-muted" : ""}`
                }`}
              >
                <span className={state === "done" ? "text-[#16a34a]" : current ? "text-accent" : "text-muted"}>
                  {state === "done" ? "✓" : current ? "▶" : "○"}
                </span>{" "}
                {i + 1}. {label}
                {current && <span className="mt-1 block text-xs font-normal text-muted">{TOUR_STEPS[i].hint}</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
