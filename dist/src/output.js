import { writeFile } from "node:fs/promises";
import path from "node:path";
function isReviewComment(value) {
    if (!value || typeof value !== "object")
        return false;
    const comment = value;
    return (typeof comment.file === "string" &&
        typeof comment.line === "number" &&
        Number.isFinite(comment.line) &&
        (comment.side === "LEFT" || comment.side === "RIGHT") &&
        typeof comment.body === "string");
}
export function parseAgentResponse(text) {
    try {
        const parsed = JSON.parse(text);
        if (parsed &&
            typeof parsed === "object" &&
            typeof parsed.summary === "string" &&
            Array.isArray(parsed.comments) &&
            parsed.comments.every(isReviewComment)) {
            return {
                summary: parsed.summary,
                comments: parsed.comments,
            };
        }
    }
    catch {
        // graceful fallback below
    }
    return { summary: text, comments: [] };
}
function formatReviewResult(result) {
    const lines = ["== Review Summary ==", result.summary];
    if (result.comments.length > 0) {
        lines.push("", "== Inline Comments ==");
        for (const comment of result.comments) {
            lines.push(`${comment.file}:${comment.line} (${comment.side})`, comment.body, "");
        }
        while (lines[lines.length - 1] === "") {
            lines.pop();
        }
    }
    return lines.join("\n");
}
export async function sendOutput(options) {
    const result = parseAgentResponse(options.content);
    if (options.target === "terminal") {
        console.log(formatReviewResult(result));
        return;
    }
    if (options.target === "comment") {
        if (!options.githubToken) {
            throw new Error("GITHUB_TOKEN is required to post a comment");
        }
        if (typeof options.prNumber !== "number") {
            throw new Error("PR number is required to post a comment");
        }
        if (!options.repo) {
            throw new Error("Repository (owner/repo) is required to post a comment");
        }
        const response = await fetch(`https://api.github.com/repos/${options.repo}/pulls/${options.prNumber}/reviews`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${options.githubToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                body: result.summary,
                event: "COMMENT",
                comments: result.comments.map((comment) => ({
                    path: comment.file,
                    line: comment.line,
                    side: comment.side,
                    body: comment.body,
                })),
            }),
        });
        if (!response.ok) {
            throw new Error(`Failed to post GitHub comment: ${response.status} ${response.statusText}`);
        }
        return;
    }
    const cwd = options.cwd ?? process.cwd();
    const filePath = path.join(cwd, "pi-review.md");
    await writeFile(filePath, formatReviewResult(result), "utf-8");
    console.log("Review saved to pi-review.md");
}
