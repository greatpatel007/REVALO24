/* Segmented snap control — DS §13 (replaced the radius slider 2026-07-29).
   Used for radius (5/10/25/50 km), Buy/Rent toggles and discrete choices. */
interface SegProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "md" | "sm";
  /** Allow pills to wrap onto multiple lines inside narrow containers. */
  wrap?: boolean;
  className?: string;
}

export function Seg<T extends string | number>({ options, value, onChange, ariaLabel, size = "md", wrap, className = "" }: SegProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex gap-0.5 rounded-xl bg-slate-200 p-[3px] ${wrap ? "flex-wrap" : ""} ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer whitespace-nowrap rounded-lg font-semibold transition-colors ${
              size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-4 text-[0.82rem]"
            } ${active ? "bg-white text-blue-700 shadow-elevation-sm" : "text-muted hover:text-navy"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const RADIUS_OPTIONS = [5, 10, 25, 50].map((v) => ({ value: v as 5 | 10 | 25 | 50, label: `${v} km` }));
