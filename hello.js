import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [
        {role: "user", content: "Explain how card network authorizes the payment, in 2 lines."}
    ]
})

console.log("Reply: ", response.content[0].text);
console.log("Tokens: ", response.usage);
console.log("Stop Reason", response.stop_reason);
console.log("Response: ", JSON.stringify(response));