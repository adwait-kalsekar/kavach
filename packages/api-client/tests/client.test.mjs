import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createApiClient,
  createRpcClient,
  KavachApiError,
} from "../dist/index.js";
test("client uses only relative Hono URL and HTTP-only cookie transport", async () => {
  let seen;
  const client = createApiClient(async (url, options) => {
    seen = { url, options };
    return Response.json({
      data: {
        status: "bootstrap",
        csrfToken: "a".repeat(64),
        expiresAt: "2026-10-17T01:00:00.000Z",
      },
      meta: { requestId: crypto.randomUUID() },
    });
  });
  await client.request("session", {});
  assert.equal(seen.url, "/api/v1/session");
  assert.equal(seen.options.credentials, "same-origin");
});
test("missing CSRF and malformed responses fail before becoming UI state", async () => {
  const client = createApiClient(async () =>
    Response.json({ unexpected: true }),
  );
  await assert.rejects(
    () => client.request("createSession", { body: {} }),
    /CSRF/,
  );
  await assert.rejects(() => client.request("session", {}));
});
test("structured API failures preserve status and request ID", async () => {
  const requestId = crypto.randomUUID();
  const client = createApiClient(async () =>
    Response.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Session required",
          requestId,
          retryable: false,
        },
      },
      { status: 401 },
    ),
  );
  await assert.rejects(
    () => client.request("session", {}),
    (e) =>
      e instanceof KavachApiError &&
      e.status === 401 &&
      e.payload.error.requestId === requestId,
  );
});

test("both transports target the exact configured Hono origin with credentialed cookies", async () => {
  const seen = [];
  const fetcher = async (url, options) => {
    seen.push({ url: String(url), credentials: options.credentials });
    return Response.json({
      data: {
        status: "ok",
        service: "kavach-api",
        apiVersion: "v1",
        checkedAt: "2026-10-17T00:00:00.000Z",
      },
      meta: { requestId: crypto.randomUUID() },
    });
  };
  await createApiClient(fetcher, "https://api.example.com").request(
    "health",
    {},
  );
  await createRpcClient(
    fetcher,
    "https://api.example.com",
  ).api.v1.health.$get();
  assert.deepEqual(
    seen,
    Array(2).fill({
      url: "https://api.example.com/api/v1/health",
      credentials: "include",
    }),
  );
  for (const bad of [
    "https://api.example.com/path",
    "https://api.example.com/",
    "https://user:password@api.example.com",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => createApiClient(fetcher, bad));
    assert.throws(() => createRpcClient(fetcher, bad));
  }
});
