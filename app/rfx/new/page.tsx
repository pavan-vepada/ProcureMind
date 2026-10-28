import { listWorkspace } from "@/lib/data";
import { SUPPLIER_DIRECTORY } from "@/lib/demo/datasets";
import { NewRfx } from "./new-rfx";

/** Start a new RFx: from an internal request waiting in the queue, or from a need the buyer describes. */
export default async function NewRfxPage(props: PageProps<"/rfx/new">) {
  const sp = await props.searchParams;
  const { pending } = await listWorkspace();
  return (
    <NewRfx
      pending={pending.map((p) => ({ key: p.key, from: p.request.from, subject: p.request.subject, body: p.request.body, lines: p.lines.length, vendors: p.vendors.map((v) => v.name) }))}
      suppliers={SUPPLIER_DIRECTORY}
      preselect={typeof sp.request === "string" ? sp.request : null}
    />
  );
}
