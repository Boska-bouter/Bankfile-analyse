import { useState } from "react";
import { KeyRound } from "lucide-react";

// Toont de herstelcode van een dossier met wachtwoord.
export default function HerstelcodeModal({ code, nieuw, onSluit }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const kopieer = async () => { try { await navigator.clipboard.writeText(code); setGekopieerd(true); } catch { /* geen klembord */ } };
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-slate-900"><KeyRound className="h-4 w-4 text-teal-700" />Herstelcode</h3>
        <p className="text-xs text-slate-600">
          {nieuw ? "Bewaar deze code op een veilige plek (niet in dezelfde map als het dossier). " : ""}
          Vergeet je het wachtwoord, dan kun je het dossier alleen nog openen met deze code. Er is geen andere manier om het te herstellen.
        </p>
        <p className="rounded-lg bg-slate-100 px-3 py-3 text-center font-mono text-base font-bold tracking-wider text-slate-900 select-all">{code}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={kopieer} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">{gekopieerd ? "Gekopieerd" : "Kopiëren"}</button>
          <button type="button" onClick={onSluit} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800">{nieuw ? "Ik heb de code bewaard" : "Sluiten"}</button>
        </div>
      </div>
    </div>
  );
}
