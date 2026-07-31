import { useState } from "react";
import { DeviceMobile, QrCode } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { Input, Select } from "@/shared/ui/Field";
import { Seg } from "@/shared/ui/Seg";
import { LOCALES } from "@/shared/i18n/dictionaries";
import { useToast } from "@/shared/ui/Toast";

type MfaMethod = "app" | "sms";

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [mfa, setMfa] = useState(user?.mfaEnabled ?? false);
  const [mfaMethod, setMfaMethod] = useState<MfaMethod>(user?.mfaMethod ?? "app");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMethod, setEnrollMethod] = useState<MfaMethod>("app");
  const [enrollPhone, setEnrollPhone] = useState("");
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [confirmMfa, setConfirmMfa] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateUser({ name: String(fd.get("name")) });
    toast(t("profile.updated"));
  };

  /* Enrollment (§3.2.2): pick authenticator app or SMS OTP, then confirm
     with a 6-digit code. Real flow: POST /me/mfa/enroll → /me/mfa/confirm. */
  const confirmEnrollment = () => {
    if (enrollCode !== "123456") {
      setEnrollError(t("auth.wrongCode"));
      return;
    }
    setMfa(true);
    setMfaMethod(enrollMethod);
    setEnrolling(false);
    setEnrollCode("");
    setEnrollError(null);
    updateUser({ mfaEnabled: true, mfaMethod: enrollMethod });
    toast(t("profile.mfaOn", { method: enrollMethod === "app" ? t("profile.methodApp") : t("profile.methodSms") }), "info");
  };

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-display text-2xl font-extrabold">{t("account.profile")}</h1>

      <form onSubmit={save} className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-300 bg-white p-5">
        <Input name="name" label={t("profile.fullName")} defaultValue={user.name} required />
        <Input name="email" type="email" label={t("auth.email")} defaultValue={user.email} disabled hint={t("profile.emailHint")} />
        <Select name="locale" label={t("auth.prefLang")} defaultValue={user.locale}>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </Select>
        <Button type="submit" className="self-start">{t("common.saveChanges")}</Button>
      </form>

      <section className="mb-8 rounded-xl border border-slate-300 bg-white p-5">
        <h2 className="mb-1 font-display text-base font-bold">{t("profile.mfaTitle")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.mfaSub")}</p>

        {mfa && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              {mfaMethod === "app"
                ? <><QrCode className="size-4.5 shrink-0" aria-hidden /> {t("profile.enabledApp")}</>
                : <><DeviceMobile className="size-4.5 shrink-0" aria-hidden /> {t("profile.enabledSms")}</>}
            </p>
            <Button size="sm" variant="secondary" onClick={() => setConfirmMfa(true)}>{t("profile.disable")}</Button>
          </div>
        )}

        {!mfa && !enrolling && (
          <Button variant="secondary" onClick={() => { setEnrolling(true); setEnrollError(null); }}>
            {t("profile.mfaEnable")}
          </Button>
        )}

        {!mfa && enrolling && (
          <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-canvas p-4">
            <Seg
              ariaLabel={t("profile.method")}
              value={enrollMethod}
              onChange={setEnrollMethod}
              options={[
                { value: "app", label: t("profile.methodApp") },
                { value: "sms", label: t("profile.methodSms") },
              ]}
            />

            {enrollMethod === "app" ? (
              <div className="flex items-start gap-4">
                {/* QR placeholder — production renders the otpauth:// provisioning QR */}
                <span className="flex size-24 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                  <QrCode className="size-16 text-navy" aria-hidden />
                </span>
                <div className="text-sm">
                  <p className="mb-2 text-muted">{t("profile.appHint")}</p>
                  <p className="font-semibold">{t("profile.setupKey")}: <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">REVA LO24 DEMO KEY9</code></p>
                </div>
              </div>
            ) : (
              <Input
                label={t("form.phone")}
                type="tel"
                placeholder="+49 …"
                autoComplete="tel"
                value={enrollPhone}
                onChange={(e) => setEnrollPhone(e.target.value)}
                hint={t("profile.smsHint")}
              />
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <Input
                  label={t("profile.codeLabel")}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={enrollCode}
                  onChange={(e) => { setEnrollCode(e.target.value.replace(/\D/g, "")); setEnrollError(null); }}
                  error={enrollError ?? undefined}
                />
              </div>
              <Button onClick={confirmEnrollment} disabled={enrollCode.length !== 6 || (enrollMethod === "sms" && !enrollPhone.trim())}>
                {t("profile.confirm")}
              </Button>
              <Button variant="ghost" onClick={() => { setEnrolling(false); setEnrollCode(""); setEnrollError(null); }}>
                {t("common.cancel")}
              </Button>
            </div>
            <p className="text-xs text-muted">{t("auth.demoCode")}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-err-600/30 bg-white p-5">
        <h2 className="mb-1 font-display text-base font-bold text-err-700">{t("profile.danger")}</h2>
        <p className="mb-4 text-sm text-muted">{t("profile.dangerSub")}</p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>
          {t("profile.deleteCta")}
        </Button>
      </section>

      <ConfirmDialog
        open={confirmMfa}
        title={t("profile.mfaOffTitle")}
        body={t("profile.mfaOffBody")}
        confirmLabel={t("profile.mfaOffCta")}
        onConfirm={() => {
          setMfa(false);
          setConfirmMfa(false);
          updateUser({ mfaEnabled: false });
          toast(t("profile.mfaOff"), "info");
        }}
        onClose={() => setConfirmMfa(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("profile.deleteTitle")}
        body={t("profile.deleteBody")}
        confirmLabel={t("profile.deleteConfirm")}
        onConfirm={() => {
          setConfirmDelete(false);
          toast(t("profile.deleteDone"), "info");
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
