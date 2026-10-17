import type { Weather } from "@kavach/contracts";
export interface WeatherProvider {
  getForecast(signal?: AbortSignal): Promise<Weather>;
}
export class DisabledWeather implements WeatherProvider {
  async getForecast(): Promise<Weather> {
    return {
      status: "unavailable",
      reason:
        "No weather provider is configured. No live values have been substituted.",
      retryable: false,
    };
  }
}
