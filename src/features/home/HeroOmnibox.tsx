import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { autocompleteLocations } from "@/features/property/api";
import { Seg } from "@/shared/ui/Seg";
import { Button } from "@/shared/ui/Button";
import type { CityIndexEntry, ListingType } from "@/shared/types";

export type HeroOmniboxProps = {
  mode: ListingType;
  onModeChange: (mode: ListingType) => void;
  /** Extra classes on the outer relative wrapper (suggestions anchor). */
  className?: string;
  /** Extra classes on the white search form shell. */
  formClassName?: string;
  /** `lg` = taller search-first portal bar. */
  size?: "md" | "lg";
};

/**
 * Shared Buy/Rent + location combobox used by all Home hero variants.
 * ARIA combobox keyboard pattern unchanged from the previous inline hero.
 */
export function HeroOmnibox({ mode, onModeChange, className = "", formClassName = "", size = "md" }: HeroOmniboxProps) {
  const { t, to } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<CityIndexEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const blurCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pad = size === "lg" ? "p-3" : "p-3 sm:p-2";
  const inputMin = size === "lg" ? "min-h-12" : "min-h-11";

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const h = setTimeout(() => {
      void autocompleteLocations(q).then((s) => {
        setSuggestions(s);
        setOpen(true);
        setHighlighted(-1);
      });
    }, 180);
    return () => clearTimeout(h);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(
    () => () => {
      if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
    },
    [],
  );

  const submit = (term = q) => {
    navigate(to(`/properties?type=${mode}${term ? `&q=${encodeURIComponent(term)}` : ""}`));
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      const s = suggestions[highlighted];
      setQ(s.city);
      setOpen(false);
      submit(s.city);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`flex flex-col gap-2.5 rounded-2xl bg-white ${pad} shadow-elevation-lg sm:flex-row sm:items-center sm:gap-2 ${formClassName}`}
      >
        <Seg
          ariaLabel={t("search.listingType")}
          options={[
            { value: "buy", label: t("nav.buy") },
            { value: "rent", label: t("nav.rent") },
          ]}
          value={mode}
          onChange={onModeChange}
          className="!flex w-full !rounded-lg sm:!inline-flex sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
        />
        {/* type=text (not search): Blink/WebKit search chrome mis-centers placeholder on mobile. */}
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (blurCloseRef.current) clearTimeout(blurCloseRef.current);
            if (suggestions.length) setOpen(true);
          }}
          onBlur={() => {
            blurCloseRef.current = setTimeout(() => {
              setOpen(false);
              setHighlighted(-1);
            }, 120);
          }}
          onKeyDown={onSearchKeyDown}
          placeholder={t("hero.placeholder")}
          title={t("hero.placeholderFull")}
          aria-label={t("hero.placeholderFull")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="hero-suggestions"
          aria-activedescendant={highlighted >= 0 ? `hero-suggestion-${highlighted}` : undefined}
          className={`${inputMin} w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-base text-navy placeholder:text-slate-500 focus:border-action focus:bg-white focus:outline-none sm:border-0 sm:bg-transparent sm:px-4 sm:text-sm sm:focus:border-0`}
        />
        <Button type="submit" size="lg" className="w-full rounded-lg sm:w-auto sm:shrink-0">
          <MagnifyingGlass className="size-4.5" weight="bold" aria-hidden />
          {t("common.search")}
        </Button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id="hero-suggestions"
          role="listbox"
          className="absolute inset-x-2 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-elevation-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.city}>
              <button
                type="button"
                id={`hero-suggestion-${i}`}
                role="option"
                aria-selected={i === highlighted}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQ(s.city);
                  setOpen(false);
                  submit(s.city);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-4 text-sm ${i === highlighted ? "bg-blue-50" : ""}`}
              >
                <span>
                  <strong>{s.city}</strong> · {s.country} · {s.zip}
                </span>
                <span className="text-xs text-muted">
                  {s.count} {t("home.listings")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
