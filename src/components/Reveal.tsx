import type { ReactNode } from "react";
import { useInView } from "@/lib/useInView";

/** Fondu + léger glissement vers le haut quand l'élément entre dans l'écran. */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`landing-reveal${inView ? " is-visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
