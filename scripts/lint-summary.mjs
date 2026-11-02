// Prints ESLint errors as one "file:line rule" per line. Usage: npx eslint . -f json | node scripts/lint-summary.mjs
import { readFileSync } from "node:fs";

const results = JSON.parse(readFileSync(0, "utf8"));
let n = 0;
for (const f of results)
  for (const m of f.messages)
    if (m.severity === 2) {
      n++;
      console.log(`${f.filePath.replace(process.cwd() + "/", "")}:${m.line} ${m.ruleId}`);
    }
console.log(`${n} error(s)`);
