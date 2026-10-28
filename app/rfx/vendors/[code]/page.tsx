import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/data";
import { compareData } from "../../compare/data";
import { VendorProfile } from "./vendor-profile";

/** S11: vendor profile. */
export default async function VendorPage(props: PageProps<"/rfx/vendors/[code]">) {
  const { code } = await props.params;
  const a = await getAnalysis();
  const vendor = a.vendors.find((v) => v.code === code.toUpperCase());
  if (!vendor) notFound();
  const d = compareData(a);
  const summary = a.comparison.vendors.find((s) => s.vendor.id === vendor.id)!;
  const answers = a.input.answers.filter((x) => x.vendor_id === vendor.id);
  const certs = a.input.certificates.filter((x) => x.vendor_id === vendor.id);
  const messages = a.messages.filter((m) => m.vendor_id === vendor.id);
  const files = a.attachments.filter((f) => messages.some((m) => m.id === f.message_id));
  const issues = a.issues.filter((i) => i.vendor_id === vendor.id);
  const rfi = a.rfi.find((r) => r.vendor_name === vendor.name);
  return (
    <VendorProfile
      vendor={vendor} view={d.vendors.find((v) => v.code === vendor.code)!} summary={{ score: summary.questionnaire.score, passed: summary.questionnaire.passed, failures: summary.questionnaire.failures, met: summary.questionnaire.met, answered: summary.questionnaire.answered }}
      questions={a.input.questions} answers={answers} certs={certs} messages={messages} files={files} issues={issues} rfi={rfi ?? null}
      drafts={d.drafts} vendors={d.vendors} requestedPayment={a.rfx.payment_days ?? 60} today={a.input.today}
    />
  );
}
