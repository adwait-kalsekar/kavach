import { expect, test } from "@playwright/test";

test("real UI → Hono health request, validated response and manual refresh", async ({
  page,
  baseURL,
}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const firstResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/health") && response.status() === 200,
  );
  await page.goto("/health");
  const first = await (await firstResponse).json();
  expect(first.data.service).toBe("kavach-api");
  await expect(
    page.getByRole("heading", { name: "API reachable", exact: true }),
  ).toBeVisible();
  await page.getByText("Inspect the API response").click();
  await expect(
    page.getByText(`Request ID: ${first.meta.requestId}`),
  ).toBeVisible();
  const refreshed = page.waitForResponse((response) =>
    response.url().endsWith("/api/v1/health"),
  );
  await page.getByRole("button", { name: "Check again" }).click();
  const second = await (await refreshed).json();
  expect(second.meta.requestId).not.toBe(first.meta.requestId);
  await expect(
    page.getByText(`Request ID: ${second.meta.requestId}`),
  ).toBeVisible();
  const apiOrigin = baseURL?.endsWith(":8081")
    ? "http://localhost:8082"
    : "http://localhost:8080";
  expect(
    requests.every((url) => [baseURL, apiOrigin].includes(new URL(url).origin)),
  ).toBe(true);
  expect(
    requests.some((url) => url.startsWith(apiOrigin + "/api/v1/health")),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("loading and unavailable states recover after the API returns", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/health", async (route) => {
    await gate;
    await route.abort("failed");
  });
  await page.goto("/health");
  await expect(
    page.getByRole("heading", { name: "Checking connection" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Checking…" })).toBeDisabled();
  release();
  await expect(
    page.getByRole("heading", { name: "API unreachable" }),
  ).toBeVisible();
  await page.unroute("**/api/v1/health");
  await page.getByRole("button", { name: "Check again" }).click();
  await expect(
    page.getByRole("heading", { name: "API reachable", exact: true }),
  ).toBeVisible();
});

test("an invalid successful payload is never presented as a healthy API", async ({
  page,
}) => {
  await page.route("**/api/v1/health", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok" }),
    }),
  );
  await page.goto("/health");
  await expect(
    page.getByRole("heading", { name: "API unreachable" }),
  ).toBeVisible();
});

test("cross-origin guest cookies and CSRF work without exposing cookies to JavaScript", async ({
  page,
}) => {
  await page.goto("/health");
  const result = await page.evaluate(async () => {
    const origin = (
      window as Window & { __KAVACH_CONFIG__?: { apiOrigin: string } }
    ).__KAVACH_CONFIG__?.apiOrigin;
    const bootstrap = await fetch(origin + "/api/v1/session", {
      credentials: "include",
    });
    const payload = await bootstrap.json();
    const response = await fetch(origin + "/api/v1/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": payload.data.csrfToken,
      },
      body: "{}",
    });
    const rejected = await fetch(origin + "/api/v1/session", {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": "wrong" },
    });
    return {
      status: response.status,
      rejected: rejected.status,
      cookie: document.cookie,
    };
  });
  expect(result.status).toBe(201);
  expect(result.rejected).toBe(403);
  expect(result.cookie).not.toContain("kavach_session");
});
