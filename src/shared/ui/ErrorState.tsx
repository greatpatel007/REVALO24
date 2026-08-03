import { ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Inline load-failure state with retry — pair with useApi's error + reload. */
export function ErrorState({ message, onRetry, className = "" }: ErrorStateProps) {
  const { t } = useI18n();
  return (
    <div role="alert" className={`rounded-xl border border-err-600/25 bg-err-50 p-8 text-center ${className}`}>
      <WarningCircle weight="duotone" className="mx-auto mb-2 block size-9 text-err-700" aria-hidden />
      <p className="text-sm font-semibold text-err-700">{message ?? t("common.loadError")}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <ArrowsClockwise className="size-4" aria-hidden /> {t("common.tryAgain")}
        </Button>
      )}
    </div>
  );
}
