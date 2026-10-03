import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getText, extractJson } from "./utils.js";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

const TAXONOMY = JSON.parse(fs.readFileSync("data/taxonomy.json", "utf8"));
const LABELS = [...Object.keys(TAXONOMY), "UNKNOWN"];

const DiagnosisSchema = z.object({
  rootCause: z.enum(LABELS),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.string().min(1),
  reason: z.string().min(1),
});

const SYSTEM = `You are a senior payments support engineer performing root cause analysis.

Classify the ROOT CAUSE (not the symptom) of the failed payment into exactly one label:
${JSON.stringify(TAXONOMY, null, 2)}

Rules:
- Use only evidence present in the record. Do not assume facts not shown.
- If the evidence does not clearly support any label, use "UNKNOWN".

Reply with ONLY a JSON object. No markdown, no code fences, no extra text:
{"rootCause": one of ${JSON.stringify(LABELS)}, "confidence": "high" | "medium" | "low", "evidence": "the exact log line that proves it", "reason": "one sentence"}`;

export async function diagnose(record) {
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
      const result = DiagnosisSchema.safeParse(extractJson(text));
      if (result.success) return result.data;
      throw new Error(result.error.message);
    } catch (err) {
      console.log(`  Attempt ${attempt} failed: ${err.message}`);
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content: `Your reply was invalid: ${err.message}. Reply again with ONLY the corrected JSON object.`,
      });
    }
  }

  return null;
}