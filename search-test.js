import fs from "node:fs";
import { search } from "./rag.js";

// Part 1: manual queries, to get a feel for it
const queries = [
    "core banking did not reply after 30 seconds",
    "account holder name does not match",
    "how do I explain a duplicate debit to the client",
];

for (const q of queries) {
    console.log(`\nQuery: "${q}"`);
    const results = await search(q, 3);
    for (const r of results) {
        console.log(`  ${r.score.toFixed(3)}  ${r.id}`);
    }
}

// Part 2: retrieval eval on all 30 payments (zero API cost)
const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));
const toFile = (label) => label.toLowerCase().replace(/_/g, "-") + ".md";

let hitAt1 = 0;
let hitAt3 = 0;
const misses = [];

for (const p of payments) {
    const query = [
        p.errorMessage,
        ...p.logs.filter((l) => /WARN|ERROR|FATAL/.test(l)).map((l) => l.replace(/^\S+\s+/, "")),
    ].join("\n");
    const results = await search(query, 3);
    const expectedFile = toFile(p.expected.rootCause);
    const sources = results.map((r) => r.source);

    if (sources[0] === expectedFile) hitAt1++;
    if (sources.includes(expectedFile)) hitAt3++;
    else misses.push({ id: p.id, expected: expectedFile, got: sources[0], difficulty: p.expected.difficulty });
}

console.log(`\nRecall@1: ${hitAt1}/${payments.length}`);
console.log(`Recall@3: ${hitAt3}/${payments.length}`);
console.table(misses);