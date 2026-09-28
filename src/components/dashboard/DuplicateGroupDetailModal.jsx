import { X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

// v237 — Toont de originele regels van één "mogelijk dubbele transactie"-groep naast elkaar, zodat de
// gebruiker zelf kan beoordelen of het écht om dezelfde boeking gaat (bijv. omdat een bankexport twee
// keer overlapt) of toevallig om twee losse, identieke betalingen. Elke rij is één ingelezen regel
// zoals die uit het bronbestand kwam (inclusief IBAN, volledige omschrijving en bestandsnaam) — dit
// is bewust dezelfde soort weergave als "Bekijk & corrigeer" per bestand (RawFileReviewModal), maar
// dan de regels van precies deze ene groep, uit al hun bronbestanden samen.
const CERTAINTY_INFO = {
  duplicaat: {
    label: "Saldo bevestigt: dit is een echte dubbeling",
    className: "border-red-200 bg-red-50 text-red-800",
  },
  apart: {
    label: "Saldo bevestigt: dit zijn losse, echte transacties",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  onzeker: {
    label: "Geen saldogegevens beschikbaar om te bevestigen — zelf beoordelen",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

export default function DuplicateGroupDetailModal({ group, onClose }) {
  if (!group || group.length === 0) return null;
  const info = CERTAINTY_INFO[group[0].certainty] || CERTAINTY_INFO.onzeker;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Vergelijk originele regels — {group.length}x {group[0].counterparty || group[0].description || "(geen omschrijving)"}
            </h2>
            <p className={`inline-block mt-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${info.className}`}>{info.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-200">
              <tr className="text-left text-slate-500">
                <th className="py-2 pl-5 pr-2 font-medium">Bestand</th>
                <th className="py-2 px-2 font-medium">Datum</th>
                <th className="py-2 px-2 font-medium text-right">Bedrag</th>
                <th className="py-2 px-2 font-medium">Tegenpartij</th>
                <th className="py-2 px-2 font-medium">IBAN tegenpartij</th>
                <th className="py-2 px-2 font-medium">Volledige omschrijving</th>
                <th className="py-2 pl-2 pr-5 font-medium text-right">Saldo (bank) na mutatie</th>
              </tr>
            </thead>
            <tbody>
              {group.map((tx, i) => (
                <tr key={tx.fingerprint || `${tx.id}-${i}`} className="border-b border-slate-50 align-top">
                  <td className="py-1.5 pl-5 pr-2 whitespace-nowrap text-slate-500">{tx.source}</td>
                  <td className="py-1.5 px-2 font-mono whitespace-nowrap">{tx.date.toLocaleDateString("nl-NL")}</td>
                  <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">{eur(tx.amount)}</td>
                  <td className="py-1.5 px-2">{tx.counterparty || "—"}</td>
                  <td className="py-1.5 px-2 font-mono text-slate-500 whitespace-nowrap">{tx.counterpartyIban || "—"}</td>
                  <td className="py-1.5 px-2 max-w-[18rem]">{tx.fullDescription || tx.description || "—"}</td>
                  <td className="py-1.5 pl-2 pr-5 text-right font-mono whitespace-nowrap text-slate-500">
                    {tx.balance != null ? eur(tx.balance) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Elke rij is de originele, ingelezen regel uit het bronbestand — niets is hier al samengevoegd of aangepast.
          </p>
          <button onClick={onClose} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800">
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
