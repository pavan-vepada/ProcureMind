import Link from "next/link";

/** The one highlighted next step on every screen (principle 2). */
export function NextAction({ href, label, note }: { href?: string; label: string; note?: string }) {
  const base = "inline-flex h-11 items-center rounded-lg px-5 text-[15px] font-medium";
  return (
    <div className="mt-8 flex items-center justify-end gap-3">
      {note && <span className="text-sm text-muted">{note}</span>}
      {href ? (
        <Link href={href} className={`${base} bg-accent text-white shadow-sm hover:bg-accent-hover`}>
          {label} →
        </Link>
      ) : (
        <span aria-disabled className={`${base} cursor-not-allowed border border-line bg-panel text-muted`}>
          {label} →
        </span>
      )}
    </div>
  );
}
