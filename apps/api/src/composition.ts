import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import type { Store } from "./ports/store.js";
import { DisabledWeather } from "./ports/weather.js";
import { OpenMeteoWeather } from "./adapters/open-meteo.js";
import { createApp } from "./app.js";

export async function compose(
  env: Record<string, string | undefined> = process.env,
) {
  const config = loadConfig(env);
  let store: Store;
  if (config.storage === "sqlite") {
    const { SqliteStore } = await import("./adapters/sqlite.js");
    store = new SqliteStore(
      resolve(
        fileURLToPath(new URL("../../../", import.meta.url)),
        config.sqlitePath,
      ),
    );
  } else {
    const { FirestoreStore } = await import("./adapters/firestore.js");
    store = new FirestoreStore(config.project!, config.databaseId);
  }
  const weather =
    config.weather === "open-meteo"
      ? new OpenMeteoWeather(config.weatherKey)
      : new DisabledWeather();
  let providers = {};
  if (config.explanationProvider === "google") {
    const [{ GoogleCredentials }, { GoogleExplanation }, { GoogleSpeech }] =
      await Promise.all([
        import("./adapters/google-credentials.js"),
        import("./adapters/google-explanation.js"),
        import("./adapters/google-speech.js"),
      ]);
    const credentials = new GoogleCredentials(config);
    providers = {
      explanation: new GoogleExplanation(config, credentials),
      speech: new GoogleSpeech(config, credentials),
    };
  }
  const app = createApp({ config, store, weather, ...providers });
  return { app, config, store };
}
