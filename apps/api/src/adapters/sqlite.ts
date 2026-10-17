import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Collection,
  Document,
  PageCursor,
  Store,
  Transaction,
} from "../ports/store.js";

export class SqliteStore implements Store {
  private db: DatabaseSync;
  private queue: Promise<void> = Promise.resolve();
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS documents (collection TEXT NOT NULL, id TEXT NOT NULL, owner TEXT, created TEXT, payload TEXT NOT NULL, PRIMARY KEY(collection,id)); CREATE INDEX IF NOT EXISTS owner_history ON documents(collection,owner,created DESC,id DESC);",
    );
  }
  private readRaw(collection: Collection, id: string): Document | null {
    const row = this.db
      .prepare("SELECT payload FROM documents WHERE collection=? AND id=?")
      .get(collection, id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as Document) : null;
  }
  async read(collection: Collection, id: string): Promise<Document | null> {
    await this.queue;
    return this.readRaw(collection, id);
  }
  async transaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    const prior = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    try {
      this.db.exec("BEGIN IMMEDIATE");
      const tx: Transaction = {
        get: async (collection, id) => this.readRaw(collection, id),
        put: (collection, id, value) => {
          this.db
            .prepare(
              "INSERT INTO documents(collection,id,owner,created,payload) VALUES(?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET owner=excluded.owner,created=excluded.created,payload=excluded.payload",
            )
            .run(
              collection,
              id,
              typeof value.ownerId === "string" ? value.ownerId : null,
              typeof value.createdAt === "string" ? value.createdAt : null,
              JSON.stringify(value),
            );
        },
        remove: (collection, id) => {
          this.db
            .prepare("DELETE FROM documents WHERE collection=? AND id=?")
            .run(collection, id);
        },
      };
      const result = await operation(tx);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
  }
  async listPlans(
    ownerId: string,
    limit: number,
    cursor?: PageCursor,
  ): Promise<Document[]> {
    // Wait until any transaction on this connection has completed before a public read.
    await this.queue;
    const rows = cursor
      ? this.db
          .prepare(
            "SELECT payload FROM documents WHERE collection='plans' AND owner=? AND (created<? OR (created=? AND id<?)) ORDER BY created DESC,id DESC LIMIT ?",
          )
          .all(ownerId, cursor.createdAt, cursor.createdAt, cursor.id, limit)
      : this.db
          .prepare(
            "SELECT payload FROM documents WHERE collection='plans' AND owner=? ORDER BY created DESC,id DESC LIMIT ?",
          )
          .all(ownerId, limit);
    return rows.map((row) => JSON.parse(row.payload as string) as Document);
  }
  async ping() {
    this.db.prepare("SELECT 1").get();
  }
  async close() {
    await this.queue;
    this.db.close();
  }
}
