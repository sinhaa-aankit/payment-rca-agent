export function getText(response){
    return response.content
        .filter((block) => (block.type == "text"))
        .map((block) => block.text)
        .join("\n");
}