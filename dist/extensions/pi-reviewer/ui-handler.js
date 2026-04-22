import { writeFile } from "node:fs/promises";
import path from "node:path";
import { startUIServer } from "../../src/core/ui-server.js";
/**
 * Returns the injection message to send to the agent, or undefined if none.
 * Save is handled internally; the caller is responsible for sending the injection
 * message at the right time (after any agent-side save has completed).
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
        const md = buildDecisionsMarkdown(result, action.decisions, source, action.globalComment, opts.model);
        const ts = new Date().toISOString().replace(/[T:]/g, "-").slice(0, 19);
        const slug = source.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const filename = `pi-review-${ts}-${slug}.md`;
        if (saveRemote) {
            saveRemote(md);
            notify(`Review save requested → ${filename} (remote)`);
        }
        else {
            await writeFile(path.join(cwd, filename), md, "utf-8");
            notify(`Review saved → ${filename}`);
        }
    }
    if (action.type === "send" || action.type === "save-and-send") {
        return buildInjectionMessage(result, action.decisions, conventions, action.globalComment);
    }
    return undefined;
}
function getModelLabel(model) {
    if (!model)
        return "unknown";
    return `${model.provider}/${model.id}`;
}
function buildDecisionsMarkdown(result, decisions, source, globalComment, model) {
    const date = new Date().toISOString().replace("T", " ").slice(0, 19);
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
