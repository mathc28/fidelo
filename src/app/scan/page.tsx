"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ConfirmButton, Field, Logo } from "@/components/ui";
import { unite } from "@/lib/uiText";
import "./scan.css";

type ProgramType = "visits" | "points";

type Lookup = {
  customer: { serial: string; firstName: string; points: number; memberSince: string };
  programType: ProgramType;
  alreadyScannedToday: boolean;
  reward: { label: string; cost_points: number } | null;
  rewardAvailable: boolean;
};

type SearchResult = { serial_number: string; first_name: string; email: string; points: number };

/** Retour d'action : la couleur dit le résultat avant qu'on lise le texte. */
type Flash = { kind: "success" | "error" | "reward"; title?: string; text: string };

const TOKEN_KEY = "fidelite_device_token";
const NAME_KEY = "fidelite_merchant_name";
const NETWORK_ERROR = "Pas de connexion. Vérifiez le réseau et réessayez.";

export default function ScanPage() {
  const [token, setToken] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairError, setPairError] = useState("");
  const [pairing, setPairing] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchProgram, setSearchProgram] = useState<ProgramType>("visits");
  const [flash, setFlash] = useState<Flash | null>(null);
  const [busy, setBusy] = useState(false);

  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastScanRef = useRef<{ serial: string; at: number }>({ serial: "", at: 0 });

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    setToken(t);
    setMerchantName(localStorage.getItem(NAME_KEY) ?? "");
    if (!t) return;
    // Le nom en cache s'affiche tout de suite ; le serveur, qui ne connaît la
    // caisse que par son jeton, le confirme (ou le corrige s'il a changé). Un
    // jeton révoqué depuis le dashboard ramène à l'écran d'appairage.
    fetch("/api/scan/caisse", { headers: { Authorization: `Device ${t}` } })
      .then(async (res) => {
        if (res.status === 401) {
          // Au chargement, rien d'autre à effacer que le jeton et le nom.
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(NAME_KEY);
          setToken(null);
          setMerchantName("");
          return;
        }
        if (!res.ok) return;
        const { merchantName: nom } = (await res.json()) as { merchantName: string };
        localStorage.setItem(NAME_KEY, nom);
        setMerchantName(nom);
      })
      .catch(() => {});
  }, []);

  // Les confirmations s'effacent seules ; une erreur reste jusqu'à la
  // prochaine action, pour qu'on ait le temps de la lire.
  useEffect(() => {
    if (!flash || flash.kind === "error") return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Device ${localStorage.getItem(TOKEN_KEY)}`,
    };
  }

  // ---------- Appairage ----------
  async function pair(e: FormEvent) {
    e.preventDefault();
    setPairError("");
    setPairing(true);
    try {
      const res = await fetch("/api/scan/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairCode, label: "Caisse" }),
      });
      if (!res.ok) {
        setPairError(
          res.status === 429 ? await res.text() : "Code invalide ou expiré. Générez-en un nouveau."
        );
        return;
      }
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(NAME_KEY, data.merchantName);
      setToken(data.token);
      setMerchantName(data.merchantName);
    } catch {
      setPairError(NETWORK_ERROR);
    } finally {
      setPairing(false);
    }
  }

  // ---------- Scan caméra ----------
  async function startScanner() {
    setLookup(null);
    setSearchResults(null);
    setFlash(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded: string) => onScan(decoded),
        () => {}
      );
    } catch (err) {
      setScanning(false);
      const refus = /NotAllowed|Permission/i.test(String(err));
      setFlash({
        kind: "error",
        text: refus
          ? "Caméra refusée : autorisez-la dans les réglages du navigateur, puis réessayez."
          : "Impossible d'ouvrir la caméra. Utilisez la recherche par nom en attendant.",
      });
    }
  }

  async function stopScanner() {
    try {
      await scannerRef.current?.stop();
    } catch {}
    setScanning(false);
  }

  async function onScan(serial: string) {
    // Debounce : ne pas re-traiter le même QR pendant 4 s
    const now = Date.now();
    if (lastScanRef.current.serial === serial && now - lastScanRef.current.at < 4000) return;
    lastScanRef.current = { serial, at: now };

    if (navigator.vibrate) navigator.vibrate(80);
    await stopScanner();
    await doLookup({ serial });
  }

  async function doLookup(body: { serial?: string; search?: string }) {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/scan/lookup", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        oublierCaisse();
        return;
      }
      if (!res.ok) {
        setFlash({ kind: "error", text: await res.text() });
        return;
      }
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
        setSearchProgram(data.programType);
        return;
      }
      setLookup(data);
      setSearchResults(null);
    } catch {
      setFlash({ kind: "error", text: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  }

  // ---------- Actions ----------
  async function earn() {
    if (!lookup) return;
    const isVisits = lookup.programType === "visits";
    // Les montants se tapent à la française : « 12,50 ».
    const montant = Number(amount.replace(",", "."));
    const amountEuros = isVisits ? undefined : montant;
    if (!isVisits && !(montant > 0)) {
      setFlash({ kind: "error", text: "Montant invalide. Exemple : 12,50" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/scan/earn", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ serial: lookup.customer.serial, amountEuros }),
      });
      if (!res.ok) {
        setFlash({ kind: "error", text: await res.text() });
        return;
      }
      const data = await res.json();
      setFlash({
        kind: "success",
        title: `${lookup.customer.firstName} : ${unite(data.points, isVisits)}`,
        text: isVisits ? "Passage compté." : "Points crédités.",
      });
      setLookup(null);
      setAmount("");
    } catch {
      setFlash({ kind: "error", text: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  }

  /** Remet le compteur à zéro via une transaction 'redeem' tracée. */
  async function redeem() {
    if (!lookup) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scan/redeem", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ serial: lookup.customer.serial }),
      });
      if (!res.ok) {
        setFlash({ kind: "error", text: await res.text() });
        return;
      }
      const data = await res.json();
      setFlash({
        kind: "reward",
        title: `${data.reward} pour ${lookup.customer.firstName}`,
        text: "Récompense offerte, compteur remis à zéro.",
      });
      setLookup(null);
    } catch {
      setFlash({ kind: "error", text: NETWORK_ERROR });
    } finally {
      setBusy(false);
    }
  }

  /** Efface l'appairage du navigateur et revient à la saisie du code. */
  function oublierCaisse() {
    void stopScanner();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    setToken(null);
    setMerchantName("");
    setLookup(null);
    setSearchResults(null);
    setFlash(null);
    setPairCode("");
  }

  /**
   * « Déconnecter cette caisse » : le jeton est d'abord révoqué côté serveur,
   * puis oublié. S'il était déjà révoqué (401), on l'oublie aussi. Sans
   * réseau, on ne fait rien : la caisse resterait active côté serveur.
   */
  async function deconnecter() {
    setBusy(true);
    try {
      const res = await fetch("/api/scan/caisse", { method: "DELETE", headers: authHeaders() });
      if (res.ok || res.status === 401) {
        oublierCaisse();
        return;
      }
      setFlash({ kind: "error", text: await res.text() });
    } catch {
      setFlash({
        kind: "error",
        text: "Pas de connexion : la caisse n'est pas déconnectée. Réessayez, ou retirez-la depuis votre espace commerçant.",
      });
    } finally {
      setBusy(false);
    }
  }

  // ---------- Écran d'appairage ----------
  if (token === null) {
    return (
      <main className="auth-shell">
        <Logo height={32} />
        <h1 className="auth-title">Associer cette caisse</h1>
        <p className="auth-lede">
          Saisissez le code à 6 chiffres affiché dans votre espace commerçant, section « Mes caisses
          ».
        </p>
        <form onSubmit={pair}>
          <Field
            label="Code d'association"
            className="field-input--code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={pairCode}
            error={pairError || undefined}
            onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="submit" size="lg" block disabled={pairCode.length !== 6 || pairing}>
            {pairing ? "Association…" : "Associer cette caisse"}
          </Button>
        </form>
      </main>
    );
  }

  const isVisits = lookup?.programType === "visits";

  // ---------- Écran principal ----------
  return (
    <main className="scan">
      {/* Le commerce de la caisse, en premier : on sait d'un coup d'œil pour
          qui on scanne. Il vient du jeton d'appairage, pas de l'URL. */}
      <header className="scan-barre">
        <span className="scan-barre-label">Caisse de</span>
        <h1 className="scan-enseigne">{merchantName || "votre commerce"}</h1>
      </header>

      <div aria-live="polite" role="status">
        {flash && (
          <div className={`flash flash-${flash.kind} scan-flash`}>
            {flash.title && <strong>{flash.title}</strong>}
            {flash.text}
          </div>
        )}
      </div>

      {/* Zone caméra */}
      <div id="qr-reader" className="scan-camera" />

      {busy && !lookup && <p className="scan-attente">Recherche de la carte…</p>}

      {!lookup && !scanning && !busy && (
        <>
          <Button size="lg" block onClick={startScanner}>
            Scanner une carte
          </Button>
          <form
            className="scan-recherche"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) doLookup({ search });
            }}
          >
            <Field
              label="Client sans téléphone"
              placeholder="Prénom ou email"
              enterKeyHint="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={busy || !search.trim()}>
              Chercher
            </Button>
          </form>
        </>
      )}

      {scanning && (
        <Button size="lg" block variant="secondary" onClick={stopScanner}>
          Annuler
        </Button>
      )}

      {/* Résultats de recherche (client sans téléphone) */}
      {searchResults && !lookup && (
        <div style={{ marginTop: 12 }}>
          {searchResults.length === 0 && (
            <p className="scan-attente">Aucun client ne correspond à « {search.trim()} ».</p>
          )}
          {searchResults.map((r) => (
            <button
              key={r.serial_number}
              type="button"
              className="scan-resultat"
              onClick={() => doLookup({ serial: r.serial_number })}
            >
              <strong>{r.first_name}</strong>
              <span className="scan-resultat-meta">
                {" "}
                · {r.email} · {unite(r.points, searchProgram === "visits")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Fiche client après scan */}
      {lookup && (
        <div>
          <div className="scan-fiche">
            <p className="scan-prenom">{lookup.customer.firstName}</p>
            <p className="scan-compteur">
              {lookup.customer.points}{" "}
              <span className="scan-unite">{isVisits ? "passages" : "points"}</span>
            </p>
            {lookup.reward && !lookup.rewardAvailable && (
              <p className="scan-objectif">
                Récompense à {lookup.reward.cost_points} : {lookup.reward.label}
              </p>
            )}
          </div>

          {lookup.rewardAvailable && lookup.reward && (
            <div className="flash flash-success scan-recompense">
              <p>
                <strong>Récompense disponible</strong>
                {lookup.reward.label} ({unite(lookup.reward.cost_points, isVisits)})
              </p>
              <ConfirmButton
                variant="primary"
                size="lg"
                block
                disabled={busy}
                question={`Offrir « ${lookup.reward.label} » ?`}
                confirmLabel="Oui, offrir"
                onConfirm={redeem}
              >
                Offrir la récompense
              </ConfirmButton>
            </div>
          )}

          {isVisits ? (
            lookup.alreadyScannedToday ? (
              <>
                <p className="flash flash-warning scan-avis">
                  Passage déjà compté aujourd&apos;hui pour {lookup.customer.firstName}.
                </p>
                <Button size="lg" block variant="secondary" onClick={() => setLookup(null)}>
                  Terminer
                </Button>
              </>
            ) : (
              <Button size="lg" block onClick={earn} disabled={busy}>
                {busy ? "Enregistrement…" : "+1 passage"}
              </Button>
            )
          ) : (
            <form
              className="scan-credit"
              onSubmit={(e) => {
                e.preventDefault();
                earn();
              }}
            >
              <Field
                label="Montant du ticket (€)"
                type="text"
                inputMode="decimal"
                placeholder="12,50"
                className="mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              <Button type="submit" size="lg" disabled={busy || !amount}>
                Créditer
              </Button>
            </form>
          )}

          <div className="scan-bas">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLookup(null);
                setFlash(null);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* En bas, loin des gestes de caisse : on ne déconnecte pas par mégarde. */}
      {!lookup && !scanning && (
        <footer className="scan-pied">
          <ConfirmButton
            variant="ghost"
            size="sm"
            disabled={busy}
            question={`Déconnecter cette caisse de ${merchantName || "votre commerce"} ?`}
            confirmLabel="Déconnecter"
            onConfirm={deconnecter}
          >
            Déconnecter cette caisse
          </ConfirmButton>
        </footer>
      )}
    </main>
  );
}
