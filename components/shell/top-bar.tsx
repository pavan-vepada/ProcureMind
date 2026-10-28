import Link from "next/link";
import { logOut } from "@/app/auth-actions";
import type { Rfx } from "@/lib/types";
import { ResetDemoButton } from "./reset-demo-button";

export function TopBar({ rfx, email }: { rfx: Rfx; email: string }) {
  return (
    <header className="flex h-13 items-center gap-6 border-b border-line bg-panel px-5">
      <Link href="/rfx" className="text-lg font-semibold tracking-tight">
        Procure Mind <span className="text-accent">V2.0</span>
      </Link>
      <p className="min-w-0 flex-1 truncate text-sm text-muted">
        {rfx.code} · {rfx.title} · {rfx.buyer_company}
      </p>
      <ResetDemoButton />
      <form action={logOut} className="flex items-center gap-3 text-sm">
        <span className="text-muted">{email}</span>
        <button className="rounded-md border border-line bg-surface px-3 py-1.5 hover:bg-panel">Log out</button>
      </form>
    </header>
  );
}
