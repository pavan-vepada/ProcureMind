/** Shown while a page loads (and, on first login, while the sample sourcing events are prepared). */
export default function Loading() {
  return (
    <div className="pt-8" aria-busy>
      <div className="h-4 w-48 animate-pulse rounded bg-panel" />
      <div className="mt-3 h-8 w-96 animate-pulse rounded bg-panel" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-panel" />)}
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-panel" />)}
      </div>
    </div>
  );
}
