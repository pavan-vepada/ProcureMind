import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/data";
import { compareData } from "../../compare/data";
import { VendorProfile } from "./vendor-profile";

/** Vendor profile within an RFx. */
export default async function VendorPage(props: PageProps<"/rfx/[id]/vendors/[code]">) {
  const { id, code } = await props.params;
  const a = await getAnalysis(id);
  const vendor = a.vendors.find((v) => v.code === code.toUpperCase());
  if (!vendor) notFound();
  const d = compareData(a);
  const summary = a.comparison.vendors.find((s) => s.vendor.id === vendor.id)!;
  const messages = a.messages.filter((m) => m.vendor_id === vendor.id);
  return (
    <VendorProfile
      rfxId={id} vendor={vendor} view={d.vendors.find((v) => v.code === vendor.code)!} lineCount={a.input.lines.length}
      summary={{ score: summary.questionnaire.score, passed: summary.questionnaire.passed, failures: summary.questionnaire.failures, met: summary.questionnaire.met, answered: summary.questionnaire.answered }}
      questions={a.input.questions} answers={a.input.answers.filter((x) => x.vendor_id === vendor.id)} certs={a.input.certificates.filter((x) => x.vendor_id === vendor.id)}
      messages={messages} files={a.attachments.filter((f) => messages.some((m) => m.id === f.message_id))} issues={a.issues.filter((i) => i.vendor_id === vendor.id)}
      rfi={a.rfi.find((r) => r.vendor_name === vendor.name) ?? null} drafts={d.drafts} vendors={d.vendors} requestedPayment={a.rfx.payment_days ?? 60} today={a.input.today}
    />
  );
}
