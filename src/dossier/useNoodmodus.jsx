import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudOff, X } from "lucide-react";

// beide-V7R9 — noodmodus (wens Boska 27-10): is de server (Cloudflare) niet bereikbaar, dan opent de app toch, uit
// de bewaarde kopie op het apparaat (service worker, zie src/noodmodus/sw.js). Rekenen, dossiers laden en opslaan en
// rapporten werken gewoon, want dat gebeurt allemaal in de browser. Wat de server nodig heeft, werkt tijdelijk niet:
// aanmelden en verlengen, beheer, bankkoppeling en hulpvraag/feedback. Deze hook kijkt of de server antwoordt
// (/api/sessie) en meldt dat met een balk; zolang de server weg is, elke minuut opnieuw, anders elke 5 minuten.
// Een verlopen sessie (doorverwijzing of 401) is géén storing: die meldt useSessieWaarschuwing.
const SNEL_MS = 60 * 1000;
const RUSTIG_MS = 5 * 60 * 1000;
const WACHT_MS = 10 * 1000;

export const NIET_IN_NOODMODUS = "aanmelden en verlengen, beheer, bankkoppeling en hulpvraag of feedback";

// true = server antwoordt niet (geen verbinding, te traag of een foutpagina 5xx van Cloudflare); false = wel.
export async function serverWeg() {
  const stop = new AbortController();
  const t = setTimeout(() => stop.abort(), WACHT_MS);
  try {
    const r = await fetch("/api/sessie", { cache: "no-store", credentials: "same-origin", redirect: "manual", signal: stop.signal });
    return r.status >= 500;
  } catch {
    return true;
  } finally {
    clearTimeout(t);
  }
}

export function useNoodmodus({ uit = false } = {}) {
  const [weg, setWeg] = useState(false);
  const [terug, setTerug] = useState(false); // was weg, is weer bereikbaar
  const vorige = useRef(false);
  useEffect(() => {
    if (uit) return;
    let stop = false, timer = null;
    const kijk = async () => {
      clearTimeout(timer);
      const w = await serverWeg();
      if (stop) return;
      if (vorige.current && !w) setTerug(true);
      if (w) setTerug(false);
      vorige.current = w;
      setWeg(w);
      timer = setTimeout(kijk, w ? SNEL_MS : RUSTIG_MS);
    };
    kijk();
    const opnieuw = () => { if (document.visibilityState !== "hidden") kijk(); };
    window.addEventListener("online", opnieuw);
    window.addEventListener("focus", opnieuw);
    document.addEventListener("visibilitychange", opnieuw);
    return () => {
      stop = true; clearTimeout(timer);
      window.removeEventListener("online", opnieuw);
      window.removeEventListener("focus", opnieuw);
      document.removeEventListener("visibilitychange", opnieuw);
    };
  }, [uit]);
  return { weg, terug, sluitTerug: () => setTerug(false) };
}

export function NoodmodusBalk({ nood }) {
  if (nood?.weg) {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm" role="status">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="flex-1 min-w-[14rem]">
          <strong>Noodmodus: de server is tijdelijk niet bereikbaar.</strong> Dossiers openen, bankbestanden inlezen, rekenen,
          rapporten en dossier opslaan werken gewoon; alles gebeurt op dit apparaat. Tijdelijk niet beschikbaar: {NIET_IN_NOODMODUS}.
          <span className="block text-xs text-amber-800">De app kijkt elke minuut of de server terug is.</span>
        </p>
      </div>
    );
  }
  if (nood?.terug) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm" role="status">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="flex-1 min-w-[14rem]">De server is weer bereikbaar; alles werkt weer. Sla het dossier op en vernieuw daarna de app, zodat ook de rechten en tarieven weer van de server komen.</p>
        <button type="button" onClick={nood.sluitTerug} className="shrink-0 rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100" title="Verbergen"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return null;
}

// Inhoud voor ConfirmDialog als iemand in de noodmodus iets kiest dat de server nodig heeft.
export const nietBeschikbaar = (wat) => ({
  title: `${wat} is even niet beschikbaar`,
  message: (
    <p>
      De server is op dit moment niet bereikbaar (noodmodus). {wat} heeft de server nodig en werkt weer zodra die terug is.
      Met dossiers op dit apparaat kan gewoon verder worden gewerkt.
    </p>
  ),
  actions: [],
});
