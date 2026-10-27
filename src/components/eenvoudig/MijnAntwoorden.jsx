import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { mainCategoryOf } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { categorieVoorAntwoord } from "../../calc/eenvoudig.js";
import { soortZoekterm, zoekAntwoord } from "../../calc/zoekAntwoord.js";

// nieuw-V3R1 — "Mijn antwoorden": alle keuzes per tegenpartij, om een vergissing te herstellen. Eerst wat in deze sessie
// in Eenvoudig is beantwoord, daarna de rest op bedrag in het gekozen jaar. Een wijziging geldt voor alle boekingen
// met die naam; "Terug naar de vragen" wist de keuze, zodat de tegenpartij weer als vraag verschijnt.
const KNOP = "rounded-lg border px-2 py-1 text-xs font-semibold";
const typeVan = (cat) => (/^Privé/.test(mainCategoryOf(cat)) || /^Privé/.test(cat) ? "Prive" : "Zakelijk");

export default function MijnAntwoorden({ lijst = [], gekozenKeys = [], jaar, onWijzig, onWis, onClose }) {
  const [zoek, setZoek] = useState("");
  const [alles, setAlles] = useState(gekozenKeys.length === 0);
  // beide-V8R3 — jaarkeuze (wens Boska 27-10): telling, bedrag en zoeken op bedrag/datum alleen in dat jaar; namen zonder
  // boekingen in dat jaar vallen weg. "Alle jaren" laat ook keuzes zien waarvoor geen boeking (meer) in het dossier staat.
  const jaren = useMemo(() => [...new Set(lijst.flatMap((r) => (r.boekingen || []).map((b) => b.jaar)).filter(Boolean))].sort((a, b) => b - a), [lijst]);
  const [kiesJaar, setKiesJaar] = useState(() => (jaren.includes(jaar) ? String(jaar) : "alle"));
  const rijen = useMemo(() => {
    const volgorde = new Map(gekozenKeys.map((k, i) => [k, i]));
    // beide-V8R2 — zoeken op naam, categorie, bedrag of datum (zie calc/zoekAntwoord.js); bij bedrag/datum staat de
    // gevonden boeking erbij.
    const term = soortZoekterm(zoek);
    return lijst
      .map((r) => {
        const boekingen = kiesJaar === "alle" ? r.boekingen || [] : (r.boekingen || []).filter((b) => String(b.jaar) === kiesJaar);
        if (kiesJaar !== "alle" && boekingen.length === 0) return null;
        const t = zoekAntwoord({ ...r, boekingen }, term);
        const bedrag = Math.round(boekingen.reduce((s, b) => s + (Number(b.bedrag) || 0), 0) * 100) / 100;
        return t ? { ...r, aantal: boekingen.length, bedrag, treffer: t.boeking } : null;
      })
      // beide-V8R4 — automatisch ingedeelde namen alleen bij zoeken (anders wordt de lijst te lang).
      .filter((r) => r && (r.automatisch ? !!term : alles || term || volgorde.has(r.key)))
      .sort((a, b) => {
        const ia = volgorde.has(a.key) ? volgorde.get(a.key) : Infinity, ib = volgorde.has(b.key) ? volgorde.get(b.key) : Infinity;
        if (ia !== ib) return ia - ib;
        return Math.abs(b.bedrag) - Math.abs(a.bedrag);
      });
  }, [lijst, gekozenKeys, zoek, alles, kiesJaar]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">Mijn antwoorden</h2>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Klaar</button>
        </div>
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="mb-2 text-xs text-slate-500">Een wijziging geldt voor alle boekingen met die naam, ook in andere jaren. De uitkomst rekent direct mee.</p>
          <div className="flex flex-wrap items-center gap-3">
            <select value={kiesJaar} onChange={(e) => setKiesJaar(e.target.value)} aria-label="Jaar" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="alle">Alle jaren</option>
              {jaren.map((j) => <option key={j} value={String(j)}>{j}</option>)}
            </select>
            <input value={zoek} onChange={(e) => setZoek(e.target.value)} type="search" placeholder="Zoek op naam, categorie, bedrag (40,02) of datum (12-03-2026)…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={alles} onChange={(e) => setAlles(e.target.checked)} /> ook keuzes van eerder of uit Uitgebreid</label>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-2">
          {rijen.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{zoek ? (kiesJaar === "alle" ? "Niets gevonden." : `Niets gevonden in ${kiesJaar}. Kies eventueel "Alle jaren".`) : "Je hebt in deze sessie nog niets beantwoord. Zet het vinkje aan om alle keuzes te zien."}</p>}
          {rijen.slice(0, 200).map((r) => {
            const opties = [["bedrijf", "Bedrijf"], ["prive", "Privé"], ["eigen", "Eigen rekening"]].map(([k, t]) => [k, t, categorieVoorAntwoord(k, r.teken, r.rekening)]);
            return (
              <div key={r.key} className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="min-w-0 font-semibold text-slate-900">{r.naam}</span>
                  <span className="text-xs text-slate-500">{r.aantal === 0 ? "geen boekingen in dit dossier" : <>{r.aantal} {r.aantal === 1 ? "boeking" : "boekingen"}{r.bedrag ? <> · <b className="font-mono text-slate-700">{eur(r.bedrag)}</b></> : null}{kiesJaar === "alle" ? " in alle jaren" : ` in ${kiesJaar}`}</>} · {r.rekening === "Zakelijk" ? "zakelijke " : "privé"}rekening</span>
                </div>
                <p className="mb-1.5 text-xs text-slate-600">Nu: <b>{r.categorieen ? r.categorieen.join(" / ") : r.categorie}</b>
                  {r.automatisch && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">automatisch ingedeeld</span>}
                  {r.treffer && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">gevonden: {r.treffer.datum?.toLocaleDateString?.("nl-NL")} · <b className="font-mono">{eur(r.treffer.bedrag)}</b></span>}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {opties.map(([k, t, patch]) => (
                    <button key={k} type="button" onClick={() => onWijzig(r.key, r.automatisch ? { ...r.basis, ...patch } : patch)} style={{ minHeight: 0 }}
                      className={`${KNOP} ${!r.categorieen && patch.category === r.categorie ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>{t}</button>
                  ))}
                  <CategorieSelect value={r.categorie} onChange={(v) => onWijzig(r.key, { ...(r.automatisch ? r.basis : {}), category: v, type: typeVan(v) })} className="max-w-[14rem] rounded-lg border border-slate-300 px-2 py-1 text-xs" />
                  {!r.automatisch && <button type="button" onClick={() => onWis(r.key)} style={{ minHeight: 0 }} className="ml-auto text-xs text-slate-500 underline hover:text-slate-800">Terug naar de vragen</button>}
                </div>
              </div>
            );
          })}
          {rijen.length > 200 && <p className="py-2 text-xs text-slate-500">… en nog {rijen.length - 200}. Gebruik het zoekveld.</p>}
        </div>
      </div>
    </div>
  );
}
