import { useEffect, useState } from "react";
import { omzetVan } from "../../classification/kleineBedragen.js";
import { eur } from "../../utils/amounts.js";
import BoekingenLijst from "../shared/BoekingenLijst.jsx";

export { omzetVan };
// nieuw-V1R5 — kleine groepen samengevoegd per categorie en soort rekening; grootste aantal eerst.
export function perCategorie(groepen) {
  const m = new Map();
  for (const g of groepen || []) {
    const k = `${g.category}|${g.type}`;
    const c = m.get(k) || { key: k, category: g.category, type: g.type, groepen: [], count: 0, total: 0 };
    c.groepen.push(g); c.count += g.count; c.total += g.total;
    m.set(k, c);
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
}
// beide-V17R2 — kandidaten voor de oude knop "Zet op Privé opnames" (blijft voor de bestaande test).
export function kleineKandidaten(items, grens) {
  return (items || []).filter((i) => !i.zonderNaam && i.amount < 0 && i.count > 0 && (i.maxBedrag || 0) < grens
    && !i.beideRekeningen && i.type === "Zakelijk");
}

// huishoudboekje-V6R9 — melding bovenaan Controleren (wens Boska 8-11): kleine onzekere boekingen tellen niet als open punt.
// De grens is per dossier instelbaar; 0 zet het uit. Zie classification/kleineBedragen.js.
// nieuw-V1R5 — voorstel Boska 9-11: (1) de grens zit achter "Grens aanpassen", met uitleg; de knop heet "Opnieuw berekenen",
// werkt pas na een wijziging en laat zien wat er veranderde. (2) alleen "Akkoord" sluit de melding in (V1R6, Boska 9-11: de Privé-opnameknop niet)
// Controleren af (bevestigd in het dossier); daarna staat dezelfde kaart bij Instellingen, met "Weer tonen bij Controleren".
export default function KleineBedragen({ overzicht, groepen = [], metPrive = true, bevestigd = false, plek = "controleren", onInstelling, onZetCategorie, onBevestig }) {
  const [toon, setToon] = useState(false);
  const [grensOpen, setGrensOpen] = useState(false);
  const [grens, setGrens] = useState(String(overzicht?.grens ?? 50));
  const [procent, setProcent] = useState(String(overzicht?.procent ?? 2.5));
  const [melding, setMelding] = useState(null);
  const [vorigAantal, setVorigAantal] = useState(null);
  useEffect(() => { setGrens(String(overzicht?.grens ?? 50)); setProcent(String(overzicht?.procent ?? 2.5)); }, [overzicht?.grens, overzicht?.procent]);
  // Na "Opnieuw berekenen": zodra de nieuwe telling er is, tonen wat er veranderde.
  useEffect(() => {
    if (vorigAantal == null || !overzicht) return;
    setMelding(`Opnieuw berekend: ${overzicht.aantal} kleine boekingen (was ${vorigAantal}).`);
    setVorigAantal(null);
  }, [overzicht?.aantal, overzicht?.grens, overzicht?.procent]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!overzicht) return null;
  if (plek === "controleren" && bevestigd) return null;
  if (plek === "instellingen" && !bevestigd) return null;
  const getal = (v) => Math.max(0, Number(String(v).replace(",", ".")) || 0);
  const gewijzigd = getal(grens) !== (overzicht.grens ?? 0) || getal(procent) !== (overzicht.procent ?? 0);
  const opslaan = () => {
    if (!gewijzigd) return;
    setVorigAantal(overzicht.aantal);
    onInstelling({ grens: getal(grens), procent: getal(procent), ...(bevestigd ? { bevestigd: true } : {}) });
  };
  const aan = overzicht.grens > 0;
  // Alleen wat de app niet kon plaatsen (Overig of personen); een voorstel als Parkeren of inkoop blijft staan.
  const zakelijk = groepen.filter((g) => g.type === "Zakelijk" && (g.category === "Overig" || g.category === "Overboekingen aan personen"));
  const zakelijkAantal = zakelijk.reduce((n, g) => n + g.count, 0);
  const zakelijkTotaal = zakelijk.reduce((n, g) => n + g.total, 0);
  const knop = "rounded-md border border-sky-400 bg-sky-100 px-3 py-1 font-medium hover:bg-sky-200";
  return (
    <div className={`${plek === "controleren" ? "mb-3" : "mt-3"} rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900`} data-testid={plek === "controleren" ? "kleinebedragen" : "kleinebedragen-instellingen"}>
      {plek === "instellingen" && <p className="mb-1 font-semibold">Kleine boekingen</p>}
      <p>
        {aan && overzicht.aantal > 0 ? (
          <>
            <strong>{overzicht.aantal} kleine boekingen</strong> ({overzicht.partijen} tegenpartijen, samen {eur(overzicht.totaal)}
            {overzicht.aandeel != null ? ` = ${overzicht.aandeel.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}% van de omzet` : ""}) hoef je niet na te lopen.
            Ze houden de categorie die de app koos en tellen niet als open punt. Wat op Overig of personen staat, telt fiscaal niet mee.
          </>
        ) : aan ? "Geen kleine onzekere boekingen onder de grens." : "Kleine bedragen tellen nu gewoon als open punt."}
      </p>
      {melding && <p className="mt-1 text-xs font-medium text-emerald-700" role="status">{melding}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {plek === "controleren" && aan && overzicht.aantal > 0 && (
          <button type="button" onClick={() => onBevestig(true)} className="rounded-md bg-sky-700 px-3 py-1 font-semibold text-white hover:bg-sky-800">Akkoord, niet meer tonen</button>
        )}
        {groepen.length > 0 && (
          <button type="button" onClick={() => setToon((v) => !v)} className="rounded-md border border-sky-300 bg-white px-3 py-1 font-medium hover:bg-sky-100" aria-expanded={toon}>
            {toon ? "Verberg de kleine boekingen" : "Toch nalopen: toon de kleine boekingen"}
          </button>
        )}
        {groepen.length > 0 && metPrive && zakelijk.length > 0 && (
          <button type="button" onClick={() => { if (window.confirm(`${zakelijkAantal} kleine boekingen op de zakelijke rekening uit Overig en personen (${zakelijk.length} tegenpartijen, samen ${eur(Math.abs(zakelijkTotaal))}) op Privé opnames zetten? De rest blijft hier staan tot je op Akkoord klikt.`)) onZetCategorie(zakelijk, "Privé opnames"); }}
            className={knop}>
            Overig en personen op Privé opnames ({zakelijkAantal})
          </button>
        )}
        <button type="button" onClick={() => setGrensOpen((v) => !v)} className="px-1 py-1 font-medium text-sky-800 underline" aria-expanded={grensOpen}>
          {grensOpen ? "Grens verbergen" : "Grens aanpassen"}
        </button>
        {plek === "instellingen" && (
          <button type="button" onClick={() => onBevestig(false)} className="px-1 py-1 font-medium text-sky-800 underline">Weer tonen bij Controleren</button>
        )}
      </div>
      {grensOpen && (
        <div className="mt-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs">
          <p className="mb-2 text-slate-600">Wat telt als klein? Een boeking onder het bedrag, zolang alle kleine boekingen samen niet boven het percentage van de omzet komen (de kleinste eerst). Pas een getal aan en klik op <b>Opnieuw berekenen</b>: de telling hierboven verandert dan mee. 0 zet het uit.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1">
              Per boeking onder €
              <input type="number" inputMode="decimal" min="0" step="5" value={grens} onChange={(e) => { setGrens(e.target.value); setMelding(null); }} aria-label="Bedraggrens kleine boekingen" className="w-16 rounded-md border border-sky-300 bg-white px-2 py-1" />
            </label>
            <label className="inline-flex items-center gap-1">
              samen hooguit
              <input type="number" inputMode="decimal" min="0" step="0.5" value={procent} onChange={(e) => { setProcent(e.target.value); setMelding(null); }} aria-label="Grens in procent van de omzet" className="w-14 rounded-md border border-sky-300 bg-white px-2 py-1" />
              % van de omzet
            </label>
            <button type="button" onClick={opslaan} disabled={!gewijzigd} className={`${knop} disabled:cursor-not-allowed disabled:opacity-50`}>Opnieuw berekenen</button>
          </div>
        </div>
      )}
      {toon && (
        // nieuw-V1R5 — per categorie (Boska 9-11): één keuze per groep; "Privé opname" alleen bij Overig en personen.
        <div className="mt-2 max-h-[32rem] overflow-y-auto space-y-2" data-testid="kleinebedragen-lijst">
          {perCategorie(groepen).map((c) => {
            const overigOfPersonen = c.type === "Zakelijk" && (c.category === "Overig" || c.category === "Overboekingen aan personen");
            return (
              <div key={c.key} className="rounded-lg border border-sky-200 bg-white text-xs">
                <div className="flex flex-wrap items-center gap-2 border-b border-sky-100 bg-sky-50/60 px-3 py-1.5">
                  <span className="font-semibold text-slate-800">{c.category}</span>
                  <span className="text-slate-500">{c.type === "Zakelijk" ? "zakelijke rekening" : "privérekening"} · {c.count}x · {eur(c.total)} · {c.groepen.length} tegenpartij{c.groepen.length === 1 ? "" : "en"}</span>
                  <span className="flex-1" />
                  <button type="button" onClick={() => onZetCategorie(c.groepen, c.category)} className="rounded border border-sky-300 bg-white px-2 py-0.5 font-medium text-sky-800 hover:bg-sky-50">Klopt: alles {c.category}</button>
                  {metPrive && overigOfPersonen && (
                    <button type="button" onClick={() => onZetCategorie(c.groepen, "Privé opnames")} className="rounded border border-sky-300 bg-white px-2 py-0.5 font-medium text-sky-800 hover:bg-sky-50">Alles op Privé opnames</button>
                  )}
                </div>
                <ul className="divide-y divide-sky-100">
                  {c.groepen.map((g) => (
                    <li key={g.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
                      <span className="font-medium text-slate-800 min-w-0 break-words">{g.name}</span>
                      <span className="text-slate-500">{g.count}x · {eur(g.total)}</span>
                      <span className="flex-1" />
                      <BoekingenLijst txs={g.txs} className="basis-full order-last" />
                      {metPrive && overigOfPersonen && (
                        <button type="button" onClick={() => onZetCategorie([g], "Privé opnames")} className="rounded border border-sky-300 px-2 py-0.5 text-sky-800 hover:bg-sky-50">Privé opname</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
