export type Document = Record<string, unknown>;
export type Collection =
  "sessions" | "farms" | "assessments" | "plans" | "operations" | "quotas" | "demoCache";
export type PageCursor = { createdAt: string; id: string };
export interface Transaction {
  get(collection: Collection, id: string): Promise<Document | null>;
  put(collection: Collection, id: string, value: Document): void;
  remove(collection: Collection, id: string): void;
}
export interface Store {
  read(collection: Collection, id: string): Promise<Document | null>;
  transaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T>;
  listPlans(
    ownerId: string,
    limit: number,
    cursor?: PageCursor,
  ): Promise<Document[]>;
  ping(): Promise<void>;
  close(): Promise<void>;
}
