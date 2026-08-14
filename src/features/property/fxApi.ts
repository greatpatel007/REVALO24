/* FX quotes for exposé purchase-cost local estimates.
   Real endpoint: GET /fx/daily?base=EUR&country=CZ */
import { USE_MOCKS, request, mockDelay } from "@/shared/api/http";
import { fxForCountry, type FxQuote } from "@/shared/lib/format";

export async function getFxQuote(countryCode: string): Promise<FxQuote | null> {
  if (!USE_MOCKS) {
    return request<{ data: FxQuote | null }>(`/fx/daily?base=EUR&country=${encodeURIComponent(countryCode)}`)
      .then((r) => r.data);
  }
  await mockDelay(180);
  return fxForCountry(countryCode);
}
