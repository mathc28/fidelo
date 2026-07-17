import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  className,
  ...props
}: ButtonProps) {
  const classes = ["btn", `btn-${variant}`, `btn-${size}`, block && "btn-block", className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...props} />;
}
