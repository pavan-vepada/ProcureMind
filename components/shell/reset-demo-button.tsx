"use client";

import { useTransition } from "react";
import { resetDemo } from "@/app/rfx/actions";

export function ResetDemoButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Start over? This puts your demo back to the beginning.")) startTransition(() => resetDemo());
      }}
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:bg-panel disabled:opacity-60"
    >
      {pending ? "Resetting…" : "↺ Reset demo"}
    </button>
  );
}
