import { useMemo } from "react";
import { X } from "lucide-react";
import { checkBalanceConsistency } from "../../importers/transactions.js";
import { eur } from "../../utils/amounts.js";

// Toont alle ruwe, ingelezen regels van 1 bestand (dus vóór classificatie) in een los venster —
// voor als het saldo niet klopt en je wilt narekenen waar het misgaat. Een regel uitsluiten
// verbergt 'm voortaan overal in de tool (net als bij dubbele transacties) — de keuze wordt
// onthouden in het projectbestand, niet in de brondata zelf.
export default function RawFileReviewModal({ fileName, rawTx, fingerprintByTxId, excludedManualFingerprints, setExcludedManualFingerprints, onClose }) {
  const excludedSet = useMemo(() => new Set(excludedManualFingerprints), [excludedManualFingerprints]);
  const sorted = useMemo(() => rawTx.slice().sort((a, b) => a.date - b.date || a.id - b.id), [rawTx]);

  const balanceCheck = useMemo(() => checkBalanceConsistency(sorted), [sorted]);
  const breakpointTxIds = useMemo(() => new Set((balanceCheck?.breakpoints || []).map((bp) => bp.tx.id)), [balanceCheck]);

  // Live herberekend saldo op basis van wat er NU nog is aangevinkt.
  const liveCheck = useMemo(() => {
    const included = sorted.filter((tx) => !excludedSet.has(fingerprintByTxId[tx.id]));
    return checkBalanceConsistency(included);
  }, [sorted, excludedSet, fingerprintByTxId]);

  const toggleRow = (tx) => {
    const fp = fingerprintByTxId[tx.id];
    setExcludedManualFingerprints((prev) => (prev.includes(fp) ? prev.filter((f) => f !== fp) : [...prev, fp]));
  };

  const uitgeslotenInDitBestand = sorted.filter((tx) => excludedSet.has(fingerprintByTxId[tx.id])).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Bekijk &amp; corrigeer — {fileName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {liveCheck?.ok ? (
                <span className="text-emerald-700">✓ Saldo klopt nu (op basis van de nog aangevinkte regels)</span>
              ) : liveCheck ? (
                <span className="text-amber-700">Saldo klopt nog niet: verschil {eur(liveCheck.diff)}</span>
              ) : (
                "Onvoldoende regels met een saldo-kolom om te controleren"
              )}
              {uitgeslotenInDitBestand > 0 && ` — ${uitgeslotenInDitBestand} regel(s) hier uitgesloten`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-200">
              <tr className="text-left text-slate-500">
                <th className="py-2 pl-5 pr-2 font-medium">Uitgesloten?</th>
                <th className="py-2 px-2 font-medium">Datum</th>
                <th className="py-2 px-2 font-medium">Tegenpartij / omschrijving</th>
                <th className="py-2 px-2 font-medium text-right">Bedrag</th>
                <th className="py-2 pl-2 pr-5 font-medium text-right">Saldo (bank)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => {
                const fp = fingerprintByTxId[tx.id];
                const isExcluded = excludedSet.has(fp);
                const isBreakpoint = breakpointTxIds.has(tx.id);
                return (
                  <tr key={tx.id} className={`border-b border-slate-50 ${isExcluded ? "opacity-40" : ""} ${isBreakpoint ? "bg-amber-50" : ""}`}>
                    <td className="py-1.5 pl-5 pr-2">
                      <input type="checkbox" checked={isExcluded} onChange={() => toggleRow(tx)} title="Aanvinken om deze regel overal in de tool uit te sluiten" />
                    </td>
                    <td className="py-1.5 px-2 font-mono whitespace-nowrap">{tx.date.toLocaleDateString("nl-NL")}</td>
                    <td className="py-1.5 px-2">
                      {tx.counterparty || tx.description || "(geen omschrijving)"}
                      {isBreakpoint && <span className="ml-1.5 text-amber-700" title="Bij deze regel klopt het lopende saldo niet meer">⚠</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">{eur(tx.amount)}</td>
                    <td className="py-1.5 pl-2 pr-5 text-right font-mono whitespace-nowrap text-slate-500">{tx.balance != null ? eur(tx.balance) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">Uitgesloten regels tellen nergens meer mee — terugzetten kan hier altijd.</p>
          <button onClick={onClose} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Sluiten</button>
        </div>
      </div>
    </div>
  );
}
