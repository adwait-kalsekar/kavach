import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export async function liveSmoke(origin, sha, apiOrigin, provider = "google") {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 393, height: 852 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const unexpected = [];
      const errors = [];
      page.on("request", (r) => {
        if (![origin, apiOrigin].includes(new URL(r.url()).origin))
          unexpected.push(r.url());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      const healthPromise = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/v1/health",
        { timeout: 20000 },
      );
      const [document, health] = await Promise.all([
        page.goto(origin + "/health", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        }),
        healthPromise,
      ]);
      assert.equal(document.status(), 200);
      assert.equal(document.headers()["x-release-sha"], sha);
      assert.equal(new URL(health.url()).origin, apiOrigin);
      assert.equal(health.status(), 200);
      assert.equal(health.headers()["x-release-sha"], sha);
      const payload = await health.json();
      assert.equal(payload.data.service, "kavach-api");
      await page
        .getByRole("heading", { name: "API reachable", exact: true })
        .waitFor({ timeout: 20000 });
      await page.goto(origin, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page
        .getByRole("heading", {
          name: "Make a plan for the water you have.",
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("link", { name: "Compare my water options", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Use this comparison", exact: true })
        .nth(1)
        .click();
      await page
        .getByRole("link", { name: "Review this comparison", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Check before acting", exact: true })
        .waitFor();
      assert.equal(
        await page.locator(".fp-receipt dd").first().innerText(),
        "1.5",
      );
      if (provider === "google" && viewport.width > 1000) {
        await page
          .getByRole("link", { name: "Talk", exact: true })
          .first()
          .click();
        const explanationResponse = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/v1/demo/water-plan/explain",
          { timeout: 40000 },
        );
        await page
          .getByRole("button", {
            name: "What should I check next?",
            exact: true,
          })
          .click();
        const result = await (await explanationResponse).json();
        assert.equal(result.data.explanation.status, "available");
        assert.equal(result.data.explanation.model.provider, "google");
        assert.ok(result.data.explanation.model.version);
        assert.equal(result.data.audio.status, "available");
        await page.locator(".fp-assistant-message").waitFor();
      }
      if (provider === "disabled" && viewport.width > 1000) {
        await page
          .getByRole("link", { name: "Talk", exact: true })
          .first()
          .click();
        const unavailableResponse = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/v1/demo/water-plan/explain",
        );
        await page
          .getByRole("button", {
            name: "What should I check next?",
            exact: true,
          })
          .click();
        const unavailable = await (await unavailableResponse).json();
        assert.equal(unavailable.data.explanation.status, "unavailable");
        await page
          .getByText(
            "Google explanations are not configured. The calculation is still available.",
            { exact: true },
          )
          .waitFor();
      }
      const ready = await context.request.get(apiOrigin + "/readyz", {
        timeout: 10000,
      });
      assert.equal(ready.status(), 200);
      assert.deepEqual(unexpected, []);
      assert.deepEqual(errors, []);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await context.close();
    }
    console.log(
      `Desktop/mobile planning, ${provider === "google" ? "real Google explanation/audio" : "explicit disabled-provider state"}, exact release health and database readiness passed.`,
    );
  } finally {
    await browser.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [origin, sha, apiOrigin] = process.argv.slice(2);
  if (
    ![origin, apiOrigin].every((v) =>
      /^https:\/\/[a-z0-9.-]+$/.test(v || ""),
    ) ||
    !/^[a-f0-9]{40}$/.test(sha || "")
  )
    throw new Error(
      "Supply the web HTTPS origin, expected commit SHA and API HTTPS origin.",
    );
  await liveSmoke(origin, sha, apiOrigin);
}
