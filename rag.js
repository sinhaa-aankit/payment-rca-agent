import fs from "node:fs";
import { pipeline } from "@huggingface/transformers";

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const index = JSON.parse(fs.readFileSync("data/index.json", "utf8"));
// console.log(index);

async function embed(text) {
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// TODO 1: cosine similarity. The vectors are normalized, so it's just the dot product.
// Hint: loop over i, add a[i] * b[i] to a total, return the total
function cosine(a, b) {
    if (a.length != b.length) throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
    let total = 0;
    for(let i=0; i<a.length; i++){
        total += a[i]*b[i];
    }
    return total;
}

export async function search(query, k = 3, source) {
  const q = await embed(query);
  const pool = source ? index.filter((c) => c.source === source) : index;

  // TODO 2: score every chunk
  // Hint: index.map(({ embedding, ...chunk }) => ({ ...chunk, score: cosine(q, embedding) }))
  //       (we drop `embedding` from results to keep output small)
  const scored = pool.map(({ embedding, ...chunk }) => ({ ...chunk, score: cosine(q, embedding) }));

  // TODO 3: sort by score (highest first) and return the top k
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0,k);
}