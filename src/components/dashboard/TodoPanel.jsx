import { useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";

// Bundelt de losse, jaar-overstijgende signalen (dubbele transacties, review-stappen, wizard-
// vragen, leningen/lease) tot één overzicht. Jaar-specifieke punten (BTW-kwartalen, IB/Zvw-status,
// onzekere classificatie voor het actieve jaar) staan bewust NIET meer hier — die stonden dubbel
// met "Aangifte {jaar}" (zelfde signaal, andere bewoording) en zijn daar samengevoegd. Het
// jaar-percentage/-status per jaar staat ook niet meer hier — dat stond letterlijk dubbel met de
// vaste jaarnavigatie links (StickyYearNav), die dezelfde yearlyProgress-data toont.
//
// Sommige punten (de "verwachte lease/lening/AOV" uit de wizard) horen bij geen concrete plek in
// de tool om naartoe te springen — die blijven anders voor altijd open als de naam een tikfout
// bevat of toch niet relevant blijkt. Zulke items geven `onRename`/`onRemove` mee, waarmee ze hier
// direct te corrigeren of te verwijderen zijn, zonder terug de wizard in te hoeven (die de vraag
// toch maar één keer stelt).
export default function TodoPanel({ items }) {
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");

  if (items.length === 0) return null;

  const startEdit = (item) => {
    setEditingKey(item.key);
    setEditValue(item.naam || "");
  };
  const saveEdit = (item) => {
    item.onRename(editValue.trim());
    setEditingKey(null);
  };

  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-stone-50">
        <p className="text-sm font-semibold">Werk te doen ({items.length})</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.key}>
            {editingKey === item.key ? (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <input
                  type="text"
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(item);
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                  placeholder="Naam (leeg = geen naam bekend)"
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <button onClick={() => saveEdit(item)} className="rounded-md border border-emerald-300 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100" title="Opslaan">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingKey(null)} className="rounded-md border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50" title="Annuleren">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50">
                <button
                  onClick={() => item.ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  disabled={!item.ref}
                  className="flex-1 flex items-center gap-2 text-left text-slate-800 disabled:cursor-default"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item.text}
                </button>
                <span className="flex items-center gap-1 shrink-0">
                  {item.onRename && (
                    <button onClick={() => startEdit(item)} className="rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Naam corrigeren">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {item.onRemove && (
                    <button
                      onClick={() => {
                        if (window.confirm("Dit open punt verwijderen? (bijv. omdat de naam per ongeluk verkeerd is ingevuld tijdens de wizard, of niet relevant blijkt)")) item.onRemove();
                      }}
                      className="rounded-md p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {item.ref && <span className="text-xs text-slate-400">Ga erheen →</span>}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
