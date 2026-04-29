import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { parseAgentResponse, type ReviewResult } from "../../src/core/output.js";
import type { MinSeverity } from "../../src/core/prompt-builder.js";
import { extractLastAssistantText } from "./events.js";

export interface RunSSHOptions {
  systemPrompt: string;
  userPrompt: string;
  pi: ExtensionAPI;
  stopLoader: () => void;
  notify: (msg: string) => void;
}

/**
 * Starts an SSH review run by registering PI event handlers and sending the user prompt to the agent.
 *
 * @param opts - Configuration for the review run
 * @param opts.systemPrompt - System-level prompt supplied to the agent before it starts
 * @param opts.userPrompt - The user-facing message sent to the agent to trigger the review
 * @param opts.pi - The ExtensionAPI instance used to communicate with the agent
 * @param opts.stopLoader - Callback invoked to stop any progress/loading UI when the run completes
 * @param opts.notify - Notification callback used to report a saved review (receives the message string)
 */
export function runSSHReview(opts: RunSSHOptions): void {
  const { systemPrompt, userPrompt, pi, stopLoader, notify } = opts;
  let done = false;

  pi.on("before_agent_start", async () => {
    if (done) return {};
    return { systemPrompt };
  });

  pi.on("agent_end", async () => {
    if (done) return;
    done = true;
    stopLoader();
    notify("Review saved → <remote-project-root>/pi-review.md");
  });

  pi.sendUserMessage(userPrompt);
}

export interface RunSSHWaitOptions {
  systemPrompt: string;
  userPrompt: string;
  pi: ExtensionAPI;
  minSeverity: MinSeverity;
  stopLoader: () => void;
  notify: (msg: string, type?: "info" | "warning" | "error") => void;
}

export function runSSHReviewAndWait(opts: RunSSHWaitOptions): Promise<ReviewResult> {
  const { systemPrompt, userPrompt, pi, minSeverity, stopLoader, notify } = opts;
  let done = false;
  let capturedDiff: string | undefined;

  return new Promise<ReviewResult>((resolve, reject) => {
    // Capture the diff from the bash tool result so we can pass it to the UI
    // without asking the agent to echo it back in the JSON response.
    pi.on("tool_result", async (event) => {
      if (done || event.toolName !== "bash") return;
      const output = event.content
        .map((c) => ("text" in c ? (c as { text: string }).text : ""))
        .join("");
      if (output.includes("diff --git ")) {
        capturedDiff = output;
      }
    });

    pi.on("before_agent_start", async () => {
      if (done) return {};
      return { systemPrompt };
    });

    pi.on("agent_end", async (event) => {
      if (done) return;
      done = true;
      stopLoader();

      const text = extractLastAssistantText(event.messages);
      if (!text) {
        reject(new Error("SSH agent returned an empty response"));
        return;
      }

      try {
        const result = parseAgentResponse(text, minSeverity);
        resolve({ ...result, ...(capturedDiff !== undefined ? { diff: capturedDiff } : {}) });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    pi.sendUserMessage(userPrompt);
  });
}
