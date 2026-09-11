import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

export default function PeriodeReviewStep({ items, onConfirm, onMove, onOpenHelp }) {
  if (items.length === 0) return null;
  return (
    <div className="p-5">
      <p className="text-xs text-slate-500 mb-3 max-w-2xl">
        Bij deze ontvangsten noemt de bankomschrijving een factuurperiode die in een ander kwartaal valt dan de
        boekingsdatum. Geen automatische wijziging — dit hangt af van het gehanteerde stelsel (factuurstelsel:
        factuurperiode is leidend; kasstelsel: boekingsdatum is al correct). Een verplaatsing raakt alleen de
        indeling in "BTW-aangifte per kwartaal".{" "}
        {onOpenHelp && <HelpHint chapter="factuurperiode" onOpen={onOpenHelp} />}
      </p>
      <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-md">
        {items.map(({ tx, boekingKwartaal, voorgesteldKwartaal }) => (
          <div key={tx.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex-1 min-w-[14rem]">
              <p className="text-sm font-medium">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
              <p className="text-xs text-slate-400">{tx.date.toLocaleDateString("nl-NL")} · {eur(tx.amount)}</p>
              <p className="text-xs text-sky-700 mt-1">
                Boekingsdatum: <strong>{boekingKwartaal}</strong> — factuurperiode lijkt: <strong>{voorgesteldKwartaal}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => onMove(tx, voorgesteldKwartaal)}
                className="rounded-md border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
              >
                Verplaatsen naar {voorgesteldKwartaal}
              </button>
              <button onClick={() => onConfirm(tx)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Nee, boekingsdatum klopt
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
