import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId, useState } from "react";
import { CaretDown, Eye, EyeSlash } from "@phosphor-icons/react";
import { useI18n } from "@/shared/i18n/I18nContext";

const control =
  /* text-base on mobile: iOS Safari zooms the page when a focused input is <16px */
  "w-full min-h-11 rounded-lg border border-border-strong bg-white px-3.5 text-base sm:text-sm text-navy " +
  "placeholder:text-slate-500 focus:border-action disabled:bg-slate-200 disabled:text-muted";

interface FieldShell {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function Shell({ label, hint, error, required, id, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-900">
          {label} {required && <span aria-hidden className="text-err-600">*</span>}
        </label>
      )}
      {children}
      {/* Error and hint can coexist — the hint often explains how to fix the error */}
      {error && <p role="alert" className="text-xs font-medium text-err-700">{error}</p>}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ label, hint, error, required, className = "", type, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <Shell label={label} hint={hint} error={error} required={required} id={id}>
      <span className="relative block">
        <input
          id={id}
          required={required}
          aria-invalid={!!error}
          type={isPassword && show ? "text" : type}
          className={`${control} ${isPassword ? "pr-12" : ""} ${error ? "border-err-600" : ""} ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? t("form.hidePw") : t("form.showPw")}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 hover:text-navy"
          >
            {show ? <EyeSlash className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
          </button>
        )}
      </span>
    </Shell>
  );
}

export function Select({ label, hint, error, required, className = "", children, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} required={required} id={id}>
      {/* appearance-none + Phosphor caret — native select arrows bleed over the padded box */}
      <span className="relative block">
        <select id={id} required={required} className={`${control} cursor-pointer appearance-none pr-9 ${error ? "border-err-600" : ""} ${className}`} {...rest}>
          {children}
        </select>
        <CaretDown weight="bold" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-600" aria-hidden />
      </span>
    </Shell>
  );
}

export function Textarea({ label, hint, error, required, className = "", ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell label={label} hint={hint} error={error} required={required} id={id}>
      <textarea id={id} required={required} rows={4} className={`${control} min-h-24 py-2.5 ${className}`} {...rest} />
    </Shell>
  );
}

/** GDPR consent checkbox — never pre-selected (§5.1). */
export function Consent({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-6 cursor-pointer items-start gap-3 text-sm text-slate-800">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-action"
      />
      <span>{children}</span>
    </label>
  );
}
