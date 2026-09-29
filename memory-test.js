import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { getText } from "./utils.js";

const client = new Anthropic();

// Call 1: tell it your name
await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 100,
  messages: [{ role: "user", content: "My name is Ankit." }],
});

// Call 2: separate call, no history
const noHistory = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 100,
  messages: [{ role: "user", content: "What is my name?" }],
});
console.log("WITHOUT history:", getText(noHistory));

// Call 3: resend the conversation
const withHistory = await client.messages.create({
  model: "claude-sonnet-5",
  max_tokens: 100,
  messages: [
    { role: "user", content: "My name is Ankit." },
    { role: "assistant", content: "Nice to meet you, Ankit!" },
    { role: "user", content: "What is my name?" },
  ],
});
console.log("WITH history:", getText(withHistory));