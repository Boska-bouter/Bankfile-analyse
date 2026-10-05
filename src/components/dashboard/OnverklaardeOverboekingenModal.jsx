import { X, Lock } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";

// V73 — bij een verschil in "Controle zakelijk ↔ privé": toont precies welke boekingen aan de andere
// kant geen tegenboeking hebben (zelfde bedrag, binnen 5 dagen), met per boeking wat je eraan kunt doen.
export default function OnverklaardeOverboekingenModal({ items, diff, jaar, onRequestChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">
            Niet-gekoppelde overboekingen zakelijk ↔ privé {jaar} ({items.length})
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pt-3 text-xs text-slate-600 shrink-0">
          Verschil: <strong className="font-mono">{eur(diff)}</strong>. Dit zijn de boekingen waarvan aan de andere kant geen boeking met
          hetzelfde bedrag (binnen 5 dagen) staat. Als je deze goed indeelt of het ontbrekende bestand laadt, wordt het verschil kleiner.
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Alle boekingen zijn gekoppeld.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {items.map(({ tx, kant }) => (
                <div key={tx.id} className="p-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${kant === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {kant === "Zakelijk" ? "Zakelijke rekening" : "Privérekening"}
                    </span>
                    <div className="flex-1 min-w-[9rem]">
                      <p className="font-medium truncate">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
                      <ExpandableDescription tx={tx} className="text-[10px] text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-mono select-all">
                        {tx.date.toLocaleDateString("nl-NL")} · {tx.category} · {tx.counterpartyIban || "geen tegenrekening"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-slate-700 w-24 text-right">{eur(tx.amount)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {kant === "Prive" && !tx.transferLocked ? (
                      <>
                        <button
                          onClick={() => onRequestChange(tx, { category: "Interne overboeking", type: tx.type })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          title="Het geld kwam niet van de zakelijke rekening: telt dan niet mee in deze controle"
                        >
                          Indelen als interne overboeking
                        </button>
                        <span className="text-[10px] text-slate-400">Kwam dit geld niet van zakelijk (bijv. terugbetaling)? Dan hoort het hier niet.</span>
                      </>
                    ) : kant === "Prive" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Lock className="h-3 w-3" /> Herkend op rekeningnummer — de categorie ligt vast. Controleer of het zakelijke bankbestand compleet is.</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        Op de privérekening staat geen ontvangst met dit bedrag. Het geld ging waarschijnlijk naar een andere eigen rekening: laad het bestand van die rekening, of controleer of de privé-afschriften van deze periode compleet zijn.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
