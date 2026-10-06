import fs from "node:fs";
import { diagnose } from "./diagnoser.js";

const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));
console.log("Payments: ", payments);

const mode = process.argv[2] === "hard" ? 4 : 0;
const sample = payments.filter((_, i) => i % 5 === mode);

let correct = 0;

for (const p of sample) {
  const { expected, ...record } = p;
  const result = await diagnose(record);

  if (!result) {
    console.log(`${p.id}: ❌ no valid answer after retry`);
    continue;
  }

  const match = result.rootCause === expected.rootCause;
  if (match) correct++;

  console.log(
    `${p.id}: expected=${expected.rootCause} predicted=${result.rootCause} (${result.confidence}) ${match ? "✅" : "❌"}`
  );
    console.log(`   evidence: ${result.evidence.join(" | ")}`);
}

console.log(`Score: ${correct}/${sample.length}`);