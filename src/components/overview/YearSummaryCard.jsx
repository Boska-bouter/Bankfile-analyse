import { eur } from "../../utils/amounts.js";

// Compact jaaroverzicht: winst uit onderneming, wat er naar privé is gegaan, nog te betalen OB
// en een grove IB-schatting. Zie tax/yearlySummary.js en tax/incomeTax.js voor de berekening.
export default function YearSummaryCard({ year, summary, openOB, ibEstimate, korRegeling }) {
  const verschil = summary.winst - summary.priUitgegeven - (korRegeling ? 0 : openOB) - ibEstimate.belasting;
  const isTekort = verschil < 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
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
      <p className="mt-3 text-[10px] text-slate-400">
        * Grove, indicatieve schatting van de inkomstenbelasting over de winst — zonder heffingskortingen, startersaftrek
        of overig inkomen. Geen belastingadvies. WUO sluit onttrekkingen (privé-overmakingen, ZVW/IH) bewust uit.
      </p>
    </section>
  );
}
