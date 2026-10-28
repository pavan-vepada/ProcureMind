import Link from "next/link";
import { AccountMenu } from "./account-menu";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-line bg-surface/95 px-6 backdrop-blur">
      <Link href="/rfx" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">PM</span>
        Procure Mind <span className="text-accent">V2.0</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/rfx" className="rounded-md px-3 py-1.5 text-muted hover:bg-panel hover:text-ink">Sourcing events</Link>
        <Link href="/rfx/new" className="rounded-md px-3 py-1.5 text-muted hover:bg-panel hover:text-ink">New RFx</Link>
      </nav>
      <div className="ml-auto">
        <AccountMenu email={email} />
      </div>
    </header>
  );
}
