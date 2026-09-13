import { useState, useEffect } from "react";
import { Building2, Home, FileSpreadsheet, ChevronRight } from "lucide-react";

const STEP_LABELS = { 0: "Rekening", 1: "KOR", 2: "BTW-verlegd", 3: "BTW-kwartalen" };

export default function SetupWizardModal({
  pendingFileNames, onAccountTypeChoose,
  korRegeling, setKorRegeling,
  btwVerlegd, setBtwVerlegd,
  quartersToAsk, kwartaalStatus, setKwartaalStatusField,
  onClose,
}) {
  const [typedNow, setTypedNow] = useState({});

  // Bevriest bij het openen welke stappen er ÜBERHAUPT relevant zijn — dat mag daarna niet meer
  // veranderen door het beantwoorden van een vraag zelf (dat veranderde namelijk precies de
  // voorwaarde die bepaalde of de wizard nog iets te doen had, waardoor die zichzelf verdween of
  // bleef hangen op een net-beantwoorde stap). Een "wachtrij" van resterende stappen (in plaats
  // van een index in een krimpende lijst) kan nooit vastlopen: elke voltooide stap wordt expliciet
  // gemarkeerd, en de KOR=Ja-uitzondering (BTW-verlegd/kwartalen worden dan overbodig) filtert
  // alleen toekomstige, nog niet getoonde stappen weg.
  const [initialSteps] = useState(() => {
    const list = [];
    if (pendingFileNames.length > 0) list.push(0);
    if (korRegeling === null) list.push(1);
    if (korRegeling !== true && btwVerlegd === null) list.push(2);
    if (korRegeling !== true && quartersToAsk.length > 0) list.push(3);
    return list;
  });
  const [doneIds, setDoneIds] = useState(() => new Set());

  const remainingSteps = initialSteps.filter((id) => {
    if (doneIds.has(id)) return false;
    if ((id === 2 || id === 3) && korRegeling === true) return false;
    return true;
  });

  useEffect(() => {
    if (remainingSteps.length === 0) onClose();
  }, [remainingSteps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (remainingSteps.length === 0) return null;
  const currentStepId = remainingSteps[0];
  const isLastStep = remainingSteps.length === 1;

  const goNext = () => {
    setDoneIds((prev) => new Set([...prev, currentStepId]));
  };

  const allTypedNow = pendingFileNames.every((f) => typedNow[f]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <p className="text-xs text-slate-300">Stap {initialSteps.indexOf(currentStepId) + 1} van {initialSteps.length}</p>
          <h2 className="text-sm font-semibold mt-0.5">{STEP_LABELS[currentStepId]}</h2>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {currentStepId === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Is dit een zakelijke rekening of een privérekening?</p>
              {pendingFileNames.map((fileName) => (
                <div key={fileName} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-[8rem] text-sm font-medium truncate">{fileName}</span>
                  <button
                    onClick={() => { onAccountTypeChoose(fileName, "Zakelijk"); setTypedNow((p) => ({ ...p, [fileName]: "Zakelijk" })); }}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Zakelijk" ? "border-emerald-400 bg-emerald-100 text-emerald-800" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    <Building2 className="h-3.5 w-3.5" /> Zakelijk
                  </button>
                  <button
                    onClick={() => { onAccountTypeChoose(fileName, "Prive"); setTypedNow((p) => ({ ...p, [fileName]: "Prive" })); }}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Prive" ? "border-slate-400 bg-slate-200 text-slate-800" : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  >
                    <Home className="h-3.5 w-3.5" /> Privé
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentStepId === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Val je onder de kleineondernemersregeling (KOR)?</p>
              <p className="text-xs text-slate-400">Bij KOR bereken je geen BTW en is er geen BTW-aangifteplicht.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setKorRegeling(true); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${korRegeling === true ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja, KOR
                </button>
                <button
                  onClick={() => { setKorRegeling(false); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${korRegeling === false ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Nee
                </button>
              </div>
            </div>
          )}

          {currentStepId === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Werk je met BTW-verlegd (bijv. onderaannemer in de bouw)?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setBtwVerlegd(true); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${btwVerlegd === true ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja
                </button>
                <button
                  onClick={() => { setBtwVerlegd(false); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${btwVerlegd === false ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Nee
                </button>
              </div>
            </div>
          )}

          {currentStepId === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Welke BTW-kwartalen zijn al aangegeven en/of betaald?</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-md">
                {quartersToAsk.map((q) => {
                  const key = `${q.year}-Q${q.kwartaal}`;
                  const status = kwartaalStatus[key] || {};
                  return (
                    <div key={key} className="flex items-center gap-4 p-2.5 text-sm">
                      <span className="w-24 font-medium">{q.year} — Q{q.kwartaal}</span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={!!status.aangegeven} onChange={(e) => setKwartaalStatusField(key, "aangegeven", e.target.checked)} />
                        Aangegeven
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={!!status.betaald} onChange={(e) => setKwartaalStatusField(key, "betaald", e.target.checked)} />
                        Betaald
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">Dit kan later altijd nog aangepast worden bij "BTW per kwartaal".</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
            Later invullen
          </button>
          {(currentStepId !== 0 || allTypedNow) && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {isLastStep ? "Klaar" : "Volgende"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
