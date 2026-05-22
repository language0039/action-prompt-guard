# ActionPromptGuard

ActionPromptGuard scans GitHub Actions workflows for risky AI-agent and pull request automation patterns.

It is built for teams adding AI reviewers, agentic coding workflows, auto-fix bots, release bots, or PR automation to GitHub.

## Why It Exists

AI agents often run inside CI with repository context, GitHub tokens, and sometimes secrets. Pull request content is untrusted input. A workflow that mixes untrusted PR text, write permissions, checkout of PR code, and AI/tool execution can become a security boundary mistake.

ActionPromptGuard gives developers a quick local and CI check before those workflows ship.

## Install

For local development in this repository:

```bash
node ./bin/action-prompt-guard.js scan /path/to/repo
```

When published to npm:

```bash
npx action-prompt-guard scan .
```

## Output

```bash
action-prompt-guard scan . --format text
action-prompt-guard scan . --format markdown
action-prompt-guard scan . --format json
```

## CI Behavior

By default, the scanner exits non-zero on high or critical findings.

```bash
action-prompt-guard scan . --fail-on high
action-prompt-guard scan . --fail-on critical
action-prompt-guard scan . --fail-on none
```

## Rules

| Rule | Severity | Description |
| --- | --- | --- |
| APG001 | Critical | `pull_request_target` workflow has write-capable permissions. |
| APG002 | Critical | `pull_request_target` checks out untrusted PR head code. |
| APG003 | High | Untrusted PR/issue/comment text appears to be passed into an AI or automation prompt. |
| APG004 | High | Third-party action is not pinned to a full commit SHA. |
| APG005 | Medium | Workflow grants broad write permissions. |
| APG006 | Medium | Secrets are referenced in a pull request-triggered workflow. |
| APG007 | Medium | AI/agent tool runs in a pull request workflow. |

## GitHub Action Usage

```yaml
name: ActionPromptGuard

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx action-prompt-guard scan . --format markdown --fail-on high
```

## Product Direction

Free:

- Local CLI.
- JSON/Markdown reports.
- CI fail threshold.

Paid:

- Pull request comment bot.
- HTML/PDF security report.
- Team policy config.
- Organization workflow inventory.
- AI-agent prompt hardening checklist.
