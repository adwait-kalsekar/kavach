import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export async function liveSmoke(origin, sha) {
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
        if (new URL(r.url()).origin !== origin) unexpected.push(r.url());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      const healthPromise = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/api/v1/health",
        { timeout: 20000 },
      );
      const [, health] = await Promise.all([
        page.goto(origin, { waitUntil: "domcontentloaded", timeout: 30000 }),
        healthPromise,
      ]);
      assert.equal(health.status(), 200);
      assert.equal(health.headers()["x-release-sha"], sha);
      const payload = await health.json();
      assert.equal(payload.data.service, "kavach-api");
      await page
        .getByRole("heading", { name: "API reachable", exact: true })
        .waitFor({ timeout: 20000 });
      const ready = await context.request.get(origin + "/readyz", {
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
      "Live desktop/mobile UI, exact release health and database readiness passed.",
    );
  } finally {
    await browser.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [origin, sha] = process.argv.slice(2);
  if (
    !/^https:\/\/[a-z0-9.-]+\.run\.app$/.test(origin || "") ||
    !/^[a-f0-9]{40}$/.test(sha || "")
  )
    throw new Error(
      "Supply the canonical HTTPS Cloud Run origin and expected commit SHA.",
    );
  await liveSmoke(origin, sha);
}
