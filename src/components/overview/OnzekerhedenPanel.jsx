import { useState } from "react";
import { Info } from "lucide-react";

// Fase 1, dashboard-restyling (Stijl F): stond eerst standaard opengeklapt als amber paneel met de
// hele lijst zichtbaar — in de goedgekeurde mockup is dit een compacte blauwe banner (korte intro +
// "Meer informatie"-knop) die je zelf openklapt. Zelfde inhoud/tekst, alleen dichtgeklapt als start
// (was: open=true) en de stijl/kleur aangepast aan het mockup-canvas (blauw i.p.v. amber, geen
// chevron-header maar een knop onderin de intro).
export default function OnzekerhedenPanel({ heeftVoorraad }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 shadow-sm p-4 flex gap-3">
      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
        <Info className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">Wat deze tool niet kan weten</p>
        <p className="text-[13px] text-slate-600 mt-0.5">
          De tool werkt met bankgegevens, maar kan niet alles weten. Denk aan contante uitgaven, openstaande facturen
          en andere fiscale gegevens die niet uit de bank blijken.
        </p>
        {open && (
          <div className="mt-3 text-[13px] text-slate-700 space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>Contante ontvangsten en uitgaven</li>
              <li>Openstaande facturen — nog te ontvangen (debiteuren) en nog te betalen (crediteuren) bedragen die aan het einde van het jaar nog niet via de bank zijn verwerkt</li>
              <li>
                Voorraad — inkoopwaarde en verkoopwaarde van onverkochte goederen
                {heeftVoorraad ? " (je gaf aan dat er voorraad is — dat vraagt een eigen registratie, dit overzicht neemt dat niet mee)" : ""}
              </li>
              <li>Inkomsten of kosten die buiten deze bankrekening om liepen (andere rekening, contant, in natura)</li>
              <li>Fiscale situaties die niet uit bankgegevens blijken (bijv. eigen woning, andere ondernemingen)</li>
              <li>Correcties, memoriaalboekingen of suppleties uit een eerdere administratie</li>
            </ul>
            <p>
              Dit maakt de reconstructie niet minder waardevol — het is juist onderdeel van een betrouwbare aanpak om
              zichtbaar te maken wat wél en niet uit de bankgegevens kan worden vastgesteld.
            </p>
          </div>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-full px-3 py-1.5 hover:bg-indigo-50"
        >
          {open ? "Minder informatie" : "Meer informatie"} →
        </button>
      </div>
    </section>
  );
}
