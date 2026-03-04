import { readFile } from "node:fs/promises";
import path from "node:path";
export async function loadContext(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const contextPath = path.join(cwd, "AGENTS.md");
    try {
        return await readFile(contextPath, "utf-8");
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return "";
        }
        throw error;
    }
}
