import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getCmsContent, sendContactMessage } from "@/features/cms/api";
import { fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/Button";
import { Input, Textarea, Consent } from "@/shared/ui/Field";
import { Skeleton } from "@/shared/ui/Skeleton";
import { useToast } from "@/shared/ui/Toast";
import type { CmsPage } from "@/shared/types";

const LEGAL_PAGES: CmsPage[] = ["imprint", "terms", "privacy", "cookies"];

function CmsRenderer({ page }: { page: CmsPage }) {
  const { t, locale } = useI18n();
  const { data, loading } = useApi(() => getCmsContent(page, locale), [page, locale]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  /* max-w-2xl caps legal prose near the 60–75ch comfort range at 16px */
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* 2xl on mobile + hyphens: "Datenschutzerklärung" alone overflows 320px at 3xl */}
      <h1 className="mb-2 hyphens-auto font-display text-2xl font-extrabold sm:text-3xl">{data.title}</h1>
      <p className="mb-6 text-sm text-muted">{t("cms.updated", { date: fmtDate(data.updatedAt, locale) })}</p>
      {data.localeFallback && (
        <p className="mb-6 rounded-lg border border-info-600/30 bg-info-50 px-4 py-3 text-sm font-semibold text-info-700">
          {t("cms.fallbackNote")}
        </p>
      )}
      <div className="space-y-6">
        {data.blocks.map((b, i) => (
          <section key={i}>
            {b.heading && <h2 className="mb-2 font-display text-xl font-bold">{b.heading}</h2>}
            {/* hyphens-auto: DE/NL/CS compounds wrap cleanly (html lang follows the locale);
                break-words catches unhyphenatable tokens — emails, URLs, register IDs */}
            <p className="break-words hyphens-auto leading-relaxed text-slate-800">{b.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

export function CmsStaticPage({ page }: { page: CmsPage }) {
  return <CmsRenderer page={page} />;
}

/* ---- Contact page = CMS content + general contact form (spec Screen 6) ---- */
export function ContactPage() {
  const { t, to } = useI18n();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    void sendContactMessage({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      message: String(fd.get("message")),
    })
      .then(() => setSent(true))
      .catch(() => toast(t("contact.fail"), "error"))
      .finally(() => setSending(false));
  };

  return (
    <>
      <CmsRenderer page="contact" />
      <section aria-label={t("contact.formTitle")} className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <div className="rounded-xl border border-slate-300 bg-white p-6">
          <h2 className="mb-1 font-display text-xl font-bold">{t("contact.formTitle")}</h2>
          <p className="mb-5 text-sm text-muted">{t("contact.formSub")}</p>
          {sent ? (
            <div role="status" className="flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-4">
              <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="text-sm">
                <p className="font-bold text-emerald-800">{t("contact.sent")}</p>
                <p className="mt-0.5 text-emerald-800/80">{t("contact.sentSub")}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Input name="name" label={t("form.name")} required autoComplete="name" />
                <Input name="email" type="email" label={t("form.email")} required autoComplete="email" />
              </div>
              <Textarea name="message" label={t("form.message")} required rows={5} />
              <Consent checked={consent} onChange={setConsent}>
                {t("form.consentPre")} <Link to={to("/legal/privacy")} className="font-semibold text-blue-700 underline">{t("form.privacy")}</Link>{t("form.consentPost")}
              </Consent>
              <Button type="submit" size="lg" loading={sending} disabled={!consent}>{t("contact.send")}</Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function LegalPage() {
  const { page } = useParams();
  const { to } = useI18n();
  if (!LEGAL_PAGES.includes(page as CmsPage)) return <Navigate to={to("/")} replace />;
  return <CmsRenderer page={page as CmsPage} />;
}
