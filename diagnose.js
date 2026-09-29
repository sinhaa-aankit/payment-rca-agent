import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { getText } from "./utils.js";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

const TAXONOMY = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));

// Records are grouped 5 per cause: index 0 = easy, index 4 = hard
const mode = process.argv[2] === "hard" ? 4 : 0;
const sample = payments.filter((_, i) => i % 5 === mode);

const SYSTEM_BAD = "You are a helpful assistant.";

const SYSTEM_GOOD = `You are a senior payments support engineer performing root cause analysis.

Classify the ROOT CAUSE (not the symptom) of the failed payment into exactly one label:
${JSON.stringify(TAXONOMY, null, 2)}

Rules:
- Use only evidence present in the record. Do not assume facts not shown.
- If the evidence does not clearly support any label, answer UNKNOWN.

Reply in exactly this format, nothing else:
LABEL | one-sentence reason quoting the key log evidence`;

async function diagnose(record, system) {
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 150,
        temperature: 0,
        system,
        messages: [
            { role: "user", content: `Diagnose this failed payment:\n${JSON.stringify(record, null, 2)}` },
        ],
    });
    return getText(response).trim();
}

for (const p of sample) {
    // TODO 1: create `record` = p without the `expected` field (hint: Day 3 check-labels.js)
    const { expected, ...record } = p;

    const answer = await diagnose(record, SYSTEM_GOOD);
    console.log("Answer: ", answer);

    // TODO 2: take the label part of `answer` (the text before "|"), trimmed
    const predicted = answer.split("|")[0].trim();
    console.log("Predicted: ", predicted);

    // TODO 3: print id, expected label, predicted label, and ✅ if they match or ❌ if not
    console.log(`${p.id}: Expected: ${p.expected.rootCause} | Predicted: ${predicted} | ${p.expected.rootCause == predicted ? '✅' : '❌'}`);
    
    // break;
}