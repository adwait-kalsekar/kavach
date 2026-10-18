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
  const services = [
    {
      name: c.service,
      runtime: c.runtime,
      port: 8080,
      localImage: "kavach-api:ci",
      vars: {
        APP_ENV: "production",
        STORAGE_BACKEND: "firestore",
        GOOGLE_CLOUD_PROJECT: c.project,
        APP_ORIGIN: c.origin,
        FIRESTORE_DATABASE_ID: c.database,
        WEATHER_PROVIDER: "disabled",
        EXPLANATION_PROVIDER: c.explanationProvider,
        GOOGLE_MODEL_ID: c.model,
        GOOGLE_CLOUD_LOCATION: c.modelLocation,
        SPEECH_LOCATION: c.speechLocation,
        RELEASE_SHA: c.sha,
      },
    },
    {
      name: c.webService,
      runtime: c.webRuntime,
      port: 8081,
      localImage: "kavach-web:ci",
      vars: { API_ORIGIN: c.apiOrigin, RELEASE_SHA: c.sha },
    },
  ];
  for (const s of services) {
    const previous = JSON.parse(
      run("gcloud", [
        "run",
        "services",
        "describe",
        s.name,
        ...base,
        "--format=json",
      ]),
    );
    if (previous.metadata?.name !== s.name)
      throw new Error("Bootstrap the selected Cloud Run services first.");
    const traffic = (previous.status?.traffic || []).filter(
      (t) => t.percent > 0,
    );
    if (
      traffic.length !== 1 ||
      traffic[0].percent !== 100 ||
      !traffic[0].revisionName
    )
      throw new Error(
        "Expected one previous revision at 100% traffic; refusing to overwrite a split rollout.",
      );
    s.previous = traffic[0].revisionName;
    if (
      previous.metadata?.annotations?.[
        "run.googleapis.com/invoker-iam-disabled"
      ] !== "true"
    )
      throw new Error(
        "Bootstrap must configure public access first; CI deliberately has no service IAM policy permission.",
      );
  }
  const temp = mkdtempSync(join(tmpdir(), "kavach-deploy-"));
  const promoted = [];
  try {
    run("gcloud", [
      "auth",
      "configure-docker",
      `${c.region}-docker.pkg.dev`,
      "--quiet",
    ]);
    for (const s of services) {
      const image = `${c.region}-docker.pkg.dev/${c.project}/${c.repository}/${s.name}:${c.sha}`;
      run("docker", ["tag", s.localImage, image]);
      run("docker", ["push", image]);
      const digest = run("gcloud", [
        "artifacts",
        "docker",
        "images",
        "describe",
        image,
        "--project",
        c.project,
        "--format=value(image_summary.digest)",
      ]).trim();
      if (!/^sha256:[a-f0-9]{64}$/.test(digest))
        throw new Error(
          "Registry did not return a valid immutable image digest.",
        );
      s.immutable = image.slice(0, image.lastIndexOf(":")) + "@" + digest;
      s.revision = `${s.name}-${c.suffix}`;
      const vars = join(temp, `${s.name}.json`);
      writeFileSync(vars, JSON.stringify(s.vars), { mode: 0o600 });
      run("gcloud", [
        "run",
        "deploy",
        s.name,
        ...base,
        "--image",
        s.immutable,
        "--service-account",
        s.runtime,
        "--env-vars-file",
        vars,
        "--revision-suffix",
        c.suffix,
        "--no-traffic",
        `--port=${s.port}`,
        "--min-instances=0",
        "--max-instances=3",
        "--concurrency=20",
        "--cpu=1",
        "--memory=512Mi",
        "--timeout=60",
        "--cpu-throttling",
        "--ingress=all",
        `--startup-probe=httpGet.path=/readyz,httpGet.port=${s.port},periodSeconds=5,failureThreshold=12`,
        `--liveness-probe=httpGet.path=/healthz,httpGet.port=${s.port},periodSeconds=30`,
      ]);
      const revision = JSON.parse(
        run("gcloud", [
          "run",
          "revisions",
          "describe",
          s.revision,
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
    }
    if (head() !== c.sha) return { status: "superseded" };
    // API first: it MUST remain compatible with the previous web release.
    for (const s of services) {
      // Track before the request: a lost response may still mean promotion succeeded.
      promoted.push(s);
      run("gcloud", [
        "run",
        "services",
        "update-traffic",
        s.name,
        ...base,
        `--to-revisions=${s.revision}=100`,
      ]);
    }
    await smoke(c.origin, c.sha, c.apiOrigin, c.explanationProvider);
    const result = {
      status: "deployed",
      origin: c.origin,
      apiOrigin: c.apiOrigin,
      sha: c.sha,
      services: services.map((s) => ({
        name: s.name,
        revision: s.revision,
        image: s.immutable,
        previousRevision: s.previous,
      })),
    };
    if (env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `\nDeployment:\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`,
      );
    return result;
  } catch (error) {
    const failures = [];
    // Restore web first. Always attempt both restorations, even if one fails.
    for (const s of promoted.reverse()) {
      try {
        run("gcloud", [
          "run",
          "services",
          "update-traffic",
          s.name,
          ...base,
          `--to-revisions=${s.previous}=100`,
        ]);
      } catch (rollback) {
        failures.push({ s, rollback });
      }
    }
    if (failures.length)
      throw new AggregateError(
        [error, ...failures.map((f) => f.rollback)],
        `Deployment and rollback failed. Restore ${failures.map((f) => `${f.s.name}: ${f.s.previous}`).join(", ")} in Cloud Run immediately.`,
      );
    throw new Error(
      `Deployment failed${promoted.length ? "; previous traffic restored" : "; production traffic unchanged"}: ${error instanceof Error ? error.message.split("\n")[0] : "unknown failure"}`,
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
