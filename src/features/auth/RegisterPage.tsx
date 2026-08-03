import { useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AppleLogo, EnvelopeSimpleOpen, LinkSimple } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { register, sessionAfterVerification, verifyOtp } from "@/features/auth/api";
import { GoogleIcon } from "@/features/auth/LoginPage";
import { getPlans } from "@/features/agent/api";
import { useApi } from "@/shared/lib/useApi";
import { LOCALES } from "@/shared/i18n/dictionaries";
import { COUNTRIES, DIAL_CODES, SALUTATIONS } from "@/shared/lib/constants";
import { Button } from "@/shared/ui/Button";
import { Input, Select, Consent } from "@/shared/ui/Field";
import { Seg } from "@/shared/ui/Seg";
import { useToast } from "@/shared/ui/Toast";
import type { Locale, RegisterPayload } from "@/shared/types";

type Step = "form" | "verify";

/* Password policy: exact rule TBC with client (spec file 04 §4.5) —
   until then: min 8 chars, meter scores length + character classes. */
function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

const STRENGTH: { labelKey: string; bar: string; text: string }[] = [
  { labelKey: "pw.tooShort", bar: "bg-slate-400", text: "text-muted" },
  { labelKey: "pw.weak", bar: "bg-err-600", text: "text-err-700" },
  { labelKey: "pw.fair", bar: "bg-warn-600", text: "text-warn-700" },
  { labelKey: "pw.good", bar: "bg-blue-500", text: "text-blue-700" },
  { labelKey: "pw.strong", bar: "bg-emerald-600", text: "text-emerald-700" },
];

function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();
  const score = passwordScore(password);
  const s = STRENGTH[score];
  return (
    <div aria-live="polite">
      <div className="mb-1 flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? s.bar : "bg-slate-300"}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold ${s.text}`}>{password ? t(s.labelKey) : t("pw.min")}</p>
    </div>
  );
}

export function RegisterPage() {
  const { t, to, locale } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { adoptSession, socialLogin } = useAuth();

  /* Return path (set by the favorites / save-search gates via login) and the
     plan chosen on the agents landing page — both survive registration. */
  const from = (location.state as { from?: string } | null)?.from;
  const planParam = Number(params.get("plan")) || null;
  const { data: plans } = useApi(getPlans);
  const chosenPlan = planParam ? plans?.find((p) => p.id === planParam) : undefined;

  const [role, setRole] = useState<"private" | "agent">(params.get("role") === "agent" ? "agent" : "private");
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = consentTerms && consentPrivacy && password.length >= 8 && confirm === password;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    /* Agents register with email + password ONLY (client Verification Gate
       step 1) — name, company, address and licence follow in the gate. */
    const payload: RegisterPayload = {
      role,
      salutation: (String(fd.get("salutation") ?? "") || undefined) as RegisterPayload["salutation"],
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      email: String(fd.get("email") ?? ""),
      password,
      locale: (String(fd.get("locale") ?? "") || locale) as Locale,
      country: role === "private" ? String(fd.get("country") || "") || undefined : undefined,
      /* Split input (code select + national number) stores as one E.164-ish string */
      phone:
        role === "private" && String(fd.get("phone") || "").trim()
          ? `${String(fd.get("phoneCode"))} ${String(fd.get("phone")).trim()}`
          : undefined,
      consentTerms,
      consentPrivacy,
      companyName: undefined,
    };
    void register(payload)
      .then(() => setStep("verify"))
      .catch(() => toast(t("auth.registerFail"), "error"))
      .finally(() => setBusy(false));
  };

  const setDigit = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    setOtp((prev) => prev.map((d, j) => (j === i ? digit : d)));
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  /* Successful DOI starts the session immediately (no second login) and routes
     to the next meaningful step: agents → verification wizard (or the chosen
     plan), private users → back where they came from, else the dashboard. */
  const finishVerification = () =>
    sessionAfterVerification(role).then((s) => {
      adoptSession(s);
      toast(t("auth.verified"));
      if (role === "agent") {
        navigate(planParam ? to(`/agent/subscription?plan=${planParam}`) : to("/agent/profile"));
      } else {
        navigate(from ?? to("/account"));
      }
    });

  const onVerify = () => {
    setBusy(true);
    setOtpError(null);
    void verifyOtp(otp.join(""))
      .then((r) => {
        if (!r.ok) {
          setOtpError(t("auth.wrongCode"));
          return;
        }
        return finishVerification();
      })
      .finally(() => setBusy(false));
  };

  /* Second DOI method (§3.2.2): the confirmation email also carries a one-click
     activation link — this simulates the user opening it. Admin-configurable. */
  const onVerifyLink = () => {
    setBusy(true);
    setOtpError(null);
    void finishVerification().finally(() => setBusy(false));
  };

  const social = (provider: "google" | "apple") => {
    setBusy(true);
    socialLogin(provider)
      .then(() => navigate(from ?? to("/account")))
      .finally(() => setBusy(false));
  };

  if (step === "verify") {
    return (
      <div className="mx-auto max-w-md px-4 py-14 text-center sm:px-6">
        <EnvelopeSimpleOpen weight="duotone" className="mx-auto mb-4 block size-12 text-blue-600" aria-hidden />
        <h1 className="mb-2 font-display text-2xl font-extrabold">{t("auth.confirmEmail")}</h1>
        <p className="mb-8 text-sm text-muted">
          {t("auth.confirmSub")}
          <br /><span className="font-semibold text-info-700">{t("auth.demoCode")}</span>
        </p>
        <div className="mb-4 flex justify-center gap-2">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) otpRefs.current[i - 1]?.focus(); }}
              inputMode="numeric"
              aria-label={t("auth.digit", { n: i + 1 })}
              className="size-12 rounded-xl border border-border-strong text-center font-display text-xl font-extrabold sm:size-14"
            />
          ))}
        </div>
        {otpError && <p role="alert" className="mb-4 text-sm font-semibold text-err-700">{otpError}</p>}
        <Button size="lg" className="w-full" loading={busy} disabled={otp.some((d) => !d)} onClick={onVerify}>
          {t("auth.verify")}
        </Button>

        {/* Second supported DOI method (§3.2.2): email activation link */}
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-muted">
          <span className="h-px flex-1 bg-slate-300" /> {t("auth.or")} <span className="h-px flex-1 bg-slate-300" />
        </div>
        <Button variant="secondary" className="w-full" disabled={busy} onClick={onVerifyLink}>
          <LinkSimple className="size-4.5" aria-hidden /> {t("auth.openLink")}
        </Button>
        <p className="mt-2 text-xs text-muted">{t("auth.linkNote")}</p>

        <button type="button" className="mt-4 cursor-pointer text-sm font-semibold text-blue-700 hover:underline" onClick={() => toast(t("auth.resent"), "info")}>
          {t("auth.resend")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("nav.register")}</h1>
      <p className="mb-5 text-sm text-muted">{t("auth.registerSub")}</p>

      <div className="mb-5 sm:max-w-xs">
        <Seg
          ariaLabel={t("auth.accountType")}
          options={[{ value: "private", label: t("auth.private") }, { value: "agent", label: t("auth.agent") }]}
          value={role}
          onChange={setRole}
        />
      </div>

      {role === "agent" && chosenPlan && (
        <p className="mb-5 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
          {t("auth.planSelected", { plan: chosenPlan.name })}
        </p>
      )}

      {/* Social sign-up mirrors login — lowest-friction path first (B2C only;
          agents need company data, so they register with email below) */}
      {role === "private" && (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => social("google")} disabled={busy}>
              <GoogleIcon /> {t("auth.google")}
            </Button>
            <Button variant="secondary" onClick={() => social("apple")} disabled={busy}>
              <AppleLogo weight="fill" className="size-4.5" aria-hidden /> {t("auth.apple")}
            </Button>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-muted">
            <span className="h-px flex-1 bg-slate-300" /> {t("auth.orEmail")} <span className="h-px flex-1 bg-slate-300" />
          </div>
        </>
      )}

      {/* Verification Gate step 1 (client spec): agents sign up with email +
          password only — everything else is collected in the gate */}
      {role === "agent" && (
        <p className="mb-5 rounded-lg bg-canvas px-4 py-2.5 text-sm text-slate-800">
          {t("auth.agentSlimNote")}
        </p>
      )}

      {/* Two-column field grid on sm+ keeps the form above the fold; single column on mobile */}
      <form onSubmit={onSubmit} className="grid items-start gap-4 sm:grid-cols-2">
        {role === "private" && (
          <>
            {/* Name block — DACH convention: optional Anrede + split first/last (spec file 04) */}
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <Select name="salutation" label={t("auth.salutation")} autoComplete="honorific-prefix">
                {SALUTATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
              <Input name="firstName" label={t("auth.firstName")} required autoComplete="given-name" />
            </div>
            <Input name="lastName" label={t("auth.lastName")} required autoComplete="family-name" />
          </>
        )}
        <Input name="email" type="email" label={t("auth.email")} required autoComplete="email" hint={t("auth.emailHint")} />
        {role === "private" && (
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <Select name="phoneCode" label={t("auth.dialCode")} autoComplete="tel-country-code" defaultValue="+49">
              {DIAL_CODES.map((d) => <option key={d.iso} value={d.code}>{d.iso} {d.code}</option>)}
            </Select>
            <Input name="phone" type="tel" label={t("form.phone")} autoComplete="tel-national" placeholder="151 2345678"
              hint={t("auth.phoneHint")} />
          </div>
        )}

        <div>
          <Input name="password" type="password" label={t("auth.password")} required minLength={8} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="mt-1.5"><PasswordStrength password={password} /></div>
        </div>
        <Input name="passwordConfirm" type="password" label={t("auth.confirmPassword")} required autoComplete="new-password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? t("auth.mismatch") : undefined} />

        {role === "private" && (
        <Select name="locale" label={t("auth.prefLang")} defaultValue={locale} hint={t("auth.prefLangHint")}>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </Select>
        )}

        {role === "private" && (
          <Select name="country" label={t("auth.country")} hint={t("auth.countryHint")}>
            <option value="">—</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        )}

        {/* Mandatory, never pre-selected (§5.1) — submit stays disabled until both are checked */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-4 sm:col-span-2">
          <Consent checked={consentTerms} onChange={setConsentTerms}>
            {t("auth.termsPre")} <Link to={to("/legal/terms")} className="font-semibold text-blue-700 underline">{t("auth.termsDoc")}</Link>{t("auth.termsPost")} <span className="text-err-600">*</span>
          </Consent>
          <Consent checked={consentPrivacy} onChange={setConsentPrivacy}>
            {t("auth.privacyPre")} <Link to={to("/legal/privacy")} className="font-semibold text-blue-700 underline">{t("auth.privacyDoc")}</Link> {t("auth.privacyPost")} <span className="text-err-600">*</span>
          </Consent>
          <p className="text-xs text-muted">{t("auth.consentLog")}</p>
        </div>

        <Button type="submit" size="lg" loading={busy} disabled={!canSubmit} className="sm:col-span-2">{t("auth.createAccount")}</Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {t("auth.already")} <Link to={to("/login")} className="font-semibold text-blue-700 hover:underline">{t("nav.login")}</Link>
      </p>
    </div>
  );
}
