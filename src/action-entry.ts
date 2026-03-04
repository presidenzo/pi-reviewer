import { readFile } from "node:fs/promises";
import { review } from "./review.js";

async function getPrNumber(): Promise<number | undefined> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return undefined;

  try {
    const raw = await readFile(eventPath, "utf-8");
    const event = JSON.parse(raw) as { pull_request?: { number?: number } };
    const number = event?.pull_request?.number;
    return typeof number === "number" ? number : undefined;
  } catch {
    return undefined;
  }
}

const prNumber = await getPrNumber();

await review({
  pr: prNumber,
  output: "comment",
});
