import { Link } from "react-router-dom";
import { Compass } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Button } from "@/shared/ui/Button";

/** 404 — shown for unknown paths instead of silently bouncing to the homepage. */
export function NotFoundPage() {
  const { t, to } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <Compass weight="duotone" className="mx-auto mb-4 block size-14 text-blue-600" aria-hidden />
      <p className="t-overline mb-1 text-blue-700">{t("notfound.overline")}</p>
      <h1 className="mb-2 font-display text-3xl font-extrabold">{t("notfound.title")}</h1>
      <p className="mb-8 text-sm text-muted">{t("notfound.sub")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to={to("/")}><Button>{t("notfound.home")}</Button></Link>
        <Link to={to("/properties")}><Button variant="secondary">{t("notfound.browse")}</Button></Link>
      </div>
    </div>
  );
}
