import type { ReactNode } from "react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  /** true renders the confirm button in the danger variant */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Confirmation step for destructive / irreversible actions. */
export function ConfirmDialog({
  open, title, body, confirmLabel, destructive = true, busy = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-slate-800">{body}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant={destructive ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
          {confirmLabel ?? t("common.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
