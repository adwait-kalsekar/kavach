import { test } from "node:test";
import assert from "node:assert/strict";
import { deployApplication } from "../deploy.mjs";
import { deploymentConfig } from "../config.mjs";

const sha = "a".repeat(40);
const env = {
  GCP_PROJECT_ID: "kavach-farmers-market-sense",
  GCP_PROJECT_NUMBER: "123456789012",
  GCP_REGION: "asia-south1",
  GCP_CLOUD_RUN_SERVICE: "kavach-api",
  GCP_ARTIFACT_REPOSITORY: "kavach",
  GCP_RUNTIME_SERVICE_ACCOUNT:
    "kavach-runtime@kavach-farmers-market-sense.iam.gserviceaccount.com",
  APP_ORIGIN: "https://kavach-api-123456789012.asia-south1.run.app",
  GITHUB_SHA: sha,
  GITHUB_RUN_ID: "123",
  GITHUB_RUN_ATTEMPT: "1",
  GITHUB_REF: "refs/heads/main",
  GITHUB_EVENT_NAME: "push",
  GITHUB_REPOSITORY: "adwait-kalsekar/kavach",
};
function harness(options = {}) {
  const calls = [];
  let heads = 0;
  const run = (command, args) => {
    calls.push([command, ...args]);
    const text = args.join(" ");
    if (command === "gh")
      return ++heads === 2 && options.staleAfterBuild
        ? "b".repeat(40)
        : options.stale
          ? "b".repeat(40)
          : sha;
    if (text.startsWith("run services describe"))
      return JSON.stringify({
        metadata: {
          name: "kavach-api",
          annotations: {
            "run.googleapis.com/invoker-iam-disabled": String(
              options.wasPublic !== false,
            ),
          },
        },
        status: {
          traffic: options.split
            ? [
                { percent: 50, revisionName: "old" },
                { percent: 50, revisionName: "other" },
              ]
            : [{ percent: 100, revisionName: "old" }],
        },
      });
    if (text.startsWith("artifacts docker images describe"))
      return options.badDigest ? "latest" : "sha256:" + "1".repeat(64);
    if (text.startsWith("run revisions describe"))
      return JSON.stringify({
        status: {
          conditions: [
            { type: "Ready", status: options.notReady ? "False" : "True" },
          ],
        },
      });
    if (options.failTraffic && text.includes("--to-revisions=kavach-api-r"))
      throw new Error("response lost after promotion");
    if (options.failRollback && text.includes("--to-revisions=old=100"))
      throw new Error("rollback denied");
    return "";
  };
  const smoke = async (origin, commit) => {
    calls.push(["smoke", origin, commit]);
    if (options.failSmoke) throw new Error("live UI failed");
  };
  return { calls, run, smoke };
}
const traffic = (calls) => calls.filter((c) => c.includes("update-traffic"));
test("config refuses incomplete/misdirected production settings", () => {
  assert.throws(() => deploymentConfig({}), /GCP_PROJECT_ID/);
  assert.throws(
    () => deploymentConfig({ ...env, APP_ORIGIN: "https://evil.example" }),
    /canonical/,
  );
  assert.throws(
    () =>
      deploymentConfig({
        ...env,
        GCP_RUNTIME_SERVICE_ACCOUNT:
          "runtime@different-project.iam.gserviceaccount.com",
      }),
    /selected project/,
  );
  assert.throws(
    () => deploymentConfig({ ...env, GITHUB_SHA: "main" }),
    /GITHUB_SHA/,
  );
});
test("trusted main deploys immutable tested image, ready candidate, then checks exact release", async () => {
  const h = harness();
  const result = await deployApplication({ ...h, env });
  assert.equal(result.status, "deployed");
  assert.equal(result.previousRevision, "old");
  const deploy = h.calls.find((c) => c.includes("deploy"));
  assert.ok(deploy.includes("--no-traffic"));
  assert.ok(deploy.some((v) => v.includes("@sha256:")));
  assert.ok(
    h.calls.findIndex((c) => c.includes("revisions")) <
      h.calls.findIndex((c) => c.includes("update-traffic")),
  );
  assert.deepEqual(h.calls.at(-1), ["smoke", env.APP_ORIGIN, sha]);
});
test("PR/foreign branch cannot reach any cloud command", async () => {
  const h = harness();
  await assert.rejects(
    () =>
      deployApplication({
        ...h,
        env: { ...env, GITHUB_EVENT_NAME: "pull_request" },
      }),
    /trusted main/,
  );
  assert.equal(h.calls.length, 0);
});
test("superseded commit makes no cloud changes", async () => {
  const h = harness({ stale: true });
  assert.equal((await deployApplication({ ...h, env })).status, "superseded");
  assert.equal(h.calls.length, 1);
});
test("newer main after candidate readiness prevents promotion", async () => {
  const h = harness({ staleAfterBuild: true });
  assert.equal((await deployApplication({ ...h, env })).status, "superseded");
  assert.equal(traffic(h.calls).length, 0);
});
test("bad registry digest never reaches Cloud Run deployment", async () => {
  const h = harness({ badDigest: true });
  await assert.rejects(() => deployApplication({ ...h, env }), /digest/);
  assert.equal(
    h.calls.some((c) => c.includes("deploy")),
    false,
  );
});
test("unready candidate leaves production untouched", async () => {
  const h = harness({ notReady: true });
  await assert.rejects(() => deployApplication({ ...h, env }), /not ready/);
  assert.equal(traffic(h.calls).length, 0);
});
test("live UI failure restores old traffic", async () => {
  const h = harness({ failSmoke: true });
  await assert.rejects(() => deployApplication({ ...h, env }), /restored/);
  assert.ok(traffic(h.calls).at(-1).includes("--to-revisions=old=100"));
});
test("incomplete private bootstrap is rejected without granting CI any IAM policy rights", async () => {
  const h = harness({ wasPublic: false });
  await assert.rejects(
    () => deployApplication({ ...h, env }),
    /Bootstrap must configure public access/,
  );
  assert.equal(traffic(h.calls).length, 0);
  assert.equal(
    h.calls.some((c) => c.includes("--no-invoker-iam-check")),
    false,
  );
});
test("ambiguous promotion response still triggers restoration", async () => {
  const h = harness({ failTraffic: true });
  await assert.rejects(() => deployApplication({ ...h, env }), /restored/);
  assert.ok(traffic(h.calls).at(-1).includes("--to-revisions=old=100"));
});
test("rollback failure is reported as a manual intervention error", async () => {
  const h = harness({ failSmoke: true, failRollback: true });
  await assert.rejects(
    () => deployApplication({ ...h, env }),
    /rollback failed/,
  );
});
test("existing traffic split is preserved rather than overwritten", async () => {
  const h = harness({ split: true });
  await assert.rejects(() => deployApplication({ ...h, env }), /split rollout/);
  assert.equal(traffic(h.calls).length, 0);
});
