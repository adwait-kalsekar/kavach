import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Hono, Env } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

/** Built assets share Hono's origin. API paths must never fall back to HTML. */
export function mountWeb<E extends Env>(
  app: Hono<E>,
  root: string,
  required = false,
) {
  const index = join(root, "index.html");
  if (!existsSync(index)) {
    if (required)
      throw new Error(
        "Built web assets are missing. Run npm run build:app before production startup.",
      );
    return;
  }
  app.get("/assets/*", serveStatic({ root }));
  app.get("/kavach.svg", serveStatic({ root }));
  app.get("/", serveStatic({ path: index }));
  // Add explicit SPA route namespaces here when new screens are introduced.
}
