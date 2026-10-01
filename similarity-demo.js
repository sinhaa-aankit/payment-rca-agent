import { pipeline } from "@huggingface/transformers";

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const embed = async (t) => Array.from((await embedder(t, { pooling: "mean", normalize: true })).data);
const cosine = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

const log = await embed("Giving up wait on backend module response");

const candidates = [
  "Core banking timeout",                      // same meaning, no shared words
  "The system took too long to reply",         // same meaning, no shared words
  "Beneficiary account is dormant",            // different meaning
  "Insufficient funds in remitter account",    // different meaning
];

for (const c of candidates) {
  console.log((cosine(log, await embed(c))).toFixed(3), c);
}