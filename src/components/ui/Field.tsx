import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, className, style, ...props }: FieldProps) {
  return (
    <div className="field" style={style}>
      {label && <label className="field-label">{label}</label>}
      <input
        className={["field-input", error && "has-error", className].filter(Boolean).join(" ")}
        {...props}
      />
      {error && <div className="field-error">{error}</div>}
      {!error && hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}
