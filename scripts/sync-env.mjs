import fs from "node:fs";
import crypto from "node:crypto";
const source = ".env.local";
if (!fs.existsSync(source)) {
  let template = fs.readFileSync(".env.example", "utf8");
  template = template.replace(
    "SESSION_SECRET=",
    "SESSION_SECRET=" + crypto.randomBytes(32).toString("hex"),
  );
  fs.writeFileSync(source, template, { mode: 0o600 });
  console.log(
    "Created ignored .env.local with a random session secret. Fill Twitch and Gemini credentials, then run npm run env:sync again.",
  );
}
const text = fs.readFileSync(source, "utf8");
const allowed = [
  "APP_URL",
  "TWITCH_CLIENT_ID",
  "TWITCH_CLIENT_SECRET",
  "SESSION_SECRET",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_FREE_TIER_CONFIRMED",
];
const lines = text
  .split(/\r?\n/)
  .filter((l) => allowed.some((k) => l.startsWith(k + "=")));
fs.writeFileSync(".dev.vars", lines.join("\n") + "\n", { mode: 0o600 });
console.log(
  "Local runtime configuration synchronized. Values were not printed. Restart the dev server to apply changes.",
);
