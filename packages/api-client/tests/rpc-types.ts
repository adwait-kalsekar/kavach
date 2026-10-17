import type { InferRequestType, InferResponseType } from "hono/client";
import { createRpcClient } from "../src/index.js";

const api = createRpcClient();
type Health = InferResponseType<typeof api.api.v1.health.$get>;
const service: Health["data"]["service"] = "kavach-api";
void service;
// @ts-expect-error Health is a literal success contract, not arbitrary provider data.
const badStatus: Health["data"]["status"] = "maybe";
void badStatus;
type FarmWrite = InferRequestType<typeof api.api.v1.farms.$post>;
const farmWrite: FarmWrite = {
  header: { "X-CSRF-Token": "csrf", "Idempotency-Key": "uuid" },
  json: {
    context: {
      district: "Latur",
      crop: "chickpea",
      stage: "planning",
      irrigation: "one",
      moisture: "unknown",
      seedAvailable: true,
      language: "en",
    },
  },
};
void farmWrite;
// @ts-expect-error A write requires CSRF and idempotency headers.
const missingHeaders: FarmWrite = { json: farmWrite.json };
void missingHeaders;
// @ts-expect-error Ownership must never be accepted from the browser.
farmWrite.json.ownerId = "attacker";
// @ts-expect-error Unsupported crop is not a valid farm input.
farmWrite.json.context.crop = "wheat";
// @ts-expect-error Route names must come from Hono, not arbitrary strings.
void api.api.v1.healthz;
type FarmRead = InferRequestType<(typeof api.api.v1.farms)[":id"]["$get"]>;
// @ts-expect-error Resource reads require the path parameter.
const missingPath: FarmRead = {};
void missingPath;
