import { useMemo, useState } from "react";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { displayCategory, getCategorieProfiel } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";

// beide-V16R3 — "Overig" opruimen: alle onbekende pinbetalingen onder een bedrag in één keer op een categorie (wens Boska 5-11).
// Alleen tegenpartijen waarvan ALLE boekingen pinbetalingen (betaald) onder het bedrag zijn, en die op één rekening staan; per
// rekening apart, omdat zakelijk en privé iets anders betekenen. Daarna leert de app ervan (lerenVanKeuzes.js).
export function pinKandidaten(items, grens, rekening) {
  return (items || []).filter((i) => !i.zonderNaam && i.amount < 0 && i.count > 0 && i.pinAantal === i.count && (i.maxBedrag || 0) < grens
    && !i.beideRekeningen && (i.type === "Zakelijk" ? "Zakelijk" : "Prive") === rekening);
}

export default function PinBulk({ items, onMark }) {
  const rekeningen = useMemo(() => ["Zakelijk", "Prive"].filter((r) => pinKandidaten(items, Infinity, r).length > 0), [items]);
  const [rekening, setRekening] = useState(null);
  const [grens, setGrens] = useState(50);
  const [categorie, setCategorie] = useState("");
  const rek = rekening && rekeningen.includes(rekening) ? rekening : rekeningen[0];
  const kandidaten = useMemo(() => (rek ? pinKandidaten(items, Number(grens) || 0, rek) : []), [items, grens, rek]);
  if (!rekeningen.length) return null;
  const boekingen = kandidaten.reduce((n, i) => n + i.count, 0);
  const totaal = kandidaten.reduce((n, i) => n + i.total, 0);
  const toepassen = () => {
    if (!categorie || !kandidaten.length) return;
    const tekst = `${kandidaten.length} tegenpartij(en) met alleen pinbetalingen onder ${eur(Number(grens))} (${boekingen} boekingen, ${eur(totaal)}) op ${displayCategory(categorie)} zetten?`;
    if (!window.confirm(tekst)) return;
    for (const i of kandidaten) onMark(i, categorie, rek);
    setCategorie("");
  };
  return (
    <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-xs text-amber-900" data-testid="pinbulk">
      <p className="font-semibold mb-1.5">Onbekende pinbetalingen in één keer indelen</p>
      <div className="flex flex-wrap items-center gap-2">
        {rekeningen.length > 1 && !getCategorieProfiel() ? (
          <select value={rek} onChange={(e) => setRekening(e.target.value)} aria-label="Rekening" className="rounded-md border border-amber-300 bg-white px-2 py-1">
            <option value="Zakelijk">zakelijke rekening</option>
            <option value="Prive">privérekening</option>
          </select>
        ) : (
          <span>{getCategorieProfiel() ? "Pinbetalingen" : rek === "Zakelijk" ? "Zakelijke rekening" : "Privérekening"}</span>
        )}
        <label className="inline-flex items-center gap-1">
          onder €
          <input type="number" inputMode="decimal" min="1" step="5" value={grens} onChange={(e) => setGrens(e.target.value)} aria-label="Bedraggrens" className="w-16 rounded-md border border-amber-300 bg-white px-2 py-1" />
        </label>
        <span>
          → <strong>{kandidaten.length}</strong> tegenpartij(en), {boekingen} boekingen, {eur(totaal)}
        </span>
        <CategorieSelect value={categorie} onChange={setCategorie} placeholder="kies categorie…" className="min-w-[12rem] rounded-md border border-amber-300 bg-white px-2 py-1" />
        <button type="button" onClick={toepassen} disabled={!categorie || !kandidaten.length}
          className="rounded-md border border-amber-400 bg-amber-100 px-3 py-1 font-medium hover:bg-amber-200 disabled:opacity-40">
          Toepassen
        </button>
      </div>
      {kandidaten.length > 0 && (
        <p className="mt-1.5 text-amber-800/80">Bijvoorbeeld: {kandidaten.slice(0, 4).map((i) => i.name).join(", ")}{kandidaten.length > 4 ? ` en nog ${kandidaten.length - 4}` : ""}.</p>
      )}
    </div>
  );
}
