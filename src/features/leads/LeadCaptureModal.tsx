import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/shared/i18n/I18nContext";
import { submitLead } from "@/features/leads/api";
import { Button } from "@/shared/ui/Button";
import { Consent, Input, Textarea } from "@/shared/ui/Field";
import { Modal } from "@/shared/ui/Modal";
import { useToast } from "@/shared/ui/Toast";
import type { LeadKind } from "@/shared/types";

export interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  kind: LeadKind;
  propertyId?: number;
  /** Prefills the address / listing field (e.g. property title) */
  addressOrListing?: string;
}

export function LeadCaptureModal({
  open, onClose, kind, propertyId, addressOrListing: initialAddress,
}: LeadCaptureModalProps) {
  const { t, to, locale } = useI18n();
  const toast = useToast();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState(initialAddress ?? "");

  useEffect(() => {
    if (open) {
      setConsent(false);
      setBusy(false);
      setAddress(initialAddress ?? "");
    }
  }, [open, initialAddress]);

  const title = kind === "valuation" ? t("lead.valuation.title") : t("lead.tour.title");
  const sub = kind === "valuation" ? t("lead.valuation.sub") : t("lead.tour.sub");
  const defaultMsg = kind === "valuation" ? t("lead.msgDefault.valuation") : t("lead.msgDefault.tour");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!consent) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    void submitLead({
      kind,
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone") || "") || undefined,
      message: String(fd.get("message") || "") || undefined,
      addressOrListing: String(fd.get("address") || "") || undefined,
      propertyId,
      locale,
      consent: true,
    })
      .then(() => {
        toast(t("lead.sent"));
        onClose();
      })
      .catch(() => toast(t("lead.fail"), "error"))
      .finally(() => setBusy(false));
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-sm text-muted">{sub}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <Input name="name" label={t("form.name")} required autoComplete="name" />
        <Input name="email" type="email" label={t("form.email")} required autoComplete="email" />
        <Input name="phone" type="tel" label={`${t("form.phone")} ${t("form.optionalTag")}`} autoComplete="tel" />
        <Input
          name="address"
          label={t("lead.address")}
          hint={t("lead.addressHint")}
          required={kind === "valuation" && !propertyId}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Textarea name="message" label={`${t("form.message")} ${t("form.optionalTag")}`} defaultValue={defaultMsg} />
        <Consent checked={consent} onChange={setConsent}>
          {t("form.consentPre")}{" "}
          <Link to={to("/legal/privacy")} className="font-semibold text-blue-700 underline">{t("form.privacy")}</Link>
          {t("form.consentPost")}
        </Consent>
        <Button type="submit" size="lg" loading={busy} disabled={!consent}>
          {t("lead.submit")}
        </Button>
      </form>
    </Modal>
  );
}
