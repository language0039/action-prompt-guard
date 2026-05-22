#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const VERSION = "0.1.2";
const WORKFLOW_EXTENSIONS = new Set([".yml", ".yaml"]);
const VALID_FORMATS = new Set(["text", "json", "markdown"]);
const VALID_FAIL_ON = new Set(["low", "medium", "high", "critical", "none"]);

const RULES = {
  APG001: {
    severity: "critical",
    title: "pull_request_target workflow has write-capable permissions",
    remediation:
      "Use pull_request instead, reduce permissions to read-only, or split privileged operations into a separately approved workflow."
  },
  APG002: {
    severity: "critical",
    title: "pull_request_target checks out untrusted pull request code",
    remediation:
      "Do not checkout github.event.pull_request.head.* inside pull_request_target workflows. Use pull_request with read-only permissions for untrusted code."
  },
  APG003: {
    severity: "high",
    title: "Untrusted pull request text appears to be passed into an AI or automation prompt",
    remediation:
      "Treat PR titles, bodies, comments, and issue text as untrusted input. Quote and constrain prompts, avoid tool execution, and do not expose secrets."
  },
  APG004: {
    severity: "high",
    title: "Third-party action is not pinned to a full commit SHA",
    remediation:
      "Pin third-party actions to a full 40-character commit SHA. Tags and branches can move."
  },
  APG005: {
    severity: "medium",
    title: "Workflow grants broad write permissions",
    remediation:
      "Set the minimum required permissions explicitly. Prefer contents: read and avoid write permissions unless the job truly needs them."
  },
  APG006: {
    severity: "medium",
    title: "Secrets are referenced in a pull request-triggered workflow",
    remediation:
      "Avoid exposing secrets to workflows that process untrusted pull request content or code. Use protected environments or manual approval."
  },
  APG007: {
    severity: "medium",
    title: "AI/agent tool runs in a pull request workflow",
    remediation:
      "Run AI agents with read-only tokens by default. Disable shell/tool execution where possible and isolate any write operations."
  }
};

const SEVERITY_WEIGHT = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5
};

function printHelp() {
  console.log(`ActionPromptGuard ${VERSION}

Usage:
  action-prompt-guard scan [path] [--format text|json|markdown] [--fail-on low|medium|high|critical|none]

Examples:
  action-prompt-guard scan .
  action-prompt-guard scan . --format markdown
  action-prompt-guard scan . --format json --fail-on high
`);
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help" };
  }

  if (argv[0] === "--version" || argv[0] === "-v") {
    return { command: "version" };
  }

  const [command, maybeTarget, ...rest] = argv;
  const options = {
    command,
    target: maybeTarget && !maybeTarget.startsWith("--") ? maybeTarget : ".",
    format: "text",
    failOn: "high"
  };
  const flags = maybeTarget && maybeTarget.startsWith("--") ? [maybeTarget, ...rest] : rest;

  for (let i = 0; i < flags.length; i += 1) {
    const flag = flags[i];
    if (flag === "--format") {
      options.format = flags[i + 1] || options.format;
      i += 1;
    } else if (flag === "--fail-on") {
      options.failOn = flags[i + 1] || options.failOn;
      i += 1;
    }
  }

  return options;
}

function validateOptions(options) {
  const errors = [];

  if (!VALID_FORMATS.has(options.format)) {
    errors.push(`Invalid --format '${options.format}'. Expected one of: ${Array.from(VALID_FORMATS).join(", ")}.`);
  }

  if (!VALID_FAIL_ON.has(options.failOn)) {
    errors.push(`Invalid --fail-on '${options.failOn}'. Expected one of: ${Array.from(VALID_FAIL_ON).join(", ")}.`);
  }

  return errors;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function findWorkflowFiles(targetPath) {
  const absoluteTarget = path.resolve(targetPath);
  if (!fs.existsSync(absoluteTarget)) {
    throw new Error(`Target path does not exist: ${targetPath}`);
  }

  const targetStat = fs.statSync(absoluteTarget);
  if (targetStat.isFile()) {
    return WORKFLOW_EXTENSIONS.has(path.extname(absoluteTarget)) ? [absoluteTarget] : [];
  }

  const workflowDir = path.join(absoluteTarget, ".github", "workflows");
  const searchRoot = fs.existsSync(workflowDir) ? workflowDir : absoluteTarget;
  return walk(searchRoot).filter((file) => WORKFLOW_EXTENSIONS.has(path.extname(file)));
}

function hasPullRequestTarget(text) {
  return /^\s*pull_request_target\s*:/m.test(text) || /^\s*-\s*pull_request_target\s*$/m.test(text);
}

function hasPullRequestTrigger(text) {
  return (
    hasPullRequestTarget(text) ||
    /^\s*pull_request\s*:/m.test(text) ||
    /^\s*-\s*pull_request\s*$/m.test(text)
  );
}

function hasWritePermissions(text) {
  return (
    /^\s*permissions\s*:\s*write-all\s*$/m.test(text) ||
    /^\s*(contents|pull-requests|issues|checks|statuses|actions|id-token|deployments|packages)\s*:\s*write\s*$/m.test(text)
  );
}

function hasBroadPermissions(text) {
  return /^\s*permissions\s*:\s*(write-all|read-all)\s*$/m.test(text) || hasWritePermissions(text);
}

function hasPrHeadCheckout(text) {
  return (
    /ref\s*:\s*\$\{\{\s*github\.event\.pull_request\.head\.(sha|ref)\s*\}\}/.test(text) ||
    /repository\s*:\s*\$\{\{\s*github\.event\.pull_request\.head\.repo\.full_name\s*\}\}/.test(text)
  );
}

function hasUntrustedPromptInput(text) {
  const untrustedInput =
    /\$\{\{\s*github\.event\.(pull_request|issue|comment)\.(title|body)\s*\}\}/.test(text) ||
    /\$\{\{\s*github\.event\.comment\.body\s*\}\}/.test(text) ||
    /\$\{\{\s*github\.event\.review\.body\s*\}\}/.test(text);
  return untrustedInput && hasAiAgentSignal(text);
}

function hasAiAgentSignal(text) {
  return /(openai|anthropic|claude|gemini|copilot|llm|ai[-_ ]?agent|cursor|aider|codex|prompt|chatgpt)/i.test(text);
}

function hasSecretReference(text) {
  return /\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}/.test(text);
}

function isOfficialAction(actionRef) {
  return (
    actionRef.startsWith("actions/") ||
    actionRef.startsWith("github/") ||
    actionRef.startsWith("./") ||
    actionRef.startsWith("docker://")
  );
}

function isPinnedToSha(actionRef) {
  return /@[a-f0-9]{40}$/i.test(actionRef);
}

function findUnpinnedActions(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*-?\s*uses\s*:\s*["']?([^"'\s#]+)["']?/);
    if (!match) return;
    const actionRef = match[1];
    if (isOfficialAction(actionRef)) return;
    if (!actionRef.includes("@")) return;
    if (isPinnedToSha(actionRef)) return;
    findings.push({
      actionRef,
      line: index + 1
    });
  });
  return findings;
}

function lineFor(text, pattern) {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? 1 : index + 1;
}

function makeFinding(ruleId, file, line, evidence) {
  const rule = RULES[ruleId];
  return {
    ruleId,
    severity: rule.severity,
    title: rule.title,
    file,
    line,
    evidence,
    remediation: rule.remediation
  };
}

function scanWorkflow(file, root) {
  const text = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file);
  const findings = [];
  const usesPullRequestTarget = hasPullRequestTarget(text);
  const usesPullRequest = hasPullRequestTrigger(text);

  if (usesPullRequestTarget && hasWritePermissions(text)) {
    findings.push(
      makeFinding(
        "APG001",
        relativeFile,
        lineFor(text, /^\s*permissions\s*:\s*write-all\s*$|^\s*(contents|pull-requests|issues|checks|statuses|actions|id-token|deployments|packages)\s*:\s*write\s*$/),
        "pull_request_target is combined with write-capable token permissions."
      )
    );
  }

  if (usesPullRequestTarget && hasPrHeadCheckout(text)) {
    findings.push(
      makeFinding(
        "APG002",
        relativeFile,
        lineFor(text, /github\.event\.pull_request\.head\.(sha|ref|repo)/),
        "Workflow checks out pull request head code while running under pull_request_target."
      )
    );
  }

  if (hasUntrustedPromptInput(text)) {
    findings.push(
      makeFinding(
        "APG003",
        relativeFile,
        lineFor(text, /github\.event\.(pull_request|issue|comment|review)\.(title|body)/),
        "Untrusted GitHub event text is used in a workflow that appears to call an AI/agent tool."
      )
    );
  }

  for (const unpinned of findUnpinnedActions(text)) {
    findings.push(
      makeFinding(
        "APG004",
        relativeFile,
        unpinned.line,
        `Third-party action '${unpinned.actionRef}' is tag- or branch-pinned instead of SHA-pinned.`
      )
    );
  }

  if (hasBroadPermissions(text)) {
    findings.push(
      makeFinding(
        "APG005",
        relativeFile,
        lineFor(text, /^\s*permissions\s*:|^\s*(contents|pull-requests|issues|checks|statuses|actions|id-token|deployments|packages)\s*:\s*write\s*$/),
        "Workflow grants broad or write-capable permissions."
      )
    );
  }

  if (usesPullRequest && hasSecretReference(text)) {
    findings.push(
      makeFinding(
        "APG006",
        relativeFile,
        lineFor(text, /secrets\.[A-Z0-9_]+/),
        "Workflow references repository secrets while handling pull request events."
      )
    );
  }

  if (usesPullRequest && hasAiAgentSignal(text)) {
    findings.push(
      makeFinding(
        "APG007",
        relativeFile,
        lineFor(text, /(openai|anthropic|claude|gemini|copilot|llm|ai[-_ ]?agent|cursor|aider|codex|prompt|chatgpt)/i),
        "Workflow appears to run an AI/agent tool in pull request context."
      )
    );
  }

  return findings;
}

function scoreFindings(findings) {
  return Math.min(
    100,
    findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0)
  );
}

function summarize(findings, filesScanned) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }
  return {
    tool: "ActionPromptGuard",
    version: VERSION,
    filesScanned,
    riskScore: scoreFindings(findings),
    bySeverity,
    findingCount: findings.length,
    findings
  };
}

function renderText(report) {
  const lines = [
    `ActionPromptGuard ${report.version}`,
    `Files scanned: ${report.filesScanned}`,
    `Risk score: ${report.riskScore}/100`,
    `Findings: ${report.findingCount} (${report.bySeverity.critical} critical, ${report.bySeverity.high} high, ${report.bySeverity.medium} medium)`,
    ""
  ];

  if (report.findings.length === 0) {
    lines.push("No risky AI-agent GitHub workflow patterns found.");
    return lines.join("\n");
  }

  for (const finding of report.findings) {
    lines.push(`[${finding.severity.toUpperCase()}] ${finding.ruleId}: ${finding.title}`);
    lines.push(`  ${finding.file}:${finding.line}`);
    lines.push(`  Evidence: ${finding.evidence}`);
    lines.push(`  Fix: ${finding.remediation}`);
    lines.push("");
  }

  return lines.join("\n");
}

function renderMarkdown(report) {
  const lines = [
    "# ActionPromptGuard Report",
    "",
    `- Files scanned: ${report.filesScanned}`,
    `- Risk score: ${report.riskScore}/100`,
    `- Findings: ${report.findingCount}`,
    `- Critical: ${report.bySeverity.critical}`,
    `- High: ${report.bySeverity.high}`,
    `- Medium: ${report.bySeverity.medium}`,
    ""
  ];

  if (report.findings.length === 0) {
    lines.push("No risky AI-agent GitHub workflow patterns found.");
    return lines.join("\n");
  }

  lines.push("| Severity | Rule | Location | Finding |");
  lines.push("| --- | --- | --- | --- |");
  for (const finding of report.findings) {
    lines.push(
      `| ${finding.severity} | ${finding.ruleId} | \`${finding.file}:${finding.line}\` | ${finding.title} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  for (const finding of report.findings) {
    lines.push("");
    lines.push(`### ${finding.ruleId}: ${finding.title}`);
    lines.push("");
    lines.push(`- Severity: ${finding.severity}`);
    lines.push(`- Location: \`${finding.file}:${finding.line}\``);
    lines.push(`- Evidence: ${finding.evidence}`);
    lines.push(`- Fix: ${finding.remediation}`);
  }

  return lines.join("\n");
}

function shouldFail(report, failOn) {
  if (failOn === "none") return false;
  const order = ["low", "medium", "high", "critical"];
  const threshold = order.indexOf(failOn);
  return report.findings.some((finding) => order.indexOf(finding.severity) >= threshold);
}

function scan(target) {
  const absoluteTarget = path.resolve(target);
  const workflowFiles = findWorkflowFiles(absoluteTarget);
  const root = fs.statSync(absoluteTarget).isFile() ? path.dirname(absoluteTarget) : absoluteTarget;
  const findings = workflowFiles.flatMap((file) => scanWorkflow(file, root));
  return summarize(findings, workflowFiles.length);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.command || options.command === "help") {
    printHelp();
    return;
  }

  if (options.command === "version") {
    console.log(VERSION);
    return;
  }

  if (options.command !== "scan") {
    console.error(`Unknown command: ${options.command}`);
    printHelp();
    process.exitCode = 2;
    return;
  }

  const validationErrors = validateOptions(options);
  if (validationErrors.length > 0) {
    for (const error of validationErrors) {
      console.error(error);
    }
    process.exitCode = 2;
    return;
  }

  let report;
  try {
    report = scan(options.target);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }
  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.format === "markdown") {
    console.log(renderMarkdown(report));
  } else {
    console.log(renderText(report));
  }

  if (shouldFail(report, options.failOn)) {
    process.exitCode = 1;
  }
}

main();
