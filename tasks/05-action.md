# Task: implement `action.yml`

## What is pi-reviewer

A standalone GitHub Action that runs a Claude agent to review pull requests.
`action.yml` makes pi-reviewer usable as a GitHub Action step in any project.

## Your job

Create `action.yml` at the root of the repo.

Do not touch any source files. No tests needed for this step — it is configuration only.

## What `action.yml` must define

### Metadata

```yaml
name: "pi-reviewer"
description: "AI-powered PR reviewer using Claude agent"
author: "zeflq"
```

### Inputs

```yaml
inputs:
  github-token:
    description: "GitHub token to post PR comments. Use ${{ secrets.GITHUB_TOKEN }}"
    required: true

  anthropic-api-key:
    description: "Anthropic API key for Claude models"
    required: false

  copilot-api-key:
    description: "GitHub Copilot API key"
    required: false

  post-comment:
    description: "Post review as a GitHub PR comment"
    required: false
    default: "true"
```

### Validation

Add a validation step that fails with a clear message if neither `anthropic-api-key` nor `copilot-api-key` is provided:

```yaml
- name: Validate API key
  shell: bash
  run: |
    if [ -z "${{ inputs.anthropic-api-key }}" ] && [ -z "${{ inputs.copilot-api-key }}" ]; then
      echo "Error: at least one of anthropic-api-key or copilot-api-key must be provided"
      exit 1
    fi
```

### Steps

```yaml
runs:
  using: "composite"
  steps:
    - name: Validate API key
      # (validation step above)

    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: "20"

    - name: Install dependencies
      shell: bash
      run: npm ci
      working-directory: ${{ github.action_path }}

    - name: Run review
      shell: bash
      working-directory: ${{ github.workspace }}
      env:
        GITHUB_TOKEN: ${{ inputs.github-token }}
        ANTHROPIC_API_KEY: ${{ inputs.anthropic-api-key }}
        POST_COMMENT: ${{ inputs.post-comment }}
      run: npx tsx ${{ github.action_path }}/src/review.ts
```

### Branding

```yaml
branding:
  icon: "eye"
  color: "blue"
```

## Notes

- `github.action_path` = the pi-reviewer repo root (where action.yml lives)
- `github.workspace` = the project being reviewed (project X)
- The review runs with `cwd = github.workspace` so file tools read project X's files
- `tsx` runs TypeScript directly — no build step needed
