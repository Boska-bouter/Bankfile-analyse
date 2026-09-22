import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function OnzekerhedenPanel({ heeftVoorraad }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left text-amber-900">
        <span>Wat deze tool niet kan weten</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-amber-900 space-y-2">
          <p>
            Deze reconstructie is gebaseerd op uitsluitend de banktransacties. Een aantal dingen dat voor de aangifte
            relevant kan zijn, staat niet (of niet volledig) op een bankrekening, en zit dus niet in dit overzicht:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Contante ontvangsten en uitgaven</li>
            <li>Openstaande facturen — nog te ontvangen (debiteuren) en nog te betalen (crediteuren) bedragen die aan het einde van het jaar nog niet via de bank zijn verwerkt</li>
            <li>
              Voorraad — inkoopwaarde en verkoopwaarde van onverkochte goederen
              {heeftVoorraad ? " (je gaf aan dat er voorraad is — dat vraagt een eigen registratie, dit overzicht neemt dat niet mee)" : ""}
            </li>
            <li>Privégebruik van bedrijfsmiddelen (bijv. een auto) voor zover niet als aparte correctie vastgelegd</li>
            <li>Inkomsten of kosten die buiten deze bankrekening om liepen (andere rekening, contant, in natura)</li>
            <li>Fiscale situaties die niet uit bankgegevens blijken (bijv. eigen woning, andere ondernemingen)</li>
            <li>Correcties, memoriaalboekingen of suppleties uit een eerdere administratie</li>
          </ul>
          <p className="text-amber-800">
            Dit maakt de reconstructie niet minder waardevol — het is juist onderdeel van een betrouwbare aanpak om
            zichtbaar te maken wat wél en niet uit de bankgegevens kan worden vastgesteld.
          </p>
        </div>
      )}
    </section>
  );
}
