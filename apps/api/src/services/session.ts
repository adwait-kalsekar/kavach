import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import type { Store } from "../ports/store.js";
import type { Config } from "../config.js";
import { ServiceError } from "../errors.js";

export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const equalSecret = (a: string, b: string) =>
  /^[a-f0-9]{64}$/.test(a) &&
  /^[a-f0-9]{64}$/.test(b) &&
  timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
export type Session = {
  key: string;
  ownerId: string | null;
  csrfToken: string;
  expiresAt: string;
};
export class SessionService {
  constructor(
    private store: Store,
    private config: Config,
    private now: () => Date,
  ) {}
  async resolve(token: string | undefined): Promise<Session | null> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const key = digest(token);
    const record = await this.store.read("sessions", key);
    if (
      !record ||
      typeof record.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(record.expiresAt)) ||
      Date.parse(record.expiresAt) <= this.now().getTime()
    )
      return null;
    return {
      key,
      ownerId: typeof record.ownerId === "string" ? record.ownerId : null,
      csrfToken: String(record.csrfToken),
      expiresAt: record.expiresAt,
    };
  }
  async create(ownerId: string | null, prior?: string) {
    const token = randomBytes(32).toString("hex");
    const key = digest(token);
    const csrfToken = randomBytes(32).toString("hex");
    const ttl = ownerId ? this.config.sessionTtlSeconds : 600;
    const session: Session = {
      key,
      ownerId,
      csrfToken,
      expiresAt: new Date(this.now().getTime() + ttl * 1000).toISOString(),
    };
    await this.store.transaction(async (tx) => {
      if (prior) tx.remove("sessions", prior);
      tx.put("sessions", key, {
        ownerId,
        csrfToken,
        expiresAt: session.expiresAt,
      });
    });
    return { token, session, ttl };
  }
  async authenticate(session: Session) {
    if (session.ownerId) return null;
    // Rotation and bootstrap consumption are atomic. Concurrent attempts cannot mint two owners.
    const token = randomBytes(32).toString("hex");
    const key = digest(token);
    const next: Session = {
      key,
      ownerId: randomUUID(),
      csrfToken: randomBytes(32).toString("hex"),
      expiresAt: new Date(
        this.now().getTime() + this.config.sessionTtlSeconds * 1000,
      ).toISOString(),
    };
    await this.store.transaction(async (tx) => {
      const original = await tx.get("sessions", session.key);
      if (
        !original ||
        original.ownerId !== null ||
        typeof original.expiresAt !== "string" ||
        Date.parse(original.expiresAt) <= this.now().getTime()
      )
        throw new ServiceError(
          401,
          "UNAUTHORIZED",
          "Bootstrap session expired. Start a new session.",
        );
      tx.remove("sessions", session.key);
      tx.put("sessions", key, {
        ownerId: next.ownerId,
        csrfToken: next.csrfToken,
        expiresAt: next.expiresAt,
      });
    });
    return { token, session: next, ttl: this.config.sessionTtlSeconds };
  }
  async revoke(session: Session) {
    await this.store.transaction(async (tx) => {
      tx.remove("sessions", session.key);
    });
  }
}

export async function consumeQuota(
  store: Store,
  scope: string,
  limit: number,
  now: Date,
) {
  const minute = Math.floor(now.getTime() / 60000);
  const key = digest(scope + ":" + minute);
  await store.transaction(async (tx) => {
    const record = await tx.get("quotas", key);
    const used = typeof record?.used === "number" ? record.used : 0;
    if (used >= limit)
      throw new ServiceError(
        429,
        "RATE_LIMITED",
        "Request limit reached. Retry in a minute.",
        true,
      );
    tx.put("quotas", key, {
      used: used + 1,
      expiresAt: new Date((minute + 2) * 60000).toISOString(),
    });
  });
}
