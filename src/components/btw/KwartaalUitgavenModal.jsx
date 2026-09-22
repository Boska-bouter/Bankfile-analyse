import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

// Herbruikbare uitsplitsings-pop-up: bij "netto" toont 'm hoe "Uitgaven (netto)" is opgebouwd, bij
// "btw" hoe "Voorbelasting" is opgebouwd — zelfde soort waarschuwing in beide gevallen: een
// categorie die het totaal juist verlaagt (negatief bedrag hier) is ongewoon, meestal een
// terugbetaling/creditnota of een verkeerd geclassificeerde transactie.
export default function KwartaalUitgavenModal({ titel, categorieen, veld = "netto", onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">{titel}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          <p className="text-xs text-slate-500 mb-2">
            Dit bedrag is de som van onderstaande categorieën ({veld === "btw" ? "de BTW erover" : "netto, excl. BTW"}):
          </p>
          {categorieen.map((r) => {
            const bedrag = r[veld];
            return (
              <div key={r.categorie} className={`rounded-md px-3 py-2 text-sm ${bedrag < 0 ? "bg-rose-50 border border-rose-200" : "bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.categorie}</span>
                  <span className={`font-mono shrink-0 ${bedrag < 0 ? "text-rose-700 font-semibold" : "text-slate-600"}`}>{eur(bedrag)}</span>
                </div>
                {bedrag < 0 && (
                  <p className="mt-1 text-xs text-rose-700">
                    Ongewoon: dit verlaagt juist het totaal — vaak een terugbetaling/creditnota, soms een verkeerd
                    geclassificeerde transactie (bijv. een privé-bedrag dat per ongeluk op "Zakelijk" staat).
                    Controleer dit.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 shrink-0 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
