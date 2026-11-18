import { useState } from "react";
import { metBolletjes } from "../shared/StatusDot.jsx";
import JaarSwipe from "../shared/JaarSwipe.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR } from "../../components/ui/stijl.js";
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
  onClose, activeYear, onSelectYear, years, yearProgress, aangifteOpenPunten, meerdereJaren, setMeerdereJaren,
  selectedYears, setSelectedYears, onExport, toonBalansKeuze = false,
}) {
  // nieuw-V8R7 — Boska 18-11: vooraf kiezen "met of zonder balans", zodat het overzicht maar één manier toont.
  const [balans, setBalans] = useState("zonder");
  const balansKeuze = toonBalansKeuze ? (
    <fieldset className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
      <legend className="px-1 text-xs font-medium text-slate-600">Hoe vul je de aangifte in bij de Belastingdienst?</legend>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="balans" className="mt-1" checked={balans === "zonder"} onChange={() => setBalans("zonder")} />
        <span><b className="font-medium">Zonder balans</b><span className="block text-xs text-slate-500">Activa en passiva € 0; privéonttrekkingen sluiten aan op de winst.</span></span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="balans" className="mt-1" checked={balans === "met"} onChange={() => setBalans("met")} />
        <span><b className="font-medium">Met balans</b><span className="block text-xs text-slate-500">Bezittingen en schulden op 1 januari en 31 december, met privéonttrekkingen en -stortingen.</span></span>
      </label>
    </fieldset>
  ) : null;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        {!meerdereJaren ? (
          <JaarSwipe years={years} year={activeYear} onSelectYear={onSelectYear} style={{ display: "block" }}>
          <div className="space-y-3">
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
            {balansKeuze}
            <div className="flex gap-2 flex-wrap pt-1">
              <button
                onClick={() => onExport([activeYear], balans)}
                className={KNOP_PRIMAIR}
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
          </div>
          </JaarSwipe>
        ) : (
          <>
            <p className="text-sm font-medium mb-2">Voor welke jaren een indicatieve aangifteberekening?</p>
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
            <div className="mb-3">{balansKeuze}</div>
            <div className="flex gap-2">
              <button onClick={() => onExport(undefined, balans)} className={KNOP_PRIMAIR}>
                Berekening tonen
              </button>
              <button onClick={() => setMeerdereJaren(false)} className={KNOP_SECUNDAIR}>
                Terug
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
