import { eur } from "../../utils/amounts.js";

// Fase 1, dashboard-restyling (Stijl F) — de "Indicatieve aangifte {jaar}"-kaart in de
// "Jaaroverzicht"-sub-tab van DetailsPanel.jsx, exact zoals in het mockup-canvas. Gebruikt dezelfde
// dashboardAangifteIndicatie-data die al bestond voor de "IB & Zvw"/"Aftrekposten"-tegels — hier
// alleen groter en met de extra regels (Belastbare winst, Totaal) die de mockup toont. Alleen
// relevant bij zzp/eenmanszaak (rechtsvorm !== "bv"); voor een BV bestaat deze doorrekening niet op
// deze manier (zie App.jsx).
export default function IndicatieveAangifteCard({ year, winst, indicatie, breakdown, showTrend, prevWinst, onShowFullCalculation }) {
  if (!indicatie) return null;
  // v292 — "Totaal belasting en premies" hield tot nu toe geen rekening met de heffingskorting: die
  // verlaagt de daadwerkelijk te betalen IB (zie ook "Indicatieve IB ná heffingskortingen" in het
  // volledige Aangiftevoorstel), dus zonder die aftrek toonde deze kaart een te hoog totaal.
  const heffingskortingTotaal = indicatie.heffingskortingen?.totaal || 0;
  const ibNaHeffingskorting = Math.max(0, (indicatie.ib?.belasting || 0) - heffingskortingTotaal);
  const totaal = ibNaHeffingskorting + (indicatie.zvw?.bijdrage || 0);
  const pct = showTrend && prevWinst != null && prevWinst !== 0 ? Math.round(((winst - prevWinst) / Math.abs(prevWinst)) * 100) : null;

  return (
    <div id="advies-sectie" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col gap-4">
      <h4 className="text-sm font-bold text-slate-900">Indicatieve aangifte {year}</h4>

      {breakdown && (
        <div className="space-y-1 text-[12.5px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>Omzet bruto (incl. BTW{breakdown.toonOmzetInclBtw ? `, ${breakdown.btwTariefLabel}` : ""})</span>
            <span className="font-semibold text-slate-800">{eur(breakdown.omzetInclBtw)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Omzet netto (excl. BTW)</span>
            <span className="font-semibold text-slate-800">{eur(breakdown.omzetExclBtw)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Zakelijke kosten (netto)</span>
            <span className="font-semibold text-slate-800">− {eur(breakdown.zakelijkeKosten)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[11px] text-slate-400">Winst uit onderneming</p>
          <p className="text-xl font-bold text-slate-900">{eur(winst)}</p>
          {pct != null && (
            <span className={`text-[11px] font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% t.o.v. vorig jaar
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 text-[12.5px] justify-center">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Zelfstandigenaftrek</span>
            <span className="font-semibold text-slate-800">− {eur(indicatie.zelfstandigenaftrekBedrag)}</span>
          </div>
          {indicatie.startersaftrekBedrag > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Startersaftrek</span>
              <span className="font-semibold text-slate-800">− {eur(indicatie.startersaftrekBedrag)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">MKB-winstvrijstelling</span>
            <span className="font-semibold text-slate-800">− {eur(indicatie.mkbVrijstellingBedrag)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-1.5">
            <span className="text-slate-500">Belastbare winst</span>
            <span className="font-semibold text-slate-800">{eur(indicatie.belastbareWinst)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-[12.5px]">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Indicatieve IB (vóór heffingskorting)</span>
          <span className="font-semibold text-slate-800">{eur(indicatie.ib?.belasting || 0)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Heffingskorting</span>
          <span className="font-semibold text-slate-800">− {eur(heffingskortingTotaal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Indicatieve IB ná heffingskorting</span>
          <span className="font-semibold text-slate-800">{eur(ibNaHeffingskorting)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Indicatieve Zvw</span>
          <span className="font-semibold text-slate-800">{eur(indicatie.zvw?.bijdrage || 0)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-slate-900">Totaal belasting en premies</span>
        <span className="text-lg font-bold text-slate-900">{eur(totaal)}</span>
      </div>

      {onShowFullCalculation && (
        <button
          onClick={onShowFullCalculation}
          className="mt-auto text-left text-xs font-bold text-teal-700 hover:underline"
        >
          Toon volledige berekening →
        </button>
      )}
    </div>
  );
}
