export function buildSystemPrompt(context) {
    const basePrompt = [
        "You are a code reviewer. Review the following PR diff carefully.",
        "Focus on correctness, security, type safety, and alignment with project conventions.",
        "Return only a JSON object with this exact shape (no markdown fences, no extra text):",
        "{",
        '  "summary": "Overall review comment",',
        '  "comments": [',
        '    { "file": "src/auth.ts", "line": 42, "side": "RIGHT", "body": "Missing null check" }',
        "  ]",
        "}",
        "Field rules:",
        "- summary: overall review, shown as the PR review body",
        "- comments: array of inline comments (may be empty)",
        "- file: relative path from repo root",
        "- line: line number in the diff",
        '- side: "RIGHT" for added lines, "LEFT" for removed lines',
        "- body: the comment text",
    ].join("\n");
    if (!context.trim()) {
        return basePrompt;
    }
    return `${basePrompt}\n\n--- Project conventions (AGENTS.md) ---\n${context}\n---`;
}
export function buildUserPrompt(diff) {
    return `Review this diff:\n\n${diff}`;
}
