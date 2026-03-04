# Task: cleanup + refactor `src/review.ts`

## What to do

Two things: delete dead files, then refactor `review.ts` to use `Agent` directly.

---

## Part 1 — Delete dead files

Delete these files:
- `src/hello.ts`
- `src/cli.ts`
- `src/cli.js`

Remove `"bin"` field from `package.json`.

---

## Part 2 — Refactor `src/review.ts` to use `Agent` directly

Currently `review.ts` uses `createAgentSession` from `@mariozechner/pi-coding-agent`.
Replace it with `Agent` from `@mariozechner/pi-agent-core` — lighter, no session/extension overhead.

### Import changes

Remove:
```typescript
import { SessionManager, createAgentSession, createReadOnlyTools } from "@mariozechner/pi-coding-agent";
```

Add:
```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { createReadOnlyTools } from "@mariozechner/pi-coding-agent";
```

### New agent creation in `review()`

Replace:
```typescript
const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  tools: createReadOnlyTools(cwd),
  ...(model ? { model } : {}),
});
```

With:
```typescript
const resolvedModel = model ?? getModel("anthropic", "claude-opus-4-6");

const agent = new Agent({
  initialState: {
    systemPrompt,
    model: resolvedModel,
    tools: createReadOnlyTools(cwd),
    thinkingLevel: "off",
  },
  getApiKey: async (provider) => {
    const key = provider === "anthropic"
      ? (options.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY)
      : process.env[`${provider.toUpperCase()}_API_KEY`];
    if (!key) throw new Error(`No API key found for provider "${provider}"`);
    return key;
  },
});
```

### Event subscription changes

Replace `session.subscribe(...)` with `agent.subscribe(...)`.
Replace `session.prompt(userPrompt)` with `agent.prompt(userPrompt)`.
Replace `session.dispose()` with nothing — `Agent` has no dispose method.

### Model resolution

Keep the existing `modelStr` parsing logic (`provider/modelId` split → `getModel(provider, modelId)`).
When no model is provided, default to `getModel("anthropic", "claude-opus-4-6")`.

### System prompt

Move `buildSystemPrompt` call before agent creation and pass it as `initialState.systemPrompt`.
Remove the separate `systemPrompt` variable from the try block.

### Agent event shape

`Agent` emits the same event types as before: `agent_end`, `message_update`, etc.
The `agent_end` event has `messages` array — same extraction logic works.

---

## Part 3 — Update `tests/review.test.ts`

Replace mock of `@mariozechner/pi-coding-agent` `createAgentSession` with mock of `@mariozechner/pi-agent-core` `Agent`.

```typescript
vi.mock("@mariozechner/pi-agent-core", () => ({
  Agent: vi.fn(),
}));

vi.mock("@mariozechner/pi-coding-agent", () => ({
  createReadOnlyTools: vi.fn().mockReturnValue([]),
}));
```

Mock `Agent` as a class:
```typescript
import { Agent } from "@mariozechner/pi-agent-core";

const AgentMock = vi.mocked(Agent);

function makeFakeAgent(text = "LGTM") {
  return {
    subscribe: vi.fn((cb) => {
      cb({
        type: "agent_end",
        messages: [{ role: "assistant", content: [{ type: "text", text }] }],
      });
      return vi.fn();
    }),
    prompt: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  AgentMock.mockImplementation(() => makeFakeAgent() as any);
  // ...
});
```

All 6 existing test cases must still pass.

---

## Run checks

```bash
npx vitest --run
```

All 27 tests must pass after the refactor.
