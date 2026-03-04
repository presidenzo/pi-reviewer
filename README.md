# pi-reviewer

AI-powered PR reviewer using Claude agent.

## Setup

Run once in your project root:

```bash
npx github:zeflq/pi-reviewer init
```

This generates `.github/workflows/pi-review.yml`. Commit it to your default branch.

Then add your API key to your repo secrets:
- `ANTHROPIC_API_KEY` — required

## CI usage

Every pull request triggers an automatic review comment posted by `github-actions[bot]`.

## Local review (pi extension)

Install the extension once:

```bash
pi install https://github.com/zeflq/pi-reviewer
```

Then inside the pi TUI, use the `/review` command:

```
/review
/review --branch dev
/review --pr 42
/review --diff HEAD~1
/review --dry-run
```

| Option | Description | Example |
|---|---|---|
| `--branch <name>` | Compare HEAD against this branch (default: auto-detected from `origin/HEAD`) | `--branch dev` |
| `--pr <number>` | Fetch and review a specific PR diff via `gh` CLI | `--pr 42` |
| `--diff <ref>` | Review changes since a specific git ref | `--diff HEAD~1` |
| `--dry-run` | Print the diff and prompt without calling the agent | |

## Project conventions

Create `AGENTS.md` at the root of your project to give the reviewer context about your conventions, patterns, and decisions. The agent reads it before reviewing every PR.

## Bot identity

PR comments appear under `github-actions[bot]` — the default GitHub Actions bot tied to `secrets.GITHUB_TOKEN`.

To use a custom bot name, create a GitHub App, generate a token for it, and pass it as `github-token` in your workflow:

```yaml
- uses: zeflq/pi-reviewer@main
  with:
    github-token: ${{ secrets.MY_BOT_TOKEN }}
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The comment will then appear under your GitHub App's name.
