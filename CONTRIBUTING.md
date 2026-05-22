# Contributing

Thanks for considering a contribution to ActionPromptGuard.

This project is intentionally small and dependency-free. Keep changes focused, testable, and easy to review.

## Development Setup

```bash
git clone https://github.com/language0039/action-prompt-guard.git
cd action-prompt-guard
npm test
```

Run the CLI locally:

```bash
node ./bin/action-prompt-guard.js scan .
```

## Rule Design Principles

Good rules should:

- Detect a specific risky workflow pattern.
- Produce a clear remediation.
- Avoid broad matches that create noisy false positives.
- Include a safe fixture and a risky fixture or targeted regression test.
- Explain why the pattern matters to GitHub Actions or AI-agent security.

Rules do not need to prove exploitability. They should identify review-worthy patterns.

## Pull Request Checklist

- Run `npm test`.
- Run `npm pack --dry-run` when package contents change.
- Update `README.md` when user-facing behavior changes.
- Update `CHANGELOG.md` for release-worthy changes.
- Keep the CLI dependency-free unless there is a strong reason.

## Commit Style

Use short, direct commit messages:

```text
Add rule for unsafe workflow dispatch input
Fix markdown report escaping
Document composite action usage
```

## False Positives

False-positive reports are useful. Please include:

- The workflow snippet.
- Which rule fired.
- Why the workflow is intentionally safe.
- Whether a narrower pattern would avoid the issue.
