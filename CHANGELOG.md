# Changelog

## 0.1.2

- Add a generated demo screenshot showing a risky AI-agent workflow being scanned and flagged.
- Add open-source project docs, issue templates, pull request template, security policy, and CI workflow.
- Remove deferred monetization notes from public-facing project docs.

## 0.1.1

- Fix top-level `--help` and `--version`.
- Support scanning a single workflow file directly.
- Validate `--format` and `--fail-on` values.
- Return a clear error for missing target paths.
- Treat `permissions: write-all` as write-capable for `pull_request_target` workflows.

## 0.1.0

- Initial CLI scanner.
- Text, JSON, and Markdown output.
- GitHub Action composite wrapper.
- Rules for risky `pull_request_target`, write permissions, untrusted PR checkout, AI-agent prompt input, secrets in PR workflows, and unpinned third-party actions.
