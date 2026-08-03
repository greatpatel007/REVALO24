interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-300 scrollbar-thin">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={`min-h-11 cursor-pointer whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors ${
            t.id === active ? "border-action text-blue-700" : "border-transparent text-muted hover:text-navy"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
