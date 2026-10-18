import { X } from "lucide-react";

// nieuw-V1R02 — eerste vraag bij een nieuw dossier: eenvoudig of uitgebreid. Bepaalt welke wizard volgt
// (verkort of volledig) en in welke weergave het dossier opent. Later altijd te wisselen.
export default function ModusKeuze({ onKies, onClose, geladen = false, huidig = null }) {
  const Kaart = ({ modus, titel, tekst, punten }) => (
    <button type="button" onClick={() => onKies(modus)} className={`flex-1 rounded-2xl border-2 p-5 text-left hover:border-teal-600 hover:bg-teal-50 ${huidig === modus ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-white"}`}>
      {huidig === modus && <span className="mb-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Zo opgeslagen</span>}
      <span className="block text-lg font-bold text-slate-900">{titel}</span>
      <span className="mt-1 block text-sm text-slate-600">{tekst}</span>
      <ul className="mt-3 space-y-1 text-xs text-slate-500">{punten.map((p) => <li key={p}>• {p}</li>)}</ul>
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /> {geladen ? "Zoals opgeslagen" : "Sluiten"}</button>
        <h2 className="text-xl font-bold">{geladen ? "Dossier geladen" : "Nieuw dossier"}</h2>
        <p className="mb-4 text-sm text-slate-600">{geladen ? "In welke weergave wil je het dossier openen?" : "Hoe wil je werken?"} Je kunt later altijd wisselen; er gaat niets verloren.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Kaart modus="eenvoudig" titel="Eenvoudig" tekst="Ik wil snel zien wat ik verdiend heb en ongeveer aan belasting en BTW moet betalen."
            punten={geladen ? ["Vier stappen", "Eén vraag tegelijk", "Uitkomst in gewone taal"] : ["Korte wizard met alleen de nodige vragen", "Daarna één vraag tegelijk", "Uitkomst in gewone taal"]} />
          <Kaart modus="uitgebreid" titel="Uitgebreid" tekst="Volledige controle, voor de adviseur of een aangifte."
            punten={geladen ? ["Alle controles en instellingen", "Aangifteberekening en onderbouwing"] : ["Volledige wizard", "Alle controles en instellingen", "Aangifteberekening en onderbouwing"]} />
        </div>
      </div>
    </div>
  );
}
