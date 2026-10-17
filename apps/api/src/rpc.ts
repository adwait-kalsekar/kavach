// This export is type-only. Browser code must never import the composition root or SDKs.
import type { createApp } from "./app.js";
export type AppType = ReturnType<typeof createApp>;
