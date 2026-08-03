/* Auth services — Sanctum token flow.
   Real endpoints:
     POST /auth/register   (DOI mail/OTP dispatched by backend)
     POST /auth/verify     { method: "otp"|"link", code }
     POST /auth/login      → { token, user }
     POST /auth/social     { provider: "google"|"apple" }
     POST /auth/logout
     GET  /me                                                      */
import { USE_MOCKS, request, mockDelay, setToken } from "@/shared/api/http";
import { DEMO_AGENT_SOFIA, DEMO_AGENTS, DEMO_PRIVATE } from "@/shared/mock/db";
import type { AuthSession, RegisterPayload, User } from "@/shared/types";

export const DEMO_ACCOUNTS = {
  private: { email: "lena@example.eu", password: "demo1234" },
  agent: { email: "anna@kraemer-immo.de", password: "demo1234" },
  /* Variant agents — Starter over quota (CZ) and unverified fresh agent (PT) */
  agentStarter: { email: "petr@vltava-reality.cz", password: "demo1234" },
  agentNew: { email: "sofia@atlantico-imo.pt", password: "demo1234" },
};

export async function login(email: string, password: string): Promise<AuthSession> {
  if (!USE_MOCKS) {
    const s = await request<AuthSession>("/auth/login", { method: "POST", body: { email, password } });
    setToken(s.token);
    return s;
  }
  await mockDelay(600);
  if (password !== "demo1234") throw Object.assign(new Error("Invalid credentials"), { status: 422 });
  const user =
    DEMO_AGENTS.find((a) => a.email === email) ?? (email === DEMO_PRIVATE.email ? DEMO_PRIVATE : null);
  if (!user) throw Object.assign(new Error("Account not found — use a demo account"), { status: 404 });
  const session = { token: `mock-sanctum-${user.id}`, user };
  setToken(session.token);
  return session;
}

/** GDPR flow: both consents must be explicitly true; backend logs timestamp + IP (§5.1). */
export async function register(payload: RegisterPayload): Promise<{ requiresVerification: true; method: "otp" }> {
  if (!USE_MOCKS) return request("/auth/register", { method: "POST", body: payload });
  await mockDelay(700);
  if (!payload.consentTerms || !payload.consentPrivacy) {
    throw Object.assign(new Error("Consent checkboxes are mandatory"), { status: 422 });
  }
  return { requiresVerification: true, method: "otp" };
}

/** DOI verification — demo OTP is 123456. */
export async function verifyOtp(code: string): Promise<{ ok: boolean }> {
  if (!USE_MOCKS) return request("/auth/verify", { method: "POST", body: { method: "otp", code } });
  await mockDelay(600);
  return { ok: code === "123456" };
}

/** Real backend: POST /auth/verify responds with { token, user } so the session
    starts right after double opt-in — no second login. A freshly registered
    agent lands UNVERIFIED (verificationState "incomplete") and must pass the
    Verification Gate before publishing — the mock mirrors that with Sofia. */
export async function sessionAfterVerification(role: "private" | "agent"): Promise<AuthSession> {
  if (!USE_MOCKS) return request<{ data: User }>("/me").then((r) => ({ token: "", user: r.data }));
  await mockDelay(300);
  const user = role === "agent" ? DEMO_AGENT_SOFIA : DEMO_PRIVATE;
  const session = { token: `mock-sanctum-${user.id}`, user };
  setToken(session.token);
  return session;
}

export async function socialLogin(provider: "google" | "apple"): Promise<AuthSession> {
  if (!USE_MOCKS) return request<AuthSession>("/auth/social", { method: "POST", body: { provider } });
  await mockDelay(800);
  const session = { token: "mock-sanctum-social", user: DEMO_PRIVATE };
  setToken(session.token);
  return session;
}

export async function logout(): Promise<void> {
  if (!USE_MOCKS) await request("/auth/logout", { method: "POST" });
  setToken(null);
}

export async function me(): Promise<User | null> {
  if (!USE_MOCKS) return request<{ data: User }>("/me").then((r) => r.data);
  return null; // mock sessions restore from AuthContext storage instead
}
