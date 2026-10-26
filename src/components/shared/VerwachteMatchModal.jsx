import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import ExpandableDescription from "./ExpandableDescription.jsx";

import { KNOP_PRIMAIR_KLEIN, KNOP_SECUNDAIR_KLEIN } from "../ui/stijl.js";
const LABELS = {
  lease: { titel: "Leaseauto gevonden?", werkwoord: "financiële lease" },
  "lease-overig": { titel: "Lease machine/ander middel gevonden?", werkwoord: "financiële lease van een machine of ander bedrijfsmiddel" },
  lening: { titel: "Lening gevonden?", werkwoord: "lening" },
  aov: { titel: "AOV gevonden?", werkwoord: "AOV" },
};

export default function VerwachteMatchModal({ suggestie, onAccept, onDismiss }) {
  const { type, naam, matches } = suggestie;
  const label = LABELS[type] || { titel: "Gevonden?", werkwoord: "post" };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3" onClick={onDismiss}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">{label.titel}</p>
          <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 text-sm text-slate-600 space-y-3">
          <p>
            Opgegeven is dat er een {label.werkwoord} is bij <strong>"{naam}"</strong>. Er {matches.length === 1 ? "is 1 transactie" : `zijn ${matches.length} transacties`} gevonden die
            hierop lijken:
          </p>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {matches.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{t.counterparty || t.description || "(geen omschrijving)"}</p>
                  <ExpandableDescription tx={t} className="text-[11px] text-slate-400" />
                </div>
                <span className="shrink-0 font-mono text-slate-400">{eur(t.amount)}</span>
              </div>
            ))}
            {matches.length > 10 && <p className="p-2 text-[11px] text-slate-400">en {matches.length - 10} andere...</p>}
          </div>
          <p>Nu meteen zo indelen en de gegevens invullen?</p>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onDismiss} className={KNOP_SECUNDAIR_KLEIN}>
            Nee, dit is het niet
          </button>
          <button onClick={onAccept} className={KNOP_PRIMAIR_KLEIN}>
            Ja, indelen
          </button>
        </div>
      </div>
    </div>
  );
}
