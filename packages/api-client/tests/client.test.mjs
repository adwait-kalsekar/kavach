import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient, KavachApiError } from "../dist/index.js";
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
