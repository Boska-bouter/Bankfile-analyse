import { useEffect, useState } from "react";

// nieuw-V2R0 — mag deze gebruiker de uitgebreide weergave gebruiken? De Worker vergelijkt het e-mailadres waarmee
// iemand via Cloudflare Access is ingelogd met de lijst "AccessAll" (zie worker/index.js). Geen lijst of niet op
// de lijst = alleen Eenvoudig. Bij een netwerkfout (offline) geldt de laatst bekende uitkomst op dit apparaat.
// Let op: dit schermt schermen af, het beveiligt geen gegevens — alle berekeningen draaien in de browser.
const SLEUTEL = "bankoverzicht.magUitgebreid";
const EMAIL_SLEUTEL = "bankoverzicht.ingelogdAls";

const leesCache = () => { try { const v = localStorage.getItem(SLEUTEL); return v === "1" ? true : v === "0" ? false : null; } catch { return null; } };
const schrijfCache = (v) => { try { localStorage.setItem(SLEUTEL, v ? "1" : "0"); } catch { /* geen opslag */ } };

// Geeft { mag, email }: email = het adres waarmee via Cloudflare Access is ingelogd (null als onbekend).
export function useMagUitgebreid() {
  // Lokaal ontwikkelen (vite dev) heeft geen Worker: dan alles open.
  const dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  const [mag, setMag] = useState(() => (dev ? true : leesCache() ?? false));
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
      })
      .catch(() => { /* offline of geen Worker: laatst bekende waarde blijft staan */ });
    return () => { weg = true; };
  }, [dev]);
  return { mag, email };
}
