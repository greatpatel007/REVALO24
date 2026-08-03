import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle, Info, XCircle } from "@phosphor-icons/react";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastItem["tone"]) => void } | null>(null);

const ICONS = {
  success: <CheckCircle weight="fill" className="size-5 shrink-0" aria-hidden />,
  error: <XCircle weight="fill" className="size-5 shrink-0" aria-hidden />,
  info: <Info weight="fill" className="size-5 shrink-0" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastItem["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-elevation-lg ${
              t.tone === "error" ? "bg-err-700" : t.tone === "info" ? "bg-slate-900" : "bg-emerald-700"
            }`}
          >
            {ICONS[t.tone]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
