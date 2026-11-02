import { createClient } from "@/lib/supabase/server";
import { loadAttachmentBytes } from "@/lib/pipeline/process";
import type { Attachment } from "@/lib/types";

/** Serves an original vendor file, exactly as received, to its owner only (row-level security). */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Not signed in", { status: 401 });
  const { data: a } = await supabase.from("attachments").select("*").eq("id", id).maybeSingle<Attachment>();
  if (!a) return new Response("Not found", { status: 404 });
  const bytes = await loadAttachmentBytes(supabase, a);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": a.mime,
      "Content-Disposition": `inline; filename="${a.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
