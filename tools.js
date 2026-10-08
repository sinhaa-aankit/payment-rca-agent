import fs from "node:fs";
import { search } from "./rag.js";

const payments = [
    ...JSON.parse(fs.readFileSync("data/payments.json", "utf8")),
    ...JSON.parse(fs.readFileSync("data/hard-cases.json", "utf8")),
];
const index = JSON.parse(fs.readFileSync("data/index.json", "utf8"));
const CAUSES = ["CBS_TIMEOUT", "INSUFFICIENT_BALANCE", "DUPLICATE_PAYMENT",
    "INVALID_BENEFICIARY", "CONFIG_ERROR", "NETWORK_ERROR"];
const WANTED = ["Checks", "Fix", "Client Communication"];
const toFile = (label) => label.toLowerCase().replace(/_/g, "-") + ".md";

export const tools = [
    {
        name: "getPaymentLogs",
        description: "Returns a payment's status, error code, error message and logs by payment ID. Always call this first.",
        input_schema: {
            type: "object",
            properties: { paymentId: { type: "string", description: "Payment ID, e.g. PAY-0005" } },
            required: ["paymentId"],
        },
    },
    {
        name: "getRunbook",
        description: "Returns the Checks, Fix and Client Communication sections of the runbook for a known root cause. Call this after you have decided the cause, unless it is UNKNOWN.",
        input_schema: {
            type: "object",
            properties: { rootCause: { type: "string", enum: CAUSES } },
            required: ["rootCause"],
        },
    },
    {
        name: "searchRunbooks",
        description: "Searches all runbooks by meaning and returns the 3 closest sections. Use ONLY when the root cause is UNKNOWN. Pass a short description of the failure.",
        input_schema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
        },
    },
];

function getPaymentLogs({ paymentId }) {
    const p = payments.find((x) => x.id === paymentId);
    if (!p) return { error: `No payment found with id ${paymentId}` };
    const { expected, ...record } = p;
    return record;
}

// TODO 1: return [{ id, text }] for the cause's WANTED sections
// - if rootCause isn't in CAUSES → return { error: ... }
// - reuse your Day 9 filter: c.source === toFile(rootCause) && WANTED.includes(c.section)
function getRunbook({ rootCause }) {
    if (!CAUSES.includes(rootCause)) return { error: `Unknown root cause: ${rootCause}` };
    return index
        .filter((c) => c.source === toFile(rootCause) && WANTED.includes(c.section))
        .map(({ id, text }) => ({ id, text }));
}

// TODO 2: await search(query, 3) and return [{ id, text, score }]
// (round score to 3 decimals; never return the embedding)
// tuned from tests: irrelevant ~0.45, relevant ~0.66+
const MIN_SCORE = 0.55; 

async function searchRunbooks({ query }) {
    const chunks = (await search(query, 3)).filter((c) => c.score >= MIN_SCORE);
    if (!chunks.length) return { error: "No relevant runbook section found for this failure." };
    return chunks.map(({ id, text, score }) => ({ id, text, score: Number(score.toFixed(3)) }));
}

const impl = { getPaymentLogs, getRunbook, searchRunbooks };

// Runs a tool safely and records every section id it returned
export async function runTool(name, input, retrieved) {
    const fn = impl[name];
    if (!fn) return { error: `Unknown tool: ${name}` };
    try {
        const result = await fn(input);
        if (Array.isArray(result)) result.forEach((c) => retrieved.add(c.id));
        return result;
    } catch (e) {
        return { error: e.message };
    }
}