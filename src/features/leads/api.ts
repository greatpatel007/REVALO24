/* Lead capture (valuation + tour). Real endpoint: POST /leads */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import type { LeadRequest } from "@/shared/types";

let leads: LeadRequest[] = [];

export async function submitLead(
  input: Omit<LeadRequest, "id" | "createdAt" | "consent"> & { consent: boolean },
): Promise<LeadRequest> {
  if (!input.consent) throw new Error("Consent required");
  if (!USE_MOCKS) {
    return request<{ data: LeadRequest }>("/leads", { method: "POST", body: input }).then((r) => r.data);
  }
  await mockDelay(700);
  const lead: LeadRequest = {
    ...input,
    consent: true,
    id: Date.now(),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  leads = [lead, ...leads];
  return lead;
}

/** Demo / QA helper — not exposed in UI */
export async function getLeads(): Promise<LeadRequest[]> {
  if (!USE_MOCKS) return request<{ data: LeadRequest[] }>("/leads").then((r) => r.data);
  await mockDelay(150);
  return leads;
}
