import { useState, useMemo } from "react";
import { CATEGORY_ORDER } from "../../classification/categories.js";
import { eur } from "../../utils/amounts.js";
import SearchInput from "../shared/SearchInput.jsx";

function ReviewRow({ item, defaultCategory, onMark, onConfirm, confirmButtonClass }) {
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
          <span className={`ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold align-middle ${item.amount >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {item.amount >= 0 ? "ontvangen" : "betaald"}
          </span>
        </p>
        <p className="text-xs text-slate-400">{item.count}x · totaal {eur(item.total)}</p>
        {item.description && (
          <p className="text-xs text-slate-400 truncate" title={item.description}>
            Omschrijving bank: {item.description}
          </p>
        )}
      </div>
      <select value={category} onChange={(e) => apply(e.target.value, type)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs">
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select value={type} onChange={(e) => apply(category, e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs">
        <option value="Prive">Prive</option>
        <option value="Zakelijk">Zakelijk</option>
      </select>
      <button
        onClick={() => onConfirm(item)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${isDefault ? confirmButtonClass : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
      >
        Klopt zo
      </button>
    </div>
  );
}

// title/accentClasses/defaultCategory laten dit component hergebruiken voor zowel "Overboekingen
// aan personen" als "Overig opruimen" — zelfde werkstroom, andere brontabel en kleuraccent.
export default function ReviewStep({ items, allDone, search, onSearch, onMark, onConfirm, defaultCategory, confirmButtonClass, explanation }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }, [items, search]);

  return (
    <div className="p-5">
      <p className="text-xs text-slate-500 mb-3 max-w-2xl">{explanation}</p>
      {allDone && (
        <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          Alles gecontroleerd. Je kunt hier nog steeds wijzigingen maken — die passen direct alle transacties van die tegenpartij aan.
        </p>
      )}
      <SearchInput value={search} onChange={onSearch} placeholder="Zoeken op naam of bankomschrijving…" className="mb-3 w-72" />
      <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
        {filtered.map((item) => (
          <ReviewRow key={item.key} item={item} defaultCategory={defaultCategory} onMark={onMark} onConfirm={onConfirm} confirmButtonClass={confirmButtonClass} />
        ))}
        {filtered.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">Geen tegenpartijen gevonden voor "{search}"</p>}
      </div>
    </div>
  );
}
