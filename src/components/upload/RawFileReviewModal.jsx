import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { checkBalanceConsistency } from "../../importers/transactions.js";
import { eur } from "../../utils/amounts.js";

// Toont alle ruwe, ingelezen regels van 1 bestand (dus vóór classificatie) in een los venster —
// voor als het saldo niet klopt en je wilt narekenen waar het misgaat. Een regel uitsluiten
// verbergt 'm voortaan overal in de tool (net als bij dubbele transacties) — de keuze wordt
// onthouden in het projectbestand, niet in de brondata zelf.
//
// Standaard op BESTANDSVOLGORDE gesorteerd (niet op datum) — dat is exact de volgorde waarin de
// bank de regels aanlevert, dus 1-op-1 te vergelijken met het originele bestand. Handig omdat het
// "saldo na mutatie" in het bestand ook in die volgorde is opgebouwd, niet per se strikt
// chronologisch.
export default function RawFileReviewModal({
  fileName, rawTx, fingerprintByTxId, excludedManualFingerprints, setExcludedManualFingerprints,
  openingBalanceCorrection, onSetOpeningBalanceCorrection, onClose,
}) {
  const [sortByDate, setSortByDate] = useState(false);
  const [openingInput, setOpeningInput] = useState(openingBalanceCorrection != null ? String(openingBalanceCorrection) : "");

  const excludedSet = useMemo(() => new Set(excludedManualFingerprints), [excludedManualFingerprints]);
  const sorted = useMemo(
    () => rawTx.slice().sort((a, b) => (sortByDate ? a.date - b.date || a.id - b.id : a.id - b.id)),
    [rawTx, sortByDate]
  );

  const balanceCheck = useMemo(() => checkBalanceConsistency(sorted, openingBalanceCorrection), [sorted, openingBalanceCorrection]);
  const breakpointTxIds = useMemo(() => new Set((balanceCheck?.breakpoints || []).map((bp) => bp.tx.id)), [balanceCheck]);

  // Live herberekend saldo op basis van wat er NU nog is aangevinkt én de eventuele correctie.
  const liveCheck = useMemo(() => {
    const included = sorted.filter((tx) => !excludedSet.has(fingerprintByTxId[tx.id]));
    return checkBalanceConsistency(included, openingBalanceCorrection);
  }, [sorted, excludedSet, fingerprintByTxId, openingBalanceCorrection]);

  const toggleRow = (tx) => {
    const fp = fingerprintByTxId[tx.id];
    setExcludedManualFingerprints((prev) => (prev.includes(fp) ? prev.filter((f) => f !== fp) : [...prev, fp]));
  };

  const applyOpeningCorrection = () => {
    const val = openingInput.trim() === "" ? null : Number(openingInput.replace(",", "."));
    onSetOpeningBalanceCorrection(fileName, val != null && !Number.isNaN(val) ? val : null);
  };

  const uitgeslotenInDitBestand = sorted.filter((tx) => excludedSet.has(fingerprintByTxId[tx.id])).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Bekijk &amp; corrigeer — {fileName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {liveCheck?.ok ? (
                <span className="text-emerald-700">✓ Saldo klopt nu (op basis van de nog aangevinkte regels{liveCheck.isCorrected ? " en het gecorrigeerde beginsaldo" : ""})</span>
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

        <div className="px-5 py-3 border-b border-slate-100 shrink-0 flex flex-wrap items-end gap-4 bg-slate-50">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">
              Beginsaldo corrigeren {balanceCheck && <span className="text-slate-400">(bestand zelf: {eur(balanceCheck.fileOpeningBalance)})</span>}
            </label>
            <div className="flex gap-1.5">
              <input
                type="text" inputMode="decimal" value={openingInput} onChange={(e) => setOpeningInput(e.target.value)}
                placeholder={balanceCheck ? String(balanceCheck.fileOpeningBalance) : "—"}
                className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
              />
              <button onClick={applyOpeningCorrection} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                Toepassen
              </button>
              {openingBalanceCorrection != null && (
                <button
                  onClick={() => { setOpeningInput(""); onSetOpeningBalanceCorrection(fileName, null); }}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white"
                >
                  Terugzetten
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 max-w-md">
              Bijvoorbeeld als het beginsaldo op 1 januari net niet exact aansluit bij het eindsaldo van 31 december in
              een ander bestand — dan kun je hier het uitgangspunt zelf zetten.
            </p>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 ml-auto shrink-0">
            <input type="checkbox" checked={sortByDate} onChange={(e) => setSortByDate(e.target.checked)} />
            Sorteer op datum (i.p.v. bestandsvolgorde)
          </label>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white border-b border-slate-200">
              <tr className="text-left text-slate-500">
                <th className="py-2 pl-5 pr-2 font-medium">Uitgesloten?</th>
                <th className="py-2 px-2 font-medium">#</th>
                <th className="py-2 px-2 font-medium">Datum</th>
                <th className="py-2 px-2 font-medium">Tegenpartij / omschrijving</th>
                <th className="py-2 px-2 font-medium text-right">Bedrag</th>
                <th className="py-2 pl-2 pr-5 font-medium text-right">Saldo (bank)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx, i) => {
                const fp = fingerprintByTxId[tx.id];
                const isExcluded = excludedSet.has(fp);
                const isBreakpoint = breakpointTxIds.has(tx.id);
                return (
                  <tr key={tx.id} className={`border-b border-slate-50 ${isExcluded ? "opacity-40" : ""} ${isBreakpoint ? "bg-amber-50" : ""}`}>
                    <td className="py-1.5 pl-5 pr-2">
                      <input type="checkbox" checked={isExcluded} onChange={() => toggleRow(tx)} title="Aanvinken om deze regel overal in de tool uit te sluiten" />
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-300 whitespace-nowrap">{i + 1}</td>
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
