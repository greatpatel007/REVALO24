import { MagnifyingGlass } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-400 bg-white px-6 py-14 text-center">
      <span aria-hidden className="text-slate-500">
        {icon ?? <MagnifyingGlass className="size-9" />}
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      {children && <div className="max-w-md text-pretty text-sm text-muted">{children}</div>}
    </div>
  );
}
