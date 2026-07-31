interface Props {
  page: number;
  lastPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, lastPage, onChange }: Props) {
  if (lastPage <= 1) return null;
  const pages = Array.from({ length: lastPage }, (_, i) => i + 1);
  const item =
    "flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}
        className={`${item} border-slate-400 bg-white text-slate-800 hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40`}>
        ‹<span className="sr-only">Previous</span>
      </button>
      {pages.map((p) => (
        <button key={p} type="button" onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined}
          className={`${item} ${p === page ? "border-action bg-action text-white" : "border-slate-400 bg-white text-slate-800 hover:border-border-strong"}`}>
          {p}
        </button>
      ))}
      <button type="button" disabled={page === lastPage} onClick={() => onChange(page + 1)}
        className={`${item} border-slate-400 bg-white text-slate-800 hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40`}>
        ›<span className="sr-only">Next</span>
      </button>
    </nav>
  );
}
