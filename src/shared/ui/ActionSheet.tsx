import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the sheet panel. */
  title: string;
  children: ReactNode;
  /** Optional header row (title text shown when provided). */
  heading?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Phone-first bottom sheet (portal). Used by agent More menu / account menus.
 * Always docks to the bottom — unlike Modal, it does not center on sm+.
 */
export function ActionSheet({ open, onClose, title, heading, children }: ActionSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const els = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end bg-navy/50 lg:items-center lg:justify-center lg:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-elevation-lg lg:max-w-md lg:rounded-xl lg:p-5"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-400 lg:hidden" aria-hidden />
        {heading && <h2 className="mb-3 text-base font-bold text-navy">{heading}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
