import type { DailyStat } from "@/shared/types";

/** Dependency-free views/clicks bar chart (7-day / 30-day per proposal §3.4.3). */
export function BarChart({ data, metric }: { data: DailyStat[]; metric: "views" | "clicks" }) {
  const max = Math.max(...data.map((d) => d[metric]), 1);
  return (
    <div className="flex h-36 items-end gap-[3px] sm:h-44" role="img" aria-label={`Daily ${metric}, last ${data.length} days`}>
      {/* Wrappers must be full-height flex columns — a % bar height inside an
          auto-height flex item resolves to 0 and the chart renders blank */}
      {data.map((d) => (
        <div key={d.date} className="group relative flex h-full flex-1 items-end">
          <div
            className={`w-full rounded-t-sm transition-colors ${metric === "views" ? "bg-blue-500 group-hover:bg-blue-700" : "bg-emerald-500 group-hover:bg-emerald-700"}`}
            style={{ height: `${Math.max(6, (d[metric] / max) * 100)}%` }}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-navy px-1.5 py-0.5 text-[11px] font-semibold text-white group-hover:block">
            {d.date.slice(5)} · {d[metric]}
          </span>
        </div>
      ))}
    </div>
  );
}
