import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadContext } from "../src/context.js";

const createdDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "pi-reviewer-context-"));
  createdDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("loadContext", () => {
  it("returns file content when AGENTS.md exists", async () => {
    const dir = await createTempDir();
    const content = "# Conventions\n- Keep functions small\n";
    await writeFile(path.join(dir, "AGENTS.md"), content, "utf-8");

    const result = await loadContext({ cwd: dir });

    expect(result).toBe(content);
  });

  it("returns empty string when AGENTS.md does not exist", async () => {
    const dir = await createTempDir();

    const result = await loadContext({ cwd: dir });

    expect(result).toBe("");
  });

  it("uses process.cwd() when cwd option is not provided", async () => {
    const dir = await createTempDir();
    const oldCwd = process.cwd();
    const content = "project context";
    await writeFile(path.join(dir, "AGENTS.md"), content, "utf-8");

    try {
      process.chdir(dir);
      const result = await loadContext();
      expect(result).toBe(content);
    } finally {
      process.chdir(oldCwd);
    }
  });
});
