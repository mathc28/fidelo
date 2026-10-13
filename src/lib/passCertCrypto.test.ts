import { randomBytes } from "crypto";
import forge from "node-forge";
import { describe, expect, it } from "vitest";
import { chiffrer, cleDeChiffrement, cleEtCsr, dechiffrer, derVersPem } from "./passCertCrypto";

const cle = randomBytes(32);
const PEM =
  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----\n";

describe("chiffrement des clés privées", () => {
  it("retrouve exactement le texte d'origine", () => {
    expect(dechiffrer(chiffrer(PEM, cle), cle)).toBe(PEM);
  });

  it("ne stocke jamais la clé en clair, et produit un chiffré différent à chaque fois", () => {
    const a = chiffrer(PEM, cle);
    const b = chiffrer(PEM, cle);
    expect(a).toMatch(/^v1:/);
    expect(a).not.toContain("PRIVATE KEY");
    expect(a).not.toBe(b);
  });

  it("refuse de déchiffrer avec une autre clé", () => {
    expect(() => dechiffrer(chiffrer(PEM, cle), randomBytes(32))).toThrow();
  });

  it("détecte une valeur altérée", () => {
    const valeur = chiffrer(PEM, cle);
    const brut = Buffer.from(valeur.slice(3), "base64");
    brut[brut.length - 1] ^= 0xff;
    expect(() => dechiffrer(`v1:${brut.toString("base64")}`, cle)).toThrow();
  });

  it("refuse un format inconnu", () => {
    expect(() => dechiffrer("v2:abcd", cle)).toThrow("Format");
  });
});

describe("clé de chiffrement", () => {
  it("exige 32 octets", () => {
    expect(cleDeChiffrement(randomBytes(32).toString("base64"))).toHaveLength(32);
    expect(() => cleDeChiffrement(randomBytes(16).toString("base64"))).toThrow("32 octets");
    expect(() => cleDeChiffrement(undefined)).toThrow("manquante");
  });
});

describe("clé et demande de certificat (CSR)", () => {
  it("produit une clé RSA 2048 et une CSR signée par cette clé", () => {
    const { keyPem, csrPem } = cleEtCsr("pass.app.fiduo.3f9a1c2b");
    const csr = forge.pki.certificationRequestFromPem(csrPem);
    expect(csr.verify()).toBe(true);
    expect(csr.subject.getField("CN").value).toBe("pass.app.fiduo.3f9a1c2b");
    const cle = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey;
    expect(cle.n.bitLength()).toBe(2048);
    expect((csr.publicKey as forge.pki.rsa.PublicKey).n.equals(cle.n)).toBe(true);
  });

  it("convertit le certificat DER d'Apple en PEM lisible", () => {
    // Certificat auto-signé de test, encodé comme Apple le renvoie (DER base64).
    const paire = forge.pki.rsa.generateKeyPair(512);
    const cert = forge.pki.createCertificate();
    cert.publicKey = paire.publicKey;
    cert.serialNumber = "01";
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(Date.now() + 86400000);
    cert.setSubject([{ name: "commonName", value: "test" }]);
    cert.setIssuer([{ name: "commonName", value: "test" }]);
    cert.sign(paire.privateKey);
    const der = forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes());

    const pem = derVersPem(der);
    expect(pem).toMatch(/^-----BEGIN CERTIFICATE-----\n/);
    expect(pem.split("\n").every((l) => l.length <= 64)).toBe(true);
    expect(forge.pki.certificateFromPem(pem).subject.getField("CN").value).toBe("test");
  });
});
