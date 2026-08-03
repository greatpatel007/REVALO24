import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "premium";
type Size = "md" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg " +
  "transition-[color,background-color,border-color,transform] " +
  "disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer";

const variants: Record<Variant, string> = {
  primary: "bg-action text-white hover:bg-action-hover",
  secondary: "bg-white text-navy border border-slate-400 hover:border-border-strong hover:bg-slate-200/60",
  ghost: "bg-transparent text-slate-800 hover:bg-slate-200",
  danger: "bg-err-600 text-white hover:bg-err-700",
  premium: "bg-premium text-premium-accent hover:bg-champagne-700",
};

/* 44px targets on md/lg — WCAG 2.5.8 AAA per the EU audit */
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-6 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Disable press-scale when motion would distract (e.g. dense toolbars). */
  static?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary", size = "md", loading, static: noScale, children, className = "", disabled, ...rest
}: Props) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${noScale ? "" : "active:scale-[0.96]"} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

/** Anchor styled as a button — for mailto/tel/download links that act like actions.
    Never nest a <button> inside an <a>: invalid HTML and a double tab stop. */
export function ButtonLink({
  variant = "primary", size = "md", static: noScale, children, className = "", ...rest
}: { variant?: Variant; size?: Size; static?: boolean; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={`${base} ${variants[variant]} ${sizes[size]} ${noScale ? "" : "active:scale-[0.96]"} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
