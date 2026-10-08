import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { triage } from "./agent.js";
import { paymentExists } from "./tools.js";

const PORT = Number(process.env.PORT ?? 3000);
const TRIAGE_TIMEOUT_MS = Number(process.env.TRIAGE_TIMEOUT_MS ?? 45000);
const API_KEYS = (process.env.API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
if (!API_KEYS.length) {
    console.error("API_KEYS is missing in .env");
    process.exit(1);
}

const app = express();
app.use(express.json({ limit: "10kb" }));

// Compares in constant time, so response timing can't leak how much of a key matched
function safeEqual(a, b) {
    const A = Buffer.from(a), B = Buffer.from(b);
    return A.length === B.length && crypto.timingSafeEqual(A, B);
}

// TODO 1: auth middleware
// - read the key: req.get("x-api-key")
// - if missing, or no key matches (API_KEYS.some((k) => safeEqual(k, key))) →
//   res.status(401).json({ error: "Invalid or missing API key" })
// - otherwise next()
function requireApiKey(req, res, next) {
    const key = req.get("x-api-key");
    if (!key || !API_KEYS.some((k) => safeEqual(k, key))) {
        return res.status(401).json({ error: "Invalid or missing API key" });
    }
    next();
}

const BodySchema = z.object({
    paymentId: z.string().regex(/^PAY-\d{4}$/, "paymentId must look like PAY-0001"),
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/triage", requireApiKey, async (req, res) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();
    let paymentId, result;

    // TODO 2: validate req.body with BodySchema.safeParse
    const body = BodySchema.safeParse(req.body ?? {});
    if (!body.success) {
        const issue = body.error.issues[0];
        return res.status(400).json({ error: `${issue.path.join(".") || "body"}: ${issue.message}`, requestId });
    }
    paymentId = body.data.paymentId;

    // TODO 3: if (!paymentExists(paymentId)) → 404 { error: "Payment not found", requestId } and return
    // (this happens BEFORE any LLM call, so it costs nothing)
    if (!paymentExists(paymentId)) {
        return res.status(404).json({ error: "Payment not found", requestId });
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TRIAGE_TIMEOUT_MS);
    try {
        // TODO 4: result = await triage(paymentId, { signal: ac.signal });
        // respond 200 with { requestId, latencyMs, ...result }
        result = await triage(paymentId, { signal: ac.signal });
        res.json({ requestId, latencyMs: Date.now() - start, ...result });

    } catch (e) {
        // TODO 5: map errors (check in this order):
        // - ac.signal.aborted                 → 504 "Triage timed out"
        // - e instanceof Anthropic.APIError   → 502 "Upstream AI service failed"
        // - anything else                     → 500 "Internal error"
        // always include requestId; NEVER send e.message to the client
        // log the real error: console.error(requestId, e)
        console.error(requestId, e);
        // Order matters: an aborted call throws an APIError too
        if (ac.signal.aborted) {
            res.status(504).json({ error: "Triage timed out", requestId });
        } else if (e instanceof Anthropic.APIError) {
            res.status(502).json({ error: "Upstream AI service failed", requestId });
        } else {
            res.status(500).json({ error: "Internal error", requestId });
        }
    } finally {
        clearTimeout(timer);
        // TODO 6: ONE structured log line per request:
        // console.log(JSON.stringify({ requestId, paymentId, status: res.statusCode,
        //   ms: Date.now() - start, rootCause: result?.rootCause, tokens: result?.tokens }));
        console.log(JSON.stringify({
            requestId, paymentId, status: res.statusCode, ms: Date.now() - start,
            rootCause: result?.rootCause, tokens: result?.tokens,
        }));
    }
});

app.listen(PORT, () => console.log(`Payment RCA API on http://localhost:${PORT}`));