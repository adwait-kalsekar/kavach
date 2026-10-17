function required(env, key, pattern) {
  const value = env[key];
  if (!value || !pattern.test(value))
    throw new Error(
      `Missing or invalid ${key}. See docs/deployment/gcp-setup.md.`,
    );
  return value;
}
export function deploymentConfig(env) {
  const project = required(
    env,
    "GCP_PROJECT_ID",
    /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/,
  );
  const number = required(env, "GCP_PROJECT_NUMBER", /^\d{6,20}$/);
  const region = required(env, "GCP_REGION", /^[a-z]+-[a-z]+\d$/);
  const service = required(
    env,
    "GCP_CLOUD_RUN_SERVICE",
    /^[a-z][a-z0-9-]{0,47}[a-z0-9]$/,
  );
  const repository = required(
    env,
    "GCP_ARTIFACT_REPOSITORY",
    /^[a-z][a-z0-9-]{0,61}[a-z0-9]$/,
  );
  const runtime = required(
    env,
    "GCP_RUNTIME_SERVICE_ACCOUNT",
    /^[a-z][a-z0-9-]+@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/,
  );
  if (!runtime.endsWith(`@${project}.iam.gserviceaccount.com`))
    throw new Error("Runtime identity must belong to the selected project.");
  if (`${service}-${number}`.length > 63)
    throw new Error(
      "Service name is too long for a deterministic Cloud Run URL.",
    );
  const origin = `https://${service}-${number}.${region}.run.app`;
  if (env.APP_ORIGIN !== origin)
    throw new Error(
      "APP_ORIGIN must match the canonical deterministic service URL.",
    );
  const database = env.FIRESTORE_DATABASE_ID || "(default)";
  if (!/^(\(default\)|[a-z][a-z0-9-]{2,61}[a-z0-9])$/.test(database))
    throw new Error("Invalid FIRESTORE_DATABASE_ID.");
  const sha = required(env, "GITHUB_SHA", /^[a-f0-9]{40}$/);
  const runId = required(env, "GITHUB_RUN_ID", /^\d{1,20}$/);
  const attempt = required(env, "GITHUB_RUN_ATTEMPT", /^\d{1,5}$/);
  const suffix = `r${sha.slice(0, 10)}-${runId}-${attempt}`;
  if (`${service}-${suffix}`.length > 63)
    throw new Error("Revision name is too long.");
  return {
    project,
    number,
    region,
    service,
    repository,
    runtime,
    origin,
    database,
    sha,
    suffix,
    revision: `${service}-${suffix}`,
    image: `${region}-docker.pkg.dev/${project}/${repository}/${service}:${sha}`,
  };
}
