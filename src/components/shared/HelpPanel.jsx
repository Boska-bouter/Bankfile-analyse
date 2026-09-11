import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

// "Help en uitleg" — in de originele tool een verzameling van meerdere hoofdstukken (BTW-
// percentages, factuurperiode, vaste/variabele kosten, etc.). Die hoofdstukken horen bij
// panelen die hier nog niet zijn overgezet, dus dit toont vooralsnog alleen een geactualiseerde
// introductie. Zodra een nieuw paneel wordt overgezet, hoort het bijbehorende hoofdstuk hier
// ook bij te komen (zie migratieplan).
export default function HelpPanel({ onClose }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-lg border-2 border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Help en uitleg</h2>
          <p className="text-xs text-slate-500 mt-0.5">Deze v2-versie is in migratie — meer hoofdstukken volgen naarmate panelen worden overgezet.</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left"
        >
          <span>Welkom — zo werkt deze tool</span>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        </button>
        {open && (
          <div className="px-5 pb-4 text-xs text-slate-500 max-w-3xl">
            <ol className="space-y-2.5 list-none">
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">1.</span>
                Upload je bank-bestand(en) hieronder (CSV, Excel of MT940). De tool splitst transacties automatisch in categorieën, op basis van dezelfde regels als de vorige versie.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">2.</span>
                Bestanden en instellingen worden automatisch bewaard in deze browser — gebruik "Project opslaan" om ook een back-upbestand te downloaden dat je op een ander apparaat kunt laden.
              </li>
              <li className="flex gap-2.5">
                <span className="text-slate-400 shrink-0">3.</span>
                Deze versie is nog in opbouw: de detailtabel, correcties per tegenpartij, BTW-overzicht, jaaroverzicht en "Werk te doen"-dashboard uit de vorige versie volgen in latere updates.
              </li>
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
