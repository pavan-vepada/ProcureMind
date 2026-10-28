import { LifecycleStrip } from "@/components/shell/lifecycle-strip";
import { TopBar } from "@/components/shell/top-bar";
import { TourPanel } from "@/components/shell/tour-panel";
import { getWorkspace } from "@/lib/data";

/** S2: the frame around every workspace screen. */
export default async function WorkspaceLayout({ children }: LayoutProps<"/rfx">) {
  const { supabase, user, rfx } = await getWorkspace();
  const { count } = await supabase.from("issues").select("id", { count: "exact", head: true }).eq("status", "open");
  return (
    <div className="flex min-h-screen flex-col">
      <div className="no-print">
        <TopBar rfx={rfx} email={user.email ?? ""} openIssues={count ?? 0} />
        <LifecycleStrip stage={rfx.stage} />
      </div>
      <div className="flex flex-1 gap-4 px-5 pb-10">
        <main className="min-w-0 flex-1">{children}</main>
        <div className="no-print contents">
          <TourPanel step={rfx.tour_step} hidden={rfx.tour_hidden} />
        </div>
      </div>
    </div>
  );
}
