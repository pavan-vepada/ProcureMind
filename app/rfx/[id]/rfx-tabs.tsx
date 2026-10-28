"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; enabled: boolean; why?: string; count?: string; warn?: boolean; live?: boolean };

export function RfxTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => path === t.href || path.startsWith(`${t.href}/`))?.href;
  return (
    <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label="RFx sections">
      {tabs.map((t) => {
        const on = t.href === active;
        const cls = `relative flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-1 text-sm ${on ? "font-medium text-ink" : "text-muted"}`;
        const inner = (
          <>
            {t.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
            {t.label}
            {t.count && <span className={`rounded-full px-1.5 text-[11px] ${t.warn ? "bg-warn text-[#713f12]" : "bg-panel text-muted"}`}>{t.count}</span>}
            {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </>
        );
        return t.enabled ? (
          <Link key={t.href} href={t.href} className={`${cls} hover:text-ink`} aria-current={on ? "page" : undefined}>{inner}</Link>
        ) : (
          <span key={t.href} className={`${cls} cursor-not-allowed opacity-40`} title={t.why}>{inner}</span>
        );
      })}
    </nav>
  );
}
