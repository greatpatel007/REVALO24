import { useEffect, useRef, useState } from "react";
import { CheckCircle, FileText, IdentificationCard, Image as ImageIcon, PencilSimple, UploadSimple } from "@phosphor-icons/react";
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
import type { AgentProfile, AgentVerificationDoc } from "@/shared/types";

/* Agent profile (§3.4.3 / registration 04 §2 + §5.2):
   - Approved agents see a completed imprint + documents (not the empty wizard).
   - Incomplete / pending / rejected agents use the Company → Licence → Review wizard. */

const DOCS = [
  { id: "license" as const, required: true, icon: <IdentificationCard weight="duotone" className="size-7 text-blue-600" aria-hidden /> },
  { id: "register" as const, required: false, icon: <FileText weight="duotone" className="size-7 text-blue-600" aria-hidden /> },
];

const MOCK_DOC_PREVIEW =
  "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=70";
const MOCK_LOGO_PREVIEW =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=70";

type DocMap = Partial<Record<"license" | "register", AgentVerificationDoc>>;

function docsFromAgent(agent: AgentProfile): DocMap {
  return {
    license: agent.documents?.license,
    register: agent.documents?.register,
  };
}

function formFromAgent(agent: AgentProfile) {
  return {
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
  };
}

export function AgentProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const STEPS = [t("agent.prof.step1"), t("agent.prof.step2"), t("agent.prof.step3")];
  const agent = user as AgentProfile;
  const isApproved = agent.verificationState === "approved";

  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!isApproved);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => formFromAgent(agent));
  const [logo, setLogo] = useState<string | null>(agent.logoUrl ?? null);
  const [uploaded, setUploaded] = useState<DocMap>(() => docsFromAgent(agent));
  const [dirty, setDirty] = useState(false);
  const wasApproved = useRef(isApproved);
  useUnsavedGuard(dirty && !busy);

  useEffect(() => {
    if (dirty) return;
    setForm(formFromAgent(agent));
    setLogo(agent.logoUrl ?? null);
    setUploaded(docsFromAgent(agent));
  }, [agent, dirty]);

  /* Stale session often starts incomplete then hydrates to approved — leave the wizard. */
  useEffect(() => {
    if (isApproved && !wasApproved.current) setEditing(false);
    wasApproved.current = isApproved;
  }, [isApproved]);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const companyComplete = Boolean(
    form.companyName && form.contactPerson && form.addressStreet && form.addressPostalCode &&
    form.addressCity && form.addressCountry && form.phone && form.vatId,
  );
  const kycComplete = Boolean(form.managingDirector && form.regulatoryAuthority && form.commercialRegisterNo);
  const docsComplete = Boolean(uploaded.license);
  const canContinue = step === 0 ? companyComplete : step === 1 ? kycComplete && docsComplete : true;

  const mockUpload = (id: "license" | "register", label: string) => {
    const name = id === "license" ? "broker-licence.pdf" : "hr-extract.pdf";
    setDirty(true);
    setUploaded((u) => ({ ...u, [id]: { name, url: MOCK_DOC_PREVIEW } }));
    toast(t("agent.prof.attached", { name: label }), "info");
  };

  const cancelEdit = () => {
    setForm(formFromAgent(agent));
    setLogo(agent.logoUrl ?? null);
    setUploaded(docsFromAgent(agent));
    setDirty(false);
    setStep(0);
    setEditing(false);
  };

  const submit = () => {
    setBusy(true);
    const nextState = isApproved ? "approved" : "pending";
    void updateAgentProfile({
      ...form,
      logoUrl: logo ?? undefined,
      documents: {
        license: uploaded.license,
        register: uploaded.register,
      },
      verificationState: nextState,
    })
      .then((updated) => {
        updateUser(updated);
        setDirty(false);
        setEditing(false);
        toast(isApproved ? t("agent.prof.saved") : t("agent.prof.submitted"));
      })
      .catch(() => toast(t("agent.prof.submitFail"), "error"))
      .finally(() => setBusy(false));
  };

  const statusRail = (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:order-2">
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
  );

  /* ---- Approved: completed profile (not the onboarding wizard) ---- */
  if (isApproved && !editing) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.profile")}</h1>
            <p className="text-sm text-muted">{t("agent.prof.completedSub")}</p>
          </div>
          <Button onClick={() => { setEditing(true); setStep(0); }}>
            <PencilSimple className="size-4" aria-hidden /> {t("agent.prof.editProfile")}
          </Button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {statusRail}

          <div className="min-w-0 space-y-6 xl:order-1">
            <section className="rounded-xl border border-slate-300 bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center gap-4">
                {logo ? (
                  <img src={logo} alt="" className="size-20 rounded-xl object-cover outline outline-1 outline-black/10" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-xl bg-canvas text-muted">
                    <ImageIcon weight="duotone" className="size-8" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold">{form.companyName}</h2>
                  <p className="text-sm text-muted">{form.contactPerson}</p>
                  <p className="mt-1 text-sm font-semibold tabular">{form.phone}</p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
                {[
                  [t("agent.prof.rvAddress"), `${form.addressStreet}, ${form.addressPostalCode} ${form.addressCity}, ${form.addressCountry}`],
                  [t("agent.prof.rvVat"), form.vatId || "—"],
                  [t("agent.prof.rvMd"), form.managingDirector],
                  [t("agent.prof.rvRa"), form.regulatoryAuthority],
                  [t("agent.prof.rvCr"), form.commercialRegisterNo],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
                    <dd className="mt-0.5 break-words font-semibold">{v}</dd>
                  </div>
                ))}
                {agent.vatValidated && (
                  <div className="sm:col-span-2">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <CheckCircle weight="fill" className="size-4" aria-hidden />
                      {t("agent.prof.vatOk")}
                    </p>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-300 bg-white p-5">
              <h2 className="mb-4 font-display text-base font-bold">{t("agent.prof.docsTitle")}</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DOCS.map((d) => {
                  const file = uploaded[d.id];
                  const label = t(`agent.prof.doc.${d.id}`);
                  return (
                    <div key={d.id} className="rounded-xl border border-slate-300 bg-canvas/50 p-4">
                      {file ? (
                        <figure>
                          <img
                            src={file.url}
                            alt=""
                            className="mb-3 h-40 w-full rounded-lg object-cover outline outline-1 outline-black/10"
                          />
                          <figcaption className="text-sm font-semibold">{label}</figcaption>
                          <p className="truncate text-xs text-muted">{file.name}</p>
                        </figure>
                      ) : (
                        <p className="text-sm text-muted">{label}: —</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted">{t("agent.prof.docNote")}</p>
            </section>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Incomplete / editing: wizard or edit form ---- */
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("agent.nav.profile")}</h1>
      <p className="mb-6 text-sm text-muted">{isApproved ? t("agent.prof.editSub") : t("agent.prof.sub")}</p>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {statusRail}

        <section className="min-w-0 rounded-xl border border-slate-300 bg-white p-5 xl:order-1">
          {!isApproved && <Stepper steps={STEPS} current={step} />}
          {isApproved && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold">{t("agent.prof.editProfile")}</h2>
              <div className="flex gap-1">
                {STEPS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setStep(i)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      step === i ? "bg-blue-50 text-blue-700" : "text-muted hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={isApproved ? "mt-4" : "mt-6"}>
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

                <div className={`rounded-xl border border-dashed p-4 sm:col-span-2 ${logo ? "border-emerald-600/40 bg-emerald-50/50" : "border-slate-400 bg-canvas"}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    {logo ? (
                      <img src={logo} alt="" className="size-16 shrink-0 rounded-lg object-cover outline outline-1 outline-black/10" />
                    ) : (
                      <ImageIcon weight="duotone" className="size-7 text-blue-600" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{t("agent.prof.logo")} <span className="font-normal text-muted">{t("form.optionalTag")}</span></p>
                      <p className="text-xs text-muted">{t("agent.prof.logoHint")}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setDirty(true);
                      setLogo(MOCK_LOGO_PREVIEW);
                      toast(t("agent.prof.attached", { name: t("agent.prof.logo") }), "info");
                    }}>
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
                    <div key={d.id} className={`rounded-xl border border-dashed p-5 sm:col-span-2 ${file ? "border-emerald-600/40 bg-emerald-50/50" : "border-slate-400 bg-canvas"}`}>
                      <div className="flex flex-wrap items-start gap-4">
                        {file ? (
                          <img src={file.url} alt="" className="h-24 w-20 shrink-0 rounded-lg object-cover outline outline-1 outline-black/10" />
                        ) : d.icon}
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
                              <CheckCircle weight="fill" className="size-3.5" aria-hidden /> {t("agent.prof.attached", { name: file.name })}
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
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</dt>
                      <dd className="break-words font-semibold">{v}</dd>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t("agent.prof.rvLogo")}</dt>
                    <dd className="mt-1.5">
                      {logo ? (
                        <img src={logo} alt="" className="size-16 rounded-lg object-cover outline outline-1 outline-black/10" />
                      ) : "—"}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{t("agent.prof.rvDocs")}</dt>
                    <dd className="flex flex-wrap gap-3">
                      {uploaded.license || uploaded.register ? (
                        <>
                          {uploaded.license && (
                            <figure className="w-24">
                              <img src={uploaded.license.url} alt="" className="h-28 w-full rounded-lg object-cover outline outline-1 outline-black/10" />
                              <figcaption className="mt-1 truncate text-[11px] font-semibold text-muted">{uploaded.license.name}</figcaption>
                            </figure>
                          )}
                          {uploaded.register && (
                            <figure className="w-24">
                              <img src={uploaded.register.url} alt="" className="h-28 w-full rounded-lg object-cover outline outline-1 outline-black/10" />
                              <figcaption className="mt-1 truncate text-[11px] font-semibold text-muted">{uploaded.register.name}</figcaption>
                            </figure>
                          )}
                        </>
                      ) : "—"}
                    </dd>
                  </div>
                </dl>
                {!isApproved && <p className="text-sm text-muted">{t("agent.prof.reviewNote")}</p>}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
            {isApproved ? (
              <>
                <Button variant="ghost" onClick={cancelEdit}>{t("common.cancel")}</Button>
                <div className="flex flex-wrap gap-2">
                  {step > 0 && (
                    <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>{t("agent.prof.back")}</Button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>{t("agent.prof.continue")}</Button>
                  ) : (
                    <Button loading={busy} disabled={!companyComplete || !kycComplete || !docsComplete} onClick={submit}>
                      {t("agent.prof.saveChanges")}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>{t("agent.prof.back")}</Button>
                {step < STEPS.length - 1 ? (
                  <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>{t("agent.prof.continue")}</Button>
                ) : (
                  <Button loading={busy} onClick={submit}>{t("agent.prof.submit")}</Button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
