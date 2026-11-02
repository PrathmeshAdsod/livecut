import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const config = "dist/server/wrangler.json";
if (!fs.existsSync(config)) {
  console.error("Run npm run build before applying local migrations.");
  process.exit(1);
}
// The D1 migrations runner records applied files, so repeated invocations are safe.
const data = JSON.parse(fs.readFileSync(config, "utf8"));
data.d1_databases = data.d1_databases.map((binding) => ({
  ...binding,
  migrations_dir: path.resolve("drizzle"),
}));
const localConfig = ".sites-runtime/migration-wrangler.json";
// Resolve build-relative paths when moving the generated config for local migration use.
data.main = path.resolve("dist/server", data.main);
if (data.assets?.directory)
  data.assets.directory = path.resolve("dist/server", data.assets.directory);
fs.mkdirSync(".sites-runtime", { recursive: true });
fs.writeFileSync(localConfig, JSON.stringify(data));
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    localConfig,
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
