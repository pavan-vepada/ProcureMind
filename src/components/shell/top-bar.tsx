import { Search } from "lucide-react";
import type { Notice } from "@/lib/data";
import { Notifications } from "./notifications";

/** Search across events, suppliers and items, plus notifications. */
export function TopBar({ notices }: { notices: Notice[] }) {
  return (
    <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center gap-4 border-b border-line bg-surface px-7">
      <form action="/rfx/search" role="search" className="flex h-[38px] w-full max-w-[520px] items-center gap-2.5 rounded-md border border-[#ddd9ce] bg-[#f8f7f3] px-3 text-muted focus-within:border-accent">
        <Search size={16} aria-hidden="true" />
        <input name="q" aria-label="Search events, suppliers and items" placeholder="Search events, suppliers, items"
          className="h-full flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
      </form>
      <div className="ml-auto">
        <Notifications notices={notices} />
      </div>
    </header>
  );
}
