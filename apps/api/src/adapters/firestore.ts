import { Firestore, FieldPath, Timestamp } from "@google-cloud/firestore";
import type {
  Collection,
  Document,
  PageCursor,
  Store,
  Transaction,
} from "../ports/store.js";

export class FirestoreStore implements Store {
  private db: Firestore;
  constructor(projectId: string, databaseId: string) {
    this.db = new Firestore({ projectId, databaseId });
  }
  private decode(value: Document): Document {
    return value.expiresAt instanceof Timestamp
      ? { ...value, expiresAt: value.expiresAt.toDate().toISOString() }
      : value;
  }
  async read(collection: Collection, id: string): Promise<Document | null> {
    const snap = await this.db.collection(collection).doc(id).get();
    return snap.exists ? this.decode(snap.data() as Document) : null;
  }
  async transaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async (native) =>
      operation({
        get: async (collection, id) => {
          const snap = await native.get(this.db.collection(collection).doc(id));
          return snap.exists ? this.decode(snap.data() as Document) : null;
        },
        put: (collection, id, value) => {
          native.set(
            this.db.collection(collection).doc(id),
            typeof value.expiresAt === "string"
              ? {
                  ...value,
                  expiresAt: Timestamp.fromDate(new Date(value.expiresAt)),
                }
              : value,
          );
        },
        remove: (collection, id) => {
          native.delete(this.db.collection(collection).doc(id));
        },
      }),
    );
  }
  async listPlans(
    ownerId: string,
    limit: number,
    cursor?: PageCursor,
  ): Promise<Document[]> {
    let query = this.db
      .collection("plans")
      .where("ownerId", "==", ownerId)
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(limit);
    if (cursor) query = query.startAfter(cursor.createdAt, cursor.id);
    const snap = await query.get();
    return snap.docs.map((doc) => doc.data());
  }
  async ping() {
    await this.db.collection("sessions").limit(1).get();
  }
  async close() {
    await this.db.terminate();
  }
}
