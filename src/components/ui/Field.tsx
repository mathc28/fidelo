"use client";

import { useId, type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Classe du conteneur ; `className` et `style` vont sur le champ lui-même. */
  wrapperClassName?: string;
}

export function Field({
  label,
  hint,
  error,
  className,
  wrapperClassName,
  id,
  ...props
}: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-note`;
  const note = error || hint;
  return (
    <div className={["field", wrapperClassName].filter(Boolean).join(" ")}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={["field-input", error && "has-error", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        {...props}
      />
      {error && (
        <div id={noteId} className="field-error" role="alert">
          {error}
        </div>
      )}
      {!error && hint && (
        <div id={noteId} className="field-hint">
          {hint}
        </div>
      )}
    </div>
  );
}
