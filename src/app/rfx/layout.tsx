import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { getShellData } from "@/lib/data";

/** The app frame: sidebar, top bar and page content. */
export default async function AppLayout({ children }: LayoutProps<"/rfx">) {
  const shell = await getShellData();
  return (
    <div className="flex min-h-screen bg-page">
      <div className="no-print">
        <Sidebar name={shell.name} email={shell.email} pendingRequests={shell.pendingRequests} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print">
          <TopBar notices={shell.notices} />
        </div>
        <main className="w-full max-w-[1600px] flex-1 px-7 pb-12">{children}</main>
      </div>
    </div>
  );
}
