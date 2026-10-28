import { setTourHidden } from "@/app/rfx/actions";
import { TOUR, tourState } from "@/lib/lifecycle";

/** FR-0.6: the guided tour checklist. Can be hidden and brought back; progress is saved. */
export function TourPanel({ step, hidden }: { step: number; hidden: boolean }) {
  if (hidden) {
    return (
      <form action={setTourHidden.bind(null, false)}>
        <button className="rounded-lg border border-line bg-panel px-2 py-6 text-xs [writing-mode:vertical-rl] hover:bg-accent-soft">
          Tour ▸
        </button>
      </form>
    );
  }
  return (
    <aside className="w-60 shrink-0 self-start rounded-xl border border-line bg-panel p-3">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">
          Guided tour · {Math.min(step + 1, TOUR.length)} of {TOUR.length}
        </h2>
        <form action={setTourHidden.bind(null, true)}>
          <button className="text-xs text-muted hover:text-ink">Hide ✕</button>
        </form>
      </div>
      <ol className="space-y-2">
        {TOUR.map((label, i) => {
          const state = tourState(step, i);
          return (
            <li
              key={label}
              className={`rounded-lg border px-3 py-2 text-sm ${
                state === "current"
                  ? "border-2 border-accent bg-accent-soft font-medium"
                  : `border-line bg-surface ${state === "done" ? "text-muted" : ""}`
              }`}
            >
              {state === "done" ? "✓" : state === "current" ? "▶" : "○"} {i + 1}. {label}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
