import { useEffect, useState } from "react";
import { omzetVan } from "../../classification/kleineBedragen.js";
import { eur } from "../../utils/amounts.js";
import BoekingenLijst from "../shared/BoekingenLijst.jsx";

export { omzetVan };
// beide-V17R2 — kandidaten voor de oude knop "Zet op Privé opnames" (blijft voor de bestaande test).
export function kleineKandidaten(items, grens) {
  return (items || []).filter((i) => !i.zonderNaam && i.amount < 0 && i.count > 0 && (i.maxBedrag || 0) < grens
    && !i.beideRekeningen && i.type === "Zakelijk");
}

// huishoudboekje-V6R9 — melding bovenaan Controleren (wens Boska 8-11): kleine onzekere boekingen tellen niet als open punt.
// De grens is per dossier instelbaar; 0 zet het uit. Zie classification/kleineBedragen.js.
export default function KleineBedragen({ overzicht, groepen = [], metPrive = true, onInstelling, onZetCategorie }) {
  const [toon, setToon] = useState(false);
  const [grens, setGrens] = useState(String(overzicht?.grens ?? 50));
  const [procent, setProcent] = useState(String(overzicht?.procent ?? 2.5));
  useEffect(() => { setGrens(String(overzicht?.grens ?? 50)); setProcent(String(overzicht?.procent ?? 2.5)); }, [overzicht?.grens, overzicht?.procent]);
  if (!overzicht) return null;
  const opslaan = () => {
    const g = Math.max(0, Number(String(grens).replace(",", ".")) || 0);
    const p = Math.max(0, Number(String(procent).replace(",", ".")) || 0);
    onInstelling({ grens: g, procent: p });
  };
  const aan = overzicht.grens > 0;
  // Alleen wat de app niet kon plaatsen (Overig of personen); een voorstel als Parkeren of inkoop blijft staan.
  const zakelijk = groepen.filter((g) => g.type === "Zakelijk" && (g.category === "Overig" || g.category === "Overboekingen aan personen"));
  const zakelijkAantal = zakelijk.reduce((n, g) => n + g.count, 0);
  const zakelijkTotaal = zakelijk.reduce((n, g) => n + g.total, 0);
  return (
    <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900" data-testid="kleinebedragen">
      <p>
        {aan && overzicht.aantal > 0 ? (
          <>
            <strong>{overzicht.aantal} kleine boekingen</strong> ({overzicht.partijen} tegenpartijen, samen {eur(overzicht.totaal)}
            {overzicht.aandeel != null ? ` = ${overzicht.aandeel.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}% van de omzet` : ""}) hoef je niet na te lopen.
            Ze houden de categorie die de app koos en tellen niet als open punt. Wat op Overig of personen staat, telt fiscaal niet mee.
          </>
        ) : aan ? "Geen kleine onzekere boekingen onder de grens." : "Kleine bedragen tellen nu gewoon als open punt."}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-1">
          Klein is per boeking onder €
          <input type="number" inputMode="decimal" min="0" step="5" value={grens} onChange={(e) => setGrens(e.target.value)} aria-label="Bedraggrens kleine boekingen" className="w-16 rounded-md border border-sky-300 bg-white px-2 py-1" />
        </label>
        <label className="inline-flex items-center gap-1">
          samen hooguit
          <input type="number" inputMode="decimal" min="0" step="0.5" value={procent} onChange={(e) => setProcent(e.target.value)} aria-label="Grens in procent van de omzet" className="w-14 rounded-md border border-sky-300 bg-white px-2 py-1" />
          % van de omzet
        </label>
        <button type="button" onClick={opslaan} className="rounded-md border border-sky-400 bg-sky-100 px-3 py-1 font-medium hover:bg-sky-200">Toepassen</button>
        <span className="text-sky-800/70">0 = uit</span>
      </div>
      {groepen.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => setToon((v) => !v)} className="rounded-md border border-sky-300 bg-white px-3 py-1 font-medium hover:bg-sky-100" aria-expanded={toon}>
            {toon ? "Verberg de kleine boekingen" : "Toch nalopen: toon de kleine boekingen"}
          </button>
          {metPrive && zakelijk.length > 0 && (
            <button type="button" onClick={() => { if (window.confirm(`${zakelijkAantal} kleine boekingen op de zakelijke rekening uit Overig en personen (${zakelijk.length} tegenpartijen, samen ${eur(Math.abs(zakelijkTotaal))}) op Privé opnames zetten?`)) onZetCategorie(zakelijk, "Privé opnames"); }}
              className="rounded-md border border-sky-400 bg-sky-100 px-3 py-1 font-medium hover:bg-sky-200">
              Overig en personen op Privé opnames ({zakelijkAantal})
            </button>
          )}
        </div>
      )}
      {toon && (
        <ul className="mt-2 max-h-96 overflow-y-auto divide-y divide-sky-100 rounded-lg border border-sky-200 bg-white text-xs" data-testid="kleinebedragen-lijst">
          {groepen.map((g) => (
            <li key={g.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
              <span className="font-medium text-slate-800 min-w-0 break-words">{g.name}</span>
              <span className="text-slate-500">{g.count}x · {eur(g.total)} · {g.category}{g.type === "Zakelijk" ? " · zakelijke rekening" : ""}</span>
              <span className="flex-1" />
              <BoekingenLijst txs={g.txs} className="basis-full order-last" />
              {metPrive && g.type === "Zakelijk" && g.category !== "Privé opnames" && (
                <button type="button" onClick={() => onZetCategorie([g], "Privé opnames")} className="rounded border border-sky-300 px-2 py-0.5 text-sky-800 hover:bg-sky-50">Privé opname</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
