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

export const SUBSCRIPTION_LABELS: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: "success", label: "Abonnement actif" },
  trialing: { variant: "warning", label: "Période d'essai" },
  past_due: { variant: "error", label: "Paiement en retard" },
  canceled: { variant: "error", label: "Abonnement résilié" },
  unpaid: { variant: "error", label: "Abonnement impayé" },
  incomplete: { variant: "warning", label: "Abonnement incomplet" },
};

/** Libellé et variante d'un statut d'abonnement ; jamais l'enum brut à l'écran. */
export function subscriptionStatus(status: string) {
  return SUBSCRIPTION_LABELS[status] ?? { variant: "error" as const, label: "Abonnement inactif" };
}

/** Mappe le statut d'abonnement Supabase (active/trialing/past_due…) sur un badge. */
export function SubscriptionBadge({ status }: { status: string }) {
  const { variant, label } = subscriptionStatus(status);
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
    <Badge variant={isVisits ? "purple" : "blue"}>{isVisits ? "Au passage" : "Aux points"}</Badge>
  );
}
