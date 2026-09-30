import fs from "node:fs";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";

const RUNBOOK_DIR = "runbooks";
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

async function embed(text) {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
}

// Splits one runbook into chunks, one per "## " section
function chunkRunbook(fileName, content) {
    const title = content.split("\n")[0].replace("# ", "").trim();
    const sections = content.split("\n## ").slice(1);

    return sections.map((sec) => {
        const [heading, ...body] = sec.split("\n");
        return {
            id: `${fileName}#${heading.trim().toLowerCase().replace(/\s+/g, "-")}`,
            source: fileName,
            section: heading.trim(),
            text: `${title} - ${heading.trim()}\n${body.join("\n").trim()}`,
        };
    });
}

const chunks = [];

// TODO 1: read every .md file in RUNBOOK_DIR and push its chunks into `chunks`
// Hints: fs.readdirSync(RUNBOOK_DIR), filter names ending in ".md",
//        fs.readFileSync(path.join(RUNBOOK_DIR, name), "utf8"), then chunkRunbook(name, content)
const runBooks = fs.readdirSync(RUNBOOK_DIR).filter(file => path.extname(file) === ".md");
runBooks.forEach(runBook => {
    const runBookContent = fs.readFileSync(path.join(RUNBOOK_DIR, runBook), "utf8");
    const chunkOfRunBook = chunkRunbook(runBook, runBookContent);
    chunks.push(...chunkOfRunBook);
})

// console.log(chunks);

// TODO 2: for each chunk, compute its embedding and store it as chunk.embedding
// Hint: a for...of loop with await embed(chunk.text)
for (const chunk of chunks) {
    chunk.embedding = await embed(chunk.text);
}

// console.log(JSON.stringify(chunks));
// console.log(chunks1);

// TODO 3: write `chunks` to data/index.json
// Hint: same as Day 3, fs.writeFileSync with JSON.stringify
fs.writeFileSync("data/index.json", JSON.stringify(chunks));

console.log(`Indexed ${chunks.length} chunks`);