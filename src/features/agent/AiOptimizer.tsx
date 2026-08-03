import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkle } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { generateExpose, getAgentProperties, getSubscription } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { LOCALES } from "@/shared/i18n/dictionaries";
import { Button } from "@/shared/ui/Button";
import { Select, Textarea } from "@/shared/ui/Field";
import { Modal } from "@/shared/ui/Modal";
import { Tabs } from "@/shared/ui/Tabs";
import { useToast } from "@/shared/ui/Toast";
import type { ExposeResult, Locale } from "@/shared/types";

/* AI Exposé Optimizer (§3.4.3): one source language in → structured,
   conversion-optimized output in all 9 languages via Gemini 1.5 Flash. */
export function AiOptimizer() {
  const toast = useToast();
  const { t, to } = useI18n();
  const navigate = useNavigate();
  const sub = useApi(getSubscription);
  const properties = useApi(getAgentProperties);
  const [source, setSource] = useState<Locale>("de");
  const [raw, setRaw] = useState(
    "3 zi whg schwabing 86qm, balkon süd, 2022 renoviert, parkett, ubahn 4 min, 485000 eur, provisionsfrei",
  );
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ExposeResult[] | null>(null);
  const [activeLang, setActiveLang] = useState<Locale>("de");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickId, setPickId] = useState("");

  const { approved } = useAgentGate();

  const run = () => {
    setBusy(true);
    void generateExpose({ sourceLanguage: source, rawDescription: raw })
      .then((r) => {
        setResults(r);
        setActiveLang(source);
        toast(t("agent.ai.done"));
      })
      .catch(() => toast(t("agent.ai.genFail"), "error"))
      .finally(() => setBusy(false));
  };

  const active = results?.find((r) => r.language === activeLang);
  const creditsLeft = sub.data ? sub.data.aiCredits - sub.data.aiCreditsUsed : null;
  const outOfCredits = creditsLeft !== null && creditsLeft <= 0;
  const listings = properties.data ?? [];
  const exposeState = active
    ? { expose: { headline: active.headline, description: active.description } }
    : null;

  const applyNew = () => {
    if (!exposeState) return;
    navigate(to("/agent/listings/new"), { state: exposeState });
  };

  const openPick = () => {
    setPickId("");
    setPickOpen(true);
    if (!properties.data && !properties.loading) properties.reload();
  };

  const confirmPick = () => {
    if (!exposeState || !pickId) return;
    navigate(to(`/agent/listings/${pickId}/edit`), { state: exposeState });
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.ai")}</h1>
      <p className="mb-6 text-sm text-muted">
        {t("agent.ai.sub")}
        {creditsLeft !== null && <strong className="ml-1 text-navy">{t("agent.ai.credits", { n: creditsLeft })}</strong>}
      </p>

      {/* Verification Gate — AI credits are a publish tool */}
      <GateNotice className="mb-6" />

      {/* Tool layout: input | output side by side at xl, stacked below */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-slate-300 bg-white p-5">
        <div className="mb-4 sm:max-w-60">
          <Select label={t("agent.ai.source")} value={source} onChange={(e) => setSource(e.target.value as Locale)}>
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </Select>
        </div>
        <Textarea label={t("agent.ai.raw")} rows={7} value={raw} onChange={(e) => setRaw(e.target.value)}
          hint={t("agent.ai.rawHint")} />
        {/* whitespace-normal!: the localized label wraps instead of forcing 320px viewports to overflow */}
        <Button className="mt-4 max-w-full whitespace-normal!" size="lg" loading={busy} disabled={!raw.trim() || outOfCredits || !approved}
          title={!approved ? t("agent.gate.incomplete") : undefined} onClick={run}>
          <Sparkle weight="fill" className="size-4.5" aria-hidden /> {t("agent.ai.generate")}
        </Button>
        {outOfCredits && (
          <p className="mt-3 rounded-lg border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn-700">
            {t("agent.ai.outOfCredits")}{" "}
            <Link to={to("/agent/subscription")} className="underline">{t("agent.ai.upgrade")}</Link>
          </p>
        )}
      </div>

      {busy && (
        <div className="rounded-xl border border-slate-300 bg-white p-8 text-center xl:min-h-72 xl:content-center">
          <span aria-hidden className="mx-auto mb-3 block size-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-semibold text-muted">{t("agent.ai.generating")}</p>
        </div>
      )}

      {/* Desktop-only placeholder keeps the output column from collapsing before the first run */}
      {!results && !busy && (
        <div className="hidden rounded-xl border border-dashed border-slate-400 bg-canvas p-8 text-center xl:block xl:min-h-72 xl:content-center">
          <Sparkle weight="duotone" className="mx-auto mb-3 size-9 text-blue-600" aria-hidden />
          <p className="text-sm font-semibold text-muted">{t("agent.ai.placeholder")}</p>
        </div>
      )}

      {results && !busy && (
        <section className="min-w-0 rounded-xl border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-5 pt-4">
            <Tabs
              tabs={LOCALES.map((l) => ({ id: l.code, label: l.code.toUpperCase() }))}
              active={activeLang}
              onChange={setActiveLang}
            />
          </div>
          {active && (
            <div className="space-y-5 p-6">
              <div>
                <p className="t-overline mb-1 text-muted">{t("agent.ai.headline")}</p>
                <p className="font-display text-xl font-extrabold">{active.headline}</p>
              </div>
              <div>
                <p className="t-overline mb-1.5 text-muted">{t("agent.ai.features")}</p>
                <ul className="flex flex-wrap gap-2">
                  {active.keyFeatures.map((f) => (
                    <li key={f} className="rounded-lg bg-slate-200 px-3.5 py-1.5 text-sm font-semibold">{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="t-overline mb-1 text-muted">{t("detail.description")}</p>
                <p className="leading-relaxed text-slate-800">{active.description}</p>
              </div>
              <div>
                <p className="t-overline mb-1 text-muted">{t("agent.ai.cta")}</p>
                <p className="font-bold text-blue-700">{active.callToAction}</p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
                <Button onClick={applyNew}>{t("agent.ai.applyNew")}</Button>
                <Button variant="secondary" onClick={openPick}>{t("agent.ai.applyExisting")}</Button>
                <Button variant="secondary" onClick={() => {
                  void navigator.clipboard?.writeText(`${active.headline}\n\n${active.description}\n\n${active.callToAction}`);
                  toast(t("agent.ai.copied"), "info");
                }}>{t("agent.ai.copy")}</Button>
                <p className="ml-auto self-center text-xs text-muted">{t("agent.ai.review")}</p>
              </div>
            </div>
          )}
        </section>
      )}
      </div>

      <Modal open={pickOpen} onClose={() => setPickOpen(false)} title={t("agent.ai.pickListing")}>
        <div className="space-y-5">
          <p className="text-sm text-muted">{t("agent.ai.pickListingHint")}</p>
          {properties.loading && (
            <p className="text-sm font-semibold text-muted">{t("common.loading")}</p>
          )}
          {!properties.loading && listings.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-canvas px-4 py-5 text-center text-sm text-muted">
              {t("agent.ai.noListings")}{" "}
              <Link to={to("/agent/listings/new")} className="font-semibold text-blue-700 underline" onClick={() => setPickOpen(false)}>
                {t("agent.ai.applyNew")}
              </Link>
            </p>
          )}
          {!properties.loading && listings.length > 0 && (
            <Select
              label={t("agent.ai.pickListing")}
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
            >
              <option value="">—</option>
              {listings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.length > 64 ? `${p.title.slice(0, 61)}…` : p.title}
                </option>
              ))}
            </Select>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="ghost" onClick={() => setPickOpen(false)}>{t("common.cancel")}</Button>
            <Button disabled={!pickId} onClick={confirmPick}>{t("agent.ai.confirmApply")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
