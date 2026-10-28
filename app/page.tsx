import { AuthForm } from "./auth-form";

const STEPS = [
  { title: "Vendors reply any way they like", body: "Excel · PDF · Word · phone photo · email", tint: "bg-info" },
  { title: "One comparison", body: "Every number converted and traced to its source", tint: "bg-ok" },
  { title: "Ask and award", body: "What-ifs in plain words, then a defensible memo", tint: "bg-est" },
];

/** S1: landing and sign-up. Signed-in visitors are sent to /rfx by proxy.ts. */
export default function Landing() {
  return (
    <>
      <header className="flex h-13 items-center border-b border-line bg-panel px-5">
        <span className="text-lg font-semibold tracking-tight">
          Procure Mind <span className="text-accent">V2.0</span>
        </span>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-wrap items-center gap-12 px-6 py-16">
        <section className="min-w-80 flex-1">
          <h1 className="text-5xl font-semibold tracking-tight">Kill the quote spreadsheet.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            An AI co-pilot drafts your RFQ, reads whatever vendors send back, and turns it into one comparison you
            can question, all the way to an award memo.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`rounded-xl border border-line p-4 ${s.tint}`}>
                <p className="font-medium">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            Built for category buyers. Reads Excel, PDF, Word, phone photos and plain email; every number links back to the vendor&apos;s own words.
          </p>
        </section>
        <AuthForm />
      </main>
    </>
  );
}
