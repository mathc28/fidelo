import type { HTMLAttributes } from "react";

type CardVariant = "default" | "marine" | "cream";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = "default", className, ...props }: CardProps) {
  const classes = ["card", variant !== "default" && `card-${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...props} />;
}
