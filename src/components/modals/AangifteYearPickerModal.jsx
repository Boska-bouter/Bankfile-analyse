import { metBolletjes } from "../shared/StatusDot.jsx";
// Keuzevenster "Indicatieve aangifteberekening": toont de status van het gekozen jaar en laat het
// rapport voor dat jaar (of meerdere jaren) openen. Puur weergave; de selectie en het genereren van het
// rapport zitten in App.jsx.

// Dezelfde statustekst als in het gegenereerde rapport (reports/aangiftevoorstel.js, functie
// statusTekst) — géén apart statussysteem, alleen dezelfde bestaande yearlyProgress-status (afgeleid
// uit categorisatie/onzekere transacties/bestandsgaten) ook zichtbaar vóórdat je het rapport
// genereert. "Groen" betekent hier uitdrukkelijk alleen dat
// de gegevenscontrole voldoende compleet is — niet dat de aangifte fiscaal correct is.
function aangifteStatusTekst(status, aantalPunten) {
  if (status === "rood") return "Nog onvoldoende gegevens voor een betrouwbare reconstructie";
  if (status === "oranje") return `Berekening beschikbaar — ${aantalPunten} punt${aantalPunten === 1 ? "" : "en"} controleren`;
  return "Berekening kan worden opgesteld";
}

export default function AangifteYearPickerModal({
  onClose, activeYear, years, yearProgress, aangifteOpenPunten, meerdereJaren, setMeerdereJaren,
  selectedYears, setSelectedYears, onExport,
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        {!meerdereJaren ? (
          <>
            <p className="text-sm font-medium">Indicatieve aangifteberekening voor {activeYear}</p>
            {yearProgress && (
              <div>
                <p className="text-sm flex items-center gap-1.5">
                  <span>{metBolletjes({ groen: "🟢", oranje: "🟠", rood: "🔴" }[yearProgress.status])}</span>
                  <span className="font-medium">
                    {aangifteStatusTekst(yearProgress.status, aangifteOpenPunten.length)}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Gegevenscontrole, geen fiscale beoordeling.</p>
              </div>
            )}
            {aangifteOpenPunten.length > 0 && (
              <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
                {aangifteOpenPunten.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 flex-wrap pt-1">
              <button
                onClick={() => onExport([activeYear])}
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                Berekening bekijken
              </button>
              <button
                onClick={() => {
                  if (selectedYears.length === 0) setSelectedYears([activeYear]);
                  setMeerdereJaren(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Ander jaar/meerdere jaren kiezen
              </button>
              <button onClick={() => onClose()} className="text-xs text-slate-400 hover:text-slate-600">
                Annuleren
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium mb-2">Voor welke jaren wil je een indicatieve aangifteberekening?</p>
            <div className="flex flex-wrap gap-3 mb-3">
              {years.map((year) => (
                <label key={year} className="inline-flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={(e) => setSelectedYears((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))}
                  />
                  {year}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => onExport()} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800">
                Berekening tonen
              </button>
              <button onClick={() => setMeerdereJaren(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Terug
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
