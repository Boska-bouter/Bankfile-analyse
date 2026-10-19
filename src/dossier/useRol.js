import { useEffect, useState } from "react";

// nieuw-V2R0 — mag deze gebruiker de uitgebreide weergave gebruiken? De Worker vergelijkt het e-mailadres waarmee
// iemand via Cloudflare Access is ingelogd met de lijst "AccessAll" (zie worker/index.js). Geen lijst of niet op
// de lijst = alleen Eenvoudig. Bij een netwerkfout (offline) geldt de laatst bekende uitkomst op dit apparaat.
// nieuw-V4R3 — de Worker geeft ook "koppelen" (bankkoppeling) en "beheerder" (scherm Gebruikers en rechten) terug;
// die komen uit de Secrets AccessAll/BEHEERDERS of de D1-tabel "rechten" (zie worker/rechten.js).
// Let op: dit schermt schermen af, het beveiligt geen gegevens — alle berekeningen draaien in de browser.
const SLEUTEL = "bankoverzicht.magUitgebreid";
const EMAIL_SLEUTEL = "bankoverzicht.ingelogdAls";

const leesCache = () => { try { const v = localStorage.getItem(SLEUTEL); return v === "1" ? true : v === "0" ? false : null; } catch { return null; } };
const schrijfCache = (v) => { try { localStorage.setItem(SLEUTEL, v ? "1" : "0"); } catch { /* geen opslag */ } };
const EXTRA_SLEUTEL = "bankoverzicht.rechtenExtra";
const leesExtra = () => { try { const x = JSON.parse(localStorage.getItem(EXTRA_SLEUTEL) || "null"); return x && typeof x === "object" ? x : {}; } catch { return {}; } };

// nieuw-V4R4 — uitloggen bij Cloudflare Access (de inlog blijft anders de ingestelde sessieduur geldig, bijv. 24 uur).
// nieuw-V4R6 — via /uitloggen in de Worker: die beëindigt de eigen sessie, of stuurt door naar Access.
// Eerst de bewaarde rechten wissen, zodat na inloggen met een ander adres niet even de oude rechten gelden.
export function uitloggen() {
  try { [SLEUTEL, EMAIL_SLEUTEL, EXTRA_SLEUTEL].forEach((k) => localStorage.removeItem(k)); } catch { /* geen opslag */ }
  window.location.href = "/uitloggen";
}

// Geeft { mag, email, status, koppelen, beheerder, geldigTot }: email = het adres waarmee via Cloudflare Access is ingelogd (null als onbekend).
export function useMagUitgebreid() {
  // Lokaal ontwikkelen (vite dev) heeft geen Worker: dan alles open.
  const dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  const [mag, setMag] = useState(() => (dev ? true : leesCache() ?? false));
  const [status, setStatus] = useState(dev ? "dev" : "laden"); // laden | ok | geenLijst | geenEmail | nietOpLijst | fout
  const [extra, setExtra] = useState(() => (dev ? { koppelen: true, beheerder: true } : leesExtra()));
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(EMAIL_SLEUTEL) || null; } catch { return null; } });
  useEffect(() => {
    if (dev) return;
    let weg = false;
    fetch("/api/rol", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (weg) return;
        const v = d?.uitgebreid === true;
        schrijfCache(v);
        setMag(v);
        const e = d?.email ? String(d.email).trim().toLowerCase() : null;
        try { if (e) localStorage.setItem(EMAIL_SLEUTEL, e); } catch { /* geen opslag */ }
        setEmail(e);
        const x = { koppelen: d?.koppelen === true, beheerder: d?.beheerder === true, geldigTot: d?.geldigTot || null, aanvragen: Number(d?.aanvragen || 0), aanvraag: d?.aanvraag || null, inlog: d?.inlog || "access" };
        try { localStorage.setItem(EXTRA_SLEUTEL, JSON.stringify(x)); } catch { /* geen opslag */ }
        setExtra(x);
        setStatus(v ? "ok" : !e ? "geenEmail" : d?.lijst === false ? "geenLijst" : "nietOpLijst");
      })
      .catch(() => { if (!weg) setStatus("fout"); /* offline of geen Worker: laatst bekende waarde blijft staan */ });
    return () => { weg = true; };
  }, [dev]);
  // nieuw-V4R5 — aanvragen = openstaande aanmeldingen (alleen voor de beheerder); aanvraag = eigen lopende aanvraag.
  const zetAanvraag = (plan) => setExtra((x) => ({ ...x, aanvraag: plan }));
  const zetAanvragen = (n) => setExtra((x) => ({ ...x, aanvragen: n }));
  return { mag, email, status, koppelen: mag && !!extra.koppelen, beheerder: !!extra.beheerder, geldigTot: extra.geldigTot || null, aanvragen: extra.aanvragen || 0, aanvraag: extra.aanvraag || null, inlog: extra.inlog || "access", zetAanvraag, zetAanvragen };
}
