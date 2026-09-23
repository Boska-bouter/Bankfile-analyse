import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { defaultZakelijkPercentage } from "../../tax/categorySplit.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

// Generieke %-splitsing zakelijk/privé per bestaande categorie (zie tax/categorySplit.js) — in
// tegenstelling tot "Huur (deels zakelijk)" (zie PersoonlijkeAannamesPanel.jsx) hoeft hiervoor geen
// aparte categorie te bestaan: transacties blijven gewoon in hun eigen categorie staan (en tx.type
// blijft gewoon de rekening weergeven), alleen het bedrag dat in de winst-/BTW-berekening meetelt
// wordt naar rato verdeeld. Toont alleen categorieën die dit jaar daadwerkelijk transacties hebben
// (`categorieTotalen`, zie computeSplitsbareCategorieTotalenVoorJaar), zodat de lijst niet nodeloos
// lang wordt met categorieën die toch niet relevant zijn.
export default function CategoryPercentagePanel({
  activeYear, categorieTotalen, categoryZakelijkPercentage, onSetCategoryZakelijkPercentage, onOpenHelp,
}) {
  const [open, setOpen] = useState(false);
  const categorieen = Object.keys(categorieTotalen || {}).sort(
    (a, b) => (categorieTotalen[b] || 0) - (categorieTotalen[a] || 0)
  );
  if (!activeYear || categorieen.length === 0) return null;

  const aangepast = categorieen.filter((c) => categoryZakelijkPercentage?.[c]?.[activeYear] != null).length;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Percentage zakelijk per categorie</span>
        {aangepast > 0 && <span className="text-xs font-normal text-slate-400">({aangepast} aangepast)</span>}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Sommige kosten zijn deels zakelijk en deels privé, ongeacht van welke rekening ze betaald zijn
            (bijv. brandstof, telefonie/internet, reiskosten OV, parkeren of huur die deels privé gebruikt
            wordt). Vul hieronder een percentage zakelijk gebruik in per categorie voor {activeYear} — de
            transacties zelf blijven gewoon in hun eigen categorie staan, alleen het bedrag dat in de winst
            en (voor zover van toepassing) de BTW meetelt wordt naar rato verdeeld. Leeg laten = standaard
            (100% voor een normaal-zakelijke kostenpost, 0% voor een normaal-privé categorie) — ongewijzigd
            gedrag.
            {onOpenHelp && <HelpHint chapter="categorie-percentage-zakelijk" onOpen={onOpenHelp} />}
          </p>
          <div className="space-y-2">
            {categorieen.map((categorie) => {
              const raw = categoryZakelijkPercentage?.[categorie]?.[activeYear];
              const standaard = defaultZakelijkPercentage(categorie);
              return (
                <div key={categorie} className="flex items-center gap-3 text-sm rounded-md border border-slate-100 p-2.5">
                  <span className="flex-1 min-w-[10rem] truncate font-medium">{categorie}</span>
                  <span className="text-xs text-slate-400 font-mono">totaal {eur(categorieTotalen[categorie])}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={raw ?? ""}
                    placeholder={String(standaard)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { onSetCategoryZakelijkPercentage(categorie, activeYear, null); return; }
                      const n = Math.max(0, Math.min(100, Number(v)));
                      onSetCategoryZakelijkPercentage(categorie, activeYear, n);
                    }}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-400">% zakelijk</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
