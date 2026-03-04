import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ContextOptions {
  cwd?: string;
}

export async function loadContext(options: ContextOptions = {}): Promise<string> {
  const cwd = options.cwd ?? process.cwd();
  const contextPath = path.join(cwd, "AGENTS.md");

  try {
    return await readFile(contextPath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}
