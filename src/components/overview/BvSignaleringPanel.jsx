import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

// Toont, alléén als computeBvSignalering (src/tax/bv.js) een rode vlag geeft, informatieve tekst
// over de drie routes bij een niet-levensvatbare BV — turboliquidatie, gewone ontbinding/vereffening,
// eigen aangifte faillissement — plus de meld-betalingsonmacht-waarschuwing en een verwijzing naar de
// liquidatieverliesregeling. Nadrukkelijk geen advies en geen keuze: de tool signaleert op basis van
// cijfers die hij al berekent, maar de beslissing (en de precieze uitvoering) is aan een boekhouder of
// jurist. Zie het bouwplan, sectie "Advies bij tegenvallende cijfers: stoppen of doorgaan", voor de
// bronnen achter deze tekst (KVK, Ondernemersplein, Jongbloed Fiscaal Juristen).
export default function BvSignaleringPanel({ signalering, activeYear, heeftHolding }) {
  const [open, setOpen] = useState(false);
  if (!signalering) return null;

  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-4 text-sm font-semibold text-rose-900">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Signaal: cijfers {activeYear} vragen om aandacht
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      <p className="px-4 pb-3 text-xs text-rose-800">{signalering.tekst}</p>
      {open && (
        <div className="px-4 pb-4 text-xs text-rose-900 space-y-3">
          <p className="italic text-rose-700">
            Dit is geen advies en geen keuze — dat is aan een boekhouder of jurist. Deze tool laat alleen zien
            welke routes er in Nederland bestaan als de cijfers van een BV niet meer verbeteren.
          </p>
          <div>
            <p className="font-semibold mb-1">Drie routes bij een niet-levensvatbare BV</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>
                <strong>Turboliquidatie</strong> — alleen mogelijk zonder baten (bezittingen), ook mét schulden.
                Sinds nov. 2023 moet het bestuur binnen 14 dagen na ontbinding een balans, resultatenrekening en
                toelichting deponeren bij de KVK en schuldeisers informeren. Misbruik (baten wegsluizen vlak vóór
                ontbinding) → persoonlijke aansprakelijkheid, boete, bestuursverbod tot 5 jaar.
              </li>
              <li>
                <strong>Gewone ontbinding met vereffening</strong> — nodig zodra er nog baten én schulden zijn: een
                vereffenaar maakt de baten te gelde, betaalt schuldeisers, en een batig saldo gaat naar de
                aandeelhouder(s) (bij een werkmaatschappij dus naar de holding, onder de deelnemingsvrijstelling).
              </li>
              <li>
                <strong>Eigen aangifte faillissement</strong> — aan de orde zodra schulden de baten structureel
                overtreffen. Te lang doorgaan terwijl dat al duidelijk was kan gelden als kennelijk onbehoorlijk
                bestuur (art. 2:248 BW) — persoonlijke aansprakelijkheid voor het boedeltekort. Selectief
                crediteuren betalen (leveranciers wel, Belastingdienst niet) is hierbij een bekende valkuil.
              </li>
            </ol>
          </div>
          <div className="rounded-md border border-rose-200 bg-white/60 px-3 py-2">
            <p className="font-semibold mb-1">Belangrijke vangnet-regel: meld betalingsonmacht op tijd</p>
            <p>
              Kan de BV een BTW- of loonheffing-afdracht niet betalen? Meld dit binnen 2 weken na de vervaldatum
              schriftelijk bij de Belastingdienst ("melding betalingsonmacht"). Dit beschermt niet absoluut, maar
              het ontbreken ervan is juist een van de sterkste aanwijzingen voor bestuurdersaansprakelijkheid bij
              een latere faillissement.
            </p>
          </div>
          {heeftHolding ? (
            <p>
              <strong>Fiscaal voordeel bij liquidatie:</strong> normaal is een verlies op de deelneming
              (werkmaatschappij) niet aftrekbaar voor de holding. Bij daadwerkelijke liquidatie mag de holding dit
              verlies, onder voorwaarden, tóch aftrekken (liquidatieverliesregeling, art. 13d Wet Vpb) — de precieze
              berekening vraagt maatwerk van een fiscalist. Dit is relevant omdat je hebt aangegeven dat er een
              holding boven deze BV staat.
            </p>
          ) : (
            <p>
              De liquidatieverliesregeling (een fiscaal voordeel bij liquidatie via een holding) is hier niet van
              toepassing — je gaf aan dat er geen holding boven deze BV staat.
            </p>
          )}
          <p className="text-rose-400">
            Bronnen: KVK — Turboliquidatie, Ondernemersplein — Turboliquidatie, Jongbloed Fiscaal Juristen —
            Bestuurdersaansprakelijkheid en faillissement / Liquidatieverlies in de Vpb.
          </p>
        </div>
      )}
    </section>
  );
}
