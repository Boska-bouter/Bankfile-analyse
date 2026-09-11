import { useState } from "react";
import { eur } from "../../utils/amounts.js";

// Compact jaaroverzicht: winst uit onderneming, wat er naar privé is gegaan, nog te betalen OB
// en een grove IB-schatting. Zie tax/yearlySummary.js en tax/incomeTax.js voor de berekening.
export default function YearSummaryCard({ year, summary, openOB, ibEstimate, korRegeling, manualPriveUitgaven, setManualPriveUitgaven, ibGedaan, setIbGedaan }) {
  const [showFixedVar, setShowFixedVar] = useState(false);
  const manualCorrectie = Number(manualPriveUitgaven?.[year]) || 0;
  const basisPriveUitgegeven = summary.priUitgegeven > 0 ? summary.priUitgegeven : summary.uitkeringenAanPrive;
  const effectievePriveUitgegeven = basisPriveUitgegeven + manualCorrectie;
  const priUitgegevenIsAanname = summary.priUitgegeven === 0 && summary.uitkeringenAanPrive > 0;
  const ibBelastingEffectief = ibGedaan ? 0 : ibEstimate.belasting;
  const verschil = summary.winst - effectievePriveUitgegeven - (korRegeling ? 0 : openOB) - ibBelastingEffectief;
  const isTekort = verschil < 0;
  const hasFixedVarData = summary.zakVast > 0 || summary.zakVariabel > 0 || summary.priVast > 0 || summary.priVariabel > 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 pb-3 border-b border-slate-100 flex flex-wrap items-center gap-4">
        <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-medium">Correctie privé-uitgaven (optioneel):</span>
          <span className="inline-flex items-center gap-1">
            €
            <input
              type="number" step="0.01"
              value={manualPriveUitgaven?.[year] ?? ""}
              onChange={(e) => setManualPriveUitgaven?.((prev) => ({ ...prev, [year]: e.target.value }))}
              placeholder="0"
              className="w-24 rounded-md border border-slate-300 px-2 py-1"
            />
          </span>
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={!!ibGedaan} onChange={(e) => setIbGedaan?.(year, e.target.checked)} />
          IB-aangifte {year} is al gedaan
        </label>
      </div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Jaaroverzicht {year}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-[10px] text-slate-400 uppercase">Zakelijke inkomsten</p>
          <p className="font-mono font-medium text-emerald-700">{eur(summary.zakelijkeInkomsten)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase">WUO (bruto)</p>
          <p className="font-mono font-medium">{eur(summary.winst)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase">Naar privé overgemaakt</p>
          <p className="font-mono font-medium text-slate-600">{eur(summary.uitkeringenAanPrive)}</p>
        </div>
        {!korRegeling && (
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Nog te betalen OB</p>
            <p className="font-mono font-medium">
              {openOB >= 0 ? "-" : "+"}{eur(Math.abs(openOB))}
            </p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-400 uppercase">Geschat IB*</p>
          <p className="font-mono font-medium text-slate-600">-{eur(ibEstimate.belasting)}{ibEstimate.geëxtrapoleerd ? "*" : ""}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase">Tekort / Over</p>
          <p className={`font-mono font-semibold ${isTekort ? "text-rose-700" : "text-emerald-700"}`}>
            {isTekort ? "Tekort: " : "Over: "}{eur(Math.abs(verschil))}
          </p>
        </div>
      </div>

      {hasFixedVarData && (
        <>
          <button onClick={() => setShowFixedVar((v) => !v)} className="mt-3 text-xs font-medium text-slate-500 underline hover:no-underline">
            {showFixedVar ? "Verberg vast/variabel" : "Toon vast/variabel"}
          </button>
          {showFixedVar && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-slate-100">
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Zakelijk vast</p>
                <p className="font-mono text-slate-600">{eur(summary.zakVast)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase">Zakelijk variabel</p>
                <p className="font-mono text-slate-600">{eur(summary.zakVariabel)}</p>
              </div>
              {(summary.priVast > 0 || summary.priVariabel > 0) && (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Privé vast</p>
                    <p className="font-mono text-slate-600">{eur(summary.priVast)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Privé variabel</p>
                    <p className="font-mono text-slate-600">{eur(summary.priVariabel)}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <p className="mt-3 text-[10px] text-slate-400">
        * Grove, indicatieve schatting van de inkomstenbelasting over de winst — zonder heffingskortingen, startersaftrek
        of overig inkomen. Geen belastingadvies. WUO sluit onttrekkingen (privé-overmakingen, ZVW/IH) bewust uit.
      </p>
    </section>
  );
}
