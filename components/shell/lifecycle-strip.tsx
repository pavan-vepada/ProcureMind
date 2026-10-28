"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGES, STAGE_HREF, stageState, type StageKey } from "@/lib/lifecycle";

const STYLE = {
  done: "bg-ok border-line",
  current: "bg-accent-soft border-accent border-2 font-medium",
  later: "bg-surface border-line border-dashed text-muted",
};

/** FR-1.1: where the RFx is in the procurement lifecycle; each built stage is clickable. */
export function LifecycleStrip({ stage }: { stage: StageKey }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Lifecycle" className="grid grid-cols-8 gap-2 px-5 py-3">
      {STAGES.map((s) => {
        const state = stageState(stage, s.key);
        const href = STAGE_HREF[s.key];
        const viewing = href === pathname;
        const label = (
          <>
            {state === "current" && <span className="text-accent">● </span>}
            {s.label}
            {state === "done" && " ✓"}
            {s.roadmap && <span className="text-muted"> (roadmap)</span>}
          </>
        );
        const cls = `flex h-10 items-center justify-center rounded-lg border text-sm ${STYLE[state]} ${
          viewing ? "ring-2 ring-ink ring-offset-1" : ""
        }`;
        return href ? (
          <Link key={s.key} href={href} className={`${cls} hover:brightness-95`} aria-current={viewing ? "page" : undefined}>
            {label}
          </Link>
        ) : (
          <span key={s.key} className={cls} title="Opens when this stage is reached">
            {label}
          </span>
        );
      })}
    </nav>
  );
}
