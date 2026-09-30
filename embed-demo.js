import { pipeline } from "@huggingface/transformers";

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

const output = await embedder("Core banking did not respond in time", {
  pooling: "mean",
  normalize: true,
});
const vector = Array.from(output.data);

console.log("Length:", vector.length);
console.log("First 5 numbers:", vector.slice(0, 5));