import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const image = process.argv[2] || "kavach-api:ci";
const docker = (...args) =>
  execFileSync("docker", args, { encoding: "utf8" }).trim();
const name = `kavach-smoke-${process.pid}`;
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
    "SQLITE_PATH=/tmp/kavach.sqlite",
    image,
  );
  started = true;
  let origin = "http://" + docker("port", name, "8080/tcp");
  async function ready() {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if (
          (
            await fetch(origin + "/readyz", {
              signal: AbortSignal.timeout(500),
            })
          ).ok
        )
          return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Packaged API did not become ready");
  }
  await ready();
  const web = await fetch(origin + "/");
  assert.equal(web.status, 200);
  assert.match(web.headers.get("content-security-policy"), /script-src 'self'/);
  const html = await web.text();
  assert.match(html, /<title>Kavach/);
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  const js = await fetch(origin + asset);
  assert.equal(js.status, 200);
  assert.match(js.headers.get("content-type"), /javascript/);
  const health = await (await fetch(origin + "/api/v1/health")).json();
  assert.equal(health.data.service, "kavach-api");
  assert.notEqual(
    (await fetch(origin + "/api/v1/nonexistent")).headers.get("content-type"),
    "text/html",
  );
  assert.equal((await fetch(origin + "/healthz")).status, 200);
  let cookie;
  let csrf;
  async function request(path, method = "GET", body) {
    const response = await fetch(origin + "/api/v1/" + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(method !== "GET"
          ? {
              Origin: "http://localhost:8080",
              "X-CSRF-Token": csrf,
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID(),
            }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const payload = await response.json();
    assert.ok(response.ok, JSON.stringify(payload));
    if (payload.data.csrfToken) csrf = payload.data.csrfToken;
    return payload.data;
  }
  await request("session");
  await request("session", "POST", {});
  const farm = await request("farms", "POST", {
    context: {
      district: "Latur",
      crop: "chickpea",
      stage: "planning",
      irrigation: "one",
      moisture: "unknown",
      seedAvailable: true,
      language: "en",
    },
  });
  const assessment = await request("assessments", "POST", {
    farmId: farm.id,
    expectedFarmRevision: farm.revision,
  });
  const plan = await request("plans", "POST", { assessmentId: assessment.id });
  docker("restart", name);
  origin = "http://" + docker("port", name, "8080/tcp");
  await ready();
  assert.deepEqual(await request("farms/" + farm.id), farm);
  assert.deepEqual(await request("plans/" + plan.id), plan);
  assert.equal((await request("capabilities")).ai, "unavailable");
  console.log(
    "Container HTTP workflow and guest/farm/plan persistence across restart passed.",
  );
} finally {
  if (started) docker("rm", "--force", name);
}
