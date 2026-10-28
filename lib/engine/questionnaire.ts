export type Question = { q_no: number; text: string; points: number; required: boolean };
export type Answer = { vendor_id: string; q_no: number; met: boolean; answer: string };
export type Certificate = { vendor_id: string; name: string; valid_until: string | null };
export type Rules = { required_q: number[]; min_score: number };

export const DEFAULT_RULES: Rules = { required_q: [1, 3], min_score: 70 };

export type QuestionnaireResult = {
  answered: boolean;
  score: number; // 0–100
  passed: boolean;
  failures: string[];
  met: Record<number, boolean>;
};

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Pass/fail against the rules locked before sending (FR-1.7, FR-4.6). An expired ISO certificate fails Q1. */
export function evaluateQuestionnaire(
  vendorId: string,
  questions: Question[],
  answers: Answer[],
  certificates: Certificate[],
  rules: Rules,
  today: string,
): QuestionnaireResult {
  const mine = answers.filter((a) => a.vendor_id === vendorId);
  if (mine.length === 0) return { answered: false, score: 0, passed: false, failures: ["No questionnaire answers yet"], met: {} };

  const met: Record<number, boolean> = {};
  for (const q of questions) met[q.q_no] = mine.find((a) => a.q_no === q.q_no)?.met ?? false;

  const failures: string[] = [];
  const expired = certificates.find(
    (c) => c.vendor_id === vendorId && /iso\s*9001/i.test(c.name) && c.valid_until !== null && c.valid_until < today,
  );
  if (expired) {
    met[1] = false;
    failures.push(`ISO 9001 certificate expired on ${fmtDate(expired.valid_until!)}`);
  }

  const max = questions.reduce((s, q) => s + q.points, 0) || 1;
  const score = Math.round((questions.reduce((s, q) => s + (met[q.q_no] ? q.points : 0), 0) / max) * 100);

  for (const n of rules.required_q) {
    if (!met[n] && !(n === 1 && expired)) {
      const q = questions.find((x) => x.q_no === n);
      failures.push(`Required: ${q?.text ?? `question ${n}`}`);
    }
  }
  if (score < rules.min_score) failures.push(`Score ${score}% is below ${rules.min_score}%`);

  return { answered: true, score, passed: failures.length === 0, failures, met };
}
