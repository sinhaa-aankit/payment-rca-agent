import "dotenv/config";
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import {getText } from "./utils.js";

const client = new Anthropic();

const CAUSES = [
    "CBS_TIMEOUT",
    "INSUFFICIENT_BALANCE",
    "DUPLICATE_PAYMENT",
    "INVALID_BENEFICIARY",
    "CONFIG_ERROR",
    "NETWORK_ERROR",
]

const SYSTEM =
    "You generate realistic SYNTHETIC test data for a generic bank payment system. " +
    "Output ONLY a valid JSON array. No markdown, no code fences, no explanation.";

const all = [];

for (const cause of CAUSES) {
    console.log(`Generating ${cause}`);
    const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 6000,
        system: SYSTEM,
        messages: [
            {
                role: "user", content: `Generate 5 failed payment records whose true root cause is ${cause}.
Each record: { "amount": number, "currency": "INR", "status": one of "RJCT","FAIL","PARK","PDNG",
"errorCode": string, "errorMessage": string, "logs": array of 3-6 timestamped log lines,
"difficulty": "easy" or "hard" }
Rules:
- First 3 records "easy": clues are obvious in the logs.
- Last 2 records "hard": clues are indirect or partly misleading.
- NEVER write the words "${cause}" or its obvious synonyms directly in the logs or messages.`,
            }
        ]
    });

    console.log("Tokens Used: ", (response.usage.input_tokens + response.usage.output_tokens));
    console.log("Response: ", JSON.stringify(response));


    // TODO 1: if response.stop_reason is "max_tokens", throw an error (Day 1 lesson!)
    if (response.stop_reason == "max_tokens") {
        throw new Error(`Reply truncated for ${cause}: hit max_tokens (${response.usage.output_tokens} tokens)`);
    }

    const text = getText(response);

    let records;
    try {
        records = JSON.parse(text);
    } catch (err) {
        console.error(`Bad JSON for ${cause}. Raw Output: ${text}`);
        throw err;
    }

    for (const r of records) {
        // We set the label ourselves, not the model
        r.expected = { rootCause: cause, difficulty: r.difficulty };
        delete r.difficulty;
        all.push(r);
    }
}

// TODO 2: give each record an id like "PAY-0001", "PAY-0002", ...
// Hint: all.forEach((r, i) => ...) and String(i + 1).padStart(4, "0")
all.forEach((rec, i)=> {
    rec.id = 'PAY-' + String(i+1).padStart(4, '0');
})

// TODO 3: write `all` to data/payments.json, pretty-printed
// Hint: fs.writeFileSync(path, JSON.stringify(all, null, 2))
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync('data/payments.json', JSON.stringify(all, null, 2));

console.log(`Done: ${all.length} records`);