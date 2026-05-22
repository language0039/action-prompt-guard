# ActionPromptGuard

[![npm version](https://img.shields.io/npm/v/action-prompt-guard.svg)](https://www.npmjs.com/package/action-prompt-guard)
[![CI](https://github.com/language0039/action-prompt-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/language0039/action-prompt-guard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ActionPromptGuard scans GitHub Actions workflows for risky AI-agent and pull request automation patterns.

It is built for teams adding AI reviewers, agentic coding workflows, auto-fix bots, release bots, or PR automation to GitHub.

## Why It Exists

AI agents often run inside CI with repository context, GitHub tokens, and sometimes secrets. Pull request content is untrusted input. A workflow that mixes untrusted PR text, write permissions, checkout of PR code, and AI/tool execution can become a security boundary mistake.

ActionPromptGuard gives developers a quick local and CI check before those workflows ship.

## Quick Start

Run it without installing:

```bash
npx action-prompt-guard scan .
```

Install it as a dev dependency:

```bash
npm install --save-dev action-prompt-guard
npx action-prompt-guard scan .
```

Run from a local clone:

```bash
npm test
node ./bin/action-prompt-guard.js scan /path/to/repo
```

## CLI

```bash
action-prompt-guard scan [path] [--format text|json|markdown] [--fail-on low|medium|high|critical|none]
```

Examples:

```bash
action-prompt-guard scan .
action-prompt-guard scan . --format markdown
action-prompt-guard scan . --format json --fail-on high
action-prompt-guard scan .github/workflows/review.yml --fail-on none
```

By default, the scanner exits non-zero on high or critical findings.

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

You can also use the repository as a composite action:

```yaml
- uses: language0039/action-prompt-guard@v0.1.1
  with:
    path: .
    format: markdown
    fail-on: high
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

## Output Formats

Text:

```bash
action-prompt-guard scan . --format text
```

Markdown:

```bash
action-prompt-guard scan . --format markdown > action-prompt-guard-report.md
```

JSON:

```bash
action-prompt-guard scan . --format json > action-prompt-guard-report.json
```

## What It Is Not

ActionPromptGuard is a static heuristic scanner. It does not prove exploitability and it does not replace a security review. It highlights workflow patterns that deserve human review before AI agents or PR automation get write access, secrets, or untrusted code execution paths.

## Development

```bash
npm test
npm pack --dry-run
```

The test suite creates temporary workflow projects and verifies safe, risky, and edge-case behavior.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, rule design guidance, and review expectations.

## Security

Please do not open public issues for suspected vulnerabilities in this project. See [SECURITY.md](SECURITY.md).

## License

MIT
