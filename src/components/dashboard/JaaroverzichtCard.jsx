import { eur } from "../../utils/amounts.js";

// Fase 1, dashboard-restyling (Stijl F) — de "Jaaroverzicht {jaar}"-kaart naast de "Wat deze tool
// niet kan weten"-banner in het mockup-canvas: omzet/kosten/winst met een %-vergelijking t.o.v. het
// vorige jaar. Gebruikt dezelfde yearlySummaries-data die al bestond (voor de "Resultaat"-tegel en
// het Meerjarenoverzicht) — geen nieuwe berekening. De %-vergelijking wordt alleen getoond als ZOWEL
// het actieve als het vorige jaar "volledig" zijn (alle 4 kwartalen), anders is een trend niet
// betekenisvol (zelfde voorwaarde als het bestaande Meerjarenoverzicht al hanteert).
function pctDelta(current, previous) {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function DeltaBadge({ pct }) {
  if (pct == null) return null;
  const positive = pct >= 0;
  return (
    <span className={`text-[11px] font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? "↑" : "↓"} {Math.abs(pct)}% t.o.v. vorig jaar
    </span>
  );
}

export default function JaaroverzichtCard({ year, summary, previousSummary, showTrend, onOpenDetails }) {
  // v273 — voorheen gaf een ontbrekende summary (o.a. geen data geladen) return null, waardoor de
  // hele kaart uit het standaard-dashboard verdween. Nu tonen we altijd de kaart, met €0,00-
  // placeholders en zonder trend-badges wanneer er nog geen data is.
  const hasSummary = !!summary;
  const omzet = summary?.zakelijkeInkomstenNetto ?? 0;
  const kosten = summary?.zakelijkeKostenNetto ?? 0;
  const winst = summary?.winst ?? 0;
  const prevOmzet = previousSummary?.zakelijkeInkomstenNetto;
  const prevKosten = previousSummary?.zakelijkeKostenNetto;
  const prevWinst = previousSummary?.winst;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Jaaroverzicht {year ?? ""}</h3>
        {onOpenDetails && hasSummary && (
          <button onClick={onOpenDetails} className="text-xs font-semibold text-teal-700 hover:underline">
            Bekijk details →
          </button>
        )}
      </div>
      {!hasSummary && (
        <p className="text-xs text-slate-400 italic -mt-1">Laad een bankbestand om cijfers te zien</p>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] text-slate-400">Omzet</p>
          <p className="text-lg font-bold text-slate-900">{eur(omzet)}</p>
          {hasSummary && showTrend && <DeltaBadge pct={pctDelta(omzet, prevOmzet)} />}
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Kosten</p>
          <p className="text-lg font-bold text-slate-900">{eur(Math.abs(kosten))}</p>
          {hasSummary && showTrend && <DeltaBadge pct={pctDelta(Math.abs(kosten), Math.abs(prevKosten ?? 0) || null)} />}
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Winst</p>
          <p className={`text-lg font-bold ${winst < 0 ? "text-red-600" : "text-slate-900"}`}>{eur(winst)}</p>
          {hasSummary && showTrend && <DeltaBadge pct={pctDelta(winst, prevWinst)} />}
        </div>
      </div>
    </div>
  );
}
