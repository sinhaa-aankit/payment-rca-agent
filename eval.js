import fs from "node:fs";
import { diagnose } from "./diagnoser.js";

const file = process.argv[2] ?? "data/hard-cases.json";
const payments = JSON.parse(fs.readFileSync(file, "utf8"));

const results = [];

for (const [i, p] of payments.entries()) {
    const { expected, ...record } = p;          // strip the answer key
    const level = expected.difficulty;
    const start = Date.now();
    let got;

    try {
        // TODO 1: call diagnose(record).
        // If it returns null → got = "NO_DIAGNOSIS", else got = its rootCause
        got = (await diagnose(record))?.rootCause ?? "NO_DIAGNOSIS";
    } catch (e) {
        got = "ERROR";                          // one failure must not kill the run
        console.log(`  ${p.id} error: ${e.message}`);
    }

    const ms = Date.now() - start;
    const ok = got === expected.rootCause;
    results.push({ id: p.id, level, expected: expected.rootCause, got, ok, ms });
    console.log(`${ok ? "✅" : "❌"} ${p.id} [${level}] expected=${expected.rootCause} got=${got} (${ms}ms)`);
}

const score = (rows) => `${rows.filter((r) => r.ok).length}/${rows.length}`;

// TODO 2: print overall, easy and hard scores
//   hint: score(results), score(results.filter((r) => r.level === "easy"))
console.log(`overall: ${score(results)}`);
console.log(`Easy: ${score(results.filter((r) => r.level === "easy"))}`);
console.log(`Hard: ${score(results.filter((r) => r.level === "hard"))}`);

// TODO 3: print the score per cause
//   hint: const causes = [...new Set(results.map((r) => r.expected))];
//         loop causes → score(results.filter((r) => r.expected === cause))
const causes = [...new Set(results.map((r) => r.expected))];
console.log('Results per Cause:- ')
for (const cause of causes) {
    console.log(`${cause} : ${score(results.filter((r) => r.expected === cause))}`);
}

// TODO 4: print each miss as "PAY-00xx: EXPECTED → GOT"
//   hint: results.filter((r) => !r.ok)
console.log("Misses:");
results.filter((r) => !r.ok).forEach((r) => console.log(`${r.id}: Expected- ${r.expected} | Got- ${r.got}`));

// TODO 5: print average latency in ms
const avg = Math.round(results.reduce((sum, r) => sum + r.ms, 0) / results.length);
console.log(`Avg time taken in ms: ${avg}`);

// TODO 6: save results so you can compare before/after later
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(`results/eval-${Date.now()}.json`, JSON.stringify(results, null, 2));