import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import process from "node:process";

const devPort = process.env.DEV_PORT ?? "3000";
const nextCli = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const runningDevPids = findListeningPids(devPort);

if (runningDevPids.length > 0) {
  console.error(`Port ${devPort} is already serving the dev app. Stop npm run dev before running npm run build.`);
  console.error("This prevents Next.js dev from reading stale production chunks.");
  process.exit(1);
}

const buildEnv = { ...process.env };
delete buildEnv.NEXT_DIST_DIR;

const build = spawnSync(process.execPath, [nextCli, "build"], {
  env: buildEnv,
  stdio: "inherit"
});

process.exit(build.status ?? 1);

function findListeningPids(port) {
  if (process.platform !== "win32") return [];

  const output = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
  return [
    ...new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
        .map((line) => line.split(/\s+/).at(-1))
        .filter((pid) => pid && pid !== "0")
    )
  ];
}
