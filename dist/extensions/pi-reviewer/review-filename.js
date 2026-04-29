/**
 * Shared helpers for generating review output filenames and model labels.
 * Used by index.ts, ui-handler.ts, and any future extension entry points.
 */
export function isModelInfo(model) {
    return (typeof model === "object" &&
        model !== null &&
        "provider" in model &&
        typeof model.provider === "string" &&
        "id" in model &&
        typeof model.id === "string");
}
export function getModelLabel(model) {
    if (!model)
        return "unknown";
    return `${model.provider}/${model.id}`;
}
export function buildReviewFilename(source, now = new Date()) {
    const ts = now.toISOString().replace(/[T:]/g, "-").slice(0, 19);
    const slug = source
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "untitled";
    return `pi-review-${ts}-${slug}.md`;
}
