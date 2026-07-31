import { useEffect } from "react";

/** Warns before the tab closes / reloads while a form has unsaved changes.
    (In-app navigation guards need a data router — planned with the backend
    integration; the browser-level guard covers the worst data-loss case.) */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
