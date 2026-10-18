import { z } from "zod";

const envSchema = z.object({
  RELEASE_SHA: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .optional(),
  APP_ENV: z.enum(["local", "test", "production"]).default("local"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  APP_ORIGIN: z.url().default("http://localhost:8080"),
  STORAGE_BACKEND: z.enum(["sqlite", "firestore"]).default("sqlite"),
  SQLITE_PATH: z.string().min(1).default(".data/kavach.sqlite"),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  FIRESTORE_DATABASE_ID: z.string().min(1).default("(default)"),
  FIRESTORE_EMULATOR_HOST: z
    .string()
    .regex(/^[a-zA-Z0-9.-]+:\d+$/)
    .optional(),
  WEATHER_PROVIDER: z.enum(["disabled", "open-meteo"]).default("disabled"),
  OPEN_METEO_API_KEY: z.string().min(1).optional(),
  EXPLANATION_PROVIDER: z.enum(["disabled", "google"]).default("disabled"),
  GOOGLE_CLOUD_LOCATION: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default("global"),
  GOOGLE_MODEL_ID: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{2,128}$/)
    .default("gemini-3.6-flash"),
  SPEECH_LOCATION: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .default("us"),
  LOCAL_GCLOUD_AUTH: z.enum(["true", "false"]).default("false"),
  DEMO_AI_REQUESTS_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),
  DEMO_AI_REQUESTS_PER_DAY: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(100),
  DEMO_STT_SECONDS_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(3000)
    .default(300),
  DEMO_STT_SECONDS_PER_DAY: z.coerce
    .number()
    .int()
    .min(1)
    .max(30000)
    .default(3000),
  DEMO_TTS_CHARS_PER_MINUTE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .default(12000),
  DEMO_TTS_CHARS_PER_DAY: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000000)
    .default(120000),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(604800)
    .default(86400),
});
export function loadConfig(env: Record<string, string | undefined>) {
  const c = envSchema.parse(env);
  if (c.EXPLANATION_PROVIDER === "google" && !c.GOOGLE_CLOUD_PROJECT)
    throw new Error("Google providers require GOOGLE_CLOUD_PROJECT.");
  if (c.APP_ENV === "production" && c.LOCAL_GCLOUD_AUTH === "true")
    throw new Error("Production cannot use a local gcloud identity.");
  if (env.NODE_ENV === "production" && c.APP_ENV !== "production")
    throw new Error(
      "NODE_ENV=production requires explicit APP_ENV=production and cloud configuration.",
    );
  const origin = new URL(c.APP_ORIGIN);
  if (origin.origin !== c.APP_ORIGIN || origin.username || origin.password)
    throw new Error(
      "APP_ORIGIN must be an exact origin without path, credentials or trailing slash.",
    );
  if (c.STORAGE_BACKEND === "firestore" && !c.GOOGLE_CLOUD_PROJECT)
    throw new Error(
      "Firestore requires GOOGLE_CLOUD_PROJECT; a demo project ID is sufficient with the emulator.",
    );
  if (c.APP_ENV === "production") {
    if (
      c.STORAGE_BACKEND !== "firestore" ||
      c.FIRESTORE_EMULATOR_HOST ||
      env.GOOGLE_APPLICATION_CREDENTIALS
    )
      throw new Error(
        "Production requires Firestore workload identity; local stores, emulators and credential files are rejected.",
      );
    if (
      origin.protocol !== "https:" ||
      /^(localhost|127\.|\[::1\])/.test(origin.hostname)
    )
      throw new Error("Production requires a public HTTPS APP_ORIGIN.");
    if (!env.APP_ORIGIN)
      throw new Error("Production requires an explicit APP_ORIGIN.");
  }
  return Object.freeze({
    releaseSha: c.RELEASE_SHA,
    environment: c.APP_ENV,
    port: c.PORT,
    origin: c.APP_ORIGIN,
    storage: c.STORAGE_BACKEND,
    sqlitePath: c.SQLITE_PATH,
    project: c.GOOGLE_CLOUD_PROJECT,
    databaseId: c.FIRESTORE_DATABASE_ID,
    emulatorHost: c.FIRESTORE_EMULATOR_HOST,
    weather: c.WEATHER_PROVIDER,
    weatherKey: c.OPEN_METEO_API_KEY,
    explanationProvider: c.EXPLANATION_PROVIDER,
    model: c.GOOGLE_MODEL_ID,
    modelLocation: c.GOOGLE_CLOUD_LOCATION,
    speechLocation: c.SPEECH_LOCATION,
    localGcloudAuth: c.LOCAL_GCLOUD_AUTH === "true",
    demoBudgets: {
      model: [
        c.DEMO_AI_REQUESTS_PER_MINUTE,
        c.DEMO_AI_REQUESTS_PER_DAY,
      ] as const,
      stt: [c.DEMO_STT_SECONDS_PER_MINUTE, c.DEMO_STT_SECONDS_PER_DAY] as const,
      tts: [c.DEMO_TTS_CHARS_PER_MINUTE, c.DEMO_TTS_CHARS_PER_DAY] as const,
    },
    sessionTtlSeconds: c.SESSION_TTL_SECONDS,
    cookieName:
      c.APP_ENV === "production" ? "__Host-kavach_session" : "kavach_session",
  });
}
export type Config = ReturnType<typeof loadConfig>;
