import { eur } from "../../utils/amounts.js";

// V15 — lichte variant van de vroegere Factuurperiode-controle: alleen een melding in het
// BTW-per-kwartaal-venster (geen kaart, geen stap, geen open punt). Toont zakelijke ontvangsten
// waarvan de bankomschrijving een periode noemt die in een ander kwartaal valt dan de boekdatum.
export default function PeriodeSignaal({ items, onConfirm, onMove }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12.5px] text-sky-900">
      <p className="font-semibold">
        {items.length} ontvangst{items.length === 1 ? "" : "en"} lijk{items.length === 1 ? "t" : "en"} in een ander kwartaal te horen
      </p>
      <p className="mt-0.5 text-sky-800">
        De bankomschrijving noemt een periode in een ander kwartaal dan de boekdatum. Kies per post: verplaatsen naar dat kwartaal
        (factuurstelsel) of laten staan (kasstelsel). Dit raakt alleen de indeling in deze kwartaaloverzichten.
      </p>
      <div className="mt-2 space-y-1.5">
        {items.map(({ tx, boekingKwartaal, voorgesteldKwartaal }) => (
          <div key={tx.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white border border-sky-100 px-2.5 py-1.5">
            <span className="flex-1 min-w-[12rem] text-slate-700">
              {tx.date.toLocaleDateString("nl-NL")} · {eur(tx.amount)} · {tx.counterparty || tx.description || "(geen omschrijving)"}
              <span className="block text-xs text-slate-500">Boekdatum {boekingKwartaal} — periode lijkt {voorgesteldKwartaal}</span>
            </span>
            <button type="button" onClick={() => onMove(tx, voorgesteldKwartaal)} className="rounded-full bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1 text-[11.5px]">
              Verplaats naar {voorgesteldKwartaal}
            </button>
            <button type="button" onClick={() => onConfirm(tx)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50">
              Laten staan
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
