"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; enabled: boolean; why?: string; count?: string; warn?: boolean; live?: boolean };

export function RfxTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => path === t.href || path.startsWith(`${t.href}/`))?.href;
  return (
    <nav className="mt-3 flex gap-6 overflow-x-auto" aria-label="RFx sections">
      {tabs.map((t) => {
        const on = t.href === active;
        const cls = `relative flex items-center gap-1.5 whitespace-nowrap pt-2 pb-2.5 text-sm ${on ? "font-semibold text-ink" : "text-ink-soft"}`;
        const inner = (
          <>
            {t.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
            {t.label}
            {t.count && <span className={`font-mono text-xs ${t.warn ? "text-warn-ink" : "text-muted"}`}>{t.count}</span>}
            {on && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
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
