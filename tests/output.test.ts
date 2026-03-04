import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseAgentResponse, sendOutput } from "../src/output.js";

const createdDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "pi-reviewer-output-"));
  createdDirs.push(dir);
  return dir;
}

describe("parseAgentResponse", () => {
  it("returns parsed ReviewResult for valid JSON", () => {
    const result = parseAgentResponse(
      JSON.stringify({
        summary: "Overall review",
        comments: [
          { file: "src/a.ts", line: 10, side: "RIGHT", body: "Nice improvement" },
        ],
      })
    );

    expect(result).toEqual({
      summary: "Overall review",
      comments: [
        { file: "src/a.ts", line: 10, side: "RIGHT", body: "Nice improvement" },
      ],
    });
  });

  it("falls back for invalid JSON", () => {
    const result = parseAgentResponse("not-json");

    expect(result).toEqual({ summary: "not-json", comments: [] });
  });

  it("falls back when JSON is missing required fields", () => {
    const result = parseAgentResponse(JSON.stringify({ summary: "Only summary" }));

    expect(result).toEqual({
      summary: JSON.stringify({ summary: "Only summary" }),
      comments: [],
    });
  });
});

describe("sendOutput", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("logs formatted content to console for terminal target", async () => {
    await sendOutput({ target: "terminal", content: "hello review" });

    expect(logSpy).toHaveBeenCalledWith("== Review Summary ==\nhello review");
  });

  it("posts review with correct request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendOutput({
      target: "comment",
      content: "LGTM",
      githubToken: "token123",
      prNumber: 42,
      repo: "owner/repo",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/pulls/42/reviews",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: "LGTM",
          event: "COMMENT",
          comments: [],
        }),
      }
    );
  });

  it("posts review with inline comments when content is valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendOutput({
      target: "comment",
      content: JSON.stringify({
        summary: "Needs fixes",
        comments: [
          { file: "src/auth.ts", line: 42, side: "RIGHT", body: "Missing null check" },
        ],
      }),
      githubToken: "token123",
      prNumber: 42,
      repo: "owner/repo",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/pulls/42/reviews",
      expect.objectContaining({
        body: JSON.stringify({
          body: "Needs fixes",
          event: "COMMENT",
          comments: [
            { path: "src/auth.ts", line: 42, side: "RIGHT", body: "Missing null check" },
          ],
        }),
      })
    );
  });

  it("uses plain text fallback for review body with no inline comments", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendOutput({
      target: "comment",
      content: "Looks mostly good",
      githubToken: "token123",
      prNumber: 42,
      repo: "owner/repo",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/pulls/42/reviews",
      expect.objectContaining({
        body: JSON.stringify({
          body: "Looks mostly good",
          event: "COMMENT",
          comments: [],
        }),
      })
    );
  });

  it("throws when githubToken is missing", async () => {
    await expect(
      sendOutput({
        target: "comment",
        content: "text",
        prNumber: 1,
        repo: "owner/repo",
      })
    ).rejects.toThrow("GITHUB_TOKEN is required to post a comment");
  });

  it("throws when prNumber is missing", async () => {
    await expect(
      sendOutput({
        target: "comment",
        content: "text",
        githubToken: "token",
        repo: "owner/repo",
      })
    ).rejects.toThrow("PR number is required to post a comment");
  });

  it("throws when repo is missing", async () => {
    await expect(
      sendOutput({
        target: "comment",
        content: "text",
        githubToken: "token",
        prNumber: 1,
      })
    ).rejects.toThrow("Repository (owner/repo) is required to post a comment");
  });

  it("throws when fetch response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendOutput({
        target: "comment",
        content: "text",
        githubToken: "token",
        prNumber: 1,
        repo: "owner/repo",
      })
    ).rejects.toThrow("Failed to post GitHub comment: 403 Forbidden");
  });

  it("writes formatted review to pi-review.md for file target", async () => {
    const dir = await createTempDir();

    await sendOutput({
      target: "file",
      content: JSON.stringify({
        summary: "Please address comments",
        comments: [
          { file: "src/a.ts", line: 7, side: "RIGHT", body: "Handle undefined" },
        ],
      }),
      cwd: dir,
    });

    const content = await readFile(path.join(dir, "pi-review.md"), "utf-8");
    expect(content).toBe(
      "== Review Summary ==\nPlease address comments\n\n== Inline Comments ==\nsrc/a.ts:7 (RIGHT)\nHandle undefined"
    );
    expect(logSpy).toHaveBeenCalledWith("Review saved to pi-review.md");
  });
});
