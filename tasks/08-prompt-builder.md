# Task: Extract `src/prompt-builder.ts`

## What to do

Extract prompt-building logic from `src/review.ts` into a new shared module `src/prompt-builder.ts`.
This module will be used by both the CI action (`src/review.ts`) and the future pi extension.

---

## Part 1 — Create `src/prompt-builder.ts`

Create the file with these two exported functions:

### `buildSystemPrompt(context: string): string`

Instructs the agent to return a structured JSON object. The system prompt must:

1. Identify the agent as a code reviewer
2. Tell it to focus on correctness, security, type safety, and project conventions
3. Tell it to return **only** a JSON object with this exact shape (no markdown fences, no extra text):

```json
{
  "summary": "Overall review comment",
  "comments": [
    { "file": "src/auth.ts", "line": 42, "side": "RIGHT", "body": "Missing null check" }
  ]
}
```

Where:
- `summary` — overall review, shown as the PR review body
- `comments` — array of inline comments (may be empty)
- `file` — relative path from repo root
- `line` — line number in the diff
- `side` — `"RIGHT"` for added lines, `"LEFT"` for removed lines
- `body` — the comment text

4. If `context` (AGENTS.md content) is non-empty, append it after a `--- Project conventions (AGENTS.md) ---` separator.

### `buildUserPrompt(diff: string): string`

Returns:

```
Review this diff:

<diff content here>
```

---

## Part 2 — Update `src/review.ts`

Replace the inline `buildSystemPrompt` function with an import from `./prompt-builder.js`.
Add `buildUserPrompt` import and use it to build `userPrompt`.

Remove from `review.ts`:
```typescript
function buildSystemPrompt(context: string): string { ... }
```

Add import:
```typescript
import { buildSystemPrompt, buildUserPrompt } from "./prompt-builder.js";
```

Replace:
```typescript
const userPrompt = `Review this diff:\n\n${diff}`;
```

With:
```typescript
const userPrompt = buildUserPrompt(diff);
```

---

## Part 3 — Create `tests/prompt-builder.test.ts`

Test cases:

1. `buildSystemPrompt("")` — returns base prompt with JSON shape instructions, no AGENTS.md section
2. `buildSystemPrompt("use tabs")` — appends AGENTS.md section with the context
3. `buildUserPrompt("some diff")` — returns string containing the diff
4. JSON instruction is present in system prompt — check that the output contains `"summary"` and `"comments"`

---

## Run checks

```bash
npx vitest --run
```

All tests must pass (existing 27 + new prompt-builder tests).
