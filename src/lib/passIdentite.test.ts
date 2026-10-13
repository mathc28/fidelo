import { randomBytes } from "crypto";
import { describe, expect, it } from "vitest";
import { chiffrer } from "./passCertCrypto";
import {
  identifiantCommerce,
  identifiantNouvelleCarte,
  identitePourCarte,
  nomPortailApple,
  type LigneCertificat,
} from "./passIdentite";

const cle = randomBytes(32);
const PARTAGEE = {
  passTypeIdentifier: "pass.com.fidelo.loyalty",
  cert: "CERT-PARTAGE",
  key: "CLE-PARTAGEE",
};
const LIGNE: LigneCertificat = {
  pass_type_identifier: "pass.app.fiduo.3f9a1c2b",
  cert_pem: "CERT-COMMERCE",
  key_pem_chiffre: chiffrer("CLE-COMMERCE", cle),
};

describe("Pass Type ID d'une nouvelle carte", () => {
  it("commerce avec certificat dédié : son identifiant", () => {
    expect(identifiantNouvelleCarte(LIGNE)).toBe("pass.app.fiduo.3f9a1c2b");
  });

  it("commerce sans certificat dédié : identifiant partagé (null)", () => {
    expect(identifiantNouvelleCarte(null)).toBeNull();
  });
});

describe("certificat de signature d'une carte", () => {
  it("carte d'un commerce sans certificat dédié : certificat partagé", () => {
    const id = identitePourCarte(null, PARTAGEE, null, cle);
    expect(id).toMatchObject({
      passTypeIdentifier: "pass.com.fidelo.loyalty",
      cert: "CERT-PARTAGE",
      dediee: false,
    });
  });

  it("carte créée sous le certificat dédié : certificat du commerce, clé déchiffrée", () => {
    const id = identitePourCarte("pass.app.fiduo.3f9a1c2b", PARTAGEE, LIGNE, cle);
    expect(id).toEqual({
      passTypeIdentifier: "pass.app.fiduo.3f9a1c2b",
      cert: "CERT-COMMERCE",
      key: "CLE-COMMERCE",
      dediee: true,
    });
  });

  it("ancienne carte d'un commerce désormais équipé : reste sur le certificat partagé", () => {
    // La carte est déjà installée sous l'identifiant partagé : la signer avec
    // le nouveau certificat la rendrait impossible à mettre à jour.
    expect(identitePourCarte(null, PARTAGEE, LIGNE, cle).dediee).toBe(false);
    expect(identitePourCarte("pass.com.fidelo.loyalty", PARTAGEE, LIGNE, cle).cert).toBe(
      "CERT-PARTAGE"
    );
  });

  it("identifiant dédié sans certificat : erreur plutôt qu'une carte mal signée", () => {
    expect(() => identitePourCarte("pass.app.fiduo.3f9a1c2b", PARTAGEE, null, cle)).toThrow();
    expect(() => identitePourCarte("pass.app.fiduo.00000000", PARTAGEE, LIGNE, cle)).toThrow();
  });
});

describe("identifiant et nom chez Apple", () => {
  it("pass.app.fiduo. + 8 premiers caractères hexadécimaux de l'UUID", () => {
    expect(identifiantCommerce("3F9A1C2B-0d4e-4b1a-9c3d-2e5f6a7b8c9d")).toBe(
      "pass.app.fiduo.3f9a1c2b"
    );
  });

  it("nom sans accents ni caractères spéciaux", () => {
    expect(nomPortailApple("L'Épicerie & Co.", "3f9a1c2b-x")).toBe("Fiduo L Epicerie Co");
    expect(nomPortailApple("!!!", "3f9a1c2b-x")).toBe("Fiduo 3f9a1c2b");
  });
});
