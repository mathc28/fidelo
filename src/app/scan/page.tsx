"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, Card, Badge } from "@/components/ui";

type Lookup = {
  customer: { serial: string; firstName: string; points: number; memberSince: string };
  programType: "visits" | "points";
  alreadyScannedToday: boolean;
  availableRewards: { id: string; label: string; cost_points: number }[];
  nextReward: { label: string; cost_points: number } | null;
};

const TOKEN_KEY = "fidelite_device_token";
const NAME_KEY = "fidelite_merchant_name";

export default function ScanPage() {
  const [token, setToken] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairError, setPairError] = useState("");

  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);

  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<{ serial: string; at: number }>({ serial: "", at: 0 });

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
    setMerchantName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Device ${localStorage.getItem(TOKEN_KEY)}`,
    };
  }

  // ---------- Appairage ----------
  async function pair() {
    setPairError("");
    const res = await fetch("/api/scan/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: pairCode, label: "Caisse" }),
    });
    if (!res.ok) { setPairError("Code invalide ou expiré."); return; }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(NAME_KEY, data.merchantName);
    setToken(data.token);
    setMerchantName(data.merchantName);
  }

  // ---------- Scan caméra ----------
  async function startScanner() {
    setLookup(null); setSearchResults(null); setFlash("");
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      (decoded: string) => onScan(decoded),
      () => {}
    );
  }

  async function stopScanner() {
    try { await scannerRef.current?.stop(); } catch {}
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

  async function doLookup(body: object) {
    setBusy(true); setFlash("");
    try {
      const res = await fetch("/api/scan/lookup", {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      });
      if (res.status === 401) { unpair(); return; }
      if (!res.ok) { setFlash(`❌ ${await res.text()}`); return; }
      const data = await res.json();
      if (data.results) { setSearchResults(data.results); return; }
      setLookup(data);
      setSearchResults(null);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Actions ----------
  async function earn() {
    if (!lookup) return;
    setBusy(true);
    const res = await fetch("/api/scan/earn", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({
        serial: lookup.customer.serial,
        amountEuros: lookup.programType === "points" ? Number(amount) : undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) { setFlash(`❌ ${await res.text()}`); return; }
    const data = await res.json();
    setFlash(`✅ ${lookup.customer.firstName} : ${data.points} ${lookup.programType === "visits" ? "passage(s)" : "points"}`);
    setLookup(null); setAmount("");
  }

  async function redeem(rewardId: string) {
    if (!lookup) return;
    setBusy(true);
    const res = await fetch("/api/scan/redeem", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ serial: lookup.customer.serial, rewardId }),
    });
    setBusy(false);
    if (!res.ok) { setFlash(`❌ ${await res.text()}`); return; }
    const data = await res.json();
    setFlash(`🎁 ${data.reward} appliquée — reste ${data.points}`);
    setLookup(null);
  }

  function unpair() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    setToken(null);
  }

  // ---------- Écran d'appairage ----------
  if (token === null) {
    return (
      <main style={{ maxWidth: 380, margin: "0 auto", padding: "60px 20px" }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Appairer cette caisse</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 24 }}>
          Saisissez le code à 6 chiffres affiché dans le dashboard
          (Mes caisses → Ajouter un appareil).
        </p>
        <Field style={{ fontSize: 26, textAlign: "center", letterSpacing: 8 }}
          inputMode="numeric" maxLength={6} placeholder="000000"
          value={pairCode} onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ""))} />
        {pairError && <p style={{ color: "var(--color-error)", fontSize: 14 }}>{pairError}</p>}
        <Button size="lg" block onClick={pair} disabled={pairCode.length !== 6}>
          Appairer
        </Button>
      </main>
    );
  }

  // ---------- Écran principal ----------
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontWeight: 700 }}>{merchantName}</span>
        <Button variant="ghost" size="sm" onClick={unpair}>Désappairer</Button>
      </div>

      {flash && (
        <Card style={{ padding: 16, marginBottom: 14, fontSize: 15 }}>
          {flash}
        </Card>
      )}

      {/* Zone caméra */}
      <div id="qr-reader" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: 14 }} />

      {!lookup && !scanning && (
        <>
          <Button size="lg" block onClick={startScanner}>📷 Scanner une carte</Button>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Field style={{ marginBottom: 0, flex: 1 }} placeholder="Ou chercher : nom, email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLookup({ search })} />
            <Button onClick={() => doLookup({ search })} disabled={busy}>
              OK
            </Button>
          </div>
        </>
      )}

      {scanning && (
        <Button size="lg" block variant="secondary" onClick={stopScanner}>
          Annuler
        </Button>
      )}

      {/* Résultats de recherche (client sans téléphone) */}
      {searchResults && (
        <div style={{ marginTop: 8 }}>
          {searchResults.length === 0 && <p style={{ color: "var(--color-text-secondary)" }}>Aucun client trouvé.</p>}
          {searchResults.map((r) => (
            <button key={r.serial_number} onClick={() => doLookup({ serial: r.serial_number })}
              className="card" style={{
                width: "100%", textAlign: "left", padding: 14,
                color: "var(--color-text)", marginBottom: 8, cursor: "pointer", fontSize: 15,
                fontFamily: "inherit",
              }}>
              <strong>{r.first_name}</strong>
              <span style={{ color: "var(--color-text-secondary)" }}> · {r.email} · {r.points} pts</span>
            </button>
          ))}
        </div>
      )}

      {/* Fiche client après scan */}
      {lookup && (
        <div>
          <Card variant="cream" style={{ padding: 18, textAlign: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{lookup.customer.firstName}</p>
            <p style={{ margin: "4px 0 0", fontSize: 38, fontWeight: 800, letterSpacing: -1, color: "var(--color-text)" }}>
              {lookup.customer.points}
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 400 }}>
                {" "}{lookup.programType === "visits" ? "passages" : "points"}
              </span>
            </p>
            {lookup.nextReward && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Prochaine récompense à {lookup.nextReward.cost_points} : {lookup.nextReward.label}
              </p>
            )}
          </Card>

          {lookup.availableRewards.map((r) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--color-success-bg)", border: "1px solid var(--color-success)",
              borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 10,
            }}>
              <span style={{ flex: 1, fontSize: 14 }}>
                🎁 {r.label} <Badge variant="success">{r.cost_points} pts</Badge>
              </span>
              <Button size="sm" variant="primary" onClick={() => redeem(r.id)} disabled={busy}>
                Utiliser
              </Button>
            </div>
          ))}

          {lookup.programType === "visits" ? (
            <Button size="lg" block onClick={earn} disabled={busy || lookup.alreadyScannedToday}>
              {lookup.alreadyScannedToday ? "Passage déjà compté aujourd'hui" : "+1 passage"}
            </Button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Field style={{ marginBottom: 0, flex: 1 }} type="number" inputMode="decimal"
                placeholder="Montant €" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button size="lg" onClick={earn} disabled={busy || !amount}>
                Créditer
              </Button>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <Button variant="ghost" size="sm" onClick={() => { setLookup(null); setFlash(""); }}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
