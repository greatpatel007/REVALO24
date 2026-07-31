import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Blueprint, Camera, CaretLeft, CaretRight, Check, Warning, X } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { useUnsavedGuard } from "@/shared/lib/useUnsavedGuard";
import { getProperty } from "@/features/property/api";
import { saveAgentProperty } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { AMENITIES, PROPERTY_TYPES } from "@/shared/mock/db";
import { Button } from "@/shared/ui/Button";
import { Input, Select, Textarea } from "@/shared/ui/Field";
import { Seg } from "@/shared/ui/Seg";
import { Tabs } from "@/shared/ui/Tabs";
import { useToast } from "@/shared/ui/Toast";
import type { AgentProfile, ListingType, PropertyStatus } from "@/shared/types";

type Section = "details" | "location" | "media" | "seo";

export function ListingEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t, to } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const agent = user as AgentProfile;
  const { approved } = useAgentGate();

  const { data: existing, loading: loadingExisting, error: loadError, reload } =
    useApi(() => (isEdit ? getProperty(Number(id)) : Promise.resolve(undefined)), [id]);
  /* Handoff from the AI Exposé Optimizer ("Apply to listing") */
  const location = useLocation();
  const expose = (location.state as { expose?: { headline: string; description: string } } | null)?.expose;
  const [section, setSection] = useState<Section>("details");
  const [listingType, setListingType] = useState<ListingType>("buy");
  const [status, setStatus] = useState<PropertyStatus>("draft");
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [isProject, setIsProject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty && !busy);

  /* Media order is editable (§3.4.3 "image deletion and reordering") —
     the first image is the cover across cards, map and exposé. */
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    if (existing) setImages(existing.media.images);
  }, [existing]);

  const moveImage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    setDirty(true);
    setImages((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const removeImage = (i: number) => {
    setDirty(true);
    setImages((prev) => prev.filter((_, k) => k !== i));
    toast(t("agent.ed.photoRemoved"), "info");
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    /* GEG §87: a German listing cannot be PUBLISHED without a complete
       energy certificate block (drafts may stay incomplete). */
    const country = String(fd.get("country") || existing?.location.country || "");
    const energyComplete = Boolean(
      fd.get("energyCertType") && fd.get("energy") && Number(fd.get("energyValue")) > 0 &&
      String(fd.get("energySource") || "").trim() && Number(fd.get("energyCertYear")) > 0,
    );
    if (status === "active" && country === "Germany" && !energyComplete) {
      setSection("details");
      toast(t("agent.ed.energyRequired"), "error");
      return;
    }

    setDirty(false);
    setBusy(true);
    void saveAgentProperty({
      id: isEdit ? Number(id) : undefined,
      title: String(fd.get("title") || existing?.title || t("agent.ed.untitled")),
      listingType,
      status,
      price: Number(fd.get("price")) || existing?.price || 0,
      propertyType: String(fd.get("kind") || existing?.propertyType || "Apartment"),
      livingArea: Number(fd.get("area")) || existing?.livingArea || 0,
      amenities: [...amenities],
      isNewConstruction: isProject,
      /* Energy block is part of the payload — previously silently dropped */
      energyRating: String(fd.get("energy") || "") || undefined,
      energyCertType: (String(fd.get("energyCertType") || "") || undefined) as "demand" | "consumption" | undefined,
      energyValue: Number(fd.get("energyValue")) || undefined,
      energySource: String(fd.get("energySource") || "").trim() || undefined,
      energyCertYear: Number(fd.get("energyCertYear")) || undefined,
    })
      .then(() => {
        toast(isEdit ? t("agent.ed.saved") : t("agent.ed.created"));
        navigate(to("/agent/listings"));
      })
      .catch(() => {
        setDirty(true);
        toast(t("agent.ed.saveFail"), "error");
      })
      .finally(() => setBusy(false));
  };

  /* Native validation can't focus fields on hidden tabs — reveal the section
     holding the first invalid field so the browser message actually shows. */
  const onInvalid = (e: React.FormEvent) => {
    const el = e.target as HTMLInputElement;
    const sec = el.closest<HTMLElement>("[data-section]")?.dataset.section as Section | undefined;
    if (sec && sec !== section) {
      setSection(sec);
      toast(t("agent.ed.tabInvalid"), "error");
      setTimeout(() => el.focus(), 0);
    }
  };

  /* Verification Gate — the editor itself is a publish tool */
  if (!approved) {
    return (
      <div className="max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
          <Link to={to("/agent/listings")} className="hover:text-blue-700 hover:underline">{t("agent.nav.listings")}</Link>
          <span aria-hidden> / </span>{t("agent.ed.newCrumb")}
        </nav>
        <h1 className="mb-4 font-display text-2xl font-extrabold">{t("agent.ed.newTitle")}</h1>
        <GateNotice />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
        <Link to={to("/agent/listings")} className="hover:text-blue-700 hover:underline">{t("agent.nav.listings")}</Link>
        <span aria-hidden> / </span>{isEdit ? t("agent.ed.editCrumb") : t("agent.ed.newCrumb")}
      </nav>
      <h1 className="mb-1 font-display text-2xl font-extrabold">{isEdit ? t("agent.ed.editTitle", { title: existing?.title ?? "…" }) : t("agent.ed.newTitle")}</h1>
      <p className="mb-5 text-sm text-muted">{t("agent.ed.sub")}</p>

      {isEdit && loadError && <ErrorState onRetry={reload} className="mb-5" />}
      {isEdit && loadingExisting && !loadError && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {(!isEdit || (!loadingExisting && !loadError)) && (
      <>

      {existing?.crmLinked && (
        <p className="mb-5 flex items-center gap-2 rounded-lg border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm font-semibold text-warn-700">
          <Warning weight="fill" className="size-4.5 shrink-0" aria-hidden />
          {t("agent.ed.crmWarn")}
        </p>
      )}

      <Tabs
        tabs={[
          { id: "details", label: t("agent.ed.tabDetails") },
          { id: "location", label: t("detail.location") },
          { id: "media", label: t("detail.media") },
          { id: "seo", label: t("agent.ed.tabSeo") },
        ]}
        active={section}
        onChange={setSection}
      />

      <form onSubmit={onSubmit} onChange={() => setDirty(true)} onInvalidCapture={onInvalid} className="mt-6 space-y-6">
        <div data-section="details" className={section === "details" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <Seg ariaLabel={t("search.listingType")} value={listingType} onChange={setListingType}
              options={[{ value: "buy", label: t("search.forSale") }, { value: "rent", label: t("search.forRent") }]} />
            <Seg ariaLabel={t("agent.list.thStatus")} wrap value={status} onChange={setStatus}
              options={[{ value: "draft", label: t("status.draft") }, { value: "active", label: t("status.active") }, { value: "sold", label: t("status.sold") }, { value: "rented", label: t("status.rented") }]} />
          </div>

          {agent.isDeveloper && (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 sm:col-span-2">
              <input type="checkbox" checked={isProject} onChange={(e) => setIsProject(e.target.checked)} className="size-5 cursor-pointer accent-action" />
              <span className="text-sm">
                <strong>{t("agent.ed.master")}</strong> — {t("agent.ed.masterBody")}{" "}
                <em className="text-muted">{t("agent.ed.masterTag")}</em>
              </span>
            </label>
          )}

          <div className="sm:col-span-2"><Input name="title" label={t("agent.ed.title")} required defaultValue={existing?.title ?? expose?.headline} /></div>
          <Input name="price" type="number" inputMode="numeric" label={listingType === "rent" ? t("agent.ed.rentLabel") : t("agent.ed.priceLabel")} required defaultValue={existing?.price} hint={t("agent.ed.priceHint")} />
          <Select name="kind" label={t("search.homeType")} defaultValue={existing?.propertyType}>
            {PROPERTY_TYPES.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </Select>
          <Input name="area" type="number" inputMode="numeric" label={`${t("detail.livingArea")} (m²)`} required defaultValue={existing?.livingArea} />
          <Input name="landArea" type="number" inputMode="numeric" label={`${t("detail.landArea")} (m²)`} defaultValue={existing?.landArea} />
          <Input name="rooms" type="number" inputMode="numeric" label={t("detail.rooms")} defaultValue={existing?.rooms} />
          <Input name="bedrooms" type="number" inputMode="numeric" label={t("detail.bedrooms")} defaultValue={existing?.bedrooms} />
          <Input name="bathrooms" type="number" inputMode="numeric" label={t("detail.bathrooms")} defaultValue={existing?.bathrooms} />
          <Input name="yearBuilt" type="number" inputMode="numeric" label={t("detail.yearBuilt")} defaultValue={existing?.yearBuilt} />
          <Input name="floor" label={t("detail.floor")} defaultValue={existing?.floor} placeholder={t("agent.ed.floorPh")} />

          {/* GEG §87 energy certificate — mandatory disclosure in German
              listing advertisements; required before publishing a DE listing */}
          <fieldset className="grid gap-4 rounded-xl border border-slate-300 bg-canvas/60 p-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-sm font-bold">{t("agent.ed.energyTitle")}</legend>
            <Select name="energyCertType" label={t("agent.ed.energyCertType")} defaultValue={existing?.energyCertType ?? ""}>
              <option value="">—</option>
              <option value="demand">{t("agent.ed.energyDemand")}</option>
              <option value="consumption">{t("agent.ed.energyConsumption")}</option>
            </Select>
            {/* Full GEG ladder (A+–H) — matches the EnergyScale on the exposé */}
            <Select name="energy" label={t("detail.energyClass")} defaultValue={existing?.energyRating ?? ""}>
              <option value="">—</option>
              {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((r) => <option key={r}>{r}</option>)}
            </Select>
            <Input name="energyValue" type="number" inputMode="decimal" step="0.1" min={0}
              label={t("agent.ed.energyValue")} defaultValue={existing?.energyValue} />
            <Input name="energySource" label={t("agent.ed.energySource")} defaultValue={existing?.energySource}
              placeholder={t("agent.ed.energySourcePh")} />
            <Input name="energyCertYear" type="number" inputMode="numeric" min={2000} max={2026}
              label={t("agent.ed.energyYear")} defaultValue={existing?.energyCertYear} />
            <p className="self-end text-xs text-muted">{t("agent.ed.energyNote")}</p>
          </fieldset>

          <div className="sm:col-span-2"><Textarea name="desc" label={t("detail.description")} defaultValue={existing?.description ?? expose?.description} hint={t("agent.ed.descHint")} /></div>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold">{t("search.amenities")}</legend>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = amenities.has(a);
                return (
                  <button key={a} type="button" aria-pressed={on}
                    onClick={() => setAmenities((prev) => { const n = new Set(prev); if (on) n.delete(a); else n.add(a); return n; })}
                    className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors ${
                      on ? "border-action bg-blue-50 text-blue-700" : "border-slate-400 text-slate-800 hover:border-border-strong"
                    }`}>
                    {on && <Check weight="bold" className="size-3.5" aria-hidden />}{t(`amen.${a}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div data-section="location" className={section === "location" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Select name="country" label={t("auth.country")} defaultValue={existing?.location.country}>
            {["Germany", "Austria", "France", "Spain", "Portugal", "Netherlands", "Czechia", "Poland", "Slovakia"].map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Input name="county" label={t("agent.ed.county")} defaultValue={existing?.location.county} />
          <Input name="city" label={t("agent.ed.city")} required defaultValue={existing?.location.city} />
          <Input name="zip" label={t("agent.ed.zip")} required defaultValue={existing?.location.postalCode} />
          <div className="sm:col-span-2"><Input name="street" label={t("agent.ed.street")} defaultValue={existing?.location.street} hint={t("agent.ed.streetHint")} /></div>
          <Input name="lat" label={t("agent.ed.lat")} defaultValue={existing?.location.geo.lat} hint={t("agent.ed.geoHint")} />
          <Input name="lng" label={t("agent.ed.lng")} defaultValue={existing?.location.geo.lng} />
        </div>

        <div data-section="media" className={section === "media" ? "space-y-4" : "hidden"}>
          <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-slate-400 bg-white p-10 text-center transition-colors hover:border-action hover:bg-blue-50/40">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const n = e.target.files?.length ?? 0;
                if (n > 0) toast(t("agent.ed.queued", { n }), "info");
              }}
            />
            <Camera className="mb-2 size-8 text-muted" aria-hidden />
            <p className="font-semibold">{t("agent.ed.upload")}</p>
            <p className="text-sm text-muted">{t("agent.ed.uploadHint")}</p>
          </label>
          {images.length > 0 && <p className="text-xs text-muted">{t("agent.ed.orderHint")}</p>}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
            {images.map((src, i) => (
              <div key={src} className="relative shrink-0">
                <img src={src} alt={t("agent.ed.photoAlt", { n: i + 1 })} className="h-24 w-36 rounded-lg object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-navy/80 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {t("agent.ed.cover")}
                  </span>
                )}
                <button type="button" aria-label={t("agent.ed.removePhoto", { n: i + 1 })} onClick={() => removeImage(i)}
                  className="absolute right-1.5 top-1.5 flex size-7 cursor-pointer items-center justify-center rounded-md bg-navy/80 text-white hover:bg-err-600"><X className="size-3.5" aria-hidden /></button>
                {/* Reorder controls (§3.4.3 media management) */}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                  <button type="button" aria-label={t("agent.ed.moveLeft", { n: i + 1 })} disabled={i === 0} onClick={() => moveImage(i, -1)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-navy/80 text-white transition-opacity hover:bg-action disabled:cursor-default disabled:opacity-30">
                    <CaretLeft weight="bold" className="size-3.5" aria-hidden />
                  </button>
                  <button type="button" aria-label={t("agent.ed.moveRight", { n: i + 1 })} disabled={i === images.length - 1} onClick={() => moveImage(i, 1)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-navy/80 text-white transition-opacity hover:bg-action disabled:cursor-default disabled:opacity-30">
                    <CaretRight weight="bold" className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Input name="video" label={t("agent.ed.video")} placeholder="https://youtube.com/watch?v=…" />
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-400 bg-white p-6 text-center text-sm text-muted transition-colors hover:border-action hover:bg-blue-50/40">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) toast(t("agent.ed.planQueued", { name: e.target.files[0].name }), "info");
              }}
            />
            <Blueprint className="size-6" aria-hidden />
            {t("agent.ed.floorplan")}
          </label>
        </div>

        <div data-section="seo" className={section === "seo" ? "grid gap-4" : "hidden"}>
          <Input name="seoTitle" label={t("agent.ed.seoTitle")} placeholder={t("agent.ed.seoTitlePh")} />
          <Input name="seoKeywords" label={t("agent.ed.seoKeywords")} placeholder={t("agent.ed.seoKeywordsPh")} />
          <Textarea name="seoDesc" label={t("agent.ed.seoDesc")} />
          <p className="text-xs text-muted">{t("agent.ed.seoNote")}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-300 pt-5">
          <Link to={to("/agent/listings")}><Button type="button" variant="secondary">{t("common.cancel")}</Button></Link>
          <Button type="submit" loading={busy}>{isEdit ? t("agent.ed.saveCta") : t("agent.ed.createCta")}</Button>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
