# Security Policy

## Supported Versions

Security fixes are handled on the latest published version.

## Reporting a Vulnerability

Please do not open a public issue for suspected vulnerabilities in ActionPromptGuard.

Report privately through GitHub Security Advisories:

https://github.com/language0039/action-prompt-guard/security/advisories/new

If GitHub advisories are unavailable, open a minimal issue asking for a private contact path without including exploit details.

## Scope

In scope:

- Vulnerabilities in the CLI or GitHub Action wrapper.
- Output injection that could affect CI logs or reports.
- Incorrect behavior that could hide a high-risk workflow pattern.

Out of scope:

- False positives that do not create a security issue.
- Vulnerabilities in third-party workflows scanned by the tool.
- Social engineering or attacks against maintainers.
