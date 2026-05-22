# Maintainer Notes

This project is currently a free open-source CLI and GitHub Action.

## Project Goals

- Help developers review risky AI-agent and pull request automation workflows.
- Keep the scanner fast, dependency-free, and easy to run in CI.
- Prefer clear, review-worthy findings over broad noisy matching.
- Build trust through transparent rules, tests, and examples.

## Release Checklist

1. Update `CHANGELOG.md`.
2. Update `package.json` version.
3. Run:

```bash
npm test
npm pack --dry-run
```

4. Commit the release changes.
5. Tag the release:

```bash
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

6. Publish to npm:

```bash
npm publish --access public
```

7. Create GitHub release notes from the changelog.

## Rule Quality Bar

Before adding a rule, ask:

- Is this tied to a concrete GitHub Actions or AI-agent risk?
- Can the finding point to a useful line number?
- Is there a clear remediation?
- Can we add a regression test?
- Is the false-positive rate likely to be acceptable?

## Deferred Ideas

Possible future improvements:

- SARIF output.
- Report escaping and Markdown table escaping.
- Config file for disabling or adjusting rules.
- PR comment workflow example.
- More precise YAML parsing if regex heuristics become too noisy.
