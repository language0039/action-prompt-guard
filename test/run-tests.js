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

console.log("All tests passed");
