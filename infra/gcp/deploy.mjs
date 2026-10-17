import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { deploymentConfig } from "./config.mjs";
import { liveSmoke } from "./live-smoke.mjs";

const execute = (command, args) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600000,
  }).trim();
export async function deployApplication({
  env = process.env,
  run = execute,
  smoke = liveSmoke,
} = {}) {
  const c = deploymentConfig(env);
  if (
    env.GITHUB_REF !== "refs/heads/main" ||
    !["push", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME)
  )
    throw new Error("Only trusted main push/manual runs may deploy.");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || ""))
    throw new Error("Invalid GITHUB_REPOSITORY.");
  const head = () =>
    run("gh", [
      "api",
      `repos/${env.GITHUB_REPOSITORY}/git/ref/heads/main`,
      "--jq",
      ".object.sha",
    ]).trim();
  if (head() !== c.sha) return { status: "superseded" };
  const base = ["--project", c.project, "--region", c.region, "--quiet"];
  const previous = JSON.parse(
    run("gcloud", [
      "run",
      "services",
      "describe",
      c.service,
      ...base,
      "--format=json",
    ]),
  );
  if (previous.metadata?.name !== c.service)
    throw new Error("Bootstrap the selected Cloud Run service first.");
  const traffic = (previous.status?.traffic || []).filter((t) => t.percent > 0);
  if (
    traffic.length !== 1 ||
    traffic[0].percent !== 100 ||
    !traffic[0].revisionName
  )
    throw new Error(
      "Expected one previous revision at 100% traffic; refusing to overwrite a split rollout.",
    );
  const priorRevision = traffic[0].revisionName;
  const wasPublic =
    previous.metadata?.annotations?.[
      "run.googleapis.com/invoker-iam-disabled"
    ] === "true";
  if (!wasPublic)
    throw new Error(
      "Bootstrap must configure public access first; CI deliberately has no service IAM policy permission.",
    );
  const temp = mkdtempSync(join(tmpdir(), "kavach-deploy-"));
  let promoted = false;
  try {
    run("gcloud", [
      "auth",
      "configure-docker",
      `${c.region}-docker.pkg.dev`,
      "--quiet",
    ]);
    run("docker", ["tag", "kavach-api:ci", c.image]);
    run("docker", ["push", c.image]);
    const digest = run("gcloud", [
      "artifacts",
      "docker",
      "images",
      "describe",
      c.image,
      "--project",
      c.project,
      "--format=value(image_summary.digest)",
    ]).trim();
    if (!/^sha256:[a-f0-9]{64}$/.test(digest))
      throw new Error(
        "Registry did not return a valid immutable image digest.",
      );
    const immutable = c.image.slice(0, c.image.lastIndexOf(":")) + "@" + digest;
    const vars = join(temp, "environment.json");
    writeFileSync(
      vars,
      JSON.stringify({
        APP_ENV: "production",
        STORAGE_BACKEND: "firestore",
        GOOGLE_CLOUD_PROJECT: c.project,
        APP_ORIGIN: c.origin,
        FIRESTORE_DATABASE_ID: c.database,
        WEATHER_PROVIDER: "disabled",
        RELEASE_SHA: c.sha,
      }),
      { mode: 0o600 },
    );
    run("gcloud", [
      "run",
      "deploy",
      c.service,
      ...base,
      "--image",
      immutable,
      "--service-account",
      c.runtime,
      "--env-vars-file",
      vars,
      "--revision-suffix",
      c.suffix,
      "--no-traffic",
      "--port=8080",
      "--min-instances=0",
      "--max-instances=3",
      "--concurrency=20",
      "--cpu=1",
      "--memory=512Mi",
      "--timeout=60",
      "--cpu-throttling",
      "--ingress=all",
      "--startup-probe=httpGet.path=/readyz,httpGet.port=8080,periodSeconds=5,failureThreshold=12",
      "--liveness-probe=httpGet.path=/healthz,httpGet.port=8080,periodSeconds=30",
    ]);
    const revision = JSON.parse(
      run("gcloud", [
        "run",
        "revisions",
        "describe",
        c.revision,
        ...base,
        "--format=json",
      ]),
    );
    if (
      !revision.status?.conditions?.some(
        (v) => v.type === "Ready" && v.status === "True",
      )
    )
      throw new Error(
        "Candidate revision is not ready; production traffic is unchanged.",
      );
    if (head() !== c.sha) return { status: "superseded", revision: c.revision };
    // Mark before the command: if the response fails after GCP accepted it, still restore traffic.
    promoted = true;
    run("gcloud", [
      "run",
      "services",
      "update-traffic",
      c.service,
      ...base,
      `--to-revisions=${c.revision}=100`,
    ]);

    await smoke(c.origin, c.sha);
    const result = {
      status: "deployed",
      origin: c.origin,
      revision: c.revision,
      digest,
      sha: c.sha,
      previousRevision: priorRevision,
    };
    if (env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `\nDeployment: ${c.origin}\n\nCommit: ${c.sha}\n\nRevision: ${c.revision}\n\nImage: ${immutable}\n\nPrevious revision: ${priorRevision}\n`,
      );
    return result;
  } catch (error) {
    if (promoted) {
      try {
        run("gcloud", [
          "run",
          "services",
          "update-traffic",
          c.service,
          ...base,
          `--to-revisions=${priorRevision}=100`,
        ]);
      } catch (rollback) {
        throw new AggregateError(
          [error, rollback],
          `Deployment and rollback failed. Restore ${priorRevision} in Cloud Run immediately.`,
        );
      }
    }
    // Avoid echoing command stderr or environment data through generic error logging.
    throw new Error(
      `Deployment failed${promoted ? "; previous traffic restored" : "; production traffic unchanged"}: ${error instanceof Error ? error.message.split("\n")[0] : "unknown failure"}`,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(JSON.stringify(await deployApplication()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
