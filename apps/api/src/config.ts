import { z } from "zod";

const envSchema = z.object({
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
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(604800)
    .default(86400),
});
export function loadConfig(env: Record<string, string | undefined>) {
  const c = envSchema.parse(env);
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
    sessionTtlSeconds: c.SESSION_TTL_SECONDS,
    cookieName:
      c.APP_ENV === "production" ? "__Host-kavach_session" : "kavach_session",
  });
}
export type Config = ReturnType<typeof loadConfig>;
