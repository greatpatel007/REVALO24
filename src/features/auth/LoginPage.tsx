import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppleLogo } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useAuth } from "@/features/auth/AuthContext";
import { DEMO_ACCOUNTS } from "@/features/auth/api";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Field";
import { useToast } from "@/shared/ui/Toast";

export function LoginPage() {
  const { t, to } = useI18n();
  const { login, socialLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Return path set by guards / the favorites & save-search gates —
     brings the user back to where they were (filters included). */
  const from = (location.state as { from?: string } | null)?.from;

  const doLogin = (em: string, pw: string) => {
    setBusy(true);
    setError(null);
    login(em, pw)
      .then((s) => {
        toast(t("auth.welcomeBack", { name: s.user.name.split(" ")[0] }));
        navigate(from ?? (s.user.role === "agent" ? to("/agent") : to("/account")));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const social = (provider: "google" | "apple") => {
    setBusy(true);
    socialLogin(provider)
      .then((s) => navigate(from ?? (s.user.role === "agent" ? to("/agent") : to("/account"))))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:px-6">
      <h1 className="mb-1 font-display text-2xl font-extrabold">{t("nav.login")}</h1>
      <p className="mb-7 text-sm text-muted">{t("auth.loginSub")}</p>

      <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password); }} className="flex flex-col gap-4">
        <Input label={t("auth.email")} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t("auth.password")} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button
          type="button"
          onClick={() => toast(t("auth.forgotDemo"), "info")}
          className="-mt-2 cursor-pointer self-end text-sm font-semibold text-blue-700 hover:underline"
        >
          {t("auth.forgot")}
        </button>
        {error && <p role="alert" className="text-sm font-semibold text-err-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy}>{t("nav.login")}</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase text-muted">
        <span className="h-px flex-1 bg-slate-300" /> {t("auth.or")} <span className="h-px flex-1 bg-slate-300" />
      </div>

      <div className="flex flex-col gap-2.5">
        <Button variant="secondary" onClick={() => social("google")} disabled={busy}>
          <GoogleIcon /> {t("auth.google")}
        </Button>
        <Button variant="secondary" onClick={() => social("apple")} disabled={busy}>
          <AppleLogo weight="fill" className="size-4.5" aria-hidden /> {t("auth.apple")}
        </Button>
      </div>

      <div className="mt-7 rounded-xl border border-info-600/30 bg-info-50 p-4 text-sm">
        <p className="mb-2 font-bold text-info-700">{t("auth.demoTitle")}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => doLogin(DEMO_ACCOUNTS.private.email, DEMO_ACCOUNTS.private.password)}>
            {t("auth.demoPrivate")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => doLogin(DEMO_ACCOUNTS.agent.email, DEMO_ACCOUNTS.agent.password)}>
            {t("auth.demoAgent")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => doLogin(DEMO_ACCOUNTS.agentStarter.email, DEMO_ACCOUNTS.agentStarter.password)}>
            {t("auth.demoAgentStarter")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => doLogin(DEMO_ACCOUNTS.agentNew.email, DEMO_ACCOUNTS.agentNew.password)}>
            {t("auth.demoAgentNew")}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.newHere")} <Link to={to("/register")} state={{ from }} className="font-semibold text-blue-700 hover:underline">{t("nav.register")}</Link>
      </p>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.2-7-5.1l-3.9 3C3.1 21.3 7.2 24 12 24z" />
      <path fill="#FBBC05" d="M5 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3l-3.9-3C.4 8.3 0 10.1 0 12s.4 3.7 1.1 5.3l3.9-3z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4L19 2.9C17 1.1 14.7 0 12 0 7.2 0 3.1 2.7 1.1 6.7l3.9 3c1-2.9 3.8-5 7-5z" />
    </svg>
  );
}
