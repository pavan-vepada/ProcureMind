import { TopBar } from "@/components/shell/top-bar";
import { requireUser } from "@/lib/data";

/** The app frame: top bar and page content. */
export default async function AppLayout({ children }: LayoutProps<"/rfx">) {
  const { user } = await requireUser();
  return (
    <div className="flex min-h-screen flex-col bg-[#fbfbfd]">
      <div className="no-print">
        <TopBar email={user.email ?? ""} />
      </div>
      <div className="mx-auto w-full max-w-[1680px] flex-1 px-6 pb-12">{children}</div>
    </div>
  );
}
