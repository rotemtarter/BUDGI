// Secrets check (Milestone 9, ARCHITECTURE.md 7.2): looks for keys in the
// files tracked by Git, in the whole Git history and in the browser bundle
// (.next/static, after `npm run build`), and checks where server-only
// variables are used. Never reads .env. Exits with 1 on any finding.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const KEY_PATTERNS = [
  ["OpenAI key", /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["Private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  // A JWT whose payload says "role":"service_role"
  ["Supabase service_role JWT", /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*(?:c2VydmljZV9yb2xl|InNlcnZpY2Vfcm9sZS)[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/],
];
const SERVER_ONLY_NAMES = ["OPENAI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "E2E_USER_"];
const ALLOWED_PUBLIC = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

const findings = [];
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

// 1. Files in the project (tracked, or new and not ignored)
const tracked = git("ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0").filter(Boolean);
const textFiles = tracked.filter((f) => existsSync(f) && !/\.(png|jpe?g|ico|webp|xlsx|woff2?)$/i.test(f));
for (const file of textFiles) {
  const text = readFileSync(file, "utf8");
  for (const [label, re] of KEY_PATTERNS) if (re.test(text)) findings.push(`${label} in ${file}`);
}

// 2. Git history (every added line of every commit)
const history = git("log", "--all", "-p", "--no-color", "--unified=0");
for (const [label, re] of KEY_PATTERNS) if (re.test(history)) findings.push(`${label} in the Git history`);
const envInHistory = git("log", "--all", "--name-only", "--pretty=format:").split("\n");
if (envInHistory.some((f) => /(^|\/)\.env(\.(?!example$).*)?$/.test(f.trim()))) findings.push(".env file in the Git history");

// 3. Browser bundle
const STATIC = ".next/static";
if (!existsSync(STATIC)) {
  findings.push("No .next/static — run `npm run build` first");
} else {
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  for (const file of walk(STATIC).filter((f) => /\.(js|css|html|json|map)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    for (const [label, re] of KEY_PATTERNS) if (re.test(text)) findings.push(`${label} in browser file ${file}`);
    for (const name of SERVER_ONLY_NAMES) if (text.includes(name)) findings.push(`${name} mentioned in browser file ${file}`);
  }
}

// 4. Where variables are used in the app code
const source = textFiles.filter((f) => f.startsWith("src/"));
for (const file of source) {
  const text = readFileSync(file, "utf8");
  if (text.includes("SUPABASE_SERVICE_ROLE_KEY") && file !== "src/lib/supabase/admin.ts") {
    findings.push(`SUPABASE_SERVICE_ROLE_KEY used outside src/lib/supabase/admin.ts: ${file}`);
  }
  if (text.includes("OPENAI_API_KEY") && !/^import "server-only";/m.test(text) && !file.startsWith("src/app/api/")) {
    findings.push(`OPENAI_API_KEY used in a file that is not server-only: ${file}`);
  }
  for (const [name] of text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
    if (!ALLOWED_PUBLIC.has(name)) findings.push(`Unexpected public variable ${name} in ${file}`);
  }
}
for (const file of tracked.filter((f) => f === ".env.example")) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (/^[A-Z0-9_]+=.+/.test(line)) findings.push(`.env.example has a value: ${line.split("=")[0]}`);
  }
}

if (findings.length) {
  console.error(`Secrets check failed (${findings.length}):\n- ${findings.join("\n- ")}`);
  process.exit(1);
}
console.log(`Secrets check passed: ${textFiles.length} files, the Git history and the browser bundle.`);
