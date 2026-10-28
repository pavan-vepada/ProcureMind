import Link from "next/link";
import { logOut } from "@/app/auth-actions";
import type { Rfx } from "@/lib/types";
import { ResetDemoButton } from "./reset-demo-button";

export function TopBar({ rfx, email, openIssues }: { rfx: Rfx; email: string; openIssues: number }) {
  const replied = rfx.stage !== "rfq";
  return (
    <header className="flex h-13 items-center gap-5 border-b border-line bg-panel px-5">
      <Link href="/rfx" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">PM</span>
        Procure Mind <span className="text-accent">V2.0</span>
      </Link>
      <p className="hidden min-w-0 flex-1 truncate text-sm text-muted lg:block">
        {rfx.code} · {rfx.title} · {rfx.buyer_company}
        {rfx.demo_day > 0 && <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs text-ink">Demo clock: Day {rfx.demo_day}</span>}
      </p>
      <nav className="ml-auto flex items-center gap-1 text-sm">
        {replied && (
          <>
            <Link href="/rfx/inbox" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface hover:text-ink">Inbox</Link>
            <Link href="/rfx/compare" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-surface hover:text-ink">Compare</Link>
            <Link href="/rfx/review" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted hover:bg-surface hover:text-ink">
              Review
              {openIssues > 0 && <span className="rounded-full bg-warn px-1.5 text-[11px] font-semibold text-[#713f12]">{openIssues}</span>}
            </Link>
          </>
        )}
      </nav>
      <ResetDemoButton />
      <form action={logOut} className="flex items-center gap-2 text-sm">
        <span className="hidden text-muted xl:inline">{email}</span>
        <button className="rounded-md border border-line bg-surface px-3 py-1.5 hover:bg-panel">Log out</button>
      </form>
    </header>
  );
}
