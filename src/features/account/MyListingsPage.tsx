import { useState } from "react";
import { Camera, HouseLine } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { getMyListings, PRIVATE_LISTING_LIMIT } from "@/features/account/api";
import { PROPERTY_TYPES } from "@/shared/mock/db";
import { PropertyCard } from "@/features/property/PropertyCard";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Input, Select, Textarea } from "@/shared/ui/Field";
import { Seg } from "@/shared/ui/Seg";
import { EmptyState } from "@/shared/ui/EmptyState";
import { useToast } from "@/shared/ui/Toast";
import type { ListingType } from "@/shared/types";

/* Private users: manual listing creation, max 3 active (§3.4.4).
   No subscriptions, AI tools or placements at this tier. */
export function MyListingsPage() {
  const { t } = useI18n();
  const { data, loading } = useApi(getMyListings);
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState<ListingType>("buy");
  const count = data?.length ?? 0;
  const atLimit = count >= PRIVATE_LISTING_LIMIT;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModal(false);
    toast(t("account.ml.submitted"), "info");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-extrabold">{t("account.listings")}</h1>
          <p className="text-sm text-muted">
            {t("account.ml.sub", { used: count, limit: PRIVATE_LISTING_LIMIT })}
          </p>
        </div>
        <Button onClick={() => setModal(true)} disabled={atLimit}>{t("agent.newListing")}</Button>
      </div>

      {atLimit && (
        <p className="mb-5 rounded-lg border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn-700">
          {t("account.ml.limitNote", { limit: PRIVATE_LISTING_LIMIT })}
        </p>
      )}

      {!loading && count === 0 ? (
        <EmptyState icon={<HouseLine className="size-9" aria-hidden />} title={t("account.ml.emptyTitle")}>
          {t("account.ml.emptyBody", { limit: PRIVATE_LISTING_LIMIT })}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {(data ?? []).map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={t("account.ml.createTitle")} wide>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Seg ariaLabel={t("search.listingType")} value={mode} onChange={setMode}
              options={[{ value: "buy", label: t("search.forSale") }, { value: "rent", label: t("search.forRent") }]} />
          </div>
          <div className="sm:col-span-2"><Input name="title" label={t("agent.ed.title")} required placeholder={t("account.ml.titlePh")} /></div>
          <Input name="price" type="number" label={mode === "rent" ? t("agent.ed.rentLabel") : t("agent.ed.priceLabel")} required inputMode="numeric" />
          <Select name="kind" label={t("search.homeType")} required>
            {PROPERTY_TYPES.filter((k) => k !== "New Construction").map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </Select>
          <Input name="area" type="number" label={`${t("detail.livingArea")} (m²)`} required inputMode="numeric" />
          <Input name="rooms" type="number" label={t("detail.rooms")} required inputMode="numeric" />
          <Input name="city" label={t("agent.ed.city")} required />
          <Input name="zip" label={t("agent.ed.zip")} required />
          <div className="sm:col-span-2"><Textarea name="desc" label={t("detail.description")} required /></div>
          <div className="sm:col-span-2 flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-400 bg-canvas p-6 text-center text-sm text-muted">
            <Camera className="size-6" aria-hidden />
            {t("account.ml.dropzone")}
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModal(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("account.ml.publish")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
