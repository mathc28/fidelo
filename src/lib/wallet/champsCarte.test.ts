import { describe, expect, it, vi } from "vitest";
import { inflateRawSync } from "zlib";
import { champsCarte } from "./champsCarte";

// Certificat auto-signé jetable : buildApplePass signe réellement le pass.
const { cert } = vi.hoisted(() => {
  const forge = require("node-forge");
  const cles = forge.pki.rsa.generateKeyPair(1024);
  const c = forge.pki.createCertificate();
  c.publicKey = cles.publicKey;
  c.serialNumber = "01";
  c.validity.notBefore = new Date("2026-01-01");
  c.validity.notAfter = new Date("2030-01-01");
  const nom = [{ name: "commonName", value: "Test" }];
  c.setSubject(nom);
  c.setIssuer(nom);
  c.sign(cles.privateKey, forge.md.sha256.create());
  return {
    cert: { pem: forge.pki.certificateToPem(c), cle: forge.pki.privateKeyToPem(cles.privateKey) },
  };
});

vi.mock("../config", () => ({
  config: {
    baseUrl: "https://fiduo.app",
    apple: { teamId: "TEAM123", wwdrCert: () => Buffer.from(cert.pem) },
  },
}));
vi.mock("../passAssets", () => ({
  getPassImages: async () => ({ "icon.png": Buffer.from("png") }),
}));
vi.mock("../passCerts", () => ({
  identiteCarte: async () => ({
    cert: Buffer.from(cert.pem),
    key: Buffer.from(cert.cle),
    passphrase: "",
    passTypeIdentifier: "pass.com.fidelo.loyalty",
  }),
}));
vi.mock("../supabaseAdmin", () => ({
  getCardTheme: async () => ({
    bg_color: "#1A2E60",
    text_color: "#F3EFE3",
    label_color: "#F56C5A",
  }),
  db: {
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: null }),
      };
      return q;
    },
  },
}));

import { buildApplePass } from "../applePass";

const SERIAL = "89449768-aaaa-bbbb-cccc-0123456789ab";

describe("champsCarte", () => {
  it("passages en cours : compteur « sur », reste avant la récompense", () => {
    const face = champsCarte({
      programType: "visits",
      points: 7,
      reward: { label: "Un café offert", cost_points: 10 },
      firstName: "Léa",
      serial: SERIAL,
    });
    expect(face).toEqual({
      headerFields: [{ key: "member", label: "MEMBRE", value: "Léa" }],
      primaryFields: [],
      secondaryFields: [
        { key: "balance", label: "VOS PASSAGES", value: "7 sur 10" },
        {
          key: "reward",
          label: "RÉCOMPENSE",
          value: "Plus que 3 avant : Un café offert",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      barcodeAltText: "89449768",
    });
  });

  it("points en cours : compteur « / »", () => {
    const face = champsCarte({
      programType: "points",
      points: 18,
      reward: { label: "-10% sur votre prochain achat", cost_points: 25 },
      firstName: "Mathieu",
      serial: SERIAL,
    });
    expect(face.secondaryFields.map((c) => [c.label, c.value])).toEqual([
      ["VOS POINTS", "18 / 25"],
      ["RÉCOMPENSE", "Plus que 7 avant : -10% sur votre prochain achat"],
    ]);
  });

  it("récompense atteinte : le cadeau à retirer, le solde reste un nombre", () => {
    const face = champsCarte({
      programType: "visits",
      points: 10,
      reward: { label: "Un café offert", cost_points: 10 },
      firstName: "Léa",
      serial: SERIAL,
    });
    expect(face.secondaryFields[0].value).toBe(10);
    expect(face.secondaryFields[1].value).toBe("🎁 Un café offert");
  });
});

/** Lit un fichier d'une archive zip (entrées stockées ou deflate). */
function lireZip(zip: Buffer, nom: string): string {
  let i = 0;
  while (zip.readUInt32LE(i) === 0x04034b50) {
    const methode = zip.readUInt16LE(i + 8);
    const taille = zip.readUInt32LE(i + 18);
    const debut = i + 30 + zip.readUInt16LE(i + 26) + zip.readUInt16LE(i + 28);
    const donnees = zip.subarray(debut, debut + taille);
    const n = zip.subarray(i + 30, i + 30 + zip.readUInt16LE(i + 26)).toString();
    if (n === nom) return (methode === 8 ? inflateRawSync(donnees) : donnees).toString("utf8");
    i = debut + taille;
  }
  throw new Error(`${nom} absent de l'archive`);
}

describe("buildApplePass et champsCarte : mêmes champs", () => {
  const commerce = (program_type: "visits" | "points") =>
    ({
      id: "m1",
      slug: "cafe-cosi",
      name: "Café Cosi",
      theme_id: "t1",
      lat: null,
      program_type,
    }) as never;
  const client = (points: number) =>
    ({
      serial_number: SERIAL,
      auth_token: "jeton-de-test-0123456789abcdef",
      first_name: "Léa",
      email: "lea@exemple.fr",
      points,
      pass_type_identifier: null,
    }) as never;

  it.each([
    ["passages en cours", "visits", 7, { label: "Un café offert", cost_points: 10 }],
    ["points en cours", "points", 18, { label: "-10% sur votre prochain achat", cost_points: 25 }],
    ["récompense atteinte", "visits", 10, { label: "Un café offert", cost_points: 10 }],
    ["sans récompense", "points", 1234, null],
  ] as const)(
    "%s",
    async (_, programme, points, recompense) => {
      const buffer = await buildApplePass(
        client(points),
        commerce(programme),
        recompense ? ({ ...recompense, id: "r1" } as never) : null
      );
      const pass = JSON.parse(lireZip(buffer, "pass.json"));
      const face = champsCarte({
        programType: programme,
        points,
        reward: recompense,
        firstName: "Léa",
        serial: SERIAL,
      });
      expect(pass.storeCard.headerFields).toEqual(face.headerFields);
      expect(pass.storeCard.primaryFields).toEqual(face.primaryFields);
      expect(pass.storeCard.secondaryFields).toEqual(face.secondaryFields);
      expect(pass.barcodes[0].altText).toBe(face.barcodeAltText);
    },
    30000
  );
});
