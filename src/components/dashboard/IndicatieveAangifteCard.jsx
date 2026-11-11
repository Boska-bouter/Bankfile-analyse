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
  const ibVoor = indicatie.ib?.belasting || 0;
  const hkToegepast = Math.min(heffingskortingTotaal, ibVoor);
  const hkRest = heffingskortingTotaal - hkToegepast;
  const ibNaHeffingskorting = Math.max(0, ibVoor - heffingskortingTotaal);
  const totaal = ibNaHeffingskorting + (indicatie.zvw?.bijdrage || 0);
  const pct = showTrend && prevWinst != null && prevWinst !== 0 ? Math.round(((winst - prevWinst) / Math.abs(prevWinst)) * 100) : null;

  return (
    <div id="advies-sectie" className="rounded-paneel border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col justify-between gap-4">
      <h4 className="text-sm font-bold text-slate-900">Indicatieve aangifte {year}</h4>

      {breakdown && (
        <div className="space-y-1 text-label text-slate-500">
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

      {/* nieuw-V3R1 — wens Boska 11-11: één doorlopende rekensom (winst → belastbare winst → IB → te betalen), met
          de heffingskorting alleen tot ten hoogste de IB en altijd "te betalen"/"te ontvangen" bij het totaal. */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-slate-500">Winst uit onderneming</p>
          <p className="text-xl font-bold text-slate-900">{eur(winst)}</p>
        </div>
        {pct != null && (
          <p className={`text-right text-xs font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% t.o.v. vorig jaar
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 text-label">
        <div className="flex flex-col gap-1.5">
          <Regel label="Zelfstandigenaftrek" waarde={`− ${eur(indicatie.zelfstandigenaftrekBedrag)}`} />
          {indicatie.startersaftrekBedrag > 0 && <Regel label="Startersaftrek" waarde={`− ${eur(indicatie.startersaftrekBedrag)}`} />}
          <Regel label="MKB-winstvrijstelling" waarde={`− ${eur(indicatie.mkbVrijstellingBedrag)}`} />
          <Regel label="Belastbare winst" waarde={eur(indicatie.belastbareWinst)} sterk />
        </div>
        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
          <Regel label="IB over de belastbare winst" waarde={eur(ibVoor)} />
          <Regel label={hkRest > 0.005 ? `Heffingskorting (van ${eur(heffingskortingTotaal)})` : "Heffingskorting"} waarde={`− ${eur(hkToegepast)}`} />
          <Regel label="IB te betalen" waarde={eur(ibNaHeffingskorting)} sterk />
          <Regel label="Zvw-bijdrage" waarde={eur(indicatie.zvw?.bijdrage || 0)} />
        </div>
      </div>

      {hkRest > 0.005 && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          De heffingskorting ({eur(heffingskortingTotaal)}) is hoger dan de IB ({eur(ibVoor)}). Een heffingskorting verlaagt de IB hooguit
          tot € 0; het restant van {eur(hkRest)} wordt niet uitbetaald. Op de Zvw-bijdrage telt de heffingskorting niet.
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-slate-900">Totaal IB en Zvw</span>
        <span className={`text-lg font-bold ${totaal < -0.005 ? "text-emerald-700" : "text-slate-900"}`}>
          {eur(Math.abs(totaal))} {totaal < -0.005 ? "te ontvangen" : "te betalen"}
        </span>
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

function Regel({ label, waarde, sterk }) {
  return (
    <div className={`flex justify-between gap-3 ${sterk ? "border-t border-slate-100 pt-1.5" : ""}`}>
      <span className={sterk ? "font-semibold text-slate-700" : "text-slate-500"}>{label}</span>
      <span className={`font-semibold tabular-nums ${sterk ? "text-slate-900" : "text-slate-800"}`}>{waarde}</span>
    </div>
  );
}
