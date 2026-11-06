import { useMemo, useState } from "react";
import { fiscalTreatmentOf } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";

// beide-V17R2 — kleine onbekende bedragen op de zakelijke rekening in één keer naar "Privé opnames" (wens Boska 6-11, regel J).
// Alleen als ze samen onder een percentage van de omzet blijven: dan is het fiscaal de voorzichtige kant (hooguit een paar euro
// aftrek of btw minder). Nooit automatisch; de gebruiker ziet het totaal en beslist zelf. Alle betaalwijzen, niet alleen pin.
export function kleineKandidaten(items, grens) {
  return (items || []).filter((i) => !i.zonderNaam && i.amount < 0 && i.count > 0 && (i.maxBedrag || 0) < grens
    && !i.beideRekeningen && i.type === "Zakelijk");
}
export function omzetVan(classified) {
  return (classified || []).reduce((s, t) => (t.amount > 0 && !t.isMirror && fiscalTreatmentOf(t.category) === "omzet" ? s + t.amount : s), 0);
}

export default function KleineBedragen({ items, classified, onMark }) {
  const [grens, setGrens] = useState(50);
  const [procent, setProcent] = useState(2.5);
  const omzet = useMemo(() => omzetVan(classified), [classified]);
  const kandidaten = useMemo(() => kleineKandidaten(items, Number(grens) || 0), [items, grens]);
  if (!omzet || !kleineKandidaten(items, Infinity).length) return null;
  const boekingen = kandidaten.reduce((n, i) => n + i.count, 0);
  const totaal = Math.abs(kandidaten.reduce((n, i) => n + i.total, 0));
  const aandeel = (totaal / omzet) * 100;
  const binnen = kandidaten.length > 0 && aandeel <= (Number(procent) || 0);
  const toepassen = () => {
    if (!binnen) return;
    if (!window.confirm(`${boekingen} kleine boekingen (${kandidaten.length} tegenpartijen, samen ${eur(totaal)}) op Privé opnames zetten?`)) return;
    for (const i of kandidaten) onMark(i, "Privé opnames", "Zakelijk");
  };
  return (
    <div className="mx-5 mt-3 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2.5 text-xs text-sky-900" data-testid="kleinebedragen">
      <p className="font-semibold mb-1.5">Kleine bedragen op de zakelijke rekening naar privé</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1">
          onder €
          <input type="number" inputMode="decimal" min="1" step="5" value={grens} onChange={(e) => setGrens(e.target.value)} aria-label="Bedraggrens kleine bedragen" className="w-16 rounded-md border border-sky-300 bg-white px-2 py-1" />
        </label>
        <span>
          → <strong>{boekingen}</strong> boekingen, samen {eur(totaal)} = <strong>{aandeel.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%</strong> van de omzet ({eur(omzet)})
        </span>
        <label className="inline-flex items-center gap-1">
          grens
          <input type="number" inputMode="decimal" min="0" step="0.5" value={procent} onChange={(e) => setProcent(e.target.value)} aria-label="Grens in procent van de omzet" className="w-14 rounded-md border border-sky-300 bg-white px-2 py-1" />
          %
        </label>
        <button type="button" onClick={toepassen} disabled={!binnen}
          className="rounded-md border border-sky-400 bg-sky-100 px-3 py-1 font-medium hover:bg-sky-200 disabled:opacity-40">
          Zet op Privé opnames
        </button>
      </div>
      <p className="mt-1.5 text-sky-800/80">
        {binnen
          ? "Fiscaal de voorzichtige kant: hooguit mis je een paar euro aftrek of btw. Zakelijke kosten hierbij (bijv. parkeren) kun je daarna nog los terugzetten."
          : kandidaten.length ? "Samen boven de grens: beter per boeking bekijken." : "Geen onbekende boekingen onder dit bedrag."}
      </p>
    </div>
  );
}
