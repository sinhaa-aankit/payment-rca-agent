import "dotenv/config";

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;
const KEY = process.env.API_KEYS.split(",")[0];

const cases = [
    ["valid", KEY, { paymentId: "PAY-0005" }],
    ["no key", null, { paymentId: "PAY-0005" }],
    ["wrong key", "nope", { paymentId: "PAY-0005" }],
    ["bad body", KEY, { id: 5 }],
    ["not found", KEY, { paymentId: "PAY-9999" }],
];

for (const [name, key, body] of cases) {
    const headers = { "Content-Type": "application/json" };
    if (key) headers["x-api-key"] = key;
    const r = await fetch(`${BASE}/triage`, { method: "POST", headers, body: JSON.stringify(body) });
    const j = await r.json();
    console.log(`${body.paymentId}: ${name.padEnd(10)} → ${r.status}`, j.error ?? `${j.rootCause} (${j.latencyMs} ms, ${j.turns} turns)`);
}