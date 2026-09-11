import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { CATEGORY_ORDER, CATEGORY_COLOR } from "../../classification/categories.js";

// BTW-instellingen: KOR (kleineondernemersregeling), BTW-verlegd, en het percentage per
// categorie. Het bankbedrag is altijd inclusief BTW — de tool rekent 'm er automatisch uit op
// basis van dit percentage. Bij KOR wordt nergens BTW berekend (zie effectiveCategoryBtwRates
// in App.jsx), dus dit paneel is dan uitgeschakeld.
export default function BtwRatesPanel({ categoryBtwRates, setCategoryBtwRates, btwVerlegd, setBtwVerlegd, korRegeling, setKorRegeling }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-5 text-sm font-semibold">
        <span>
          BTW-instellingen
          {korRegeling && <span className="ml-2 text-xs font-normal text-slate-400">(KOR — geen BTW-plicht)</span>}
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Het bankbedrag is altijd inclusief BTW — de tool rekent 'm er automatisch uit op basis van het percentage
            per categorie. Alleen van toepassing op Zakelijke transacties.
          </p>

          <div className="flex items-center gap-3 mb-3 p-3 rounded-md bg-slate-50">
            <span className="text-xs font-medium text-slate-600">Kleineondernemersregeling (KOR):</span>
            <button
              onClick={() => setKorRegeling(true)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${korRegeling === true ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600"}`}
            >
              Ja
            </button>
            <button
              onClick={() => setKorRegeling(false)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${korRegeling === false ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600"}`}
            >
              Nee
            </button>
          </div>

          {korRegeling === true && (
            <p className="mb-3 text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-md px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Bij de KOR wordt nergens BTW berekend — de instellingen hieronder zijn dan niet van toepassing.
            </p>
          )}

          {!korRegeling && (
            <>
              <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-slate-50">
                <span className="text-xs font-medium text-slate-600">BTW-verlegd op zakelijke inkomsten:</span>
                <button
                  onClick={() => setBtwVerlegd(true)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${btwVerlegd === true ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600"}`}
                >
                  Ja
                </button>
                <button
                  onClick={() => setBtwVerlegd(false)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${btwVerlegd === false ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-600"}`}
                >
                  Nee
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <div key={c} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium truncate ${CATEGORY_COLOR[c] || "bg-slate-200 text-slate-700"}`}>{c}</span>
                    <select
                      value={categoryBtwRates[c] ?? 21}
                      onChange={(e) => setCategoryBtwRates((prev) => ({ ...prev, [c]: Number(e.target.value) }))}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs shrink-0"
                    >
                      <option value={21}>21%</option>
                      <option value={9}>9%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
