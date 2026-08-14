import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export type BottomTabItem = {
  href: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  /** When set, renders a button that opens a sheet instead of navigating. */
  onPress?: () => void;
  /** Highlight as active (e.g. More when a secondary route is current). */
  forceActive?: boolean;
};

/**
 * App-style bottom tab bar for agent (and future account) mobile shells.
 * Fixed to the viewport with safe-area padding; DS uses rounded-lg, not pills.
 */
export function BottomTabBar({ items, ariaLabel }: { items: BottomTabItem[]; ariaLabel: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch gap-0.5 px-1 pt-1">
        {items.map((item) => {
          const base =
            "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold leading-tight transition-colors";
          if (item.onPress) {
            return (
              <li key={item.label} className="flex min-w-0 flex-1">
                <button
                  type="button"
                  onClick={item.onPress}
                  title={item.label}
                  aria-current={item.forceActive ? "page" : undefined}
                  className={`${base} cursor-pointer ${
                    item.forceActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-navy"
                  }`}
                >
                  {item.icon}
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex min-w-0 flex-1">
              <NavLink
                to={item.href}
                end={item.end}
                title={item.label}
                className={({ isActive }) =>
                  `${base} ${isActive || item.forceActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-navy"}`
                }
              >
                {item.icon}
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Reserve space so page content isn’t covered by BottomTabBar. */
export const BOTTOM_TAB_PAD = "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0";
