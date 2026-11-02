import fs from "node:fs";
import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const localSecrets = fs.existsSync(".env.local")
  ? fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((line) =>
        line.match(
          /^(TWITCH_CLIENT_SECRET|TWITCH_CLIENT_ID|GEMINI_API_KEY|SESSION_SECRET)=(.+)$/,
        ),
      )
      .filter(Boolean)
      .map((match) => match[2].trim().replace(/^['"]|['"]$/g, ""))
  : [];
const problems = [];
for (const file of files) {
  if (
    /(^|\/)(node_modules|dist|\.wrangler|\.next|\.local)\//.test(file) ||
    /\.env(?!\.example$)|\.dev\.vars|\.(db|sqlite|sqlite3)$/.test(file)
  )
    problems.push(file + ": forbidden tracked file");
  const bytes = fs.readFileSync(file);
  if (bytes.length > 2 * 1024 * 1024)
    problems.push(file + ": larger than 2 MB");
  if (
    !bytes.includes(0) &&
    localSecrets.some(
      (secret) => secret.length > 12 && bytes.toString().includes(secret),
    )
  )
    problems.push(file + ": contains a local credential");
}
const historyNames = execFileSync(
  "git",
  ["log", "--all", "--name-only", "--format="],
  { encoding: "utf8" },
)
  .split(/\r?\n/)
  .filter(Boolean);
const forbiddenHistory = historyNames.filter((file) =>
  /\.env(?!\.example$)|\.dev\.vars|\.(db|sqlite|sqlite3)$/.test(file),
);
for (const file of new Set(forbiddenHistory))
  problems.push(file + ": forbidden file exists in Git history");
const sensitive = localSecrets.filter((secret) => secret.length > 12);
const commits = execFileSync("git", ["log", "--all", "--format=%H"], {
  encoding: "utf8",
})
  .trim()
  .split(/\s+/)
  .filter(Boolean);
if (sensitive.length && commits.length) {
  try {
    execFileSync(
      "git",
      ["grep", "--quiet", "--fixed-strings", "-f", "-", ...commits, "--"],
      { input: sensitive.join("\n") + "\n", stdio: ["pipe", "pipe", "pipe"] },
    );
    problems.push("A current local credential was found in Git history");
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}
const trackedSecretNames = files.filter((f) =>
  /\.env(?!\.example$)|\.dev\.vars/.test(f),
);
console.log(
  JSON.stringify(
    { trackedFiles: files.length, trackedSecretNames, problems },
    null,
    2,
  ),
);
if (problems.length) process.exit(1);

