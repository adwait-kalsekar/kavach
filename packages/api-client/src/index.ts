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
} & ((typeof endpoints)[K] extends { method: "GET" }
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

export function createApiClient(fetcher: typeof fetch = fetch) {
  return {
    async request<K extends Operation>(
      operation: K,
      options: Options<K>,
    ): Promise<ResponseBody<K>> {
      const endpoint = endpoints[operation];
      const path = endpoint.path.includes("{id}")
        ? endpoint.path.replace("{id}", idSchema.parse(options.id))
        : endpoint.path;
      const query = new URLSearchParams();
      if (options.query?.limit !== undefined)
        query.set("limit", String(options.query.limit));
      if (options.query?.cursor) query.set("cursor", options.query.cursor);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (endpoint.method !== "GET") {
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
      const response = await fetcher(path + (query.size ? "?" + query : ""), {
        method: endpoint.method,
        headers,
        body,
        credentials: "same-origin",
        signal: options.signal,
      });
      const payload: unknown = await response.json();
      if (!response.ok)
        throw new KavachApiError(response.status, errorSchema.parse(payload));
      return endpoint.response.parse(payload) as ResponseBody<K>;
    },
  };
}
