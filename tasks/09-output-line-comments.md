# Task: Upgrade `src/output.ts` to line-specific PR comments

## What to do

Upgrade the `comment` output target to use the **PR Reviews API** (not Issues API),
so inline line comments are posted directly on the diff.
Add `parseAgentResponse` to parse JSON from the agent, with a graceful plain-text fallback.

---

## Part 1 — Types (add to `src/output.ts` or a shared location)

```typescript
export interface ReviewComment {
  file: string;
  line: number;
  side: "LEFT" | "RIGHT";
  body: string;
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
}
```

---

## Part 2 — `parseAgentResponse(text: string): ReviewResult`

Export this function from `src/output.ts`.

Logic:
1. Try to parse `text` as JSON
2. If valid JSON with `summary` string and `comments` array → return it as `ReviewResult`
3. Otherwise → return `{ summary: text, comments: [] }`

---

## Part 3 — Update `sendOutput` — `comment` target

Current code posts to Issues API:
```
POST /repos/{repo}/issues/{prNumber}/comments
body: { body: content }
```

Replace with PR Reviews API:
```
POST /repos/{repo}/pulls/{prNumber}/reviews
body: {
  body: result.summary,
  event: "COMMENT",
  comments: result.comments.map(c => ({
    path: c.file,
    line: c.line,
    side: c.side,
    body: c.body,
  }))
}
```

Where `result = parseAgentResponse(content)`.

If `result.comments` is empty, still use the Reviews API (just with an empty comments array) — consistent behavior.

---

## Part 4 — `terminal` and `file` targets

Keep both targets outputting readable text.
For `terminal` and `file`, call `parseAgentResponse(content)` and render as:

```
== Review Summary ==
<summary>

== Inline Comments ==
<file>:<line> (<side>)
<body>

<file>:<line> (<side>)
<body>
...
```

If `comments` is empty, skip the inline comments section.

---

## Part 5 — Update `tests/output.test.ts`

Update existing tests and add new ones:

1. **comment target** — mock fetch, assert it calls `/pulls/{pr}/reviews` (not `/issues/{pr}/comments`)
2. **comment target with line comments** — `content` is valid JSON with comments → assert `comments` array in request body
3. **comment target plain text fallback** — `content` is plain text → `{ summary: text, comments: [] }` posted to reviews API
4. **`parseAgentResponse` valid JSON** — returns parsed `ReviewResult`
5. **`parseAgentResponse` invalid JSON** — returns `{ summary: text, comments: [] }`
6. **`parseAgentResponse` JSON missing fields** — falls back gracefully

All existing tests must still pass. Total test count must increase.

---

## Run checks

```bash
npx vitest --run
```

All tests must pass.
