import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Blueprint, Camera, CaretLeft, CaretRight, Check, Warning, X } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthContext";
import { useI18n } from "@/shared/i18n/I18nContext";
import { useApi } from "@/shared/lib/useApi";
import { useUnsavedGuard } from "@/shared/lib/useUnsavedGuard";
import { fmtPrice } from "@/shared/lib/format";
import { getProperty } from "@/features/property/api";
import { saveAgentProperty } from "@/features/agent/api";
import { GateNotice, useAgentGate } from "@/features/agent/gate";
import { PropertyCard } from "@/features/property/PropertyCard";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton";
import { AMENITIES, PROPERTY_TYPES } from "@/shared/mock/db";
import { Button } from "@/shared/ui/Button";
import { Input, Select, Textarea } from "@/shared/ui/Field";
import { Seg } from "@/shared/ui/Seg";
import { Tabs } from "@/shared/ui/Tabs";
import { useToast } from "@/shared/ui/Toast";
import type { AgentProfile, ListingType, Property, PropertyStatus } from "@/shared/types";

type Section = "details" | "location" | "media" | "preview";
type WizardStep = 1 | 2 | 3 | 4;

const WIZARD_TOTAL = 4;
const STEP_TO_SECTION: Record<1 | 2 | 3, Section> = {
  1: "details",
  2: "location",
  3: "media",
};

const COUNTRY_CODES: Record<string, string> = {
  Germany: "DE", Austria: "AT", France: "FR", Spain: "ES", Portugal: "PT",
  Netherlands: "NL", Czechia: "CZ", Poland: "PL", Slovakia: "SK",
};

/** Neutral cover when the listing has no photos yet (SERP card always needs an image). */
const PLACEHOLDER_COVER =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=60";

function validateSection(root: HTMLElement | null): boolean {
  if (!root) return true;
  const controls = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "input, select, textarea",
  );
  for (const el of controls) {
    if (!el.checkValidity()) {
      el.reportValidity();
      return false;
    }
  }
  return true;
}

export function ListingEditor() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t, to, locale } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const agent = user as AgentProfile;
  const { approved } = useAgentGate();
  const formRef = useRef<HTMLFormElement>(null);

  const { data: existing, loading: loadingExisting, error: loadError, reload } =
    useApi(() => (isEdit ? getProperty(Number(id)) : Promise.resolve(undefined)), [id]);
  /* Handoff from the AI Exposé Optimizer ("Apply to listing") */
  const location = useLocation();
  const expose = (location.state as { expose?: { headline: string; description: string } } | null)?.expose;

  /* Edit: tab sections. Create: linear wizard steps. */
  const [section, setSection] = useState<Section>("details");
  const [step, setStep] = useState<WizardStep>(1);

  const [listingType, setListingType] = useState<ListingType>("buy");
  const [status, setStatus] = useState<PropertyStatus>("draft");
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [isProject, setIsProject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedGuard(dirty && !busy);

  /* Preview-critical fields — controlled so the SERP card updates live */
  const [title, setTitle] = useState(expose?.headline ?? "");
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0] ?? "Apartment");
  const [livingArea, setLivingArea] = useState("");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [energyRating, setEnergyRating] = useState("");
  const [description, setDescription] = useState(expose?.description ?? "");
  const [country, setCountry] = useState("Germany");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  /* Media order is editable (§3.4.3 "image deletion and reordering") —
     the first image is the cover across cards, map and exposé. */
  const [images, setImages] = useState<string[]>([]);

  const [isLg, setIsLg] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setIsLg(mq.matches);
      if (mq.matches && isEdit) setSection((s) => (s === "preview" ? "details" : s));
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [isEdit]);

  useEffect(() => {
    if (!existing) return;
    setListingType(existing.listingType);
    setStatus(existing.status);
    setAmenities(new Set(existing.amenities));
    setIsProject(!!existing.isNewConstruction);
    setImages(existing.media.images);
    setTitle(expose?.headline ?? existing.title);
    setPrice(existing.price ? String(existing.price) : "");
    setPropertyType(existing.propertyType);
    setLivingArea(existing.livingArea ? String(existing.livingArea) : "");
    setRooms(existing.rooms ? String(existing.rooms) : "");
    setBathrooms(existing.bathrooms ? String(existing.bathrooms) : "");
    setEnergyRating(existing.energyRating ?? "");
    setDescription(expose?.description ?? existing.description);
    setCountry(existing.location.country);
    setCity(existing.location.city);
    setPostalCode(existing.location.postalCode);
  }, [existing, expose?.headline, expose?.description]);

  const markDirty = () => setDirty(true);

  const draft = useMemo((): Property => ({
    id: existing?.id ?? 0,
    slug: existing?.slug ?? "draft",
    title: title.trim() || t("agent.ed.untitled"),
    description,
    listingType,
    status,
    price: Number(price) || 0,
    currency: "EUR",
    propertyType,
    livingArea: Number(livingArea) || 0,
    rooms: Number(rooms) || 0,
    bedrooms: existing?.bedrooms ?? 0,
    bathrooms: Number(bathrooms) || 0,
    energyRating: energyRating || undefined,
    amenities: [...amenities],
    location: {
      country,
      countryCode: COUNTRY_CODES[country] ?? existing?.location.countryCode ?? "DE",
      city: city.trim() || "—",
      postalCode: postalCode.trim() || "—",
      street: existing?.location.street,
      geo: existing?.location.geo ?? { lat: 0, lng: 0 },
    },
    media: { images: images.length > 0 ? images : [PLACEHOLDER_COVER] },
    placement: existing?.placement ?? null,
    offMarket: existing?.offMarket ?? false,
    agentId: existing?.agentId ?? agent.id,
    createdAt: existing?.createdAt ?? "",
    isNewConstruction: isProject,
  }), [
    existing, title, description, listingType, status, price, propertyType, livingArea,
    rooms, bathrooms, energyRating, amenities, country, city, postalCode, images, isProject,
    agent.id, t,
  ]);

  const stepLabels = [
    t("agent.ed.tabDetails"),
    t("detail.location"),
    t("detail.media"),
    t("agent.ed.reviewStep"),
  ];

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

  const goToWizardStep = (next: WizardStep) => {
    if (next > step) {
      /* Only advance one step at a time after validating the current panel */
      const key = STEP_TO_SECTION[step as 1 | 2 | 3];
      const panel = formRef.current?.querySelector<HTMLElement>(`[data-section="${key}"]`) ?? null;
      if (!validateSection(panel)) return;
    }
    setStep(next);
  };

  const continueWizard = () => {
    if (step >= WIZARD_TOTAL) return;
    const key = STEP_TO_SECTION[step as 1 | 2 | 3];
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-section="${key}"]`) ?? null;
    if (!validateSection(panel)) return;
    setStep((s) => (s + 1) as WizardStep);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    /* Create: only the Review step may submit */
    if (!isEdit && step !== 4) return;

    /* Form uses noValidate so hidden steps/tabs don't block submit —
       validate every content section before save. */
    for (const sec of ["details", "location", "media"] as const) {
      const panel = formRef.current?.querySelector<HTMLElement>(`[data-section="${sec}"]`) ?? null;
      if (!validateSection(panel)) {
        if (isEdit) setSection(sec);
        else {
          const entry = (Object.entries(STEP_TO_SECTION) as [string, Section][]).find(([, s]) => s === sec);
          if (entry) setStep(Number(entry[0]) as WizardStep);
        }
        toast(t("agent.ed.tabInvalid"), "error");
        return;
      }
    }

    const fd = new FormData(e.currentTarget);

    /* GEG §87: a German listing cannot be PUBLISHED without a complete
       energy certificate block (drafts may stay incomplete). */
    const energyComplete = Boolean(
      fd.get("energyCertType") && energyRating && Number(fd.get("energyValue")) > 0 &&
      String(fd.get("energySource") || "").trim() && Number(fd.get("energyCertYear")) > 0,
    );
    if (status === "active" && country === "Germany" && !energyComplete) {
      if (isEdit) setSection("details");
      else setStep(1);
      toast(t("agent.ed.energyRequired"), "error");
      return;
    }

    setDirty(false);
    setBusy(true);
    void saveAgentProperty({
      id: isEdit ? Number(id) : undefined,
      title: title.trim() || existing?.title || t("agent.ed.untitled"),
      description,
      listingType,
      status,
      price: Number(price) || existing?.price || 0,
      propertyType,
      livingArea: Number(livingArea) || existing?.livingArea || 0,
      rooms: Number(rooms) || existing?.rooms || 0,
      bathrooms: Number(bathrooms) || existing?.bathrooms || 0,
      amenities: [...amenities],
      isNewConstruction: isProject,
      energyRating: energyRating || undefined,
      energyCertType: (String(fd.get("energyCertType") || "") || undefined) as "demand" | "consumption" | undefined,
      energyValue: Number(fd.get("energyValue")) || undefined,
      energySource: String(fd.get("energySource") || "").trim() || undefined,
      energyCertYear: Number(fd.get("energyCertYear")) || undefined,
      location: {
        ...(existing?.location ?? { geo: { lat: 0, lng: 0 }, countryCode: "DE", city: "", postalCode: "" }),
        country,
        countryCode: COUNTRY_CODES[country] ?? "DE",
        city,
        postalCode,
        county: String(fd.get("county") || existing?.location.county || "") || undefined,
        street: String(fd.get("street") || existing?.location.street || "") || undefined,
        geo: {
          lat: Number(fd.get("lat")) || existing?.location.geo.lat || 0,
          lng: Number(fd.get("lng")) || existing?.location.geo.lng || 0,
        },
      },
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
    if (!sec) return;
    if (isEdit) {
      if (sec !== section) {
        setSection(sec);
        toast(t("agent.ed.tabInvalid"), "error");
        setTimeout(() => el.focus(), 0);
      }
      return;
    }
    const entry = (Object.entries(STEP_TO_SECTION) as [string, Section][]).find(([, s]) => s === sec);
    const wizardStep = entry ? (Number(entry[0]) as WizardStep) : null;
    if (wizardStep && wizardStep !== step) {
      setStep(wizardStep);
      toast(t("agent.ed.tabInvalid"), "error");
      setTimeout(() => el.focus(), 0);
    }
  };

  const previewPanel = (
    <div>
      <p className="t-overline mb-2 text-muted">{t("agent.ed.livePreview")}</p>
      <div className="pointer-events-none select-none" aria-hidden>
        <PropertyCard property={draft} compact />
      </div>
    </div>
  );

  /* Full-page scroll: jump to top of the agent main pane when the wizard step changes */
  useEffect(() => {
    if (isEdit) return;
    const main = document.querySelector("main");
    main?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, isEdit]);

  const editTabs = [
    { id: "details" as const, label: t("agent.ed.tabDetails") },
    { id: "location" as const, label: t("detail.location") },
    { id: "media" as const, label: t("detail.media") },
    ...(!isLg ? [{ id: "preview" as const, label: t("agent.ed.tabPreview") }] : []),
  ];

  /* Verification Gate — the editor itself is a publish tool */
  if (!approved) {
    return (
      <div className="flex flex-1 flex-col">
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
          <Link to={to("/agent/listings")} className="hover:text-blue-700 hover:underline">{t("agent.nav.listings")}</Link>
          <span aria-hidden> / </span>{t("agent.ed.newCrumb")}
        </nav>
        <h1 className="mb-4 font-display text-2xl font-extrabold">{t("agent.ed.newTitle")}</h1>
        <GateNotice />
      </div>
    );
  }

  const showDetails = isEdit ? section === "details" : step === 1;
  const showLocation = isEdit ? section === "location" : step === 2;
  const showMedia = isEdit ? section === "media" : step === 3;
  const showReview = !isEdit && step === 4;
  const showEditPreview = isEdit && section === "preview";
  /* Side preview on lg for edit + every create step */
  const showSidePreview = isLg;

  const [energyOpen, setEnergyOpen] = useState(false);
  useEffect(() => {
    if (status === "active" || !!energyRating || !!existing?.energyCertType) setEnergyOpen(true);
  }, [status, energyRating, existing?.energyCertType]);

  return (
    <div className="w-full max-w-6xl xl:max-w-7xl">
      <header className="mb-6">
        <nav aria-label="Breadcrumb" className="mb-1 text-sm text-muted">
          <Link to={to("/agent/listings")} className="hover:text-blue-700 hover:underline">{t("agent.nav.listings")}</Link>
          <span aria-hidden> / </span>{isEdit ? t("agent.ed.editCrumb") : t("agent.ed.newCrumb")}
        </nav>
        <h1 className="font-display text-2xl font-extrabold">{isEdit ? t("agent.ed.editTitle", { title: existing?.title ?? "…" }) : t("agent.ed.newTitle")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("agent.ed.sub")}</p>
      </header>

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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0">

      {isEdit ? (
        <Tabs tabs={editTabs} active={section} onChange={setSection} />
      ) : (
        /* Equal-column stepper + progress bar — clearer than fragile connector lines */
        <nav
          className="mb-6 rounded-xl border border-slate-300 bg-white p-4 sm:p-5"
          aria-label={t("agent.ed.stepOf", { n: step, total: WIZARD_TOTAL })}
        >
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-navy">
              {t("agent.ed.stepOf", { n: step, total: WIZARD_TOTAL })}
              <span className="text-muted"> · {stepLabels[step - 1]}</span>
            </p>
            <p className="text-xs font-semibold tabular text-muted">{Math.round((step / WIZARD_TOTAL) * 100)}%</p>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
            <div
              className="h-full rounded-full bg-action transition-[width] duration-300 ease-out"
              style={{ width: `${(step / WIZARD_TOTAL) * 100}%` }}
            />
          </div>
          <ol className="grid grid-cols-4 gap-2 sm:gap-3">
            {stepLabels.map((label, i) => {
              const n = (i + 1) as WizardStep;
              const done = n < step;
              const current = n === step;
              const reachable = n <= step;
              return (
                <li key={label} className="min-w-0">
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => goToWizardStep(n)}
                    aria-current={current ? "step" : undefined}
                    className={`flex w-full flex-col items-center gap-2 rounded-lg px-1 py-2 transition-colors ${
                      current
                        ? "bg-blue-50"
                        : reachable
                          ? "cursor-pointer hover:bg-slate-100"
                          : "cursor-default opacity-55"
                    }`}
                  >
                    <span
                      className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${
                        current || done
                          ? "bg-action text-white"
                          : "border-2 border-slate-300 bg-white text-muted"
                      }`}
                    >
                      {done ? <Check weight="bold" className="size-4" aria-hidden /> : n}
                    </span>
                    <span
                      className={`w-full truncate text-center text-xs font-semibold ${
                        current ? "text-blue-700" : done ? "text-navy" : "text-muted"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        onChange={markDirty}
        onInvalidCapture={onInvalid}
        className="space-y-6"
      >
        <div data-section="details" className={showDetails ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "hidden"}>
          {/* Toolbar: listing type + status on one row; developer flag as compact toggle */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white p-3 sm:col-span-2 lg:col-span-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <Seg ariaLabel={t("search.listingType")} value={listingType} onChange={(v) => { setListingType(v); markDirty(); }}
                  options={[{ value: "buy", label: t("search.forSale") }, { value: "rent", label: t("search.forRent") }]} />
                <Seg ariaLabel={t("agent.list.thStatus")} wrap value={status} onChange={(v) => { setStatus(v); markDirty(); }}
                  options={[{ value: "draft", label: t("status.draft") }, { value: "active", label: t("status.active") }, { value: "sold", label: t("status.sold") }, { value: "rented", label: t("status.rented") }]} />
              </div>
              {agent.isDeveloper && (
                <label
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 bg-canvas px-3 py-2"
                  title={`${t("agent.ed.masterBody")} ${t("agent.ed.masterTag")}`}
                >
                  <input type="checkbox" checked={isProject} onChange={(e) => { setIsProject(e.target.checked); markDirty(); }} className="size-5 cursor-pointer accent-action" />
                  <span className="text-sm font-semibold">{t("agent.ed.master")}</span>
                </label>
              )}
            </div>
            {agent.isDeveloper && isProject && (
              <p className="text-xs text-muted">{t("agent.ed.masterBody")} <em>{t("agent.ed.masterTag")}</em></p>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <Input name="title" label={t("agent.ed.title")} required value={title}
              onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Input name="price" type="number" inputMode="numeric"
            label={listingType === "rent" ? t("agent.ed.rentLabel") : t("agent.ed.priceLabel")}
            required value={price} onChange={(e) => setPrice(e.target.value)} hint={t("agent.ed.priceHint")} />
          <Select name="kind" label={t("search.homeType")} value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}>
            {PROPERTY_TYPES.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </Select>
          <Input name="area" type="number" inputMode="numeric" label={`${t("detail.livingArea")} (m²)`}
            required value={livingArea} onChange={(e) => setLivingArea(e.target.value)} />
          <Input name="landArea" type="number" inputMode="numeric" label={`${t("detail.landArea")} (m²)`} defaultValue={existing?.landArea} />
          <Input name="rooms" type="number" inputMode="numeric" label={t("detail.rooms")}
            value={rooms} onChange={(e) => setRooms(e.target.value)} />
          <Input name="bedrooms" type="number" inputMode="numeric" label={t("detail.bedrooms")} defaultValue={existing?.bedrooms} />
          <Input name="bathrooms" type="number" inputMode="numeric" label={t("detail.bathrooms")}
            value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          <Input name="yearBuilt" type="number" inputMode="numeric" label={t("detail.yearBuilt")} defaultValue={existing?.yearBuilt} />
          <Input name="floor" label={t("detail.floor")} defaultValue={existing?.floor} placeholder={t("agent.ed.floorPh")} />

          {/* Collapsed by default on drafts — opens when Active or energy already set */}
          <details
            className="rounded-xl border border-slate-300 bg-canvas/60 sm:col-span-2 lg:col-span-3"
            open={energyOpen}
            onToggle={(e) => setEnergyOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                {t("agent.ed.energyTitle")}
                <span className="text-xs font-semibold text-muted">{energyRating || "—"}</span>
              </span>
            </summary>
            <fieldset className="grid gap-3 border-t border-slate-300 p-4 sm:grid-cols-2">
              <legend className="sr-only">{t("agent.ed.energyTitle")}</legend>
              <Select name="energyCertType" label={t("agent.ed.energyCertType")} defaultValue={existing?.energyCertType ?? ""}>
                <option value="">—</option>
                <option value="demand">{t("agent.ed.energyDemand")}</option>
                <option value="consumption">{t("agent.ed.energyConsumption")}</option>
              </Select>
              <Select name="energy" label={t("detail.energyClass")} value={energyRating}
                onChange={(e) => setEnergyRating(e.target.value)}>
                <option value="">—</option>
                {["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
              <Input name="energyValue" type="number" inputMode="decimal" step="0.1" min={0}
                label={t("agent.ed.energyValue")} defaultValue={existing?.energyValue} />
              <Input name="energySource" label={t("agent.ed.energySource")} defaultValue={existing?.energySource}
                placeholder={t("agent.ed.energySourcePh")} />
              <Input name="energyCertYear" type="number" inputMode="numeric" min={2000} max={2026}
                label={t("agent.ed.energyYear")} defaultValue={existing?.energyCertYear} />
              <p className="self-end text-xs text-muted">{t("agent.ed.energyNote")}</p>
            </fieldset>
          </details>

          <div className="sm:col-span-2 lg:col-span-3">
            <Textarea name="desc" label={t("detail.description")} rows={4} value={description}
              onChange={(e) => setDescription(e.target.value)} hint={t("agent.ed.descHint")} />
          </div>

          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="mb-1.5 text-sm font-semibold">{t("search.amenities")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES.map((a) => {
                const on = amenities.has(a);
                return (
                  <button key={a} type="button" aria-pressed={on}
                    onClick={() => {
                      markDirty();
                      setAmenities((prev) => { const n = new Set(prev); if (on) n.delete(a); else n.add(a); return n; });
                    }}
                    className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                      on ? "border-action bg-blue-50 text-blue-700" : "border-slate-400 text-slate-800 hover:border-border-strong"
                    }`}>
                    {on && <Check weight="bold" className="size-3.5" aria-hidden />}{t(`amen.${a}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div data-section="location" className={showLocation ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Select name="country" label={t("auth.country")} value={country}
            onChange={(e) => setCountry(e.target.value)}>
            {["Germany", "Austria", "France", "Spain", "Portugal", "Netherlands", "Czechia", "Poland", "Slovakia"].map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Input name="county" label={t("agent.ed.county")} defaultValue={existing?.location.county} />
          <Input name="city" label={t("agent.ed.city")} required value={city}
            onChange={(e) => setCity(e.target.value)} />
          <Input name="zip" label={t("agent.ed.zip")} required value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)} />
          <div className="sm:col-span-2"><Input name="street" label={t("agent.ed.street")} defaultValue={existing?.location.street} hint={t("agent.ed.streetHint")} /></div>
          <Input name="lat" label={t("agent.ed.lat")} defaultValue={existing?.location.geo.lat} hint={t("agent.ed.geoHint")} />
          <Input name="lng" label={t("agent.ed.lng")} defaultValue={existing?.location.geo.lng} />
        </div>

        <div data-section="media" className={showMedia ? "space-y-3" : "hidden"}>
          <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-slate-400 bg-white p-6 text-center transition-colors hover:border-action hover:bg-blue-50/40 lg:p-8">
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

        {showEditPreview && (
          <div data-section="preview" className="lg:hidden">
            {previewPanel}
          </div>
        )}

        {showReview && (
          <div data-section="review" className="space-y-4">
            <dl className="grid gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold text-muted">{t("agent.ed.title")}</dt>
                <dd className="font-semibold">{title.trim() || t("agent.ed.untitled")}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{listingType === "rent" ? t("agent.ed.rentLabel") : t("agent.ed.priceLabel")}</dt>
                <dd className="font-semibold tabular">{fmtPrice(draft, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t("detail.location")}</dt>
                <dd className="font-semibold">{[postalCode, city, country].filter(Boolean).join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t("agent.list.thStatus")}</dt>
                <dd className="font-semibold">{t(`status.${status}`)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">{t("detail.media")}</dt>
                <dd className="font-semibold tabular">{images.length}</dd>
              </div>
            </dl>
            {/* Card lives in the side column on lg — only show inline on smaller screens */}
            <div className="mx-auto w-full max-w-sm lg:hidden">
              {previewPanel}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300 pt-5">
          <Link to={to("/agent/listings")}><Button type="button" variant="ghost">{t("common.cancel")}</Button></Link>
          <div className="flex flex-wrap justify-end gap-2">
            {isEdit ? (
              <Button type="submit" loading={busy}>{t("agent.ed.saveCta")}</Button>
            ) : (
              <>
                {step > 1 && (
                  <Button type="button" variant="secondary" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
                    {t("agent.ed.back")}
                  </Button>
                )}
                {step < WIZARD_TOTAL ? (
                  <Button type="button" onClick={continueWizard}>{t("agent.ed.continue")}</Button>
                ) : (
                  <Button type="submit" loading={busy}>{t("agent.ed.createCta")}</Button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
      </div>

      {showSidePreview && (
        <aside className="hidden lg:block lg:sticky lg:top-6">
          <div className="rounded-xl border border-slate-300 bg-white p-4">
            {previewPanel}
          </div>
        </aside>
      )}
      </div>
      </>
      )}
    </div>
  );
}
