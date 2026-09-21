"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";

type ButtonProps = Parameters<typeof Button>[0];

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  children: ReactNode;
  /** Question posée au second temps, ex. « Retirer « Caisse 1 » ? ». */
  question: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Action irréversible en deux temps, sans fenêtre modale : le bouton cède
 * la place à la question et à « Confirmer / Annuler » au même endroit.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel = "Confirmer",
  onConfirm,
  variant = "destructive",
  size = "sm",
  block,
  disabled,
  ...props
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        block={block}
        disabled={disabled}
        onClick={() => setAsking(true)}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return (
    <div className="confirm" role="group" style={block ? { width: "100%" } : undefined}>
      <span className="confirm-question">{question}</span>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        autoFocus
        onClick={async () => {
          await onConfirm();
          setAsking(false);
        }}
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" size={size} onClick={() => setAsking(false)}>
        Annuler
      </Button>
    </div>
  );
}
