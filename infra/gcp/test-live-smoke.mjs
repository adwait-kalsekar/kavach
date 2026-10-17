import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { liveSmoke } from "./live-smoke.mjs";
const image = process.argv[2] || "kavach-api:ci";
const name = `kavach-live-smoke-${process.pid}`;
const sha = "a".repeat(40);
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
let started = false;
try {
  docker(
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1::8080",
    "--env",
    "NODE_ENV=development",
    "--env",
    "APP_ENV=local",
    "--env",
    "STORAGE_BACKEND=sqlite",
    "--env",
    "SQLITE_PATH=/tmp/live-smoke.sqlite",
    "--env",
    `RELEASE_SHA=${sha}`,
    image,
  );
  started = true;
  const origin = "http://" + docker("port", name, "8080/tcp");
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      if (
        (await fetch(origin + "/readyz", { signal: AbortSignal.timeout(500) }))
          .ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Container must become ready");
  await liveSmoke(origin, sha);
  await assert.rejects(
    () => liveSmoke(origin, "b".repeat(40)),
    /Expected values to be strictly equal/,
  );
  console.log(
    "Live smoke verified against the real container and rejected a wrong release SHA.",
  );
} finally {
  if (started) docker("rm", "--force", name);
}
