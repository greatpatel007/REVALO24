import { useState } from "react";
import { CheckCircle, FileText, IdentificationCard, Image as ImageIcon, UploadSimple } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useUnsavedGuard } from "@/shared/lib/useUnsavedGuard";
import { updateAgentProfile } from "@/features/agent/api";
import { COUNTRIES } from "@/shared/lib/constants";
import { Badge, StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Field";
import { Stepper } from "@/shared/ui/Stepper";
import { useToast } from "@/shared/ui/Toast";
import type { AgentProfile } from "@/shared/types";

/* Agent onboarding wizard (registration spec file 04 §2 + §5.2):
   Company → Licence & KYC (34c GewO) → Review. Listings stay private
   until the wizard is complete AND an admin approves via the
   "Verify Agent" master toggle. */

const DOCS = [
  { id: "license", required: true, icon: <IdentificationCard weight="duotone" className="size-7 text-blue-600" aria-hidden /> },
  { id: "register", required: false, icon: <FileText weight="duotone" className="size-7 text-blue-600" aria-hidden /> },
];

export function AgentProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const STEPS = [t("agent.prof.step1"), t("agent.prof.step2"), t("agent.prof.step3")];
  const agent = user as AgentProfile;
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    companyName: agent.companyName ?? "",
    contactPerson: agent.contactPerson ?? "",
    addressStreet: agent.addressStreet ?? "",
    addressPostalCode: agent.addressPostalCode ?? "",
    addressCity: agent.addressCity ?? "",
    addressCountry: agent.addressCountry ?? "",
    phone: agent.phone ?? "",
    vatId: agent.vatId ?? "",
    managingDirector: agent.managingDirector ?? "",
    regulatoryAuthority: agent.regulatoryAuthority ?? "",
    commercialRegisterNo: agent.commercialRegisterNo ?? "",
  });
  const [logo, setLogo] = useState<string | null>(agent.logoUrl ?? null);
  /* Mock upload state — real flow POSTs to /agent/verification/documents */
  const [uploaded, setUploaded] = useState<Record<string, string>>(
    agent.verificationState === "approved" ? { license: "broker-licence.pdf", register: "hr-extract.pdf" } : {},
  );

  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty && !busy);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const companyComplete = Boolean(
    form.companyName && form.contactPerson && form.addressStreet && form.addressPostalCode &&
    form.addressCity && form.addressCountry && form.phone && form.vatId,
  );
  const kycComplete = Boolean(form.managingDirector && form.regulatoryAuthority && form.commercialRegisterNo);
  /* Verification Gate (client spec): the Real Estate License upload is
     MANDATORY — the register extract stays optional supporting evidence. */
  const docsComplete = Boolean(uploaded.license);
  const canContinue = step === 0 ? companyComplete : step === 1 ? kycComplete && docsComplete : true;

  const mockUpload = (id: string, label: string) => {
    setUploaded((u) => ({ ...u, [id]: `${id}-document.pdf` }));
    toast(t("agent.prof.attached", { name: label }), "info");
  };

  const submit = () => {
    setBusy(true);
    /* Submitting the gate moves an unverified account to "pending" (under
       review); admins flip it to "approved" in the backend. */
    const nextState = agent.verificationState === "approved" ? "approved" : "pending";
    void updateAgentProfile({ ...form, logoUrl: logo ?? undefined, verificationState: nextState })
      .then((updated) => {
        updateUser(updated);
        setDirty(false);
        toast(t("agent.prof.submitted"));
      })
      .catch(() => toast(t("agent.prof.submitFail"), "error"))
      .finally(() => setBusy(false));
  };

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.profile")}</h1>
      <p className="mb-6 text-sm text-muted">{t("agent.prof.sub")}</p>

      {/* Wizard fills the left column; status + developer form a right rail at xl */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:order-2">
      {/* Verification status indicator */}
      <section className="rounded-xl border border-slate-300 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold">{t("agent.prof.statusTitle")}</h2>
          <StatusBadge status={agent.verificationState} />
        </div>
        {agent.verificationState === "approved" && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle weight="fill" className="size-4.5 shrink-0" aria-hidden />
            {t("agent.prof.approvedMsg")}
          </p>
        )}
        {agent.verificationState === "pending" && (
          <p className="rounded-lg bg-info-50 px-4 py-2.5 text-sm font-semibold text-info-700">
            {t("agent.prof.pendingMsg")}
          </p>
        )}
        {agent.verificationState === "incomplete" && (
          <p className="rounded-lg bg-warn-50 px-4 py-2.5 text-sm font-semibold text-warn-700">
            {t("agent.prof.incompleteMsg")}
          </p>
        )}
        {agent.verificationState === "rejected" && (
          <p className="rounded-lg bg-err-50 px-4 py-2.5 text-sm font-semibold text-err-700">
            {t("agent.prof.rejectedMsg")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-5">
        <h2 className="mb-2 font-display text-base font-bold">{t("agent.prof.devTitle")}</h2>
        <p className="text-sm text-muted">
          {agent.isDeveloper
            ? <>{t("agent.prof.devOn")} <Badge tone="success">{t("agent.prof.devBadge")}</Badge> — {t("agent.prof.devOnBody")}</>
            : t("agent.prof.devOff")}
        </p>
      </section>
      </div>

      {/* ---- Onboarding wizard ---- */}
      <section className="min-w-0 rounded-xl border border-slate-300 bg-white p-5 xl:order-1">
        <Stepper steps={STEPS} current={step} />

        <div className="mt-6">
          {/* Step 1 · Company */}
          {step === 0 && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Input label={t("agent.prof.company")} required value={form.companyName} onChange={setField("companyName")} />
              <Input label={t("agent.prof.contact")} required value={form.contactPerson} onChange={setField("contactPerson")} />
              <Input label={t("agent.ed.street")} required value={form.addressStreet} onChange={setField("addressStreet")} autoComplete="street-address" />
              <div className="grid grid-cols-[130px_1fr] gap-3">
                <Input label={t("agent.ed.zip")} required value={form.addressPostalCode} onChange={setField("addressPostalCode")} autoComplete="postal-code" />
                <Input label={t("agent.ed.city")} required value={form.addressCity} onChange={setField("addressCity")} autoComplete="address-level2" />
              </div>
              <Select label={t("auth.country")} required value={form.addressCountry} onChange={setField("addressCountry")}
                hint={t("agent.prof.countryHint")}>
                <option value="">{t("agent.prof.selectPh")}</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Input label={t("form.phone")} type="tel" required value={form.phone} onChange={setField("phone")} placeholder="+49 …" autoComplete="tel" />

              {/* Company logo — optional */}
              <div className={`rounded-xl border border-dashed p-4 sm:col-span-2 ${logo ? "border-emerald-600/40 bg-emerald-50/50" : "border-slate-400 bg-canvas"}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <ImageIcon weight="duotone" className="size-7 text-blue-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{t("agent.prof.logo")} <span className="font-normal text-muted">{t("form.optionalTag")}</span></p>
                    <p className="text-xs text-muted">{t("agent.prof.logoHint")}</p>
                    {logo && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle weight="fill" className="size-3.5" aria-hidden /> {t("agent.prof.attached", { name: logo })}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { setLogo("company-logo.png"); toast(t("agent.prof.attached", { name: "company-logo.png" }), "info"); }}>
                    <UploadSimple className="size-4" aria-hidden /> {logo ? t("agent.prof.replace") : t("agent.prof.upload")}
                  </Button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input label={t("agent.prof.vat")} required value={form.vatId} onChange={setField("vatId")}
                  hint={agent.vatValidated ? undefined : t("agent.prof.vatHint")} />
                {agent.vatValidated && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle weight="fill" className="size-3.5" aria-hidden />
                    {t("agent.prof.vatOk")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2 · Licence & KYC (34c GewO) */}
          {step === 1 && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
              <Input label={t("agent.prof.md")} required value={form.managingDirector} onChange={setField("managingDirector")}
                hint={t("agent.prof.mdHint")} />
              <Input label={t("agent.prof.ra")} required value={form.regulatoryAuthority} onChange={setField("regulatoryAuthority")}
                hint={t("agent.prof.raHint")} />
              <Input label={t("agent.prof.crn")} required value={form.commercialRegisterNo} onChange={setField("commercialRegisterNo")}
                hint={t("agent.prof.crnHint")} />

              <p className="mt-1 text-sm font-bold sm:col-span-2">{t("agent.prof.docsTitle")} <span className="font-semibold text-muted">{t("agent.prof.docsReq")}</span></p>
              {DOCS.map((d) => {
                const file = uploaded[d.id];
                const label = t(`agent.prof.doc.${d.id}`);
                return (
                  <div key={d.id} className={`rounded-xl border border-dashed p-5 ${file ? "border-emerald-600/40 bg-emerald-50/50" : "border-slate-400 bg-canvas"}`}>
                    <div className="flex flex-wrap items-center gap-4">
                      {d.icon}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">
                          {label}{" "}
                          <span className={`font-semibold ${d.required ? "text-err-600" : "text-muted"}`}>
                            {d.required ? "*" : t("form.optionalTag")}
                          </span>
                        </p>
                        <p className="text-xs text-muted">{t(`agent.prof.doc.${d.id}Hint`)}</p>
                        {file && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle weight="fill" className="size-3.5" aria-hidden /> {t("agent.prof.attached", { name: file })}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant={file ? "secondary" : "primary"} onClick={() => mockUpload(d.id, label)}>
                        <UploadSimple className="size-4" aria-hidden /> {file ? t("agent.prof.replace") : t("agent.prof.upload")}
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted sm:col-span-2">{t("agent.prof.docNote")}</p>
            </div>
          )}

          {/* Step 3 · Review */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl bg-canvas p-5 sm:grid-cols-2">
                {[
                  [t("agent.prof.rvCompany"), form.companyName],
                  [t("agent.prof.contact"), form.contactPerson],
                  [t("agent.prof.rvAddress"), `${form.addressStreet}, ${form.addressPostalCode} ${form.addressCity}, ${form.addressCountry}`],
                  [t("form.phone"), form.phone],
                  [t("agent.prof.rvVat"), form.vatId || "—"],
                  [t("agent.prof.rvMd"), form.managingDirector],
                  [t("agent.prof.rvRa"), form.regulatoryAuthority],
                  [t("agent.prof.rvCr"), form.commercialRegisterNo],
                  [t("agent.prof.rvLogo"), logo ?? "—"],
                  [t("agent.prof.rvDocs"), Object.values(uploaded).join(", ") || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
                    <dd className="break-words font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-muted">{t("agent.prof.reviewNote")}</p>
            </div>
          )}
        </div>

        {/* Wizard controls */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("agent.prof.back")}</Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>{t("agent.prof.continue")}</Button>
          ) : (
            <Button loading={busy} onClick={submit}>{t("agent.prof.submit")}</Button>
          )}
        </div>
      </section>

      </div>
    </div>
  );
}
