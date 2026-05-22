# Publish Checklist

## Repository

1. Create a new GitHub repository named `action-prompt-guard`.
2. Push the `action_prompt_guard/` folder contents as the repository root.
3. Add these topics:
   - `github-actions`
   - `security`
   - `ai-agents`
   - `pull-request`
   - `devsecops`

## npm

1. Create or log in to an npm account.
2. From the repository root, run:

```bash
npm publish --access public
```

3. Test:

```bash
npx action-prompt-guard scan .
```

## GitHub Action Marketplace

The included `action.yml` makes this usable as a GitHub Action after it is pushed and tagged.

Tag the first release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Marketplace listing angle:

> Scan GitHub Actions workflows for risky AI-agent, PR automation, and `pull_request_target` security patterns.

## First Paid Asset

Create a Payhip product:

Name:

ActionPromptGuard Pro Report Pack

Price:

USD 19

Contents:

- HTML report template.
- PR comment markdown template.
- Client handoff report wording.
- Agency policy presets.
- AI-agent workflow hardening checklist.

This avoids charging for the CLI before trust exists. The free CLI becomes the traffic source; the paid pack saves teams time when they need polished reporting.

## Launch Post

AI coding agents are landing in GitHub Actions fast, but many workflows mix untrusted PR content, write tokens, secrets, and `pull_request_target`.

I built ActionPromptGuard, a small CLI/GitHub Action that scans for those risky combinations before they ship.

Run:

```bash
npx action-prompt-guard scan .
```

It checks for:

- `pull_request_target` with write permissions,
- checkout of untrusted PR head code,
- PR text passed into AI/agent prompts,
- secrets in PR workflows,
- unpinned third-party actions.

Feedback welcome.
