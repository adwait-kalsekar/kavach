import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFarmSchema,
  weatherSchema,
  comparisonSchema,
  updatePlanSchema,
  openApiDocument,
  endpoints,
} from "../dist/index.js";
const context = {
  district: "Latur",
  crop: "chickpea",
  stage: "planning",
  irrigation: "one",
  moisture: "unknown",
  seedAvailable: true,
  language: "en",
};
test("strict contract rejects injected owner and unknown context fields", () => {
  assert.equal(
    createFarmSchema.safeParse({ context, ownerId: "other" }).success,
    false,
  );
  assert.equal(
    createFarmSchema.safeParse({ context: { ...context, provider: "fake" } })
      .success,
    false,
  );
  assert.equal(createFarmSchema.safeParse({ context }).success, true);
});
test("no zero-valued forecast can masquerade as unavailable", () => {
  assert.equal(
    weatherSchema.safeParse({
      status: "unavailable",
      reason: "No provider configured",
      retryable: false,
    }).success,
    true,
  );
  assert.equal(
    weatherSchema.safeParse({
      status: "unavailable",
      reason: "No provider configured",
      retryable: false,
      days: [],
    }).success,
    false,
  );
});
test("hypothetical changes must be nonempty and cannot change supported geography", () => {
  assert.equal(comparisonSchema.safeParse({ changes: {} }).success, false);
  assert.equal(
    comparisonSchema.safeParse({ changes: { district: "Other" } }).success,
    false,
  );
  assert.equal(
    comparisonSchema.safeParse({ changes: { irrigation: "none" } }).success,
    true,
  );
});
test("task blocker invariants and duplicate task IDs are validated", () => {
  assert.equal(
    updatePlanSchema.safeParse({
      expectedRevision: 1,
      tasks: [{ actionId: "check", status: "blocked", blocker: null }],
    }).success,
    false,
  );
  assert.equal(
    updatePlanSchema.safeParse({
      expectedRevision: 1,
      tasks: [{ actionId: "check", status: "pending", blocker: "water" }],
    }).success,
    false,
  );
  assert.equal(
    updatePlanSchema.safeParse({
      expectedRevision: 1,
      tasks: [
        { actionId: "check", status: "pending", blocker: null },
        { actionId: "check", status: "pending", blocker: null },
      ],
    }).success,
    false,
  );
});
test("all declared endpoints produce an OpenAPI response schema", () => {
  const doc = openApiDocument();
  assert.equal(doc.openapi, "3.1.0");
  for (const [name, e] of Object.entries(endpoints))
    assert.equal(doc.paths[e.path][e.method.toLowerCase()].operationId, name);
});
