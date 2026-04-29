import { writeFile } from "node:fs/promises";
import path from "node:path";
import { startUIServer } from "../../src/core/ui-server.js";
import { getModelLabel, buildReviewFilename } from "./review-filename.js";
/**
 * Orchestrates the interactive review UI flow and produces an agent injection message when the user requests sending.
 *
 * Starts a UI server for the given review, notifies the caller of the UI URL, waits for the user's action, and closes the UI.
 * If the user chooses to save, the function will either write a timestamped markdown file into `cwd` or invoke `saveRemote` if provided.
 *
 * @returns A plain-text injection message for the agent if the user selected "send" or "save-and-send", `undefined` otherwise.
 */
export async function handleUIReview(opts) {
    const { result, diff, conventions, source, ssh, cwd, notify, saveRemote } = opts;
    const handle = await startUIServer(result, diff, source, ssh);
    notify(`Review UI → ${handle.url}`);
    const action = await handle.waitForAction();
    await handle.close();
    if (action.type === "closed")
        return undefined;
    if (action.type === "save" || action.type === "save-and-send") {
        const now = new Date();
        const md = buildDecisionsMarkdown(result, action.decisions, source, action.globalComment, opts.model, now);
        const filename = buildReviewFilename(source, now);
        if (saveRemote) {
            saveRemote(md, filename);
            notify(`Review save requested → <remote-project-root>/${filename}`);
        }
        else {
            const filePath = path.join(cwd, filename);
            await writeFile(filePath, md, "utf-8");
            notify(`Review saved → ${filePath}`);
        }
    }
    if (action.type === "send" || action.type === "save-and-send") {
        return buildInjectionMessage(result, action.decisions, conventions, action.globalComment);
    }
    return undefined;
}
/**
 * Create a markdown report summarizing review results and the decisions made for a given source.
 *
 * @param result - The review result containing a human summary and an array of comments referenced by decisions
 * @param decisions - Decisions for each comment (accept, reject, discuss) that determine how each comment is presented
 * @param source - The source identifier or path to include in the report title
 * @param globalComment - Optional overall comment to include near the top of the report
 * @param model - Optional model metadata; when provided the report header includes `provider/id` (or `"unknown"` if absent)
 * @returns The complete review report as a markdown-formatted string
 */
function buildDecisionsMarkdown(result, decisions, source, globalComment, model, now = new Date()) {
    const date = now.toISOString().replace("T", " ").slice(0, 19);
    const modelLabel = getModelLabel(model);
    const lines = [`# Pi Review — ${source}`, ``, `> ${date} · ${modelLabel}`, ``, `**Model:** ${modelLabel}`, ``, `---`, ``, `## Summary`, ``, result.summary, ``];
    if (globalComment)
        lines.push("## Comment", "", globalComment, "");
    const accepted = decisions.filter((d) => d.decision !== "reject");
    if (accepted.length > 0) {
        lines.push("## Review findings", "");
        for (const d of accepted) {
            const c = result.comments[d.index];
            if (!c)
                continue;
            const label = d.decision === "discuss" ? "💬 Discuss" : "✅ Accept";
            lines.push(`**${label}** \`${c.file}:${c.line}\` [${c.severity}]`, c.body, "");
            if (d.decision === "discuss" && d.discussText) {
                lines.push(`> ${d.discussText}`, "");
            }
        }
    }
    const rejected = decisions.filter((d) => d.decision === "reject");
    if (rejected.length > 0) {
        lines.push("## Rejected", "");
        for (const d of rejected) {
            const c = result.comments[d.index];
            if (c)
                lines.push(`- ❌ \`${c.file}:${c.line}\` ${c.body}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
function buildInjectionMessage(result, decisions, conventions, globalComment) {
    const accepted = decisions.filter((d) => d.decision !== "reject");
    const parts = ["Here are the review findings to address. Please work through each one:", ""];
    if (globalComment)
        parts.push(`**Overall comment:** ${globalComment}`, "");
    for (const d of accepted) {
        const c = result.comments[d.index];
        if (!c)
            continue;
        parts.push(`**\`${c.file}:${c.line}\`** [${c.severity}]`, c.body);
        if (d.decision === "discuss" && d.discussText)
            parts.push(`My note: ${d.discussText}`);
        parts.push("");
    }
    if (conventions)
        parts.push("---", "Project context:", conventions);
    return parts.join("\n");
}
