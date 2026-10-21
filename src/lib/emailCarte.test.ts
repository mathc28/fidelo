import { describe, expect, it } from "vitest";
import { construireEmailCarte } from "./emailCarte";

const CONTENU = {
  prenom: "Léa",
  commerce: "L'Épicerie <Fine>",
  solde: "7 passages",
  lienApple: "https://fiduo.app/api/pass/apple/abc",
  lienGoogle: "https://fiduo.app/api/pass/google/abc",
};

describe("email « Votre carte de fidélité »", () => {
  it("affiche le commerce, le solde et les deux liens", () => {
    const { subject, html, text } = construireEmailCarte(CONTENU);
    expect(subject).toBe("Votre carte de fidélité L'Épicerie <Fine>");
    expect(html).toContain("7 passages");
    expect(html).toContain('href="https://fiduo.app/api/pass/apple/abc"');
    expect(html).toContain('href="https://fiduo.app/api/pass/google/abc"');
    expect(html).toContain("https://fiduo.app/brand/logo-full.png");
    expect(html).toContain("#F56C5A");
    expect(html).toContain("hellofiduo@gmail.com");
    expect(text).toContain("https://fiduo.app/api/pass/google/abc");
  });

  it("échappe le nom du commerce et le prénom dans le HTML", () => {
    const { html } = construireEmailCarte({ ...CONTENU, prenom: "<script>x</script>" });
    expect(html).toContain("L&#39;Épicerie &lt;Fine&gt;");
    expect(html).not.toContain("<script>");
  });
});
