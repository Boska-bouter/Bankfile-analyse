import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eurTight } from "../../utils/amounts.js";
import { estimateVpb } from "../../tax/vpb.js";
import HelpHint from "../shared/HelpHint.jsx";

// BV-variant van het Meerjarenoverzicht. Zelfde opzet als MultiYearOverview.jsx (kolomvolgorde volgt
// de opbouw van het Aangiftevoorstel BV), maar met Vpb in plaats van IB/Zvw, en een extra blok voor
// de balansmutaties die de winst niet raken (DGA-salaris zit al in "Kosten", rekening-courant/
// dividend niet). `rcVerloop`/`evVerloop` komen uit computeRekeningCourantVerloop/
// computeEigenVermogenVerloop (src/tax/bv.js) — dezelfde cumulatieve reeks als in het BV-
// Aangiftevoorstel, zodat de twee rapportages nooit uit de pas kunnen lopen.
export default function MultiYearOverviewBV({
  years, yearlySummaries, kostenTotaalByYear, dgaSalarisByYear, rcVerloop, evVerloop, onYearClick, activeYear, onOpenHelp,
}) {
  const [open, setOpen] = useState(false);
  if (years.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
        <span className="flex items-center gap-2">
          {years.length > 1 ? `Meerjarenoverzicht BV (${years.length} jaar)` : "Jaaroverzicht BV"}
          {onOpenHelp && <HelpHint chapter="jaaroverzicht" onOpen={onOpenHelp} />}
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      <div className="mx-4 mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        BV-tak nog in ontwikkeling — dit overzicht neemt geen holdingstructuur mee en is niet gelijk aan een
        jaarrekening.
      </div>
      {open && (
        <div className="px-4 pb-4 overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-3">Jaar</th>
                <th className="text-right font-medium py-2 px-3" title="Netto omzet, exclusief BTW">Omzet</th>
                <th className="text-right font-medium py-2 px-3" title="Zakelijke kosten, netto (incl. DGA-salaris) — zelfde bedrag als in het Aangiftevoorstel BV">Kosten</th>
                <th className="text-right font-medium py-2 px-3" title="Omzet minus kosten, vóór vennootschapsbelasting">Resultaat vóór Vpb</th>
                <th className="text-right font-medium py-2 px-3">Geschatte Vpb*</th>
                <th className="text-right font-medium py-2 px-3" title="Resultaat vóór Vpb minus de geschatte vennootschapsbelasting">Resultaat ná Vpb</th>
                <th className="text-right font-medium py-2 px-3" title="Zit al in Kosten hiernaast — hier alleen ter info">DGA-salaris</th>
                <th className="text-right font-medium py-2 px-3" title="Mutatie dit jaar in de rekening-courant met de DGA">RC-mutatie</th>
                <th className="text-right font-medium py-2 px-3">Dividend</th>
                <th className="text-right font-medium py-2 px-3" title="Cumulatieve stand rekening-courant, alleen over de jaren in dit overzicht">RC-stand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {years.map((year) => {
                const summary = yearlySummaries[year];
                if (!summary) return null;
                const vpbEstimate = estimateVpb(summary.winst, year);
                const kosten = kostenTotaalByYear?.[year] ?? summary.zakelijkeKostenNetto;
                const resultaatNaVpb = summary.winst - vpbEstimate.belasting;
                const rc = rcVerloop?.[year] || { mutatieDitJaar: 0, standEindJaar: 0 };
                const ev = evVerloop?.[year] || { dividend: 0 };
                const dgaSalaris = dgaSalarisByYear?.[year] || 0;

                return (
                  <tr key={year} className="hover:bg-slate-50 cursor-pointer" onClick={() => onYearClick(year)}>
                    <td className="py-2 pr-3 font-medium">{year}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">{eurTight(summary.zakelijkeInkomstenNetto)}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">-{eurTight(kosten)}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(summary.winst)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                      -{eurTight(vpbEstimate.belasting)}{vpbEstimate.geëxtrapoleerd ? "*" : ""}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(resultaatNaVpb)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(dgaSalaris)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(rc.mutatieDitJaar)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500 whitespace-nowrap">{eurTight(ev.dividend)}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">{eurTight(rc.standEindJaar)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">Klik op een jaar om ernaartoe te springen.</p>
          <p className="mt-1 text-xs text-slate-400">
            * Grove, indicatieve schatting van de vennootschapsbelasting over het resultaat — zonder
            investeringsregelingen (bijv. KIA) of fiscale eenheid. Geen belastingadvies. Rekening-courant en
            dividend zijn balansmutaties die niet meetellen in het resultaat.
          </p>
        </div>
      )}
    </section>
  );
}
