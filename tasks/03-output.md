# Task: implement `src/output.ts`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
After the agent produces a review, the result is routed to one of three targets: terminal, GitHub PR comment, or a file.

## Your job

Implement `src/output.ts` and `tests/output.test.ts`.

Do not touch any other file.

## What `output.ts` must do

Route the review text to the correct output target.

### Types and function signature

```typescript
export type OutputTarget = "terminal" | "comment" | "file";

export interface OutputOptions {
  target: OutputTarget;
  content: string;
  cwd?: string;          // used for "file" target, defaults to process.cwd()
  githubToken?: string;  // required for "comment" target
  prNumber?: number;     // required for "comment" target
  repo?: string;         // required for "comment" target — format: "owner/repo"
}

export async function sendOutput(options: OutputOptions): Promise<void>
```

### Behavior per target

**`terminal`**
- `console.log(content)`
- No external calls

**`comment`**
- Requires `githubToken`, `prNumber`, `repo` — throw `Error` with clear message if any is missing:
  - `"GITHUB_TOKEN is required to post a comment"`
  - `"PR number is required to post a comment"`
  - `"Repository (owner/repo) is required to post a comment"`
- Post to GitHub API:
  ```
  POST https://api.github.com/repos/{repo}/issues/{prNumber}/comments
  Authorization: Bearer {githubToken}
  Content-Type: application/json
  body: { "body": content }
  ```
- Use native `fetch` (Node 18+) — no extra packages
- Throw if the response is not ok (`response.ok === false`)

**`file`**
- Write content to `pi-review.md` in `cwd`
- Use `node:fs/promises` `writeFile`
- Log: `console.log("Review saved to pi-review.md")`

## Project setup

```
pi-reviewer/
├── package.json       (type: module, vitest for tests)
├── tsconfig.json      (NodeNext module resolution)
├── src/
│   ├── diff-resolver.ts   (already done — do not touch)
│   ├── context.ts         (already done — do not touch)
│   └── output.ts          ← implement this
└── tests/
    ├── diff-resolver.test.ts  (already done — do not touch)
    ├── context.test.ts        (already done — do not touch)
    └── output.test.ts         ← implement this
```

Use only `node:fs/promises`, `node:path`, and native `fetch` — no extra packages.

## Tests

File: `tests/output.test.ts`

Mock `fetch` via `vi.stubGlobal("fetch", vi.fn())`.
Use a real temp directory for the `file` target.
Mock `console.log` with `vi.spyOn`.

Cover:
- `terminal`: logs content to console
- `comment`: calls fetch with correct URL, headers, and body
- `comment`: throws clear error when `githubToken` is missing
- `comment`: throws clear error when `prNumber` is missing
- `comment`: throws clear error when `repo` is missing
- `comment`: throws when fetch response is not ok
- `file`: writes `pi-review.md` with correct content in cwd

## Run tests

```bash
npx vitest --run tests/output.test.ts
```
