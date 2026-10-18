import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { deploymentConfig } from "./config.mjs";

const file = process.argv[2];
if (!file || file.startsWith("--"))
  throw new Error(
    "Usage: node infra/gcp/configure-github.mjs gcp-bootstrap-output.json [--apply] [--enable]",
  );
const values = JSON.parse(readFileSync(file, "utf8"));
const optional = [
  "EXPLANATION_PROVIDER",
  "GOOGLE_MODEL_ID",
  "GOOGLE_CLOUD_LOCATION",
  "SPEECH_LOCATION",
];
const keys = [
  "GCP_PROJECT_ID",
  "GCP_PROJECT_NUMBER",
  "GCP_REGION",
  "GCP_CLOUD_RUN_SERVICE",
  "GCP_ARTIFACT_REPOSITORY",
  "GCP_RUNTIME_SERVICE_ACCOUNT",
  "FIRESTORE_DATABASE_ID",
  "APP_ORIGIN",
  "API_ORIGIN",
  "GCP_WEB_SERVICE",
  "GCP_WEB_RUNTIME_SERVICE_ACCOUNT",
  "GCP_DEPLOY_SERVICE_ACCOUNT",
  "GCP_WORKLOAD_IDENTITY_PROVIDER",
];
if (
  Object.keys(values).some((k) => ![...keys, ...optional].includes(k)) ||
  keys.some((k) => !values[k])
)
  throw new Error(
    "Only the documented non-secret bootstrap configuration is accepted.",
  );
keys.push(...optional.filter((k) => values[k]));
deploymentConfig({
  ...values,
  GITHUB_SHA: "0".repeat(40),
  GITHUB_RUN_ID: "1",
  GITHUB_RUN_ATTEMPT: "1",
});
if (
  values.GCP_DEPLOY_SERVICE_ACCOUNT !==
    `kavach-deploy@${values.GCP_PROJECT_ID}.iam.gserviceaccount.com` ||
  values.GCP_WORKLOAD_IDENTITY_PROVIDER !==
    `projects/${values.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/kavach-github/providers/github`
)
  throw new Error(
    "Deployment identity/provider does not belong to the selected project.",
  );
const repo = "adwait-kalsekar/kavach";
const gh = (...args) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
if (!process.argv.includes("--apply")) {
  console.log(
    `PLAN ONLY: configure ${repo} production environment with ${keys.join(", ")}; GCP_DEPLOY_ENABLED=${process.argv.includes("--enable") ? "true" : "false"}. No GitHub changes made.`,
  );
} else {
  let environment;
  try {
    environment = JSON.parse(
      gh("api", `repos/${repo}/environments/production`),
    );
  } catch (error) {
    if (!String(error.stderr).includes("404")) throw error;
    environment = JSON.parse(
      gh(
        "api",
        `repos/${repo}/environments/production`,
        "--method",
        "PUT",
        "--field",
        "deployment_branch_policy[protected_branches]=false",
        "--field",
        "deployment_branch_policy[custom_branch_policies]=true",
      ),
    );
  }
  // Refuse to remove existing reviewers or widen an existing environment's branch policy.
  if (!environment.deployment_branch_policy?.custom_branch_policies)
    throw new Error(
      "Existing production environment lacks custom main-only restrictions. Configure them manually; this tool will not replace existing protection settings.",
    );
  const policies = JSON.parse(
    gh(
      "api",
      `repos/${repo}/environments/production/deployment-branch-policies`,
    ),
  );
  if (
    policies.branch_policies.some(
      (p) => p.name !== "main" || p.type !== "branch",
    )
  )
    throw new Error(
      "Existing production branch policies include other refs; review them manually.",
    );
  if (!policies.branch_policies.length)
    gh(
      "api",
      `repos/${repo}/environments/production/deployment-branch-policies`,
      "--method",
      "POST",
      "-f",
      "name=main",
      "-f",
      "type=branch",
    );
  for (const key of keys)
    gh(
      "variable",
      "set",
      key,
      "--repo",
      repo,
      "--env",
      "production",
      "--body",
      values[key],
    );
  gh(
    "variable",
    "set",
    "GCP_DEPLOY_ENABLED",
    "--repo",
    repo,
    "--body",
    process.argv.includes("--enable") ? "true" : "false",
  );
  console.log(
    "Non-secret GitHub configuration applied. Existing reviewers are preserved; deployment enablement was set explicitly.",
  );
}
