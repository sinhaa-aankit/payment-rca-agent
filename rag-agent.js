import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getText, extractJson } from "./utils.js";
import { diagnose } from "./diagnoser.js";
import { search } from "./rag.js";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";

const payments = JSON.parse(fs.readFileSync("data/payments.json", "utf8"));
const index = JSON.parse(fs.readFileSync("data/index.json", "utf8"));
const sample = payments.filter((_, i) => i % 5 === 4).slice(0, 3); // 3 hard cases
const toFile = (label) => label.toLowerCase().replace(/_/g, "-") + ".md";

const FixSchema = z.object({
    suggestedFix: z.string().min(1),
    clientNote: z.string().min(1),
    usedSections: z.array(z.string()),
});

const SYSTEM = `You are a senior payments support engineer.
Using ONLY the runbook sections provided, write the fix and a short client-facing note.
If the sections do not cover this case, say so in suggestedFix. Do not invent steps.
Reply with ONLY a JSON object, no markdown:
{"suggestedFix": "...", "clientNote": "...", "usedSections": ["ids of sections you used"]}
- In clientNote, keep bracketed placeholders like [completed / retried] as-is. Never claim an action has been taken.`;

async function recommend(diagnosis, chunks) {
    if (chunks.length === 0) {
        return { suggestedFix: "NOT_COVERED: no runbook found, escalate to a human.", clientNote: "", usedSections: [] };
    }
    const context = chunks.map((c) => `[${c.id}]\n${c.text}`).join("\n\n");
    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        temperature: 0,
        system: SYSTEM,
        messages: [
            { role: "user", content: `Diagnosis:\n${JSON.stringify(diagnosis)}\n\nRunbook sections:\n${context}` },
        ],
    });
    const result = FixSchema.safeParse(extractJson(getText(response)));
    if (!result.success) throw new Error(result.error.message);
    return result.data;
}

for (const p of sample) {
    const { expected, ...record } = p;

    // TODO 1 (Retrieve, part 1): get the diagnosis using diagnose(record)
    const diagnosis = await diagnose(record);
    if (!diagnosis) {
        console.log(`${p.id}: ❌ no valid diagnosis`);
        continue;
    }

    // TODO 2 (Retrieve, part 2): search with the diagnosis reason, filtered to the matching runbook
    const WANTED = ["Checks", "Fix", "Client Communication"];
    let chunks;
    if (diagnosis.rootCause !== "UNKNOWN") {
        // Known cause: deterministic metadata filter
        chunks = index
            .filter((c) => c.source === toFile(diagnosis.rootCause) && WANTED.includes(c.section))
            .map(({ embedding, ...c }) => c);
    } else {
        // Unknown cause: semantic search across all runbooks
        chunks = await search(diagnosis.reason, 3);
    }

    // TODO 3 (Augment + Generate): rec = await recommend(diagnosis, chunks)
    const rec = await recommend(diagnosis, chunks);

    const fake = rec.usedSections.filter((id) => !chunks.some((c) => c.id === id));
    if (fake.length) console.log("  ⚠️ cited sections not retrieved:", fake);

    // TODO 4: print id, rootCause, retrieved chunk ids, suggestedFix, clientNote, usedSections
    console.log(`\n${p.id} → ${diagnosis.rootCause}`);
    console.log("  retrieved:", chunks.map((c) => c.id));
    console.log("  used:     ", rec.usedSections);
    console.log("  fix:      ", rec.suggestedFix);
    console.log("  client:   ", rec.clientNote);
}