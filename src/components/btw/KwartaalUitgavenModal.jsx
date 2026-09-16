import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

export default function KwartaalUitgavenModal({ kwartaalLabel, categorieen, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">Uitgaven (netto) — {kwartaalLabel}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          <p className="text-xs text-slate-500 mb-2">Dit bedrag is de som van onderstaande categorieën (netto, excl. BTW):</p>
          {categorieen.map((r) => (
            <div key={r.categorie} className={`rounded-md px-3 py-2 text-sm ${r.netto < 0 ? "bg-rose-50 border border-rose-200" : "bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{r.categorie}</span>
                <span className={`font-mono shrink-0 ${r.netto < 0 ? "text-rose-700 font-semibold" : "text-slate-600"}`}>{eur(r.netto)}</span>
              </div>
              {r.netto < 0 && (
                <p className="mt-1 text-xs text-rose-700">
                  Ongewoon: dit verlaagt juist de totale uitgaven van het kwartaal — vaak een terugbetaling/creditnota,
                  soms een verkeerd geclassificeerde transactie (bijv. een privé-bedrag dat per ongeluk op "Zakelijk"
                  staat). Controleer dit.
                </p>
              )}
            </div>
          ))}
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
