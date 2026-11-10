// nieuw-V2R1 — gedeelde namenlijst ophalen bij het openen en, met toestemming, eigen keuzes op bedrijfsnamen terugsturen.
// Zie classification/gedeeldeNamen.js (wat er wel en niet meegaat) en worker/namenlijst.js.
import { useEffect, useRef, useState } from "react";
import { setGedeeldeNamen, gedeeldeNamenVersie, stemmenUit, aiKandidaten, voegAiToe, NIET_DELEN, NOOIT_AI } from "../classification/gedeeldeNamen.js";

const dev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

// Geeft een versienummer dat verandert zodra de lijst (of een AI-uitkomst) binnen is (voor useClassified).
let _zetVersie = null;
export function useGedeeldeNamenLijst(email) {
  const [versie, setVersie] = useState(gedeeldeNamenVersie());
  _zetVersie = setVersie;
  useEffect(() => {
    if (!email || dev) return;
    let weg = false;
    fetch("/api/namen/lijst", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!weg && d?.ok) { setGedeeldeNamen(d); setVersie(gedeeldeNamenVersie()); } })
      .catch(() => { /* offline: zonder lijst verder */ });
    return () => { weg = true; };
  }, [email]);
  return versie;
}

// Stuurt na een korte pauze de eigen keuzes op bedrijfsnamen die nog niet zijn verstuurd (alleen met toestemming).
export function useNamenTerugsturen(classified, toestemming) {
  const verstuurd = useRef(new Map());
  useEffect(() => {
    if (!toestemming || dev || !classified?.length) return;
    const t = setTimeout(() => {
      const nieuw = [];
      for (const [k, c] of stemmenUit(classified)) if (verstuurd.current.get(k) !== c) nieuw.push({ k, c });
      if (!nieuw.length) return;
      for (let i = 0; i < nieuw.length; i += 200) {
        const deel = nieuw.slice(i, i + 200);
        fetch("/api/namen/stem", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ stemmen: deel }) })
          .then((r) => { if (r.ok) for (const { k, c } of deel) verstuurd.current.set(k, c); })
          .catch(() => { /* offline: volgende keer opnieuw */ });
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [classified, toestemming]);
}

// Toestemming aan of uit zetten (ook op de abonnementenpagina /aanmelden te wijzigen).
export function stuurNamenToestemming(aan) {
  return fetch("/api/namen/toestemming", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ aan: !!aan }) })
    .then((r) => r.ok).catch(() => false);
}

// nieuw-V2R2 — namen die niet in de lijst staan opzoeken met AI (worker/namenAi.js). Alleen als de Worker het aan heeft staan
// (/api/rol → namenAi). Hooguit 300 namen per keer open; de Worker bewaart de uitkomst, dus nogmaals vragen kost niets.
export function useNamenOpzoeken(classified, categoryRules, aan) {
  const bezig = useRef(false);
  const mislukt = useRef(0);
  useEffect(() => {
    if (!aan || dev || !classified?.length || bezig.current || mislukt.current >= 3) return;
    const t = setTimeout(async () => {
      const kandidaten = aiKandidaten(classified);
      if (!kandidaten.length) return;
      const categorieen = [...new Set((categoryRules || []).map((r) => r?.name).filter((n) => n && !NIET_DELEN.has(n) && !NOOIT_AI.test(n)))];
      if (categorieen.length < 2) return;
      bezig.current = true;
      const groepen = new Map();
      for (const k of kandidaten) { const g = `${k.soort}|${k.branche}`; if (!groepen.has(g)) groepen.set(g, []); groepen.get(g).push(k); }
      let nieuw = 0;
      try {
        for (const lijst of groepen.values()) {
          for (let i = 0; i < lijst.length; i += 50) {
            const deel = lijst.slice(i, i + 50);
            const r = await fetch("/api/namen/zoek", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
              body: JSON.stringify({ soort: deel[0].soort, branche: deel[0].branche, categorieen, namen: deel.map(({ k, naam }) => ({ k, naam })) }) });
            const d = await r.json().catch(() => null);
            if (!r.ok || !d?.ok) { mislukt.current++; return; }
            // Niet opgezochte namen (limiet) ook onthouden, zodat ze niet steeds opnieuw worden gevraagd.
            const uitkomst = Object.fromEntries(deel.map(({ k }) => [k, d.uitkomst?.[k] ?? null]));
            nieuw += voegAiToe(deel[0].soort, deel[0].branche, uitkomst);
            if (d.rest > 0) return;
          }
        }
      } catch { mislukt.current++; }
      finally {
        bezig.current = false;
        if (nieuw && _zetVersie) _zetVersie(gedeeldeNamenVersie());
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [classified, categoryRules, aan]);
}
