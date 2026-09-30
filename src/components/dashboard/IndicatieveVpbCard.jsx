import { eur } from "../../utils/amounts.js";

// v282 — het BV-equivalent van IndicatieveAangifteCard.jsx: dezelfde plek in de "Jaaroverzicht"-
// sub-tab van DetailsPanel.jsx, maar dan met de indicatieve vennootschapsbelasting (Vpb) i.p.v.
// IB/Zvw — die laatste twee bestaan niet voor een BV. Gebruikt dezelfde estimateVpb(...)-berekening
// (tax/vpb.js) die ook al voor het Aangiftevoorstel-BV en het eigen-vermogen-verloop wordt gebruikt,
// dus geen nieuwe/afwijkende rekenlogica.
// v283 — op verzoek uitgebreid met hetzelfde drieluik (Omzet incl. BTW / Omzet excl. BTW / Zakelijke
// kosten) als de "kerncijfers"-kaart in het BV-Aangiftevoorstel, zodat je hier meteen ziet waaruit
// het resultaat is opgebouwd i.p.v. alleen het eindbedrag. `breakdown` is optioneel — zonder (bijv.
// een ouder aanroepend component) toont de kaart alleen het bestaande resultaat/Vpb-blok, exact
// zoals voorheen.
export default function IndicatieveVpbCard({ year, winst, vpbIndicatie, breakdown, showTrend, prevWinst, onShowFullCalculation }) {
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

      {breakdown && (
        <div className="border-t border-slate-100 pt-3 space-y-1 text-[12.5px]">
          {breakdown.toonOmzetInclBtw && (
            <div className="flex items-center justify-between text-slate-500">
              <span>Omzet incl. BTW ({breakdown.btwTariefLabel})</span>
              <span>{eur(breakdown.omzetInclBtw)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-500">
            <span>Omzet excl. BTW</span>
            <span>{eur(breakdown.omzetExclBtw)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Zakelijke kosten</span>
            <span>- {eur(breakdown.zakelijkeKosten)}</span>
          </div>
        </div>
      )}

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

      <p className="text-[11px] text-slate-400">
        * Geen belastingadvies, alleen een indicatie op basis van de beschikbare bankgegevens.
      </p>

      {onShowFullCalculation && (
        <button onClick={onShowFullCalculation} className="mt-auto text-left text-xs font-bold text-teal-700 hover:underline">
          Toon volledige berekening →
        </button>
      )}
    </div>
  );
}
