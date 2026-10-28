"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGES, STAGE_HREF, stageState, type StageKey } from "@/lib/lifecycle";

const STYLE = {
  done: "bg-ok border-[#c6ebd3] text-ink",
  current: "bg-accent-soft border-accent text-ink font-medium",
  later: "bg-surface border-line border-dashed text-muted",
};

/** FR-1.1: where the RFx is in the procurement lifecycle; every reached stage is clickable. */
export function LifecycleStrip({ stage }: { stage: StageKey }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Lifecycle" className="grid grid-cols-8 gap-1.5 px-5 py-3">
      {STAGES.map((s, i) => {
        const state = stageState(stage, s.key);
        const href = state !== "later" ? STAGE_HREF[s.key] : undefined;
        const viewing = !!STAGE_HREF[s.key] && (pathname === STAGE_HREF[s.key] || (s.key === "analysis" && pathname.startsWith("/rfx/review")));
        const label = (
          <>
            <span className={`mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${state === "done" ? "bg-[#16a34a] text-white" : state === "current" ? "bg-accent text-white" : "border border-line text-muted"}`}>
              {state === "done" ? "✓" : i + 1}
            </span>
            {s.label}
            {s.roadmap && <span className="ml-1 text-[11px] text-muted">(roadmap)</span>}
          </>
        );
        const cls = `flex h-9 items-center justify-center rounded-lg border text-[13px] transition ${STYLE[state]} ${state === "current" ? "border-2" : ""} ${viewing ? "ring-2 ring-ink/70 ring-offset-1" : ""}`;
        return href ? (
          <Link key={s.key} href={href} className={`${cls} hover:shadow-sm`} aria-current={viewing ? "page" : undefined}>
            {label}
          </Link>
        ) : (
          <span key={s.key} className={cls} title={s.roadmap ? "On the roadmap" : "Opens when this stage is reached"}>
            {label}
          </span>
        );
      })}
    </nav>
  );
}
