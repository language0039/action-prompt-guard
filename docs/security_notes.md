# Security Notes

ActionPromptGuard is a static heuristic scanner. It does not prove a workflow is exploitable. It flags patterns that deserve human review.

## High-Risk Pattern

The most important pattern is:

1. Workflow runs on untrusted pull request activity.
2. Workflow has secrets or write-capable `GITHUB_TOKEN` permissions.
3. Workflow checks out or executes pull request-controlled code.
4. Workflow passes pull request-controlled text into AI/agent tooling.

Any one item may be legitimate. The combination creates risk.

## Current Limitations

- It does not fully parse YAML.
- It may miss generated workflows.
- It may produce false positives for intentionally isolated workflows.
- It treats third-party tag pins as risky even when teams have accepted that risk.

## Intended Use

Use this as a fast pre-review check in local development and CI. Review each finding before making security claims.
