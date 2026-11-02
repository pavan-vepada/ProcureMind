"use client";

import { Building2, CircleHelp, FileText, Inbox, LayoutList, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/logo";
import { AccountMenu } from "./account-menu";

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/rfx", label: "Sourcing events", icon: LayoutList, match: (p) => p === "/rfx" || p === "/rfx/new" || /^\/rfx\/[0-9a-f-]{36}/.test(p) || p.startsWith("/rfx/search") },
  { href: "/rfx/requests", label: "Requests", icon: Inbox, match: (p) => p.startsWith("/rfx/requests") },
  { href: "/rfx/suppliers", label: "Suppliers", icon: Building2, match: (p) => p.startsWith("/rfx/suppliers") },
  { href: "/rfx/contracts", label: "Contracts", icon: FileText, match: (p) => p.startsWith("/rfx/contracts") },
];

/** Main navigation. Inside a sourcing event it slims to icons so the comparison keeps its width. */
export function Sidebar({ name, email, pendingRequests }: { name: string; email: string; pendingRequests: number }) {
  const path = usePathname();
  const slim = /^\/rfx\/[0-9a-f-]{36}/.test(path);

  return (
    <nav aria-label="Main" className={`sticky top-0 flex h-screen shrink-0 flex-col gap-4 border-r border-line bg-sidebar py-4 ${slim ? "w-16 items-center px-2.5" : "w-60 px-3.5"}`}>
      <Link href="/rfx" aria-label="Procure Mind home" className={slim ? "" : "px-1.5 py-1"}>{slim ? <LogoMark size={32} /> : <Logo />}</Link>
      {!slim && (
        <div className="rounded-md border border-[#ddd9ce] bg-[#f8f7f3] px-2.5 py-2 text-[13px]">
          <p className="font-semibold text-ink">Sunrise Consumer Goods</p>
          <p className="text-muted">Packaging · Pune and Nashik</p>
        </div>
      )}
      <ul className={`flex flex-col gap-0.5 ${slim ? "mt-2" : ""}`}>
        {NAV.map((n) => {
          const on = n.match(path);
          const Icon = n.icon;
          return (
            <li key={n.href}>
              <Link href={n.href} aria-label={slim ? n.label : undefined} title={slim ? n.label : undefined} aria-current={on ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 rounded-md text-sm transition-colors ${slim ? "w-11 justify-center" : "px-2.5"} ${on ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-soft hover:bg-surface/70"}`}>
                <Icon size={18} strokeWidth={1.8} />
                {!slim && <span className="flex-1">{n.label}</span>}
                {!slim && n.href === "/rfx/requests" && pendingRequests > 0 && (
                  <span className="rounded-full bg-accent px-1.5 font-mono text-xs leading-5 text-white">{pendingRequests}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={`mt-auto flex flex-col gap-2 ${slim ? "items-center" : ""}`}>
        <Link href="/rfx/help" aria-label={slim ? "Help and guides" : undefined} title={slim ? "Help and guides" : undefined}
          className={`flex h-10 items-center gap-2.5 rounded-md text-sm text-ink-soft hover:bg-surface/70 ${slim ? "w-11 justify-center" : "px-2.5"} ${path.startsWith("/rfx/help") ? "bg-surface font-semibold text-ink" : ""}`}>
          <CircleHelp size={18} strokeWidth={1.8} />
          {!slim && "Help & guides"}
        </Link>
        <AccountMenu name={name} email={email} slim={slim} />
      </div>
    </nav>
  );
}
