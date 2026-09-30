export function getText(response) {
    return response.content
        .filter((block) => (block.type == "text"))
        .map((block) => block.text)
        .join("\n");
}

export function extractJson(text) {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
}