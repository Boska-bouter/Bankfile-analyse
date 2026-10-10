import { useState, useMemo } from "react";
import { CATEGORY_ORDER, sortNl, displayCategory, storedCategoryForChoice, soortenVoor } from "../../classification/categories.js";

// V76 — privé-categorieën samengevoegd in de keuzelijst (zie displayCategory in categories.js).
import { eur } from "../../utils/amounts.js";
import SearchInput from "../shared/SearchInput.jsx";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";

function ReviewRow({ item, defaultCategory, onMark, onConfirm, confirmButtonClass }) {
  const KEUZE_OPTIES = sortNl([...new Set(CATEGORY_ORDER.map(displayCategory))]);
  const [category, setCategory] = useState(item.category || defaultCategory);
  const [type, setType] = useState(item.type || "Prive");

  const apply = (nextCategory, nextType) => {
    setCategory(nextCategory);
    setType(nextType);
    onMark(item, nextCategory, nextType);
  };
  const isDefault = category === defaultCategory && type === (item.type || "Prive");

  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <div className="flex-1 min-w-[10rem]">
        <p className="text-sm font-medium truncate">
          {item.name}{" "}
          <span className={`ml-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold align-middle ${item.amount >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {item.amount >= 0 ? "ontvangen" : "betaald"}
          </span>
        </p>
        <p className="text-xs text-slate-400">{item.count}x · totaal {eur(item.total)}</p>
        {item.description && <ExpandableDescription tx={item} prefix="Omschrijving bank: " className="text-xs text-slate-400" />}
      </div>
      <select value={displayCategory(category)} onChange={(e) => apply(storedCategoryForChoice(e.target.value, category), type)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
        {KEUZE_OPTIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      {soortenVoor(category) && (
        <select value={category} onChange={(e) => apply(e.target.value, type)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500" title="Soort">
          {soortenVoor(category).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      )}
      <select value={type} onChange={(e) => apply(category, e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
        <option value="Prive">Privé</option>
        <option value="Zakelijk">Zakelijk</option>
      </select>
      <button
        onClick={() => onConfirm(item)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${isDefault ? confirmButtonClass : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
      >
        Klopt zo
      </button>
    </div>
  );
}

// title/accentClasses/defaultCategory laten dit component hergebruiken voor zowel "Overboekingen
// aan personen" als "Overig opruimen" — zelfde werkstroom, andere brontabel en kleuraccent.
//
// v226: `items` (nog te bevestigen) en `allItems` (dossierbreed, inclusief al bevestigde
// tegenpartijen) komen nu apart binnen. Vóór deze wijziging viel de lijst, zodra alles bevestigd
// was, terug op `allItems` en toonde die ONVOORWAARDELIJK — dus precies de tegenpartijen die net
// met "Klopt zo" bevestigd waren, bleven met een even actieve "Klopt zo"-knop in beeld staan. Dat
// was zo bedoeld (verder kunnen aanpassen blijft mogelijk), maar zag er voor de gebruiker uit alsof
// de bevestiging niet had gewerkt: "ik heb 'm als klopt zo aangegeven, dus hoeft hij niet meer in
// het overzicht te staan". Nu toont de lijst standaard ALLEEN de nog te bevestigen tegenpartijen
// (dus leeg zodra alles bevestigd is) — bevestigde tegenpartijen zijn alleen nog zichtbaar via de
// expliciete "Toon ook bevestigde tegenpartijen"-schakelaar hieronder.
export default function ReviewStep({ items, allItems, allDone, search, onSearch, onMark, onConfirm, defaultCategory, confirmButtonClass, explanation, bulkAction }) {
  const [showAll, setShowAll] = useState(false);
  const bron = showAll ? allItems : items;
  const filtered = useMemo(() => {
    if (!search.trim()) return bron;
    const q = search.toLowerCase();
    return bron.filter((i) => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }, [bron, search]);
  const aantalBevestigd = (allItems?.length || 0) - items.length;

  return (
    <div className="p-5">
      <p className="text-xs text-slate-500 mb-3 max-w-2xl">{explanation}</p>
      {allDone && !showAll && (
        <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Alles gecontroleerd — niets meer openstaand.
          {aantalBevestigd > 0 && (
            <> <button onClick={() => setShowAll(true)} className="underline font-medium hover:text-emerald-900">Toon alle {aantalBevestigd} bevestigde tegenpartijen</button> als je alsnog iets wilt aanpassen.</>
          )}
        </p>
      )}
      {!allDone && !showAll && aantalBevestigd > 0 && (
        <p className="mb-3 text-xs text-slate-400">
          {aantalBevestigd} tegenpartij(en) hier al bevestigd (niet getoond).{" "}
          <button onClick={() => setShowAll(true)} className="underline hover:text-slate-600">Toon ook bevestigde tegenpartijen</button>.
        </p>
      )}
      {showAll && (
        <p className="mb-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Je ziet nu ook de al bevestigde tegenpartijen — die passen bij een wijziging net zo goed direct alle transacties aan.
          {" "}<button onClick={() => setShowAll(false)} className="underline font-medium hover:text-slate-700">Verberg bevestigde tegenpartijen weer</button>.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SearchInput value={search} onChange={onSearch} placeholder="Zoeken op naam of bankomschrijving…" className="w-72" />
        {!allDone && (Array.isArray(bulkAction) ? bulkAction : bulkAction ? [bulkAction] : []).map((ba) => (
          <button
            key={ba.label}
            onClick={() => {
              if (window.confirm(ba.confirmText || "Weet je het zeker?")) ba.onApply();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-medium hover:bg-amber-100"
          >
            {ba.label}
          </button>
        ))}
      </div>
      <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
        {filtered.map((item) => (
          <ReviewRow key={item.key} item={item} defaultCategory={defaultCategory} onMark={onMark} onConfirm={onConfirm} confirmButtonClass={confirmButtonClass} />
        ))}
        {filtered.length === 0 && (
          <p className="p-4 text-sm text-slate-400 text-center">
            {search.trim() ? `Geen tegenpartijen gevonden voor "${search}"` : "Niets (meer) te tonen."}
          </p>
        )}
      </div>
    </div>
  );
}
