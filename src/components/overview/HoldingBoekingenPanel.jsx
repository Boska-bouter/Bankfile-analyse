import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eur } from "../../utils/amounts.js";

// Alleen zichtbaar als er (bij de wizard-vraag) een holding boven de BV is aangegeven. Géén eigen
// bankbestand/classificatie voor de holding — dat is een veel grotere uitbreiding (zie het
// bouwplan, "Bouwfasering"): dit paneel laat de gebruiker gewoon de bedragen intypen die de holding
// zelf ontving/stortte, puur om te vergelijken met wat er al aan de kant van de werkmaatschappij
// wordt berekend (Kapitaalstorting/Dividenduitkering-categorieën, via evVerloop). Een verschil is
// geen fout — de holding kan bijvoorbeeld een dividend nog niet hebben doorgekeerd naar de DGA
// privé — maar is wel de moeite waard om te weten.
export default function HoldingBoekingenPanel({ years, holdingBoekingen, onSetField, evVerloop }) {
  const [open, setOpen] = useState(false);
  if (years.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-sm font-semibold">
        <span>Holding-boekingen (handmatig)</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-slate-500">
            Vul hier in wat er dit jaar daadwerkelijk bij de holding is binnengekomen (dividend, vergoeding) of door
            de holding is gestort — de tool vergelijkt dit met de kapitaalstorting/dividenduitkering die al
            berekend zijn uit de banktransacties van de werkmaatschappij hierboven. Geen bankimport voor de
            holding zelf — dat is nog niet beschikbaar in deze tool.
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-slate-500 uppercase border-b border-slate-100">
                <th className="text-left font-medium py-2 pr-3">Jaar</th>
                <th className="text-left font-medium py-2 px-3">Kapitaalstorting door holding</th>
                <th className="text-left font-medium py-2 px-3">Dividend ontvangen door holding</th>
                <th className="text-left font-medium py-2 pl-3">Vergelijking met werkmaatschappij</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {years.map((year) => {
                const b = holdingBoekingen?.[year] || {};
                const ev = evVerloop?.[year] || { kapitaalstorting: 0, dividend: 0 };
                const kapitaalVerschil = (b.kapitaalstorting || 0) - ev.kapitaalstorting;
                const dividendVerschil = (b.dividendOntvangen || 0) - ev.dividend;
                const heeftVerschil = Math.abs(kapitaalVerschil) >= 1 || Math.abs(dividendVerschil) >= 1;
                return (
                  <tr key={year}>
                    <td className="py-2 pr-3 font-medium">{year}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={b.kapitaalstorting ?? ""}
                        onChange={(e) => onSetField(year, "kapitaalstorting", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="0,00"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={b.dividendOntvangen ?? ""}
                        onChange={(e) => onSetField(year, "dividendOntvangen", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="0,00"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      {b.kapitaalstorting == null && b.dividendOntvangen == null ? (
                        <span className="text-slate-300">— nog niet ingevuld</span>
                      ) : heeftVerschil ? (
                        <span className="text-amber-700">
                          Verschil: kapitaal {eur(kapitaalVerschil)}, dividend {eur(dividendVerschil)}
                        </span>
                      ) : (
                        <span className="text-emerald-700">Sluit aan met de werkmaatschappij</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
