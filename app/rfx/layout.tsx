import { LifecycleStrip } from "@/components/shell/lifecycle-strip";
import { TopBar } from "@/components/shell/top-bar";
import { TourPanel } from "@/components/shell/tour-panel";
import { getWorkspace } from "@/lib/data";

/** S2: the frame around every workspace screen. */
export default async function WorkspaceLayout({ children }: LayoutProps<"/rfx">) {
  const { user, rfx } = await getWorkspace();
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar rfx={rfx} email={user.email ?? ""} />
      <LifecycleStrip stage={rfx.stage} />
      <div className="flex flex-1 gap-5 px-5 pb-8">
        <main className="min-w-0 flex-1">{children}</main>
        <TourPanel step={rfx.tour_step} hidden={rfx.tour_hidden} />
      </div>
    </div>
  );
}
