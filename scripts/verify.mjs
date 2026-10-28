#!/usr/bin/env node
// Verification gate — run after every task, before committing.
//   npm run verify                 # uncommitted changes vs HEAD
//   npm run verify -- --base HEAD~1   # a commit range (e.g. re-check the last commit)
//   npm run verify -- --build      # also run `next build`
// Exit 1 on any FAIL. WARNs are convention slips to fix or justify in the report.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "HEAD";
const withBuild = args.includes("--build");
const results = [];
const add = (level, check, detail = "") => results.push({ level, check, detail });
const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const run = (cmd) => spawnSync(cmd, { shell: true, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });

// ---- changed files (committed range + working tree + untracked)
const names = new Set([
  ...sh(`git diff --name-only --diff-filter=ACMR ${base}`).split("\n"),
  ...sh("git ls-files --others --exclude-standard").split("\n"),
].filter(Boolean));
const changed = [...names].filter((f) => existsSync(f) && /\.(ts|tsx|mjs)$/.test(f) && !f.startsWith("scripts/verify"));
const deleted = sh(`git diff --name-only --diff-filter=D ${base}`).split("\n").filter(Boolean);
const addedLines = (f) => {
  const tracked = run(`git ls-files --error-unmatch "${f}"`).status === 0;
  const diff = tracked ? sh(`git diff -U0 ${base} -- "${f}"`) : readFileSync(f, "utf8").replace(/^/gm, "+");
  return diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
};
console.log(`verify: ${changed.length} changed, ${deleted.length} deleted (base ${base})\n`);

// ---- 1. types
const tsc = run("npx tsc --noEmit -p .");
const tsErrors = (tsc.stdout + tsc.stderr).split("\n").filter((l) => /error TS/.test(l) && !l.startsWith(".next/"));
add(tsErrors.length ? "FAIL" : "PASS", "TypeScript", tsErrors.slice(0, 10).join("\n"));

// ---- 2. lint (errors only, changed files)
const lintable = changed.filter((f) => /\.(ts|tsx)$/.test(f));
if (lintable.length) {
  const lint = run(`npx eslint -f json ${lintable.map((f) => `"${f}"`).join(" ")}`);
  let errs = [];
  try {
    errs = JSON.parse(lint.stdout).flatMap((r) => r.messages.filter((m) => m.severity === 2).map((m) => `${r.filePath.split(/[\\/]/).slice(-3).join("/")}:${m.line} ${m.ruleId}`));
  } catch { errs = ["eslint output unreadable"]; }
  add(errs.length ? "FAIL" : "PASS", "ESLint errors in changed files", errs.slice(0, 10).join("\n"));
}

// ---- 3. tests
const test = run("npx vitest run");
const summary = (test.stdout.match(/Tests\s+.*$/m) || [""])[0].trim();
add(test.status === 0 ? "PASS" : "FAIL", "Unit tests", summary);

// ---- 4. every client /api call still has a route (catches deleted/renamed routes)
const walk = (d, a = []) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (n !== "node_modules" && !n.startsWith(".")) walk(p, a); } else a.push(p.split("\\").join("/")); } return a; };
const routes = walk("app/api").filter((f) => f.endsWith("route.ts")).map((f) => f.replace(/^app/, "").replace(/\/route\.ts$/, "").split("/").filter(Boolean));
const missing = [];
for (const f of [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => /\.tsx?$/.test(f) && !f.startsWith("app/api/"))) {
  for (const m of readFileSync(f, "utf8").matchAll(/(?:fetch|apiFetch\w*)\s*\(\s*(["'`])(\/api\/[^"'`?]*)/g)) {
    const segs = m[2].replace(/\$\{[^}]+\}/g, "*").replace(/\/$/, "").split("/").filter(Boolean);
    const ok = routes.some((r) => r.length === segs.length && r.every((s, i) => s === segs[i] || s.startsWith("[") || segs[i].includes("*")));
    if (!ok) missing.push(`${f}: ${m[2]}`);
  }
}
add(missing.length ? "FAIL" : "PASS", "Client API calls resolve to a route", missing.join("\n"));

// ---- 5. conventions on added lines (CLAUDE.md)
const rules = [
  { level: "FAIL", name: "Hard-coded secret", re: /(SECRET|PRIVATE_KEY|API_KEY|TOKEN)\w*\s*[:=|]+\s*["'][A-Za-z0-9_\-+/=]{20,}["']/ },
  { level: "WARN", name: "window.confirm/alert (use ConfirmDialog / toast)", re: /\b(window\.)?(confirm|alert)\(\s*["'`]/ },
  { level: "WARN", name: "Native <select> (use CustomSelect)", re: /<select[\s>]/ },
  { level: "WARN", name: "Raw fetch('/api') in UI (use apiFetch)", re: /\bfetch\(\s*["'`]\/api\//, only: (f) => !f.startsWith("app/api/") },
  { level: "WARN", name: "react-hot-toast (use sonner)", re: /react-hot-toast/ },
  { level: "WARN", name: "console.log left in", re: /console\.log\(/, only: (f) => !f.startsWith("scripts/") },
];
for (const r of rules) {
  const hits = [];
  for (const f of changed.filter((f) => !r.only || r.only(f))) for (const l of addedLines(f)) if (r.re.test(l)) hits.push(`${f}: ${l.trim().slice(0, 90)}`);
  add(hits.length ? r.level : "PASS", r.name, hits.slice(0, 8).join("\n"));
}

// ---- 6. API route rules: auth guard, undo for data-changing handlers
for (const f of changed.filter((f) => /^app\/api\/.*route\.ts$/.test(f))) {
  const src = readFileSync(f, "utf8");
  const isPublic = f.startsWith("app/api/public/") || /verify/.test(f);
  // Documented exceptions: `// guard: custom — reason` and `// undo: n/a — reason`.
  if (!isPublic && !/requireRole|requireStaff|hasCronSecret|\/\/ guard: custom — /.test(src)) add("FAIL", "API route without requireRole/requireStaff", f);
  if (/export async function (PATCH|PUT|DELETE)\b/.test(src) && !/recordUndo|\/\/ undo: n\/a — /.test(src))
    add("WARN", "Edit/delete handler without recordUndo (or `// undo: n/a — reason`)", f);
}

// ---- 7. build (optional, slow)
if (withBuild) {
  const b = run("npx next build");
  add(b.status === 0 ? "PASS" : "FAIL", "next build", b.status === 0 ? "" : (b.stdout + b.stderr).split("\n").filter((l) => /error/i.test(l)).slice(0, 8).join("\n"));
}

// ---- report
const icon = { PASS: "✅", WARN: "⚠️ ", FAIL: "❌" };
for (const r of results) {
  console.log(`${icon[r.level]} ${r.check}`);
  if (r.level !== "PASS" && r.detail) console.log(r.detail.replace(/^/gm, "     "));
}
const fails = results.filter((r) => r.level === "FAIL").length;
const warns = results.filter((r) => r.level === "WARN").length;
console.log(`\n${fails ? "FAIL" : "PASS"} — ${fails} fail, ${warns} warn`);
console.log("Next: independent review of the diff (/code-review), then a manual check in the app.");
process.exit(fails ? 1 : 0);
