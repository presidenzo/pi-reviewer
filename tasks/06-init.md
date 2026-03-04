# Task: implement `src/init.ts`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
`init.ts` is a one-time setup command that generates the GitHub Actions workflow file in project X.

## Your job

Implement `src/init.ts` and `tests/init.test.ts`.

Do not touch any other file.

## What `init.ts` must do

Generate `.github/workflows/pi-review.yml` in the current working directory.

### Function signature

```typescript
export interface InitOptions {
  cwd?: string; // defaults to process.cwd()
}

export async function init(options?: InitOptions): Promise<void>
```

### Behavior

1. Resolve output path: `<cwd>/.github/workflows/pi-review.yml`
2. If the file already exists:
   - Print warning: `"pi-review.yml already exists. Skipping."`
   - Return early — do not overwrite
3. Create directories if needed (`mkdir -p` equivalent via `mkdirSync` recursive)
4. Write the workflow file with this exact content:

```yaml
name: Pi Reviewer

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: zeflq/pi-reviewer@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

5. Print success message:
   ```
   ✓ Created .github/workflows/pi-review.yml

   Next step: add your project conventions to AGENTS.md at the root of your project.
   This file will be used by the reviewer to understand your project's rules and patterns.
   ```

## Project setup

```
pi-reviewer/
├── package.json
├── tsconfig.json
├── src/
│   ├── diff-resolver.ts   (done)
│   ├── context.ts         (done)
│   ├── output.ts          (done)
│   ├── review.ts          (done)
│   └── init.ts            ← implement this
└── tests/
    └── init.test.ts       ← implement this
```

Use only `node:fs`, `node:fs/promises`, and `node:path` — no extra packages.

## Tests

File: `tests/init.test.ts`

Use a real temp directory — no mocking needed.
Mock `console.log` with `vi.spyOn` to verify output messages.

Cover:
- Generates workflow file with correct content in `<cwd>/.github/workflows/pi-review.yml`
- Creates intermediate directories if they don't exist
- Skips without overwriting if file already exists + prints warning
- Prints success message and next step instructions after generation

## Run tests

```bash
npx vitest --run tests/init.test.ts
```
