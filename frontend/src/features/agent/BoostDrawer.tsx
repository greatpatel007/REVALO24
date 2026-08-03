import { useEffect, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { fmtEur, fmtLocalEstimate, fmtPrice, locationLabel } from "@/shared/lib/format";
import type { PlacementProduct, PlacementTier, Property } from "@/shared/types";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Seg } from "@/shared/ui/Seg";

type TierChoice = "featured" | "top";

interface Props {
  property: Property | null;
  products: PlacementProduct[];
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (productId: number) => void;
}

/** Per-listing boost picker: Featured | Top preview, then 14/30 day SKUs. */
export function BoostDrawer({ property, products, open, busy, onClose, onConfirm }: Props) {
  const { t, locale } = useI18n();
  const [tier, setTier] = useState<TierChoice>("featured");
  const [days, setDays] = useState<14 | 30>(14);

  useEffect(() => {
    if (!property) return;
    setTier(property.placement === "top" ? "top" : "featured");
    setDays(14);
  }, [property?.id, property?.placement]);

  const product = products.find((p) => p.tier === tier && p.durationDays === days) ?? null;
  const durations = ([14, 30] as const).filter((d) => products.some((p) => p.tier === tier && p.durationDays === d));

  return (
    <Modal
      open={open && !!property}
      onClose={onClose}
      title={property ? t("agent.pl.drawerTitle", { title: property.title }) : ""}
      wide
    >
      {property && (
        <div className="space-y-5">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-canvas px-3 py-3">
            {property.media.images[0] && (
              <img
                src={property.media.images[0]}
                alt=""
                className="h-14 w-20 shrink-0 rounded-md object-cover outline outline-1 outline-black/10"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{property.title}</p>
              <p className="truncate text-xs text-muted">{locationLabel(property)}</p>
              <p className="text-sm font-bold tabular">{fmtPrice(property, locale)}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">{t("agent.pl.chooseTier")}</p>
            <Seg
              ariaLabel={t("agent.pl.chooseTier")}
              value={tier}
              onChange={setTier}
              options={[
                { value: "featured" as const, label: t("card.featured") },
                { value: "top" as const, label: t("card.top") },
              ]}
            />
            <p className="mt-2 text-sm text-muted">
              {tier === "top" ? t("agent.pl.topDesc") : t("agent.pl.featDesc")}
            </p>
          </div>

          <SerpPreview property={property} tier={tier} />

          <div>
            <p className="mb-2 text-sm font-semibold">{t("agent.pl.chooseDuration")}</p>
            <div className="grid grid-cols-2 gap-2">
              {durations.map((d) => {
                const sku = products.find((p) => p.tier === tier && p.durationDays === d);
                if (!sku) return null;
                const active = days === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDays(d)}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors ${
                      active
                        ? "border-2 border-action bg-blue-50"
                        : "border-slate-300 bg-white hover:border-border-strong"
                    }`}
                  >
                    <p className="text-sm font-bold">{t("agent.pl.days", { n: d })}</p>
                    <p className="font-display text-lg font-extrabold tabular">{fmtEur(sku.priceEur, locale)}</p>
                    {fmtLocalEstimate(sku.priceEur, locale) && (
                      <p className="text-xs font-semibold tabular text-muted">{fmtLocalEstimate(sku.priceEur, locale)}</p>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t("agent.pl.netOnce")}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button
              loading={busy}
              disabled={!product}
              onClick={() => product && onConfirm(product.id)}
            >
              {t("agent.pl.confirm", {
                tier: tier === "top" ? t("card.top") : t("card.featured"),
                n: days,
                price: product ? fmtEur(product.priceEur, locale) : "—",
              })}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Mini SERP card preview — champagne frame (Featured) vs pinned Top treatment. */
function SerpPreview({ property, tier }: { property: Property; tier: TierChoice }) {
  const { t, locale } = useI18n();
  const featured = tier === "featured";
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{t("agent.pl.preview")}</p>
      <div
        className={`overflow-hidden rounded-xl bg-white ${
          featured
            ? "border-2 border-champagne-600 shadow-[0_0_0_3px_rgba(169,133,69,0.15)]"
            : "border-2 border-action"
        }`}
      >
        <div className="relative aspect-[8/5] bg-slate-300">
          {property.media.images[0] && (
            <img
              src={property.media.images[0]}
              alt=""
              className="h-full w-full object-cover outline outline-1 outline-offset-[-1px] outline-black/10"
            />
          )}
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            <Badge tone={featured ? "premium" : "action"}>
              {featured ? t("card.featured") : t("card.top")}
            </Badge>
          </div>
          {!featured && (
            <p className="absolute inset-x-0 bottom-0 bg-action/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {t("agent.pl.previewTopCue")}
            </p>
          )}
        </div>
        <div className="space-y-1 px-3 py-2.5">
          <p className="truncate text-sm font-bold">{property.title}</p>
          <p className="text-xs text-muted">{locationLabel(property)}</p>
          <p className="font-display text-base font-extrabold tabular">{fmtPrice(property, locale)}</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {featured ? t("agent.pl.previewFeatHint") : t("agent.pl.previewTopHint")}
      </p>
    </div>
  );
}

export function placementActionKey(placement: PlacementTier): "boost" | "upgrade" | "extend" {
  if (!placement) return "boost";
  if (placement === "featured") return "upgrade";
  return "extend";
}
