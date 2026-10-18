import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  GoogleAuth,
  OAuth2Client,
  type AnyAuthClient,
} from "google-auth-library";
import type { Config } from "../config.js";

const run = promisify(execFile);
export class GoogleCredentials {
  private auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  private cached?: { client: AnyAuthClient; until: number };
  constructor(private config: Config) {}
  async client(): Promise<AnyAuthClient> {
    if (!this.config.localGcloudAuth) return this.auth.getClient();
    // Explicit local-only mode; config rejects this in production. No key/token file.
    if (this.cached && Date.now() < this.cached.until)
      return this.cached.client;
    const { stdout } = await run("gcloud", ["auth", "print-access-token"], {
      timeout: 10000,
      maxBuffer: 8192,
    });
    const client = new OAuth2Client();
    client.setCredentials({
      access_token: stdout.trim(),
      expiry_date: Date.now() + 3000000,
    });
    this.cached = { client, until: Date.now() + 2700000 };
    return client;
  }
  async request(
    url: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<unknown> {
    const token = await (await this.client()).getAccessToken();
    const response = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
        "x-goog-user-project": this.config.project!,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(`Google service returned ${response.status}`);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > 1800000) {
      await response.body?.cancel();
      throw new Error("Provider payload limit");
    }
    const reader = response.body!.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1800000) {
          await reader.cancel();
          throw new Error("Provider payload limit");
        }
        parts.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  }
}
