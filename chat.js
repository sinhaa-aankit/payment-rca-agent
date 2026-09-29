import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getText } from "./utils.js";

const client = new Anthropic();
const rl = readline.createInterface({ input, output });

const SYSTEM = "You are a senior payments support engineer. Keep answers under 3 lines.";
const history = [];
let totalTokensUsed = 0;

while (true) {
    let userText;
    try {
        userText = await rl.question("You: ");
    } catch {
        break; // Ctrl+C pressed, so exit cleanly
    }
    if (userText == "exit") break;

    // TODO 1: add the user's message to history
    history.push({ role: "user", content: userText });

    const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 500,
        system: SYSTEM,
        messages: history,
    });

    console.log("Claude:", getText(response));

    // TODO 2: add Claude's reply to history
    // Hint: push { role: "assistant", content: response.content }
    // (the full block array, not just the text; this keeps thinking blocks intact)
    history.push({ role: "assistant", content: response.content });

    // TODO 3: print response.usage.input_tokens for this turn
    const tokenUsedForAboveAnswer = (response.usage.input_tokens + response.usage.output_tokens);
    console.log("Tokens Used for above answer: ", tokenUsedForAboveAnswer);
    totalTokensUsed += tokenUsedForAboveAnswer;
}

console.log("Total token used: ", totalTokensUsed);

rl.close();