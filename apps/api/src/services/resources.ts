import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  assessmentSchema,
  comparisonSchema,
  createAssessmentSchema,
  createFarmSchema,
  createPlanSchema,
  farmSchema,
  planSchema,
  updateFarmSchema,
  updatePlanSchema,
  type Assessment,
  type Farm,
} from "@kavach/contracts";
import { evaluate } from "@kavach/domain";
import { digest } from "./session.js";
import { missing, ServiceError } from "../errors.js";
import type {
  Store,
  Transaction,
  Collection,
  Document,
  PageCursor,
} from "../ports/store.js";
import type { WeatherProvider } from "../ports/weather.js";

function owned(record: Document | null, ownerId: string): Document {
  if (!record || record.ownerId !== ownerId) throw missing();
  return record;
}
function publicValue(record: Document): Document {
  const { ownerId: _owner, ...value } = record;
  return value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const cursorSchema = z.strictObject({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

export class ResourceService {
  constructor(
    private store: Store,
    private weather: WeatherProvider,
    private now: () => Date = () => new Date(),
  ) {}

  private async replay(
    owner: string,
    scope: string,
    key: string,
    body: unknown,
  ) {
    const record = await this.store.read(
      "operations",
      digest(owner + ":" + scope + ":" + key),
    );
    if (
      !record ||
      typeof record.expiresAt !== "string" ||
      Date.parse(record.expiresAt) <= this.now().getTime()
    )
      return null;
    if (record.fingerprint !== digest(canonical(body)))
      throw new ServiceError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "The idempotency key was already used for a different request.",
      );
    return record.result as Document;
  }

  private async create(
    owner: string,
    scope: string,
    key: string,
    body: unknown,
    collection: Collection,
    factory: (tx: Transaction, id: string, now: string) => Promise<Document>,
  ) {
    const operationId = digest(owner + ":" + scope + ":" + key);
    const fingerprint = digest(canonical(body));
    return this.store.transaction(async (tx) => {
      const existing = await tx.get("operations", operationId);
      if (
        existing &&
        typeof existing.expiresAt === "string" &&
        Date.parse(existing.expiresAt) > this.now().getTime()
      ) {
        if (existing.fingerprint !== fingerprint)
          throw new ServiceError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "The idempotency key was already used for a different request.",
          );
        return existing.result as Document;
      }
      const result = await factory(tx, randomUUID(), this.now().toISOString());
      tx.put(collection, String(result.id), { ...result, ownerId: owner });
      tx.put("operations", operationId, {
        ownerId: owner,
        fingerprint,
        result,
        expiresAt: new Date(this.now().getTime() + 86400000).toISOString(),
      });
      return result;
    });
  }
  async createFarm(
    owner: string,
    body: z.infer<typeof createFarmSchema>,
    key: string,
  ) {
    return this.create(
      owner,
      "createFarm",
      key,
      body,
      "farms",
      async (_tx, id, now) =>
        farmSchema.parse({
          id,
          schemaVersion: 1,
          context: body.context,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        }),
    );
  }
  async getFarm(owner: string, id: string) {
    return farmSchema.parse(
      publicValue(owned(await this.store.read("farms", id), owner)),
    );
  }
  async updateFarm(
    owner: string,
    id: string,
    body: z.infer<typeof updateFarmSchema>,
  ) {
    return this.store.transaction(async (tx) => {
      const farm = farmSchema.parse(
        publicValue(owned(await tx.get("farms", id), owner)),
      );
      if (farm.revision !== body.expectedRevision)
        throw new ServiceError(
          409,
          "CONFLICT",
          "Farm details changed. Reload before updating.",
        );
      const next = {
        ...farm,
        context: body.context,
        revision: farm.revision + 1,
        updatedAt: this.now().toISOString(),
      };
      tx.put("farms", id, { ...next, ownerId: owner });
      return next;
    });
  }
  async createAssessment(
    owner: string,
    body: z.infer<typeof createAssessmentSchema>,
    key: string,
    signal?: AbortSignal,
  ) {
    const replay = await this.replay(owner, "createAssessment", key, body);
    if (replay) return replay;
    const confirmed = await this.getFarm(owner, body.farmId); // Authorize and check revision before provider work.
    if (confirmed.revision !== body.expectedFarmRevision)
      throw new ServiceError(
        409,
        "CONFLICT",
        "Assessment context is out of date. Reload the farm.",
      );
    const weather = await this.weather.getForecast(signal);
    return this.create(
      owner,
      "createAssessment",
      key,
      body,
      "assessments",
      async (tx, id, now) => {
        const farm = farmSchema.parse(
          publicValue(owned(await tx.get("farms", body.farmId), owner)),
        );
        if (farm.revision !== body.expectedFarmRevision)
          throw new ServiceError(
            409,
            "CONFLICT",
            "Assessment context is out of date. Reload the farm.",
          );
        return assessmentSchema.parse(
          evaluate({ id, farm, weather, createdAt: now }),
        );
      },
    );
  }
  async getAssessment(owner: string, id: string): Promise<Assessment> {
    return assessmentSchema.parse(
      publicValue(owned(await this.store.read("assessments", id), owner)),
    );
  }
  async compare(
    owner: string,
    id: string,
    body: z.infer<typeof comparisonSchema>,
    key: string,
  ) {
    return this.create(
      owner,
      "compare:" + id,
      key,
      body,
      "assessments",
      async (tx, nextId, now) => {
        const base = assessmentSchema.parse(
          publicValue(owned(await tx.get("assessments", id), owner)),
        );
        const hypothetical: Farm = {
          id: base.farmId,
          schemaVersion: 1,
          context: { ...base.context, ...body.changes },
          revision: base.farmRevision,
          createdAt: base.createdAt,
          updatedAt: base.createdAt,
        };
        return assessmentSchema.parse(
          evaluate({
            id: nextId,
            farm: hypothetical,
            weather: base.weather,
            createdAt: now,
            basedOnAssessmentId: id,
          }),
        );
      },
    );
  }
  async createPlan(
    owner: string,
    body: z.infer<typeof createPlanSchema>,
    key: string,
  ) {
    return this.create(
      owner,
      "createPlan",
      key,
      body,
      "plans",
      async (tx, id, now) => {
        const assessment = assessmentSchema.parse(
          publicValue(
            owned(await tx.get("assessments", body.assessmentId), owner),
          ),
        );
        if (assessment.mode === "hypothetical")
          throw new ServiceError(
            409,
            "CONFLICT",
            "Confirm the farm change and create a confirmed assessment before saving its plan.",
          );
        return planSchema.parse({
          id,
          schemaVersion: 1,
          assessmentId: assessment.id,
          revision: 1,
          tasks: assessment.actions.map((a) => ({
            actionId: a.id,
            status: "pending",
            blocker: null,
          })),
          createdAt: now,
          updatedAt: now,
        });
      },
    );
  }
  async getPlan(owner: string, id: string) {
    return planSchema.parse(
      publicValue(owned(await this.store.read("plans", id), owner)),
    );
  }
  async updatePlan(
    owner: string,
    id: string,
    body: z.infer<typeof updatePlanSchema>,
  ) {
    return this.store.transaction(async (tx) => {
      const plan = planSchema.parse(
        publicValue(owned(await tx.get("plans", id), owner)),
      );
      const assessment = assessmentSchema.parse(
        publicValue(
          owned(await tx.get("assessments", plan.assessmentId), owner),
        ),
      );
      if (plan.revision !== body.expectedRevision)
        throw new ServiceError(
          409,
          "CONFLICT",
          "Plan changed. Reload before updating.",
        );
      if (
        body.tasks.length !== assessment.actions.length ||
        body.tasks.some(
          (t) => !assessment.actions.some((a) => a.id === t.actionId),
        )
      )
        throw new ServiceError(
          400,
          "VALIDATION_ERROR",
          "Supply exactly the existing assessment action IDs.",
        );
      const next = {
        ...plan,
        tasks: body.tasks,
        revision: plan.revision + 1,
        updatedAt: this.now().toISOString(),
      };
      tx.put("plans", id, { ...next, ownerId: owner });
      return next;
    });
  }
  async listPlans(owner: string, limit: number, encodedCursor?: string) {
    let cursor: PageCursor | undefined;
    if (encodedCursor) {
      try {
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(encodedCursor, "base64url").toString("utf8")),
        );
      } catch {
        throw new ServiceError(
          400,
          "VALIDATION_ERROR",
          "The history cursor is invalid.",
        );
      }
    }
    const results = await this.store.listPlans(owner, limit + 1, cursor);
    const items = results
      .slice(0, limit)
      .map((record) => planSchema.parse(publicValue(owned(record, owner))));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        results.length > limit && last
          ? Buffer.from(
              JSON.stringify({ createdAt: last.createdAt, id: last.id }),
            ).toString("base64url")
          : null,
    };
  }
}
