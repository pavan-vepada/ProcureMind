import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const BTN = {
  primary: "bg-accent font-semibold text-white hover:bg-accent-hover disabled:opacity-60",
  secondary: "border border-line bg-surface text-ink hover:bg-panel disabled:opacity-60",
  ghost: "text-muted hover:bg-panel hover:text-ink disabled:opacity-60",
  soft: "bg-accent-soft text-accent-hover hover:bg-accent-line disabled:opacity-60",
};
const SIZE = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-[15px]" };

type BtnProps = { variant?: keyof typeof BTN; size?: keyof typeof SIZE };

export function Button({ variant = "secondary", size = "md", className = "", ...p }: ComponentProps<"button"> & BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...p}
    />
  );
}

export function ButtonLink({ variant = "secondary", size = "md", className = "", ...p }: ComponentProps<typeof Link> & BtnProps) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...p}
    />
  );
}

export function Card({ className = "", ...p }: ComponentProps<"section">) {
  return <section className={`rounded-lg border border-line bg-surface ${className}`} {...p} />;
}

// Colour only for meaning: amber = needs a look, red = missing or failing, petrol = action or best value.
// Everything informational (conversions, contract, estimate, clarification) stays a quiet grey tag.
const TONE = {
  neutral: "bg-panel text-ink-soft border-line",
  ok: "bg-ok text-ok-ink border-ok-line",
  warn: "bg-warn text-warn-ink border-warn-line",
  bad: "bg-bad text-bad-ink border-bad-line",
  info: "bg-info text-ink-soft border-line",
  est: "bg-est text-ink-soft border-line",
  clar: "bg-clar text-ink-soft border-line",
  accent: "bg-accent-soft text-accent-hover border-accent-line",
};
export type Tone = keyof typeof TONE;

export function Badge({ tone = "neutral", children, className = "", title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold leading-8">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-panel ${className}`}>
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Dots() {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}
