import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Globe } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";
import { LOCALES } from "@/shared/i18n/dictionaries";

/* Language selector per proposal §3.5.2: always visible in the top nav,
   dropdown grid on desktop, bottom sheet on mobile, instant switch. */
export function LanguageSelector() {
  const { locale, switchLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = LOCALES.map((l) => (
    <button
      key={l.code}
      type="button"
      aria-current={l.code === locale ? "true" : undefined}
      onClick={() => { switchLocale(l.code); setOpen(false); }}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
        l.code === locale ? "bg-blue-50 text-blue-700" : "text-slate-800 hover:bg-slate-200"
      }`}
    >
      <span className="t-overline w-6 text-muted">{l.code}</span> {l.label}
    </button>
  ));

  /* Mobile bottom sheet is portaled to <body>: ancestors with backdrop-filter
     (the sticky header) would otherwise trap this fixed overlay. */
  const sheet = open
    ? createPortal(
        <div className="fixed inset-0 z-[95] flex items-end bg-navy/50 sm:hidden" onClick={() => setOpen(false)}>
          <div role="menu" className="grid max-h-[75vh] w-full grid-cols-1 gap-1 overflow-y-auto rounded-t-2xl bg-white p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-400" aria-hidden />
            {options}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-bold uppercase text-slate-800 hover:bg-slate-200"
      >
        <Globe className="size-4.5" aria-hidden /> {locale}
        <CaretDown className="size-3" aria-hidden />
      </button>

      {/* Desktop dropdown grid (absolute, unaffected by the containing-block issue) */}
      {open && (
        <div role="menu" className="absolute right-0 top-full z-90 mt-2 hidden w-[420px] grid-cols-2 gap-1 rounded-xl border border-slate-300 bg-white p-3 shadow-elevation-lg sm:grid">
          {options}
        </div>
      )}

      {sheet}
    </div>
  );
}
