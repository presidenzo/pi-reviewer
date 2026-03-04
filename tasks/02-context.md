# Task: implement `src/context.ts`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
It reads `AGENTS.md` from the project root to inject project-specific conventions into the agent's system prompt.

## Your job

Implement `src/context.ts` and `tests/context.test.ts`.

Do not touch any other file.

## What `context.ts` must do

Load the `AGENTS.md` file from the project root and return its content as a string.

### Function signature

```typescript
export interface ContextOptions {
  cwd?: string; // defaults to process.cwd()
}

export async function loadContext(options?: ContextOptions): Promise<string>
```

### Behavior

- Read `AGENTS.md` from `cwd` (use `node:fs/promises` `readFile`)
- If the file exists: return its content as a UTF-8 string
- If the file does not exist (`ENOENT`): return empty string `""`
- Do not throw for missing file — it is optional
- Any other error (permissions, etc.) should be re-thrown as-is

## Project setup

```
pi-reviewer/
├── package.json       (type: module, vitest for tests)
├── tsconfig.json      (NodeNext module resolution)
├── src/
│   ├── diff-resolver.ts   (already done — do not touch)
│   └── context.ts         ← implement this
└── tests/
    ├── diff-resolver.test.ts  (already done — do not touch)
    └── context.test.ts        ← implement this
```

Use only `node:fs/promises` and `node:path` — no extra packages.

## Tests

File: `tests/context.test.ts`

Use a real temp directory (`node:os` `tmpdir`) — no mocking needed, it's simple enough.

Cover:
- Returns file content when `AGENTS.md` exists
- Returns empty string when `AGENTS.md` does not exist
- Uses `process.cwd()` when no `cwd` option provided (create AGENTS.md in a temp dir and set `process.cwd` via `cwd` option)

## Run tests

```bash
npx vitest --run tests/context.test.ts
```
