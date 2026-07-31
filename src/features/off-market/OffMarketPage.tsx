import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getOffMarket, unlockOffMarket } from "@/features/property/api";
import { grantOffMarketAccess } from "@/features/off-market/useOffMarketAccess";
import { PropertyCard, LockIcon } from "@/features/property/PropertyCard";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";

export function OffMarketPage() {
  const { t, to } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { data } = useApi(getOffMarket);
  const [modal, setModal] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    void unlockOffMarket(code.trim())
      .then((r) => {
        if (r.ok && r.propertyId) {
          grantOffMarketAccess(r.propertyId); // detail page checks this grant
          toast(t("off.granted"));
          navigate(to(`/property/${r.propertyId}`));
        } else {
          setError(t("off.invalid"));
        }
      })
      .finally(() => setBusy(false));
  };

  return (
    <>
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-premium text-premium-accent"><LockIcon /></span>
          <p className="t-overline mb-2 text-champagne-100/80">{t("off.overline")}</p>
          <h1 className="mb-3 font-display text-3xl font-extrabold text-white sm:text-4xl">{t("off.title")}</h1>
          <p className="mx-auto mb-8 max-w-xl text-slate-400">{t("off.sub")}</p>
          {/* Full-width on mobile: the hotspot test showed the headline eating the
              first-view attention while the small CTA island stayed borderline cold */}
          <Button variant="premium" size="lg" className="w-full sm:w-auto" onClick={() => setModal(true)}>{t("off.cta")}</Button>
          {/* Collapsed so the exclusivity story isn't undercut for real visitors */}
          <details className="mx-auto mt-3 inline-block text-xs text-slate-400">
            <summary className="cursor-pointer select-none hover:text-slate-300">{t("off.demoSummary")}</summary>
            <p className="mt-1">{t("off.demoText")}</p>
          </details>
        </div>
      </section>

      <section className="mx-auto max-w-shell px-4 py-12 sm:px-6">
        <h2 className="mb-5 font-display text-xl font-extrabold">{t("off.current")}</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {/* Cards open the unlock dialog — linking back to this page would be a dead loop */}
          {(data ?? []).map((p) => <PropertyCard key={p.id} property={p} onOffMarketClick={() => setModal(true)} />)}
        </div>
        <div className="mt-10 grid gap-5 rounded-xl border border-slate-300 bg-white p-6 sm:grid-cols-3">
          {[
            [t("off.step1t"), t("off.step1b")],
            [t("off.step2t"), t("off.step2b")],
            [t("off.step3t"), t("off.step3b")],
          ].map(([t2, b]) => (
            <div key={t2}>
              <h3 className="mb-1 font-bold">{t2}</h3>
              <p className="text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <Modal open={modal} onClose={() => setModal(false)} title={t("off.modalTitle")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t("off.modalHint")}</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            aria-label={t("off.codeLabel")}
            placeholder="••••••"
            className="min-h-14 w-full rounded-xl border border-border-strong text-center font-display text-2xl font-extrabold tracking-[0.5em]"
          />
          {error && <p role="alert" className="text-sm font-semibold text-err-700">{error}</p>}
          <Button type="submit" size="lg" loading={busy} disabled={code.length !== 6}>{t("off.unlock")}</Button>
        </form>
      </Modal>
    </>
  );
}
