import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { liveSmoke } from "./live-smoke.mjs";
const apiImage = process.argv[2] || "kavach-api:ci";
const webImage = process.argv[3] || "kavach-web:ci";
const apiName = `kavach-api-live-${process.pid}`;
const webName = `kavach-web-live-${process.pid}`;
const sha = "a".repeat(40);
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
const names = [];
async function ready(origin) {
  for (let i = 0; i < 100; i++) {
    try {
      if (
        (await fetch(origin + "/readyz", { signal: AbortSignal.timeout(500) }))
          .ok
      )
        return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Container did not become ready");
}
try {
  // Discover web URL first, then configure the API's exact CORS origin.
  docker(
    "run",
    "--detach",
    "--name",
    webName,
    "--publish",
    "127.0.0.1::8081",
    "--entrypoint",
    "sh",
    webImage,
    "-c",
    "sleep 120",
  );
  names.push(webName);
  const webPort = docker("port", webName, "8081/tcp").split(":").at(-1);
  const origin = `http://127.0.0.1:${webPort}`;
  docker(
    "run",
    "--detach",
    "--name",
    apiName,
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
    `APP_ORIGIN=${origin}`,
    "--env",
    `RELEASE_SHA=${sha}`,
    apiImage,
  );
  names.push(apiName);
  const apiOrigin = "http://" + docker("port", apiName, "8080/tcp");
  docker("rm", "--force", webName);
  docker(
    "run",
    "--detach",
    "--name",
    webName,
    "--publish",
    `127.0.0.1:${webPort}:8081`,
    "--env",
    `API_ORIGIN=${apiOrigin}`,
    "--env",
    `RELEASE_SHA=${sha}`,
    webImage,
  );
  await Promise.all([ready(origin), ready(apiOrigin)]);
  const html = await fetch(origin);
  assert.ok(
    html.headers
      .get("content-security-policy")
      .includes(`connect-src ${apiOrigin};`),
  );
  assert.equal((await fetch(origin + "/api/v1/health")).status, 404);
  assert.equal((await fetch(apiOrigin)).status, 404);
  await liveSmoke(origin, sha, apiOrigin);
  await assert.rejects(
    () => liveSmoke(origin, "b".repeat(40), apiOrigin),
    /Expected values/,
  );
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  let paused = false;
  try {
    const page = await browser.newPage();
    await page.goto(origin);
    await page
      .getByRole("heading", { name: "API reachable", exact: true })
      .waitFor();
    docker("pause", apiName);
    paused = true;
    await page.getByRole("button", { name: "Check again" }).click();
    await page
      .getByRole("heading", { name: "API unreachable", exact: true })
      .waitFor({ timeout: 20000 });
    assert.equal(
      (await fetch(origin)).status,
      200,
      "Web stays available during an API outage",
    );
    docker("unpause", apiName);
    paused = false;
    await page.getByRole("button", { name: "Check again" }).click();
    await page
      .getByRole("heading", { name: "API reachable", exact: true })
      .waitFor({ timeout: 20000 });
  } finally {
    if (paused) {
      try {
        docker("unpause", apiName);
      } catch {}
    }
    await browser.close();
  }
  console.log(
    "Independent web/API containers: direct browser health, CSP, origin boundary, release mismatch detection and API outage/recovery passed.",
  );
} finally {
  for (const name of names.reverse()) {
    try {
      docker("rm", "--force", name);
    } catch {}
  }
}
