import "dotenv/config";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getText, extractJson } from "./utils.js";
import { DiagnosisSchema } from "./diagnoser.js";
import { tools, runTool } from "./tools.js";
import { AGENT_SYSTEM } from "./prompts.js";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TURNS = 6;

const AgentSchema = DiagnosisSchema.extend({
    suggestedFix: z.string().min(1),
    clientNote: z.string(),
    usedSections: z.array(z.string()),
});

export async function triage(paymentId) {
    const messages = [{ role: "user", content: `Triage payment ${paymentId}.` }];
    const retrieved = new Set();
    const tokens = { in: 0, out: 0 };
    let retried = false;

    for (let turn = 1; turn <= MAX_TURNS; turn++) {
        const res = await client.messages.create({
            model: MODEL, max_tokens: 800, temperature: 0, system: AGENT_SYSTEM, tools, messages,
        });
        tokens.in += res.usage.input_tokens;
        tokens.out += res.usage.output_tokens;
        messages.push({ role: "assistant", content: res.content });

        const calls = res.content.filter((b) => b.type === "tool_use");
        console.log(`  turn ${turn}: ${res.stop_reason}`,
            calls.map((c) => `${c.name}(${JSON.stringify(c.input)})`).join(", "));

        if (res.stop_reason === "tool_use") {
            // TODO 3: run EVERY call (there can be more than one):
            //   const result = await runTool(c.name, c.input, retrieved);
            // build one tool_result per call (add is_error: true if result.error),
            // then push ONE user message containing all of them
            const results = [];
            for (const c of calls) {
                const result = await runTool(c.name, c.input, retrieved);
                const r = { type: "tool_result", tool_use_id: c.id, content: JSON.stringify(result) };
                if (result.error) r.is_error = true;
                results.push(r);
            }
            messages.push({ role: "user", content: results });
            continue;
        }

        if (res.stop_reason === "end_turn") {
            // TODO 4: parse getText(res) with extractJson + AgentSchema.safeParse
            // - invalid and not yet retried → log the zod error, push a user message:
            //   `Invalid JSON: ${error}. Reply with ONLY the JSON object.`, set retried = true, continue
            // - invalid after retry → break
            let parsed;
            try {
                parsed = AgentSchema.safeParse(extractJson(getText(res)));
            } catch (e) {
                parsed = { success: false, error: { issues: [{ message: `not valid JSON (${e.message})` }] } };
            }
            if (!parsed.success) {
                const msg = parsed.error.issues[0].message;
                console.log("  zod error:", msg);
                if (retried) break;                 // second failure 
                retried = true;
                messages.push({ role: "user", content: `Invalid JSON: ${msg}. Reply with ONLY the JSON object.` });
                continue;
            }

            // TODO 5: citation check:
            //   const fake = data.usedSections.filter((id) => !retrieved.has(id));
            //   if any → log a warning and set data.citationWarning = fake
            // return { ...data, turns: turn, tokens }
            const data = parsed.data;
            if (retrieved.size === 0) {   // no runbook was found, so nothing to ground on
                data.suggestedFix = "NOT_COVERED: no matching runbook, escalate to a human.";
                data.clientNote = "";
                data.usedSections = [];
            }
            const fake = data.usedSections.filter((id) => !retrieved.has(id));
            if (fake.length) {
                console.log("  ⚠️ cited sections not retrieved:", fake);
                data.citationWarning = fake;
            }
            return { ...data, turns: turn, tokens };
        }
        break; // max_tokens or anything unexpected
    }
    console.log("  ⚠️ no valid final answer, escalating to a human");
    return { rootCause: "UNKNOWN", escalate: true, tokens };
}

// Runs only when you call `node agent.js`, not when another file imports triage()
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    for (const id of ["PAY-0005", "PAY-0015", "PAY-0035", "PAY-0039"]) {
        console.log(`\n${id}`);
        const r = await triage(id);
        console.log(`  → ${r.rootCause} | turns=${r.turns ?? "-"} | tokens in/out=${r.tokens.in}/${r.tokens.out}`);
        if (r.evidence) console.log("  evidence:", r.evidence.join(" | "));
        if (r.usedSections) console.log("  used:    ", r.usedSections);
        if (r.suggestedFix) console.log("  fix:     ", r.suggestedFix);
        if (r.clientNote !== undefined) console.log("  client:  ", r.clientNote || "(empty)");
    }
}