import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { getText } from "./utils.js";

const client = new Anthropic();
const TAXONOMY = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));

const flagged = [];

for (const p of payments) {
  const { expected, ...record } = p; // strip the label: no leakage!

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 50,
    system:
      "You are a payments expert. Classify the root cause using ONLY these definitions:\n" +
      JSON.stringify(TAXONOMY, null, 2) +
      "\nReply with exactly one label and nothing else.",
    messages: [{ role: "user", content: JSON.stringify(record) }],
  });

  const judged = getText(response).trim();
  if (judged !== expected.rootCause) {
    flagged.push({ id: p.id, label: expected.rootCause, judge: judged });
  }
}

console.log(`Flagged ${flagged.length}/${payments.length}`);
console.table(flagged);