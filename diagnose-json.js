import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getText, extractJson } from "./utils.js";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

const TAXONOMY = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));

const mode = process.argv[2] === "hard" ? 4 : 0;
const sample = payments.filter((_, i) => i % 5 === mode);

const LABELS = [...Object.keys(TAXONOMY), "UNKNOWN"];

// The shape we expect back, like a Mongoose schema
const DiagnosisSchema = z.object({
    rootCause: z.enum(LABELS),
    confidence: z.enum(["high", "medium", "low"]),
    evidence: z.string().min(1),
    reason: z.string().min(1),
});

// console.log(JSON.stringify(DiagnosisSchema));
// console.log(DiagnosisSchema1);

const SYSTEM = `You are a senior payments support engineer performing root cause analysis.

Classify the ROOT CAUSE (not the symptom) of the failed payment into exactly one label:
${JSON.stringify(TAXONOMY, null, 2)}

Rules:
- Use only evidence present in the record. Do not assume facts not shown.
- If the evidence does not clearly support any label, use "UNKNOWN".

Reply with ONLY a JSON object. No markdown, no code fences, no extra text:
{"rootCause": one of ${JSON.stringify(LABELS)}, "confidence": "high" | "medium" | "low", "evidence": "the exact log line that proves it", "reason": "one sentence"}`;

async function diagnose(record) {
    const messages = [
        { role: "user", content: `Diagnose this failed payment:\n${JSON.stringify(record, null, 2)}` },
    ];

    for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 200,
            temperature: 0,
            system: SYSTEM,
            messages,
        });

        if (response.stop_reason === "max_tokens") {
            throw new Error("Reply truncated: increase max_tokens");
        }

        const text = getText(response);

        try {
            const parsed = extractJson(text);

            // TODO 1: validate `parsed` using DiagnosisSchema.safeParse(parsed)
            //   - if result.success → return result.data
            //   - else → throw new Error(result.error.message)
            const result = DiagnosisSchema.safeParse(parsed);
            if (result.success) return result.data;
            else throw new Error(result.error.message)

        } catch (err) {
            console.log(`  Attempt ${attempt} failed: ${err.message}`);

            // TODO 2: push two messages so the model can fix its mistake:
            //   1) the bad reply:    { role: "assistant", content: text }
            //   2) a correction:     { role: "user", content: `Your reply was invalid: ${err.message}. Reply again with ONLY the corrected JSON object.` }
            messages.push({ role: "assistant", content: text });
            messages.push({ role: "user", content: `Your reply was invalid: ${err.message}. Reply again with ONLY the corrected JSON object.` });
        }
    }

    return null; // both attempts failed
}

let correct = 0;

for (const p of sample) {
    const { expected, ...record } = p;

    let result;
    try {
        result = await diagnose(record);
    } catch (err) {
        console.log(`${p.id}: ❌ ${err.message}`);
        continue;
    }

    const match = result.rootCause === expected.rootCause;
    if (match) correct++;

    console.log(
        `${p.id}: expected=${expected.rootCause} predicted=${result.rootCause} (${result.confidence}) ${match ? "✅" : "❌"}`
    );
    console.log(`   evidence: ${result.evidence}`);
}

// TODO 3: print the final score, e.g. "Score: 6/6"
console.log(`Score: ${correct}/${sample.length}`);