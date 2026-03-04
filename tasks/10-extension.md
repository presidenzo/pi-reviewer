# Task: `extensions/pi-reviewer/index.ts` — pi extension

## What to do

Create the pi extension that registers a `/review` command inside the pi TUI.
It spawns `pi --mode json -p --no-session` as a subprocess — same pattern as the official subagent example.
No `Agent`, no `createAgentSession` — pure subprocess.

---

## Architecture

```
extensions/pi-reviewer/index.ts
  ↳ import resolveDiff    from "../../src/diff-resolver.js"
  ↳ import loadContext    from "../../src/context.js"
  ↳ import { buildSystemPrompt, buildUserPrompt } from "../../src/prompt-builder.js"
  ↳ spawn: pi --mode json -p --no-session --append-system-prompt <tmpfile> "<userPrompt>"
```

No shared code with `src/review.ts` (the CI action). Only the utility modules above are shared.

---

## Part 1 — Scaffold `extensions/pi-reviewer/index.ts`

Reference the official subagent example pattern:
`packages/coding-agent/examples/extensions/subagent`

The extension must:

1. Register a `/review` command via `pi.registerCommand("review", handler)`

2. Parse args from the command string:
   - `--diff <ref>` — git ref to diff against (e.g. `HEAD~1`)
   - `--branch <name>` — branch to diff against (e.g. `dev`)
   - `--pr <number>` — PR number (fetches diff via `gh`)
   - `--dry-run` — print prompts without calling pi

3. Call `resolveDiff(...)` + `loadContext(...)` + `buildSystemPrompt(...)` + `buildUserPrompt(...)`

4. Write system prompt to a temp file (use `os.tmpdir()` + random suffix)

5. Spawn pi subprocess:
   ```
   pi --mode json -p --no-session --append-system-prompt <tmpfile> "<userPrompt>"
   ```

6. Stream JSON events from subprocess stdout line by line
   - Parse each line as JSON
   - On `agent_end` event: extract assistant text from `messages`, display via `ctx.ui.notify()`
   - On error: display error via `ctx.ui.notify()`

7. Clean up temp file after subprocess exits

---

## Part 2 — Update `package.json`

Add pi extension registration:

```json
{
  "pi": {
    "extensions": ["./extensions"]
  }
}
```

---

## Part 3 — No tests required for the extension

The extension spawns a real subprocess — unit testing is not practical.
Manual testing: `pi install ~/projects/pi-reviewer` then run `/review` in pi TUI.

---

## Notes

- `ExtensionAPI` does NOT expose a sub-agent API — the only way is subprocess
- The subprocess pattern is confirmed by the official example at:
  `github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent`
- `ctx.ui.notify(message)` is how extensions display output to the user
- The subprocess must inherit `process.env` so `ANTHROPIC_API_KEY` etc. are available
- If `pi` binary is not in PATH, fail with a clear error message

---

## Do NOT run vitest after this task

The extension has no unit tests. Just verify the file compiles (no TypeScript errors).

```bash
npx tsc --noEmit
```
