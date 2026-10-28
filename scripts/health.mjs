// Codebase health scorecard. Usage: npm run health  (add --build to include next build)
// Runs each tool sequentially to stay within memory on 8 GB machines.
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SRC = ["app", "components", "lib"];
const tmp = mkdtempSync(join(tmpdir(), "health-"));
const env = { ...process.env, NODE_OPTIONS: "--max-old-space-size=3072" };

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { env, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).toString() };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function sourceFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, acc);
    else if (/\.tsx?$/.test(name) && !name.endsWith(".d.ts")) acc.push(p);
  }
  return acc;
}

const files = SRC.flatMap((d) => sourceFiles(d)).concat("proxy.ts");
const lineCounts = files.map((f) => readFileSync(f, "utf8").split("\n").length);
const loc = lineCounts.reduce((a, b) => a + b, 0);

const tsc = run("npx tsc --noEmit");
const tscErrors = (tsc.out.match(/error TS/g) || []).length;

run(`npx eslint ${SRC.join(" ")} proxy.ts -f json -o "${join(tmp, "eslint.json")}"`);
const eslint = JSON.parse(readFileSync(join(tmp, "eslint.json"), "utf8"));
let lintErrors = 0, lintWarnings = 0, anyCount = 0;
for (const f of eslint) {
  lintErrors += f.errorCount;
  lintWarnings += f.warningCount;
  anyCount += f.messages.filter((m) => m.ruleId === "@typescript-eslint/no-explicit-any").length;
}

run(`npx --yes jscpd@4 ${SRC.join(" ")} --min-tokens 50 --format "typescript,tsx" --reporters json --output "${tmp}" --silent`);
const dupPct = JSON.parse(readFileSync(join(tmp, "jscpd-report.json"), "utf8")).statistics.total.percentage;

const knipRaw = run("npx --yes knip@5 --reporter json --no-exit-code").out;
const knip = JSON.parse(knipRaw.slice(knipRaw.indexOf("{")));
let deadExports = 0, deadDeps = 0;
for (const i of knip.issues || []) {
  deadExports += (i.exports || []).length + (i.types || []).length;
  deadDeps += (i.dependencies || []).length + (i.devDependencies || []).length;
}
const deadFiles = (knip.files || []).length;

const madge = run(`npx --yes madge@8 --circular --extensions ts,tsx --ts-config tsconfig.json ${SRC.join(" ")}`).out;
const circular = Number((madge.match(/Found (\d+) circular/) || [0, 0])[1]);

const audit = JSON.parse(run("npm audit --json").out || "{}").metadata?.vulnerabilities || {};

const tests = run("npx vitest run");
const plainTestOut = tests.out.replace(/\u001b\[[0-9;]*m/g, "");
const testsPassed = Number((plainTestOut.match(/Tests\s+(?:\S+\s+)?(\d+) passed/) || [0, 0])[1]);

const build = process.argv.includes("--build") ? run("npx next build").ok : null;

const clamp = (n) => Math.max(0, Math.min(10, n));
const scores = {
  types: tscErrors === 0 ? 10 : clamp(10 - tscErrors / 5),
  lint: clamp(10 - lintErrors / 5 - lintWarnings / 250),
  any: clamp(10 - anyCount / 100),
  duplication: clamp(((15 - dupPct) / 12) * 10),
  deadCode: clamp(10 - deadFiles / 5 - deadExports / 60 - deadDeps),
  circular: clamp(10 - circular),
  bigFiles: clamp(10 - lineCounts.filter((n) => n > 1000).length / 5),
  vulns: clamp(10 - (audit.critical || 0) * 2 - (audit.high || 0) * 0.5),
  tests: clamp(testsPassed / 10),
};
const score = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;

const report = {
  loc,
  files: files.length,
  filesOver500: lineCounts.filter((n) => n > 500).length,
  filesOver1000: lineCounts.filter((n) => n > 1000).length,
  tscErrors,
  lintErrors,
  lintWarnings,
  anyCount,
  duplicationPct: dupPct,
  deadFiles,
  deadExports,
  deadDeps,
  circular,
  vulns: audit,
  testsPassed,
  testsOk: tests.ok,
  build,
  scores,
  score: Math.round(score * 10) / 10,
};
console.log(JSON.stringify(report, null, 2));
