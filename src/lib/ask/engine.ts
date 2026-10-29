// The Ask engine (architecture A3): the AI interprets the question and calls a tool; code computes;
// the AI explains using only the result's numbers; code checks those numbers.
import { zodResponsesFunction } from "openai/helpers/zod";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { z } from "zod";
import { aiModel, openai } from "@/lib/ai/client";
import type { Comparison, ComparisonInput } from "@/lib/engine/comparison";
import { runScenario, ScenarioSpec, type Contract, type ScenarioResult } from "@/lib/engine/scenario";
import { money, pct } from "@/lib/format";
import type { AskPayload, ChatMessage, IssueRecord } from "@/lib/types";
import { numbersAreGrounded } from "./numbers";

const VendorCode = z.enum(["V1", "V2", "V3", "V4", "V5"]);

const tools = [
  zodResponsesFunction({
    name: "run_scenario",
    description: "Compute an award scenario exactly: award splits, vendor filters, combining plant volumes, price-match what-ifs. Use for any question about totals, costs, savings or who to award.",
    parameters: ScenarioSpec,
  }),
  zodResponsesFunction({
    name: "list_open_issues",
    description: "List open issues (missing lines, unclear terms, unreadable values, expired certificates) per vendor.",
    parameters: z.object({ vendor: VendorCode.nullable() }),
  }),
  zodResponsesFunction({
    name: "vendor_profile",
    description: "Terms, questionnaire result, certificates and lines quoted for one vendor.",
    parameters: z.object({ vendor: VendorCode }),
  }),
  zodResponsesFunction({
    name: "ask_clarifying_question",
    description: "Use when the question is ambiguous (e.g. 'the expensive one' could mean several vendors). Ask ONE short question with 2–4 clickable choices, each a complete question the user could ask instead.",
    parameters: z.object({ question: z.string(), choices: z.array(z.string()) }),
  }),
];

function context(input: ComparisonInput, comparison: Comparison) {
  const vendors = comparison.vendors
    .map((s) => `${s.vendor.code} ${s.vendor.name}: ${s.processed ? `${s.linesQuoted}/${input.lines.length} lines, total ${money(s.total)}, questionnaire ${s.questionnaire.passed ? "PASS" : "FAIL"} (${s.questionnaire.score}%)${s.invalidReasons.length && s.processed ? ` – ${s.invalidReasons.join("; ")}` : ""}, payment ${s.vendor.payment_days ?? "?"} days` : "not processed yet"}`)
    .join("\n");
  const cats = [...new Set(input.lines.map((l) => `${l.ply}-ply ${l.category}`))].join(", ");
  return `Vendors:\n${vendors}\nLine categories: ${cats} (rsc = regular slotted boxes, heavy = 7-ply).\nPlants: Plant 1 (Pune), Plant 2 (Nashik).`;
}

const INSTRUCTIONS = `You are the analysis assistant inside a procurement comparison tool for a corrugated-packaging RFQ.
You NEVER calculate. To answer, call exactly one tool. For follow-ups, build on the previous scenario (keep its filters unless the user changes them).
Vendor names map to codes: use the codes in tool calls. "Passed the questionnaire" means passed_only=true.
"Split the award" / "cheapest per line" → rule cheapest_per_line. "Combine both plants' volumes" → volume combined.
If the question is ambiguous, call ask_clarifying_question instead of guessing.
After a tool result, write 2–3 short sentences for a VP. Use ONLY numbers that appear in the tool result; format money like ₹1.19 Cr or ₹5.0 L. Refer to suppliers by name, never by code (V1, V2…), and call them suppliers, never vendors. Do not list every line. No markdown headings.`;

export type AskContext = {
  input: ComparisonInput;
  comparison: Comparison;
  contracts: Contract[];
  issues: IssueRecord[];
  history: ChatMessage[];
};

function compactResult(r: ScenarioResult, previousTotal: number | null) {
  return {
    name: r.name,
    total: money(r.total),
    total_rupees: Math.round(r.total),
    awarded: r.by_vendor.map((v) => ({ vendor: `${v.code} ${v.name}`, lines: v.lines.length, value: money(v.value), share: pct(v.share * 100, 0) })),
    excluded: r.excluded,
    lines_uncovered: r.lines_uncovered,
    cheapest_single_vendor: r.cheapest_single ? { vendor: r.cheapest_single.code, total: money(r.cheapest_single.total) } : null,
    savings_vs_cheapest_single_vendor: r.savings_vs_single !== null ? money(r.savings_vs_single) : null,
    savings_vs_last_year: r.last_year ? { amount: money(r.last_year.savings), pct: pct(r.last_year.pct), lines: r.last_year.comparable_lines } : null,
    volume_tier_lines: r.tier_lines,
    price_matched_lines: r.rows.filter((x) => x.matched).map((x) => x.line_no),
    previous_answer_total: previousTotal !== null ? money(previousTotal) : null,
    change_vs_previous: previousTotal !== null ? money(r.total - previousTotal) : null,
  };
}

function allowedNumbers(r: ScenarioResult, previousTotal: number | null): number[] {
  const n: number[] = [r.total, r.lines_in_scope, r.eligible.length, r.excluded.length, 70, 30, 18];
  for (const v of r.by_vendor) n.push(v.value, v.lines.length, v.share * 100, Number(v.code.slice(1)));
  for (const e of r.excluded) n.push(Number(e.code.slice(1)));
  for (const x of r.rows) { n.push(x.line_no); if (x.total) n.push(x.total, x.unit_price!); }
  if (r.cheapest_single) n.push(r.cheapest_single.total, Number(r.cheapest_single.code.slice(1)));
  if (r.savings_vs_single !== null) n.push(r.savings_vs_single, Math.abs(r.savings_vs_single));
  if (r.last_year) n.push(r.last_year.savings, r.last_year.pct, r.last_year.comparable_lines, r.last_year.last_year_total, r.last_year.scenario_total);
  n.push(r.tier_lines.length, ...r.tier_lines, r.lines_uncovered.length);
  if (previousTotal !== null) n.push(previousTotal, Math.abs(r.total - previousTotal), r.total - previousTotal);
  return n;
}

function fallbackText(r: ScenarioResult, previousTotal: number | null, nameOf: (code: string) => string) {
  const award = r.by_vendor.map((v) => `${v.name} (${v.lines.length} lines)`).join(", ");
  let t = `Award to ${award}: total ${money(r.total)}.`;
  if (r.savings_vs_single && r.cheapest_single) t += ` That is ${money(r.savings_vs_single)} below the cheapest single supplier (${nameOf(r.cheapest_single.code)}).`;
  if (previousTotal !== null) t += ` ${r.total <= previousTotal ? `${money(previousTotal - r.total)} less` : `${money(r.total - previousTotal)} more`} than the previous answer.`;
  return t;
}

export type AskResult = { content: string; payload: AskPayload };

function history(h: ChatMessage[]): ResponseInputItem[] {
  return h.slice(-8).map((m) =>
    m.role === "user"
      ? { role: "user" as const, content: m.content }
      : { role: "assistant" as const, content: m.payload?.result ? `${m.content}\n[Scenario used: ${JSON.stringify(m.payload.result.spec)}]` : m.content },
  );
}

export async function ask(question: string, ctx: AskContext): Promise<AskResult> {
  const previous = [...ctx.history].reverse().find((m) => m.payload?.result)?.payload?.result ?? null;
  const input: ResponseInputItem[] = [
    { role: "developer", content: context(ctx.input, ctx.comparison) },
    ...history(ctx.history),
    { role: "user", content: question },
  ];
  const first = await openai().responses.parse({ model: aiModel(), reasoning: { effort: "low" }, instructions: INSTRUCTIONS, input, tools, tool_choice: "required" });
  const call = first.output.find((o) => o.type === "function_call");
  if (!call || call.type !== "function_call") return { content: "I couldn't work out what to compute. Try one of the suggested questions.", payload: { kind: "error" } };
  const args = call.parsed_arguments as Record<string, unknown>;

  if (call.name === "ask_clarifying_question") {
    const a = args as { question: string; choices: string[] };
    return { content: a.question, payload: { kind: "clarify", choices: a.choices.slice(0, 4) } };
  }

  if (call.name === "list_open_issues" || call.name === "vendor_profile") {
    const code = (args.vendor as string | null) ?? null;
    if (call.name === "list_open_issues") {
      const rows = ctx.comparison.vendors
        .filter((s) => !code || s.vendor.code === code)
        .map((s) => {
          const open = ctx.issues.filter((i) => i.vendor_id === s.vendor.id && i.status !== "resolved");
          return [s.vendor.code, s.vendor.name, open.length, open.slice(0, 3).map((i) => i.title).join("; ") || "None"];
        });
      const withIssues = rows.filter((r) => (r[2] as number) > 0);
      return {
        content: withIssues.length
          ? `${withIssues.length} supplier${withIssues.length > 1 ? "s" : ""} still ha${withIssues.length > 1 ? "ve" : "s"} open issues: ${withIssues.map((r) => `${r[1]} (${r[2]})`).join(", ")}. Use “Ask supplier” to send one email per supplier.`
          : "No open issues. Every supplier's quote is complete.",
        payload: { kind: "issues", table: { columns: ["Code", "Supplier", "Open", "Examples"], rows } },
      };
    }
    const s = ctx.comparison.vendors.find((x) => x.vendor.code === code)!;
    return {
      content: `${s.vendor.name}: ${s.linesQuoted} of ${ctx.input.lines.length} lines, total ${money(s.total)}. Questionnaire ${s.questionnaire.passed ? "passed" : "failed"} at ${s.questionnaire.score}%${s.questionnaire.failures.length ? ` (${s.questionnaire.failures[0]})` : ""}.`,
      payload: {
        kind: "profile",
        table: {
          columns: ["Item", "Value"],
          rows: [
            ["Lines quoted", `${s.linesQuoted} of ${ctx.input.lines.length}`], ["Total value", money(s.total)],
            ["Questionnaire", `${s.questionnaire.passed ? "Pass" : "Fail"} · ${s.questionnaire.score}%`],
            ["Payment", s.vendor.payment_days ? `${s.vendor.payment_days} days` : "—"], ["Lead time", s.vendor.lead_time_days ? `${s.vendor.lead_time_days} days` : "—"],
            ["Freight", s.vendor.freight ?? "—"],
          ],
        },
      },
    };
  }

  // run_scenario: validated by the schema, computed by code.
  const spec = ScenarioSpec.parse(args);
  const result = runScenario(ctx.input, ctx.comparison, ctx.contracts, spec);
  const previousTotal = previous ? previous.total : null;

  const nameOf = (code: string) => ctx.comparison.vendors.find((s) => s.vendor.code === code)?.vendor.name ?? code;
  let text = fallbackText(result, previousTotal, nameOf);
  let checked = false;
  try {
    const second = await openai().responses.create({
      model: aiModel(),
      reasoning: { effort: "low" },
      instructions: INSTRUCTIONS,
      input: [
        ...input,
        { type: "function_call", call_id: call.call_id, name: call.name, arguments: call.arguments },
        { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(compactResult(result, previousTotal)) },
      ],
    });
    const prose = second.output_text.trim();
    if (prose && numbersAreGrounded(prose, allowedNumbers(result, previousTotal)).ok) {
      text = prose;
      checked = true;
    }
  } catch {
    // The table and working still answer the question; keep the code-written summary.
  }
  return { content: text, payload: { kind: "answer", result, previousTotal, explanationChecked: checked } };
}
