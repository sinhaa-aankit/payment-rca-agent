import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import {getText} from "./utils.js";

const client = new Anthropic();

const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: 
        "You are a senior payments support engineer at a bank. " +
        "Answer in plain text, maximum 3 line, no markdown",
    messages: [
        {role: "user", content: "A Payment is stuck in PARK Status. What could that mean?"}
    ]
});

const reply = getText(response);

console.log("Reply: ", reply);
console.log(JSON.stringify(response));