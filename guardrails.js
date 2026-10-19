// guardrails.js — checks done in code, not trusted to the prompt

// lowercase, collapse whitespace, strip surrounding quotes
const norm = (s) =>
    String(s).toLowerCase().replace(/\s+/g, " ").replace(/^["'\s]+|["'\s]+$/g, "").trim();

export function checkEvidence(evidence, payment) {
    // TODO 1: build one normalised "haystack" string from:
    //   payment.logs (array), payment.errorCode, payment.errorMessage
    const haystack = [
        ...(payment.logs ?? []),
        payment.errorCode, payment.errorMessage,
        payment.errorCode && `errorCode: ${payment.errorCode}`,
        payment.errorMessage && `errorMessage: ${payment.errorMessage}`,
    ].filter(Boolean).map(norm).join("\n");

    // TODO 2: split evidence into kept / dropped
    //   a quote is kept if haystack.includes(norm(quote))
    //   (contains, not equality: the model may quote part of a line)
    const kept = [];
    const dropped = [];
    for (const quote of evidence) {
        const q = norm(quote);
        if (q && haystack.includes(q)) kept.push(quote);   // empty string would match everything, so require q
        else dropped.push(quote);
    }

    return { kept, dropped };
}

export function checkCitations(usedSections, retrieved) {
    // TODO 3: keep only section ids that are in the `retrieved` Set
    const kept = usedSections.filter((id) => retrieved.has(id));
    const dropped = usedSections.filter((id) => !retrieved.has(id));
    return { kept, dropped };
}

export function applyGuardrails(data, payment, retrieved) {
    const flags = [];

    // --- evidence ---
    const ev = checkEvidence(data.evidence ?? [], payment);
    if (ev.dropped.length) { flags.push(`EVIDENCE_DROPPED:${ev.dropped.length}`); console.log("  dropped:", ev.dropped); }
    data.evidence = ev.kept;

    // TODO 4: if no evidence survived AND rootCause !== "UNKNOWN": downgrade and return early
    if (ev.kept.length === 0 && data.rootCause !== "UNKNOWN") {
        data.rootCause = "UNKNOWN";
        data.confidence = "low";
        data.suggestedFix = "NOT_COVERED: diagnosis had no verifiable evidence, escalate to a human.";
        data.clientNote = "";
        data.usedSections = [];
        flags.push("DOWNGRADED_NO_EVIDENCE");
        return { data, flags };
    }

    // --- citations ---
    const cit = checkCitations(data.usedSections ?? [], retrieved);
    // TODO 5: drop uncited sections; if nothing grounded is left for a known cause, mark NOT_COVERED
    if (cit.dropped.length) flags.push(`CITATION_DROPPED:${cit.dropped.length}`);
    data.usedSections = cit.kept;
    if (data.usedSections.length === 0 && data.rootCause !== "UNKNOWN") {
        data.suggestedFix = "NOT_COVERED: fix not grounded in a retrieved runbook, escalate to a human.";
        data.clientNote = "";
        flags.push("FIX_UNGROUNDED");
    }

    return { data, flags };
}