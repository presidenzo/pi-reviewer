# Task: implement `src/diff-resolver.ts`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
It works in two modes:
- **Local**: developer runs `npx pi-reviewer review` on their feature branch
- **CI**: GitHub Actions runs it automatically on every PR

This is the first module to implement. It has no dependencies on other modules.

## Your job

Implement `src/diff-resolver.ts` and its tests `tests/diff-resolver.test.ts`.

Do not implement any other file. Do not touch `src/review.ts` or any other module.

## What `diff-resolver.ts` must do

Resolve the git diff to review based on CLI options and environment.

### Function signature

```typescript
export interface DiffOptions {
  pr?: number;       // --pr <number>
  diff?: string;     // --diff <ref>  e.g. "HEAD~2", "abc123"
  branch?: string;   // --branch <name>  e.g. "dev", "main"
  cwd?: string;      // working directory, defaults to process.cwd()
}

export interface DiffResult {
  diff: string;       // the raw diff content
  source: string;     // human-readable description e.g. "PR #42", "git diff HEAD~2"
}

export async function resolveDiff(options: DiffOptions): Promise<DiffResult>
```

### Resolution logic (in priority order)

1. `--pr <number>` → run `gh pr diff <number>` in cwd
2. `--diff <ref>` → run `git diff <ref>` in cwd
3. `--branch <name>` → run `git diff <name>...HEAD` in cwd
4. **default (CI)**: `GITHUB_ACTIONS=true` → run `git diff origin/${GITHUB_BASE_REF}...HEAD`
5. **default (local)**: auto-detect base branch:
   - run `git symbolic-ref refs/remotes/origin/HEAD --short` → returns e.g. `origin/main`
   - if that fails → fallback to `origin/main`
   - run `git diff <detected-base>...HEAD`

### Empty diff

If the resolved diff is empty, throw an error:
```
No changes found. Make sure you are on a feature branch with commits ahead of the base.
```

## Project setup

```
pi-reviewer/
├── package.json       (type: module, tsx for dev, vitest for tests)
├── tsconfig.json      (NodeNext module resolution)
├── src/
│   └── diff-resolver.ts   ← implement this
└── tests/
    └── diff-resolver.test.ts  ← implement this
```

Current `package.json` already has: `vitest`, `tsx`, `typescript`, `@types/node`.

Use only Node.js built-ins (`node:child_process`, `node:path`) — no extra packages.
Use `execSync` from `node:child_process` with `{ cwd, encoding: "utf-8" }`.

## Tests

File: `tests/diff-resolver.test.ts`

Mock `execSync` via `vi.mock` — never run real git commands in tests.

Cover:
- `--pr 42` → calls `gh pr diff 42`
- `--diff HEAD~2` → calls `git diff HEAD~2`
- `--branch dev` → calls `git diff dev...HEAD`
- CI mode (`GITHUB_BASE_REF=main`, `GITHUB_ACTIONS=true`) → calls `git diff origin/main...HEAD`
- Local auto-detect → `git symbolic-ref` returns `origin/main` → calls `git diff origin/main...HEAD`
- Local fallback → `git symbolic-ref` throws → falls back to `origin/main`
- Empty diff → throws with clear message

## Run tests

```bash
npx vitest --run tests/diff-resolver.test.ts
```
