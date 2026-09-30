import { eur } from "../../utils/amounts.js";

// v282 — het BV-equivalent van IndicatieveAangifteCard.jsx: dezelfde plek in de "Jaaroverzicht"-
// sub-tab van DetailsPanel.jsx, maar dan met de indicatieve vennootschapsbelasting (Vpb) i.p.v.
// IB/Zvw — die laatste twee bestaan niet voor een BV. Gebruikt dezelfde estimateVpb(...)-berekening
// (tax/vpb.js) die ook al voor het Aangiftevoorstel-BV en het eigen-vermogen-verloop wordt gebruikt,
// dus geen nieuwe/afwijkende rekenlogica.
export default function IndicatieveVpbCard({ year, winst, vpbIndicatie, showTrend, prevWinst, onShowFullCalculation }) {
  if (!vpbIndicatie) return null;
  const resultaatNaVpb = winst - (vpbIndicatie.belasting || 0);
  const pct = showTrend && prevWinst != null && prevWinst !== 0 ? Math.round(((winst - prevWinst) / Math.abs(prevWinst)) * 100) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-full flex flex-col gap-4">
      <h4 className="text-sm font-bold text-slate-900">Indicatieve vennootschapsbelasting {year}</h4>

      <div>
        <p className="text-[11px] text-slate-400">Resultaat vóór Vpb</p>
        <p className="text-xl font-bold text-slate-900">{eur(winst)}</p>
        {pct != null && (
          <span className={`text-[11px] font-semibold ${pct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {pct >= 0 ? "↑" : "↓"} {Math.abs(pct)}% t.o.v. vorig jaar
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[12.5px]">
        <span className="text-slate-500">Geschatte Vpb</span>
        <span className="font-semibold text-slate-800">{eur(vpbIndicatie.belasting || 0)}</span>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-slate-900">Resultaat ná Vpb</span>
        <span className="text-lg font-bold text-slate-900">{eur(resultaatNaVpb)}</span>
      </div>

      {vpbIndicatie.geëxtrapoleerd && (
        <p className="text-[11px] text-slate-400">
          Vpb-tarief van {year} nog niet bekend — benaderd met het dichtstbijzijnde bekende tarief.
        </p>
      )}

      {onShowFullCalculation && (
        <button onClick={onShowFullCalculation} className="mt-auto text-left text-xs font-bold text-teal-700 hover:underline">
          Toon volledige berekening →
        </button>
      )}
    </div>
  );
}
