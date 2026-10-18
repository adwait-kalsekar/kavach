import {
  endpoints,
  errorSchema,
  idSchema,
  type Operation,
  type RequestBody,
  type ResponseBody,
  type ApiErrorBody,
} from "@kavach/contracts";

export class KavachApiError extends Error {
  constructor(
    public status: number,
    public payload: ApiErrorBody,
  ) {
    super(payload.error.message);
    this.name = "KavachApiError";
  }
}
export type Options<K extends Operation> = {
  signal?: AbortSignal;
} & ((typeof endpoints)[K] extends { method: "GET" } | { publicDemo: true }
  ? { csrfToken?: never }
  : { csrfToken: string }) &
  ((typeof endpoints)[K] extends { idempotent: true }
    ? { idempotencyKey: string }
    : { idempotencyKey?: never }) &
  (K extends "listPlans"
    ? { query?: { limit?: number; cursor?: string } }
    : { query?: never }) &
  ((typeof endpoints)[K] extends { path: `${string}{id}${string}` }
    ? { id: string }
    : { id?: never }) &
  ((typeof endpoints)[K] extends { body: unknown }
    ? { body: RequestBody<K> }
    : { body?: never });

function apiBase(origin: string) {
  if (!origin) return "";
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("API origin must be an exact HTTP(S) origin.");
  return origin;
}
export function createApiClient(fetcher: typeof fetch = fetch, origin = "") {
  const base = apiBase(origin);
  return {
    async request<
      K extends Exclude<Operation, "demoTranscribe" | "planningTranscribe">,
    >(operation: K, options: Options<K>): Promise<ResponseBody<K>> {
      const endpoint = endpoints[operation];
      const path = endpoint.path.includes("{id}")
        ? endpoint.path.replace("{id}", idSchema.parse(options.id))
        : endpoint.path;
      const query = new URLSearchParams();
      if (options.query?.limit !== undefined)
        query.set("limit", String(options.query.limit));
      if (options.query?.cursor) query.set("cursor", options.query.cursor);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (endpoint.method !== "GET" && !("publicDemo" in endpoint)) {
        if (!options.csrfToken)
          throw new Error(
            "Bootstrap the session and supply a CSRF token before mutating requests.",
          );
        headers["X-CSRF-Token"] = options.csrfToken;
      }
      if ("idempotent" in endpoint)
        headers["Idempotency-Key"] = idSchema.parse(options.idempotencyKey);
      let body: string | undefined;
      if ("body" in endpoint) {
        body = JSON.stringify(endpoint.body.parse(options.body));
        headers["Content-Type"] = "application/json";
      }
      const response = await fetcher(
        base + path + (query.size ? "?" + query : ""),
        {
          method: endpoint.method,
          headers,
          body,
          credentials:
            "publicDemo" in endpoint
              ? "omit"
              : base
                ? "include"
                : "same-origin",
          signal: options.signal,
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok)
        throw new KavachApiError(response.status, errorSchema.parse(payload));
      return endpoint.response.parse(payload) as ResponseBody<K>;
    },
  };
}

/** Type-only server schema: SDKs/configuration never become browser imports. */
import type { AppType } from "@kavach/api/rpc";
import { hc } from "hono/client";

export function createRpcClient(fetcher: typeof fetch = fetch, origin = "") {
  const base = apiBase(origin);
  return hc<AppType>(base || "/", {
    fetch: (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) =>
      fetcher(input, {
        ...init,
        credentials: base ? "include" : "same-origin",
      }),
  });
}

/** RPC supplies compile-time completion; Zod still checks the actual wire payload. */
export async function readRpcResponse<K extends Operation>(
  operation: K,
  response: Response,
): Promise<ResponseBody<K>> {
  const payload: unknown = await response.json();
  if (!response.ok)
    throw new KavachApiError(response.status, errorSchema.parse(payload));
  return endpoints[operation].response.parse(payload) as ResponseBody<K>;
}

/** Public synthetic calculations have no session, bearer token or cookie. */
export function createDemoClient(
  origin: string,
  fetcher: typeof fetch = fetch,
) {
  const base = apiBase(origin);
  async function call<
    K extends
      | "planningCatalog"
      | "demoWaterPlan"
      | "demoWaterExplain"
      | "planningTranscribe"
      | "demoScenarios"
      | "demoAssess"
      | "demoExplain"
      | "demoTranscribe"
      | "demoMessage",
  >(
    operation: K,
    body?: BodyInit,
    locale?: string,
    signal?: AbortSignal,
  ): Promise<ResponseBody<K>> {
    const endpoint = endpoints[operation];
    const response = await fetcher(
      base +
        endpoint.path +
        (locale ? "?locale=" + encodeURIComponent(locale) : ""),
      {
        method: endpoint.method,
        credentials: "omit",
        signal,
        headers: {
          Accept: "application/json",
          ...(body
            ? {
                "Content-Type":
                  operation === "demoTranscribe" ||
                  operation === "planningTranscribe"
                    ? "audio/wav"
                    : "application/json",
              }
            : {}),
        },
        body,
      },
    );
    return readRpcResponse(operation, response);
  }
  return {
    planning: (signal?: AbortSignal) =>
      call("planningCatalog", undefined, undefined, signal),
    waterPlan: (input: RequestBody<"demoWaterPlan">, signal?: AbortSignal) =>
      call(
        "demoWaterPlan",
        JSON.stringify(endpoints.demoWaterPlan.body.parse(input)),
        undefined,
        signal,
      ),
    waterExplain: (
      input: RequestBody<"demoWaterExplain">,
      signal?: AbortSignal,
    ) =>
      call(
        "demoWaterExplain",
        JSON.stringify(endpoints.demoWaterExplain.body.parse(input)),
        undefined,
        signal,
      ),
    planningTranscribe: (
      audio: Blob,
      locale: import("@kavach/contracts").DemoLocale,
      signal?: AbortSignal,
    ) => call("planningTranscribe", audio, locale, signal),
    scenarios: (signal?: AbortSignal) =>
      call("demoScenarios", undefined, undefined, signal),
    assess: (input: RequestBody<"demoAssess">, signal?: AbortSignal) =>
      call(
        "demoAssess",
        JSON.stringify(endpoints.demoAssess.body.parse(input)),
        undefined,
        signal,
      ),
    explain: (input: RequestBody<"demoExplain">, signal?: AbortSignal) =>
      call(
        "demoExplain",
        JSON.stringify(endpoints.demoExplain.body.parse(input)),
        undefined,
        signal,
      ),
    message: (input: RequestBody<"demoMessage">, signal?: AbortSignal) =>
      call(
        "demoMessage",
        JSON.stringify(endpoints.demoMessage.body.parse(input)),
        undefined,
        signal,
      ),
    transcribe: (
      audio: Blob,
      locale: import("@kavach/contracts").DemoLocale,
      signal?: AbortSignal,
    ) => call("demoTranscribe", audio, locale, signal),
  };
}
