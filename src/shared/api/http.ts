/* ============================================================
   HTTP core — the single integration point for the Laravel API.

   Backend integration:
   1. Set VITE_API_BASE_URL to the Laravel API v1 base URL.
   2. Set VITE_USE_MOCKS=false.
   Every service in src/services/* routes through request() when
   mocks are off; the mock branch never ships network calls.
   Auth uses a Sanctum bearer token stored by setToken().
   ============================================================ */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const USE_MOCKS: boolean =
  (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

const TOKEN_KEY = "r24.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session-only auth */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/** Real network request — used when VITE_USE_MOCKS=false. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE_URL + path);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const token = getToken();
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiError(res.status, payload.message ?? res.statusText, payload.errors);
  }
  return (await res.json()) as T;
}

/** Simulated latency for mock services so loading states are exercised. */
export function mockDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 250));
}
