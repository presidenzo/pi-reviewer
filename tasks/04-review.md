# Task: implement `src/review.ts`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
`review.ts` is the main entry point — it wires together diff resolution, context loading, the agent session, and output routing.

## Your job

Implement `src/review.ts` and `tests/review.test.ts`.

Do not touch any other file.

## Dependencies already implemented

- `src/diff-resolver.ts` — exports `resolveDiff(options: DiffOptions): Promise<DiffResult>`
- `src/context.ts` — exports `loadContext(options?: ContextOptions): Promise<string>`
- `src/output.ts` — exports `sendOutput(options: OutputOptions): Promise<void>`, type `OutputTarget`

## What `review.ts` must do

### Types and function signature

```typescript
export interface ReviewOptions {
  cwd?: string;
  pr?: number;
  diff?: string;
  branch?: string;
  output?: OutputTarget;   // default: "terminal" locally, "comment" in CI
  dryRun?: boolean;
  githubToken?: string;    // defaults to process.env.GITHUB_TOKEN
  anthropicApiKey?: string; // defaults to process.env.ANTHROPIC_API_KEY
  repo?: string;           // defaults to process.env.GITHUB_REPOSITORY (format: "owner/repo")
}

export async function review(options: ReviewOptions): Promise<void>
```

### Behavior

1. **Resolve diff** via `resolveDiff({ pr, diff, branch, cwd })`
   - If diff is empty, `resolveDiff` throws — let it propagate

2. **Load context** via `loadContext({ cwd })`
   - Returns `""` if `AGENTS.md` not found — that's fine, continue

3. **Determine output target**
   - If `options.output` is set: use it
   - Else if `GITHUB_ACTIONS=true`: use `"comment"`
   - Else: use `"terminal"`

4. **Dry run** (`options.dryRun === true`)
   - Print the diff source and prompt to terminal
   - Do NOT call the agent
   - Return early

5. **Build system prompt**
   ```
   You are a code reviewer. Review the following PR diff carefully.
   Focus on: correctness, security, type safety, and alignment with project conventions.
   Be concise and actionable. Group feedback by file.

   <context if AGENTS.md loaded>
   --- Project conventions (AGENTS.md) ---
   {context}
   ---
   </context>
   ```

6. **Create agent session** via `createAgentSession` from `@mariozechner/pi-coding-agent`
   - `sessionManager: SessionManager.inMemory()`
   - `tools: createReadOnlyTools(cwd)`
   - Set `ANTHROPIC_API_KEY` env var from `options.anthropicApiKey` if provided

7. **Send prompt** — the diff as user message:
   ```
   Review this diff:

   {diff}
   ```

8. **Collect response** — listen to `agent_end` event, extract final assistant text

9. **Route output** via `sendOutput({ target, content, cwd, githubToken, prNumber: pr, repo })`

10. **Dispose session** via `session.dispose()`

## Project setup

```
pi-reviewer/
├── package.json
├── tsconfig.json
├── src/
│   ├── diff-resolver.ts   (done)
│   ├── context.ts         (done)
│   ├── output.ts          (done)
│   └── review.ts          ← implement this
└── tests/
    └── review.test.ts     ← implement this
```

## Tests

File: `tests/review.test.ts`

Mock these modules:
- `../src/diff-resolver.js` → `vi.mock`, return controlled `DiffResult`
- `../src/context.js` → `vi.mock`, return controlled context string
- `../src/output.js` → `vi.mock`, spy on `sendOutput`
- `@mariozechner/pi-coding-agent` → mock `createAgentSession` to return a fake session:
  ```typescript
  const fakeSession = {
    subscribe: vi.fn((cb) => {
      // immediately emit agent_end with a fake assistant message
      cb({
        type: "agent_end",
        messages: [{ role: "assistant", content: [{ type: "text", text: "LGTM" }] }],
      });
      return () => {};
    }),
    prompt: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
  };
  ```

Cover:
- `--dry-run`: logs diff source + prompt, does NOT call agent, does NOT call `sendOutput`
- Local mode (no `GITHUB_ACTIONS`): output target is `"terminal"`
- CI mode (`GITHUB_ACTIONS=true`): output target is `"comment"`
- `options.output` overrides auto-detect
- Missing `AGENTS.md` (empty context) does not break the flow
- Agent response is passed to `sendOutput`

## Run tests

```bash
npx vitest --run tests/review.test.ts
```
