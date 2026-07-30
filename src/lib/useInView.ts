import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * true dès que l'élément entre dans le viewport, une seule fois
 * (n'observe plus après le premier déclenchement — pas de re-jeu au scroll arrière).
 */
export function useInView<T extends HTMLElement>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}
