import type { DailyStat } from "@/shared/types";

/** Round up to a clean Y-axis ceiling so ticks read as 0 / mid / max. */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const mag = 10 ** exp;
  const f = n / mag;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * mag;
}

function shortDate(iso: string, locale: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(5);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

/** Evenly spaced indices including first and last — keeps X labels readable. */
function tickIndices(len: number): number[] {
  if (len <= 1) return [0];
  if (len <= 7) return Array.from({ length: len }, (_, i) => i);
  const count = 5;
  const out: number[] = [];
  for (let t = 0; t < count; t++) {
    out.push(Math.round((t / (count - 1)) * (len - 1)));
  }
  return [...new Set(out)];
}

/** Dependency-free views/clicks bar chart (7-day / 30-day per proposal §3.4.3). */
export function BarChart({
  data,
  metric,
  locale = "en",
  ariaLabel,
}: {
  data: DailyStat[];
  metric: "views" | "clicks";
  locale?: string;
  ariaLabel?: string;
}) {
  const maxRaw = Math.max(...data.map((d) => d[metric]), 1);
  const max = niceCeil(maxRaw);
  const ticks = [max, Math.round(max / 2), 0];
  const xTicks = tickIndices(data.length);
  const barTone =
    metric === "views"
      ? "bg-blue-500 group-hover:bg-blue-700"
      : "bg-emerald-500 group-hover:bg-emerald-700";

  return (
    <div
      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
      role="img"
      aria-label={ariaLabel ?? `Daily ${metric}, last ${data.length} days`}
    >
      <div
        className="flex h-36 flex-col justify-between py-0.5 text-right tabular text-[11px] font-semibold text-slate-600 sm:h-40"
        aria-hidden
      >
        {ticks.map((v) => (
          <span key={`y-${v}`}>{v.toLocaleString(locale)}</span>
        ))}
      </div>

      <div className="min-w-0">
        <div className="relative h-36 sm:h-40">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((v) => (
              <div
                key={`g-${v}`}
                className={v === 0 ? "border-t border-slate-300" : "border-t border-dashed border-slate-200"}
              />
            ))}
          </div>

          <div className="relative flex h-full items-end gap-px sm:gap-0.5">
            {data.map((d) => {
              const value = d[metric];
              const pct = Math.max(4, (value / max) * 100);
              const tip = `${shortDate(d.date, locale)} · ${value.toLocaleString(locale)}`;
              return (
                <div key={d.date} className="group relative flex h-full min-w-0 flex-1 items-end">
                  <div
                    className={`w-full rounded-t-sm ${barTone} transition-colors`}
                    style={{ height: `${pct}%` }}
                    title={tip}
                  />
                  <span className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-semibold text-white group-hover:block">
                    {tip}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sparse absolute labels — never cramped into one bar's width */}
        <div className="relative mt-2 h-4" aria-hidden>
          {xTicks.map((i) => {
            const isFirst = i === 0;
            const isLast = i === data.length - 1;
            const left = ((i + 0.5) / data.length) * 100;
            return (
              <span
                key={`x-${data[i].date}`}
                className={`absolute top-0 whitespace-nowrap text-[11px] font-semibold text-slate-600 ${
                  isFirst ? "left-0" : isLast ? "right-0" : "-translate-x-1/2"
                }`}
                style={isFirst || isLast ? undefined : { left: `${left}%` }}
              >
                {shortDate(data[i].date, locale)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
