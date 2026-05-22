import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "action-prompt-guard.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "apg-test-"));
const workflowDir = path.join(tmp, ".github", "workflows");
fs.mkdirSync(workflowDir, { recursive: true });

function copyFixture(name) {
  fs.copyFileSync(
    path.join(root, "test", "fixtures", name),
    path.join(workflowDir, name)
  );
}

function run(args, expectedCode = 0) {
  try {
    return execFileSync("node", [cli, ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    if (error.status !== expectedCode) {
      console.error(error.stdout);
      console.error(error.stderr);
      throw error;
    }
    return error.stdout;
  }
}

copyFixture("safe-workflow.yml");
const safeReport = JSON.parse(run(["scan", tmp, "--format", "json", "--fail-on", "none"]));
if (safeReport.findingCount !== 0) {
  throw new Error(`Expected safe workflow to have 0 findings, got ${safeReport.findingCount}`);
}

const versionOutput = run(["--version"]).trim();
if (!/^\d+\.\d+\.\d+$/.test(versionOutput)) {
  throw new Error(`Expected top-level --version to print semver, got '${versionOutput}'`);
}

const helpOutput = run(["--help"]);
if (!helpOutput.includes("Usage:")) {
  throw new Error("Expected top-level --help to print usage");
}

fs.rmSync(workflowDir, { recursive: true, force: true });
fs.mkdirSync(workflowDir, { recursive: true });
copyFixture("vulnerable-workflow.yml");
const vulnerableReport = JSON.parse(run(["scan", tmp, "--format", "json", "--fail-on", "none"]));
const ruleIds = new Set(vulnerableReport.findings.map((finding) => finding.ruleId));

for (const expectedRule of ["APG001", "APG002", "APG003", "APG004", "APG005", "APG006", "APG007"]) {
  if (!ruleIds.has(expectedRule)) {
    throw new Error(`Expected ${expectedRule} in vulnerable workflow findings`);
  }
}

run(["scan", tmp, "--format", "text", "--fail-on", "high"], 1);
run(["scan", tmp, "--format", "xml", "--fail-on", "none"], 2);
run(["scan", tmp, "--format", "json", "--fail-on", "banana"], 2);
run(["scan", path.join(tmp, "missing"), "--format", "json", "--fail-on", "none"], 2);

const singleFileReport = JSON.parse(
  run(["scan", path.join(workflowDir, "vulnerable-workflow.yml"), "--format", "json", "--fail-on", "none"])
);
if (singleFileReport.filesScanned !== 1 || singleFileReport.findingCount !== 7) {
  throw new Error("Expected single-file scan to report vulnerable workflow findings");
}

fs.writeFileSync(
  path.join(workflowDir, "write-all.yml"),
  `name: Write All\n\non:\n  pull_request_target:\n\npermissions: write-all\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n`
);
const writeAllReport = JSON.parse(
  run(["scan", path.join(workflowDir, "write-all.yml"), "--format", "json", "--fail-on", "none"])
);
if (!writeAllReport.findings.some((finding) => finding.ruleId === "APG001")) {
  throw new Error("Expected permissions: write-all under pull_request_target to trigger APG001");
}

console.log("All tests passed");
