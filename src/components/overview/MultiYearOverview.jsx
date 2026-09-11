import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eurTight } from "../../utils/amounts.js";
import { estimateIncomeTax } from "../../tax/incomeTax.js";
import HelpHint from "../shared/HelpHint.jsx";

export default function MultiYearOverview({
  years, yearlySummaries, yearlyOpenOB, korRegeling, onYearClick, ibStatus,
  manualPriveUitgaven, volledigeJaren, businessAdvies, activeYear, onOpenHelp,
}) {
  const [open, setOpen] = useState(years.length > 1);
  const [showHiddenCols, setShowHiddenCols] = useState(false);
  if (years.length === 0) return null;

  const effectiefFor = (year) => {
    const summary = yearlySummaries[year];
    if (!summary) return null;
    const openOB = yearlyOpenOB[year] || 0;
    const ibEstimate = estimateIncomeTax(summary.winst, year);
    const ibGedaan = !!ibStatus[year]?.gedaan;
    const ibBelastingEffectief = ibGedaan ? 0 : ibEstimate.belasting;
    const manualCorrectie = Number(manualPriveUitgaven[year]) || 0;
    const priUitgegevenIsAanname = summary.priUitgegeven === 0 && summary.uitkeringenAanPrive > 0;
    const basisPriveUitgegeven = summary.priUitgegeven > 0 ? summary.priUitgegeven : summary.uitkeringenAanPrive;
    const effectievePriveUitgegeven = basisPriveUitgegeven + manualCorrectie;
    const verschil = summary.winst - effectievePriveUitgegeven - (korRegeling ? 0 : openOB) - ibBelastingEffectief;
    const zakelijkTotaalNetto = summary.winst - effectievePriveUitgegeven;
    return { summary, openOB, ibEstimate, ibGedaan, manualCorrectie, priUitgegevenIsAanname, effectievePriveUitgegeven, verschil, zakelijkTotaalNetto };
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
        <span className="flex items-center gap-2">
          {years.length > 1 ? `Meerjarenoverzicht (${years.length} jaar)` : "Jaaroverzicht — is dit rendabel?"}
          {onOpenHelp && <HelpHint chapter="jaaroverzicht" onOpen={onOpenHelp} />}
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {businessAdvies && (
        <div
          className={`mx-4 mb-3 rounded-md border px-3 py-2 text-xs ${
            businessAdvies.niveau === "negatief" ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {businessAdvies.tekst} <span className="opacity-70">(indicatief, {activeYear} — geen financieel advies)</span>
        </div>
      )}
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-3">Jaar</th>
                <th className="text-right font-medium py-2 px-3">Zak. Ink.</th>
                <th className="text-right font-medium py-2 px-3">WUO (bruto)</th>
                <th className="text-right font-medium py-2 px-3">Al betaald ZVW/IH</th>
                <th className="text-right font-medium py-2 px-3">Uitbetaald/opgenomen naar prive</th>
                {showHiddenCols && (
                  <>
                    <th className="text-right font-medium py-2 px-3">Zak. Uit.</th>
                    <th className="text-right font-medium py-2 px-3">Zak. Vast</th>
                    <th className="text-right font-medium py-2 px-3">Zak. Var.</th>
                    <th className="text-right font-medium py-2 px-3">Prive Vast</th>
                    <th className="text-right font-medium py-2 px-3">Prive Var.</th>
                  </>
                )}
                <th className="text-right font-medium py-2 px-3">Totaal prive uitgegeven</th>
                <th className="text-right font-medium py-2 px-3">Zakelijk totaal (netto)</th>
                <th className="text-right font-medium py-2 px-3">OB/BTW</th>
                <th className="text-right font-medium py-2 px-3">Voorbelasting</th>
                {!korRegeling && <th className="text-right font-medium py-2 px-3">Te betalen OB</th>}
                <th className="text-right font-medium py-2 px-3">Geschat IB*</th>
                <th className="text-right font-medium py-2 pl-3">Tekort / Over</th>
                <th className="text-right font-medium py-2 pl-3">Trend t.o.v. vorig jaar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {years.map((year) => {
                const d = effectiefFor(year);
                if (!d) return null;
                const { summary, openOB, ibEstimate, ibGedaan, manualCorrectie, priUitgegevenIsAanname, effectievePriveUitgegeven, verschil, zakelijkTotaalNetto } = d;
                const isTekort = verschil < 0;
                const prev = effectiefFor(year - 1);
                const beideJarenVolledig = volledigeJaren.has(year) && volledigeJaren.has(year - 1);
                let trendDelta = null;
                if (prev && beideJarenVolledig) trendDelta = verschil - prev.verschil;

                return (
                  <tr key={year} className="hover:bg-slate-50 cursor-pointer" onClick={() => onYearClick(year)}>
                    <td className="py-2 pr-3 font-medium">{year}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">{eurTight(summary.zakelijkeInkomsten)}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(summary.winst)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(summary.alBetaaldeZvwIh)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{eurTight(summary.uitkeringenAanPrive)}</td>
                    {showHiddenCols && (
                      <>
                        <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">{eurTight(summary.zakelijkeUitgaven)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{eurTight(summary.zakVast)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{eurTight(summary.zakVariabel)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{summary.priVast > 0 || summary.priVariabel > 0 ? eurTight(summary.priVast) : "—"}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{summary.priVast > 0 || summary.priVariabel > 0 ? eurTight(summary.priVariabel) : "—"}</td>
                      </>
                    )}
                    <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                      {eurTight(effectievePriveUitgegeven)}{priUitgegevenIsAanname ? "*" : ""}{manualCorrectie !== 0 ? "†" : ""}
                      {manualCorrectie !== 0 && (
                        <span className="block text-[10px] font-normal text-amber-700 whitespace-normal">⚠ incl. correctie {manualCorrectie >= 0 ? "+" : ""}{eurTight(manualCorrectie)}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(zakelijkTotaalNetto)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(summary.verschuldigdBtw)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(summary.voorbelasting)}</td>
                    {!korRegeling && (
                      <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{openOB >= 0 ? "-" : "+"}{eurTight(Math.abs(openOB))}</td>
                    )}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {ibGedaan ? (
                        <span className="font-medium text-emerald-700">✓ IB gedaan</span>
                      ) : (
                        <span className="font-mono text-slate-500">-{eurTight(ibEstimate.belasting)}{ibEstimate.geëxtrapoleerd ? "*" : ""}</span>
                      )}
                    </td>
                    <td className={`py-2 pl-3 text-right font-mono font-medium whitespace-nowrap ${isTekort ? "text-rose-700" : "text-emerald-700"}`}>
                      {isTekort ? "Tekort: " : "Over: "}{eurTight(Math.abs(verschil))}
                    </td>
                    <td className="py-2 pl-3 text-right whitespace-nowrap">
                      {!prev ? (
                        <span className="text-slate-300">—</span>
                      ) : !beideJarenVolledig ? (
                        <span className="text-slate-400 text-[10px]">— (jaar niet compleet)</span>
                      ) : Math.abs(trendDelta) < 1 ? (
                        <span className="text-slate-500">≈ gelijk aan vorig jaar</span>
                      ) : trendDelta > 0 ? (
                        <span className="text-emerald-700">▲ {eurTight(trendDelta)} beter</span>
                      ) : (
                        <span className="text-rose-700">▼ {eurTight(Math.abs(trendDelta))} slechter</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Klik op een jaar om ernaartoe te springen.</p>
          <button onClick={() => setShowHiddenCols((v) => !v)} className="mt-2 text-xs font-medium text-slate-500 underline hover:no-underline">
            {showHiddenCols ? "Verberg Zak. Uit. / Uitbet/Opn. Prive" : "Toon Zak. Uit. / Uitbet/Opn. Prive"}
          </button>
        </div>
      )}
    </section>
  );
}
