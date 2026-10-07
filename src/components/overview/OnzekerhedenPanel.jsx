import { useState } from "react";
import { Info, X } from "lucide-react";

// Fase 1, dashboard-restyling (Stijl F): stond eerst standaard opengeklapt als amber paneel met de
// hele lijst zichtbaar — in de goedgekeurde mockup is dit een compacte blauwe banner (korte intro +
// "Meer informatie"-knop). Op verzoek: "Meer informatie" klapte de lijst tot nu toe inline open
// (schoof de rest van het dashboard, o.a. de Jaaroverzicht-kaart ernaast, omlaag) — dat opent nu als
// pop-up, zoals de losse "?"-uitleg elders in de app, i.p.v. inline te verschuiven.
export default function OnzekerhedenPanel({ heeftVoorraad }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex items-center gap-2 px-1 text-[12.5px] text-slate-500">
      <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
      <p className="min-w-0">
        Reconstructie op basis van bankdata ·{" "}
        <button onClick={() => setOpen(true)} className="font-semibold text-indigo-700 hover:underline whitespace-nowrap">
          wat staat niet in de bankgegevens? →
        </button>
      </p>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0 rounded-t-xl">
              <p className="text-sm font-semibold text-slate-800">Wat deze app niet kan weten</p>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-[13px] text-slate-700 space-y-2">
              <p className="text-slate-500">Dit zijn punten die je niet uit de bankgegevens kunt halen. Er ontbreekt dus niets in je dossier — de app kan het alleen niet zien, en houdt er daarom geen rekening mee.</p>
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
          </div>
        </div>
      )}
    </section>
  );
}
