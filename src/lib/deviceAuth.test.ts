import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALPHABET_CODE, formaterCode, genererCode, normaliserCode } from "./codeAppairage";

/*
 * Base en mémoire, juste assez fidèle pour pairing_codes et devices : elle
 * applique les filtres eq / is / gt / lt et l'unicité de la clé « code ».
 */
type Ligne = Record<string, unknown>;
const tables: Record<string, Ligne[]> = { pairing_codes: [], devices: [], merchants: [] };
/** Tables en panne : leurs lectures échouent, comme une base injoignable. */
const pannes = new Set<string>();

class Requete {
  private filtres: ((l: Ligne) => boolean)[] = [];
  private op: "update" | "delete" | null = null;
  private valeurs: Ligne = {};
  constructor(private table: string) {}
  insert(ligne: Ligne) {
    const t = tables[this.table];
    if (this.table === "pairing_codes" && t.some((l) => l.code === ligne.code)) {
      return Promise.resolve({ error: { code: "23505", message: "duplicate key" } });
    }
    t.push({ used_at: null, ...ligne });
    return Promise.resolve({ error: null });
  }
  update(v: Ligne) {
    this.op = "update";
    this.valeurs = v;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filtres.push((l) => l[c] === v);
    return this;
  }
  is(c: string, v: unknown) {
    this.filtres.push((l) => (l[c] ?? null) === v);
    return this;
  }
  gt(c: string, v: string) {
    this.filtres.push((l) => String(l[c]) > v);
    return this;
  }
  lt(c: string, v: string) {
    this.filtres.push((l) => String(l[c]) < v);
    return this;
  }
  select() {
    return this;
  }
  private executer(): Ligne[] {
    const t = tables[this.table];
    const touchees = t.filter((l) => this.filtres.every((f) => f(l)));
    if (this.op === "update") touchees.forEach((l) => Object.assign(l, this.valeurs));
    if (this.op === "delete") tables[this.table] = t.filter((l) => !touchees.includes(l));
    return touchees;
  }
  maybeSingle() {
    if (pannes.has(this.table)) {
      return Promise.resolve({ data: null, error: { message: "connexion perdue" } });
    }
    const [l] = this.executer();
    return Promise.resolve({
      data: l ? { ...l, merchants: { name: "Boulangerie Martin" } } : null,
      error: null,
    });
  }
  then(resoudre?: (r: { error: null }) => void) {
    this.executer();
    resoudre?.({ error: null });
  }
}

// Tirages imposés pour un test ; vide = vrai hasard.
const { tirages } = vi.hoisted(() => ({ tirages: [] as number[] }));
vi.mock("crypto", async (original) => {
  const vrai = await original<typeof import("crypto")>();
  const randomInt = ((n: number) =>
    tirages.length ? tirages.shift()! : vrai.randomInt(n)) as typeof vrai.randomInt;
  return { ...vrai, default: { ...vrai, randomInt }, randomInt };
});

vi.mock("./supabaseAdmin", () => ({
  db: { from: (t: string) => new Requete(t) },
}));

import { NextRequest } from "next/server";
import { createPairingCode, redeemPairingCode, requireDevice } from "./deviceAuth";

beforeEach(() => {
  tables.pairing_codes = [];
  tables.devices = [];
  tables.merchants = [{ id: "m1", name: "Boulangerie Martin" }];
  pannes.clear();
});

describe("format des codes", () => {
  it("8 caractères, uniquement dans l'alphabet sans caractères ambigus", () => {
    for (const ambigu of ["0", "O", "1", "I", "L"]) expect(ALPHABET_CODE).not.toContain(ambigu);
    const code = genererCode((n) => Math.floor(Math.random() * n));
    expect(code).toMatch(new RegExp(`^[${ALPHABET_CODE}]{8}$`));
  });

  it("saisie tolérante : minuscules, tiret et espaces acceptés", () => {
    expect(normaliserCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(formaterCode("ABCD2345")).toBe("ABCD-2345");
  });
});

describe("création d'un code", () => {
  it("purge les codes expirés et enregistre un code valable 10 minutes", async () => {
    tables.pairing_codes.push({
      code: "VIEUXXXX",
      merchant_id: "m0",
      expires_at: "2000-01-01T00:00:00Z",
    });
    const code = await createPairingCode("m1");
    expect(tables.pairing_codes.map((l) => l.code)).toEqual([code]);
    expect(Date.parse(String(tables.pairing_codes[0].expires_at)) - Date.now()).toBeGreaterThan(
      9 * 60 * 1000
    );
  });

  it("retire au sort en cas de collision au lieu de renvoyer le code d'un autre commerce", async () => {
    const futur = new Date(Date.now() + 600_000).toISOString();
    // Toutes les valeurs « AAAAAAAA » sont déjà prises par un autre commerce.
    tables.pairing_codes.push({ code: "AAAAAAAA", merchant_id: "autre", expires_at: futur });
    tirages.push(0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1); // AAAAAAAA puis BBBBBBBB
    const code = await createPairingCode("m1");
    expect(code).toBe("BBBBBBBB");
    expect(tables.pairing_codes.find((l) => l.code === "AAAAAAAA")?.merchant_id).toBe("autre");
  });
});

describe("utilisation d'un code", () => {
  it("un code ne sert qu'une fois", async () => {
    const code = await createPairingCode("m1");
    const premier = await redeemPairingCode(formaterCode(code).toLowerCase(), "Caisse 1");
    const second = await redeemPairingCode(code, "Caisse 2");
    expect(premier).toMatchObject({ merchantName: "Boulangerie Martin" });
    expect(second).toBeNull();
    expect(tables.devices).toHaveLength(1);
  });

  it("refuse un code expiré, inconnu ou mal formé", async () => {
    tables.pairing_codes.push({
      code: "ABCD2345",
      merchant_id: "m1",
      expires_at: "2000-01-01T00:00:00Z",
    });
    expect(await redeemPairingCode("ABCD2345", "")).toBeNull();
    expect(await redeemPairingCode("ZZZZ9999", "")).toBeNull();
    expect(await redeemPairingCode("123456", "")).toBeNull();
    expect(tables.devices).toHaveLength(0);
  });
});

describe("authentification d'une caisse", () => {
  async function caisseAppairee(): Promise<string> {
    const appairage = await redeemPairingCode(await createPairingCode("m1"), "Caisse");
    return appairage!.token;
  }
  const requete = (jeton: string) =>
    new NextRequest("https://fiduo.app/api/scan/caisse", {
      headers: { Authorization: `Device ${jeton}` },
    });

  it("reconnaît une caisse appairée et renvoie son commerce", async () => {
    const auth = await requireDevice(requete(await caisseAppairee()));
    expect(auth?.merchant).toMatchObject({ id: "m1", name: "Boulangerie Martin" });
  });

  it("refuse un jeton inconnu ou révoqué (→ 401, la caisse redemande un code)", async () => {
    const jeton = await caisseAppairee();
    expect(await requireDevice(requete("inconnu"))).toBeNull();
    tables.devices[0].revoked_at = new Date().toISOString();
    expect(await requireDevice(requete(jeton))).toBeNull();
  });

  it("lève sur une panne de base au lieu de refuser : la caisse garde son jeton", async () => {
    const jeton = await caisseAppairee();
    pannes.add("devices");
    await expect(requireDevice(requete(jeton))).rejects.toThrow("connexion perdue");
    pannes.clear();
    pannes.add("merchants");
    await expect(requireDevice(requete(jeton))).rejects.toThrow("connexion perdue");
  });
});
