import { KNOP_SECUNDAIR } from "../../components/ui/stijl.js";
// nieuw-V9R8 — Boska 23-11: "Let op, gegevens ontbreken" hoort niet in de indicatieve aangifte, maar vóór het maken,
// zodat het nog te herstellen is. meldingen: { [jaar]: [{ k, tekst }, …] } (tekst kan eenvoudige HTML bevatten, al ge-escaped).
export default function RapportWaarschuwingModal({ meldingen, onHerstel, onDoorgaan, onSluit }) {
  const jaren = Object.keys(meldingen).sort();
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onSluit}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold text-amber-900">Balanscheck: {jaren.reduce((n, j) => n + meldingen[j].length, 0)} punten open</p>
        <p className="text-sm text-slate-600">Deze punten kunnen de berekening onjuist maken. Los ze eerst op of vink ze af in de Balanscheck, of maak de berekening toch.</p>
        {jaren.map((j) => (
          <div key={j} className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">{j}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {meldingen[j].map((m) => <li key={m.k} dangerouslySetInnerHTML={{ __html: m.tekst }} />)}
            </ul>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onHerstel} className="min-h-[48px] min-w-[160px] rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800">Naar Balanscheck</button>
          <button type="button" onClick={onDoorgaan} className={`min-h-[48px] min-w-[160px] ${KNOP_SECUNDAIR}`}>Toch maken</button>
        </div>
      </div>
    </div>
  );
}
