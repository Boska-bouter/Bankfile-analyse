import { useState } from "react";
import { X } from "lucide-react";

// Los, altijd-beschikbaar venster om de rekeninghouder-/fiscaal-partnernaam (eigenNamen) in te
// vullen of te wijzigen — dezelfde twee velden als stap 10 van de opzet-wizard (SetupWizardModal),
// maar die stap wordt alleen bij de allereerste opzet getoond. Dit venster is er ook voor een
// project waarin die naam nooit is ingevuld (bijv. een ouder project van vóór deze functie), zodat
// je dit niet alleen bij een gloednieuw project kunt instellen.
export default function RekeninghouderModal({ eigenNamen, onSave, onClose }) {
  const [ondernemer, setOndernemer] = useState(eigenNamen?.ondernemer || "");
  const [partner, setPartner] = useState(eigenNamen?.partner || "");

  const save = () => {
    onSave({ ondernemer: ondernemer.trim() || null, partner: partner.trim() || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">Rekeninghouder</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-600">
            Wat is je eigen naam (en die van je fiscaal partner, indien van toepassing)? Zo herkent de tool een
            overboeking naar/van jezelf als privé, ook als de tegenrekening niet is geladen. Deze naam staat ook
            bovenin de tool en in de bestandsnaam bij "Project opslaan".
          </p>
          <input
            type="text"
            value={ondernemer}
            onChange={(e) => setOndernemer(e.target.value)}
            placeholder="Naam rekeninghouder"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            placeholder="Naam fiscaal partner (optioneel)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Annuleren
            </button>
            <button onClick={save} className="rounded-md px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-700">
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
