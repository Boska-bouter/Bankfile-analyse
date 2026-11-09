import { useState } from "react";
import { eur } from "../../utils/amounts.js";

// huishoudboekje-V7R1 — de onderliggende boekingen van een tegenpartij tonen (wens Boska 9-11: "naar de onderliggende
// transacties kunnen kijken wat daar staat"). Nieuwste eerst; datum, bedrag, rekening en de volledige bankomschrijving.
const datum = (d) => (d instanceof Date && !isNaN(d) ? d.toLocaleDateString("nl-NL") : String(d || ""));
export default function BoekingenLijst({ txs = [], className = "" }) {
  const [open, setOpen] = useState(false);
  if (!txs.length) return null;
  const lijst = open ? [...txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) : [];
  return (
    <div className={className}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} aria-expanded={open}
        className="text-xs font-medium text-sky-700 underline hover:text-sky-900">
        {open ? "Verberg de boekingen" : `Toon de ${txs.length === 1 ? "boeking" : `${txs.length} boekingen`}`}
      </button>
      {open && (
        <ul className="mt-1.5 max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-xs" data-testid="boekingen-lijst">
          {lijst.map((t) => (
            <li key={t.id} className="px-2.5 py-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-slate-500 tabular-nums">{datum(t.date)}</span>
                <span className={`font-semibold tabular-nums ${t.amount < 0 ? "text-rose-700" : "text-emerald-700"}`}>{eur(t.amount)}</span>
                <span className="text-slate-400">{t.type === "Zakelijk" ? "zakelijke rekening" : "privérekening"}{t.category ? ` · ${t.category}` : ""}</span>
              </div>
              <p className="mt-0.5 whitespace-normal break-words text-slate-600">{t.fullDescription || t.description || "(geen omschrijving)"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
