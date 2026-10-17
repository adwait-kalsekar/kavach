import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../dist/index.js";
const farm = {
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  revision: 1,
  createdAt: "2026-10-17T00:00:00.000Z",
  updatedAt: "2026-10-17T00:00:00.000Z",
  context: {
    district: "Latur",
    crop: "chickpea",
    stage: "planning",
    irrigation: "one",
    moisture: "unknown",
    seedAvailable: true,
    language: "en",
  },
};
const input = {
  id: "22222222-2222-4222-8222-222222222222",
  farm,
  weather: { status: "unavailable", reason: "Disabled", retryable: false },
  createdAt: farm.createdAt,
};
test("same confirmed inputs produce a reproducible assessment", () =>
  assert.deepEqual(evaluate(input), evaluate(input)));
test("water constraint substantively changes applicable workflow checks", () => {
  assert.ok(evaluate(input).actions.some((a) => a.id === "limited-water"));
  const other = evaluate({
    ...input,
    farm: { ...farm, context: { ...farm.context, irrigation: "none" } },
  });
  assert.ok(other.actions.some((a) => a.id === "rainfed-check"));
  assert.ok(!other.actions.some((a) => a.id === "limited-water"));
});
test("comparison never mutates confirmed context and is marked hypothetical", () => {
  const before = structuredClone(farm);
  const result = evaluate({
    ...input,
    basedOnAssessmentId: input.id,
    farm: { ...farm, context: { ...farm.context, seedAvailable: false } },
  });
  assert.equal(result.mode, "hypothetical");
  assert.deepEqual(farm, before);
  assert.ok(result.actions.some((a) => a.id === "seed-access"));
});
test("no invented measurements or falsely reviewed recommendations", () => {
  const result = evaluate(input);
  assert.equal(result.readiness, "needs-check");
  assert.equal(result.weather.status, "unavailable");
  assert.ok(
    result.actions.every(
      (a) => a.reviewStatus === "unreviewed" && a.sourceIds.length === 0,
    ),
  );
});
