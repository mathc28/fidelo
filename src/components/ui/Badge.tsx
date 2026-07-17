import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "error" | "purple" | "blue" | "coral" | "marine";

export function Badge({
  variant,
  dot,
  children,
}: {
  variant: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

const SUBSCRIPTION_LABELS: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: "success", label: "Actif" },
  trialing: { variant: "warning", label: "Essai" },
  past_due: { variant: "error", label: "Paiement en retard" },
};

/** Mappe le statut d'abonnement Supabase (active/trialing/past_due…) sur un badge. */
export function SubscriptionBadge({ status }: { status: string }) {
  const { variant, label } = SUBSCRIPTION_LABELS[status] ?? { variant: "error" as const, label: status };
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

/** Mappe le type de programme (visits/points) sur un badge purple/blue. */
export function ProgramBadge({ programType }: { programType: string }) {
  const isVisits = programType === "visits";
  return (
    <Badge variant={isVisits ? "purple" : "blue"}>
      {isVisits ? "Au passage" : "Aux points"}
    </Badge>
  );
}
