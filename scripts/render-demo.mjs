import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "assets");
fs.mkdirSync(assetsDir, { recursive: true });

const scannerOutput = execFileSync(
  "node",
  [
    path.join(root, "bin", "action-prompt-guard.js"),
    "scan",
    path.join(root, "test", "fixtures", "vulnerable-workflow.yml"),
    "--format",
    "text",
    "--fail-on",
    "none"
  ],
  { encoding: "utf8" }
);

fs.writeFileSync(path.join(assetsDir, "demo-risky-scan-output.txt"), scannerOutput);

const workflowLines = [
  "name: Risky Agent Review",
  "",
  "on:",
  "  pull_request_target:",
  "    types: [opened, synchronize]",
  "",
  "permissions:",
  "  contents: write",
  "  pull-requests: write",
  "",
  "steps:",
  "  - uses: tj-actions/changed-files@v44",
  "  - uses: actions/checkout@v4",
  "    with:",
  "      ref: ${{ github.event.pull_request.head.sha }}",
  "  - name: Ask AI reviewer",
  "    env:",
  "      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}",
  "      PROMPT: \"Review this PR: ${{ github.event.pull_request.body }}\"",
  "    run: npx ai-agent-review --prompt \"$PROMPT\""
];

const outputLines = scannerOutput
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => {
    return (
      line.startsWith("ActionPromptGuard") ||
      line.startsWith("Files scanned") ||
      line.startsWith("Risk score") ||
      line.startsWith("Findings") ||
      line.startsWith("[CRITICAL]") ||
      line.startsWith("[HIGH]") ||
      line.startsWith("[MEDIUM]") ||
      line.trim().startsWith("Evidence:")
    );
  })
  .slice(0, 18);

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateLine(line, maxLength = 58) {
  return line.length > maxLength ? `${line.slice(0, maxLength - 3)}...` : line;
}

function colorForOutput(line) {
  if (line.startsWith("[CRITICAL]")) return "#fecdd3";
  if (line.startsWith("[HIGH]")) return "#fed7aa";
  if (line.startsWith("[MEDIUM]")) return "#fde68a";
  if (line.startsWith("Risk score")) return "#fda4af";
  if (line.trim().startsWith("Evidence:")) return "#b7c2d8";
  return "#d9e6ff";
}

function colorForWorkflow(line) {
  if (line.includes("pull_request_target") || line.includes("write")) return "#fecdd3";
  if (line.includes("changed-files@v44") || line.includes("pull_request.head")) return "#fed7aa";
  if (line.includes("secrets.") || line.includes("pull_request.body")) return "#fde68a";
  return "#d9e6ff";
}

function textRows(lines, x, y, lineHeight, colorFn) {
  return lines
    .map((line, index) => {
      const color = colorFn(line);
      return `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-family="SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="22">${escapeXml(truncateLine(line))}</text>`;
    })
    .join("\n");
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1120" viewBox="0 0 1800 1120">
  <rect width="1800" height="1120" fill="#0b1020"/>
  <rect x="52" y="48" width="1696" height="1024" rx="28" fill="#101827" stroke="#263246" stroke-width="2"/>

  <text x="88" y="122" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800">ActionPromptGuard catches the risky PR-agent pattern</text>
  <text x="88" y="170" fill="#98a6bd" font-family="Inter, Arial, sans-serif" font-size="25">Generated from a real scan of test/fixtures/vulnerable-workflow.yml</text>

  <rect x="88" y="220" width="775" height="780" rx="18" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="88" y="220" width="775" height="58" rx="18" fill="#162033"/>
  <circle cx="124" cy="249" r="9" fill="#fb7185"/>
  <circle cx="154" cy="249" r="9" fill="#fbbf24"/>
  <circle cx="184" cy="249" r="9" fill="#34d399"/>
  <text x="220" y="258" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">risky-agent-review.yml</text>
  ${textRows(workflowLines, 122, 328, 32, colorForWorkflow)}

  <rect x="936" y="220" width="776" height="780" rx="18" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <rect x="936" y="220" width="776" height="58" rx="18" fill="#162033"/>
  <circle cx="972" cy="249" r="9" fill="#fb7185"/>
  <circle cx="1002" cy="249" r="9" fill="#fbbf24"/>
  <circle cx="1032" cy="249" r="9" fill="#34d399"/>
  <text x="1068" y="258" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">$ action-prompt-guard scan .</text>
  ${textRows(outputLines, 970, 328, 38, colorForOutput)}

  <rect x="88" y="1020" width="1624" height="1" fill="#263246"/>
  <text x="88" y="1052" fill="#98a6bd" font-family="Inter, Arial, sans-serif" font-size="20">The workflow mixes pull_request_target, write permissions, untrusted checkout, secrets, and PR text passed into an AI prompt.</text>
</svg>
`;

fs.writeFileSync(path.join(assetsDir, "demo-risky-scan.svg"), svg);
console.log("Wrote assets/demo-risky-scan.svg and assets/demo-risky-scan-output.txt");
