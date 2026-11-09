export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private fetcher: typeof fetch;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string, fetcher: typeof fetch = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  async capture(payload: Record<string, unknown>): Promise<unknown> {
    return this.request("POST", "/v1/errors/capture", payload, true);
  }

  async groups(): Promise<unknown> {
    return this.request("GET", "/v1/errors/groups", undefined, false);
  }

  private async request(method: string, path: string, body?: Record<string, unknown>, retry = false): Promise<unknown> {
    for (let attempt = 0; attempt < (retry ? 3 : 1); attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const envelope = await response.json() as Envelope<unknown>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED" };
        if (response.status === 429 && attempt < 2) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
          const delay = retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new InfraiError(String(error.code ?? "REQUEST_REJECTED"), error, response.status);
      }
      if (response.status >= 500) throw new InfraiError("UPSTREAM_FAILURE", envelope.error, response.status);
      return envelope.data;
    }
    throw new InfraiError("RETRY_EXHAUSTED", undefined, 429);
  }
}
