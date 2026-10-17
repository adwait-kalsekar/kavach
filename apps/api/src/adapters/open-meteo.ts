import { weatherSchema, type Weather } from "@kavach/contracts";
import type { WeatherProvider } from "../ports/weather.js";

export class OpenMeteoWeather implements WeatherProvider {
  private cached?: { until: number; value: Weather };
  constructor(
    private key?: string,
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
  ) {}
  async getForecast(signal?: AbortSignal): Promise<Weather> {
    if (this.cached && this.cached.until > this.now().getTime())
      return structuredClone(this.cached.value);
    try {
      const url = new URL(
        this.key
          ? "https://customer-api.open-meteo.com/v1/forecast"
          : "https://api.open-meteo.com/v1/forecast",
      );
      url.search = new URLSearchParams({
        latitude: "18.4088",
        longitude: "76.5604",
        daily: "precipitation_sum,temperature_2m_max",
        forecast_days: "7",
        timezone: "Asia/Kolkata",
        ...(this.key ? { apikey: this.key } : {}),
      }).toString();
      const response = await this.fetcher(url, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(7000)])
          : AbortSignal.timeout(7000),
      });
      if (!response.ok) throw new Error("Provider error");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Provider returned no body");
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 64000) {
            await reader.cancel();
            throw new Error("Provider response too large");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      const data = JSON.parse(raw);
      if (
        data.daily_units?.precipitation_sum !== "mm" ||
        data.daily_units?.temperature_2m_max !== "°C"
      )
        throw new Error("Units mismatch");
      if (
        ![
          data.daily?.time,
          data.daily?.precipitation_sum,
          data.daily?.temperature_2m_max,
        ].every((v) => Array.isArray(v) && v.length === 7)
      )
        throw new Error("Incomplete forecast");
      const now = this.now();
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      const days = data.daily.time.map((date: unknown, i: number) => {
        if (
          typeof date !== "string" ||
          new Date(date + "T00:00:00Z").getTime() !==
            new Date(today + "T00:00:00Z").getTime() + i * 86400000
        )
          throw new Error("Stale forecast");
        return {
          date,
          rainMm: data.daily.precipitation_sum[i],
          maxC: data.daily.temperature_2m_max[i],
        };
      });
      const value = weatherSchema.parse({
        status: "available",
        days,
        provenance: {
          provider: "Open-Meteo",
          product: "forecast",
          productVersion: "v1",
          sourceUrl: "https://open-meteo.com/en/docs",
          retrievedAt: now.toISOString(),
          forecastIssuedAt: null,
          location: {
            latitude: 18.4088,
            longitude: 76.5604,
            scope: "district-centre",
          },
          resolutionDescription:
            "Model-selected district-centre forecast; native grid varies. Not a field measurement.",
        },
      });
      this.cached = { until: now.getTime() + 300000, value };
      return structuredClone(value);
    } catch {
      return {
        status: "unavailable",
        reason:
          "A complete current forecast could not be verified. No forecast-dependent conclusion is issued.",
        retryable: true,
      };
    }
  }
}
