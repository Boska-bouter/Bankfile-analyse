import { useMemo, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Check } from "lucide-react";

import { parseFile } from "./importers/detector.js";
import { buildTransactions, checkBalanceConsistency } from "./importers/transactions.js";
import { resolveClassification } from "./classification/classify.js";
import { DEFAULT_RULES, CATEGORY_ORDER, CATEGORY_COLOR } from "./classification/categories.js";
import { computeBtw, DEFAULT_BTW_RATES } from "./tax/btw.js";
import { eur } from "./utils/amounts.js";

// ---------------------------------------------------------------------------
// Dit is bewust een MINIMALE, functionele schil rond de volledig gemigreerde
// logicalagen (importers/, classification/, tax/, storage/, utils/) — niet een
// volledige 1-op-1 kopie van de originele ~2000-regelige hoofdcomponent.
//
// Wat hier al werkt, end-to-end, met de nieuwe module-structuur:
//   upload -> parseFile() -> buildTransactions() -> resolveClassification() ->
//   categorietotalen + saldo-consistentiecheck
//
// Wat hier NOG NIET zit (stap 4 van het migratieplan — de hoofdcomponent
// daadwerkelijk opsplitsen in de volledige set schermen/panelen):
//   - alle review-stappen (inkomsten/personen/overig/periode)
//   - BTW-kwartaaloverzicht, meerjarenoverzicht, aangiftevoorstel
//   - leningen/lease-invoervensters, instellingen-hub, project opslaan/laden
// Dat is doelbewust niet hier ingekort of overgeslagen samengevat — het is
// substantiële UI die per paneel op dezelfde manier moet worden overgezet als
// de logica hierboven al is: met behoud van exact dezelfde regels.
// ---------------------------------------------------------------------------

export default function App() {
  const [parsedFiles, setParsedFiles] = useState([]);
  const [error, setError] = useState(null);

  const handleFiles = async (fileList) => {
    setError(null);
    const files = Array.from(fileList).filter((f) => /\.(csv|xlsx|xls|940|sta|mt940|swi|txt|xml)$/i.test(f.name));
    const results = [];
    const failed = [];
    for (const f of files) {
      try {
        const { headers, rows, mapping } = await parseFile(f);
        results.push({ headers, rows, mapping, sourceLabel: f.name, fileName: f.name });
      } catch (e) {
        failed.push(`${f.name}: ${e.message || e}`);
      }
    }
    if (failed.length > 0) setError(failed.join("\n"));
    if (results.length > 0) {
      setParsedFiles((prev) => [...prev.filter((p) => !results.some((r) => r.fileName === p.fileName)), ...results]);
    }
  };

  const allTransactions = useMemo(() => buildTransactions(parsedFiles), [parsedFiles]);

  const classified = useMemo(
    () =>
      allTransactions.map((tx) => ({
        ...tx,
        ...resolveClassification(tx, DEFAULT_RULES, [], [], "Beide", {}, {}),
      })),
    [allTransactions]
  );

  const totals = useMemo(() => {
    const t = {};
    for (const tx of classified) t[tx.category] = (t[tx.category] || 0) + tx.amount;
    return t;
  }, [classified]);

  const btwByCategory = useMemo(() => {
    const t = {};
    for (const tx of classified) t[tx.category] = (t[tx.category] || 0) + computeBtw(tx, DEFAULT_BTW_RATES, false);
    return t;
  }, [classified]);

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-slate-900 text-stone-50">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">Bankoverzicht — Zakelijk &amp; Privé (v2, in migratie)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Vite/React-versie — logicalagen volledig gemigreerd, UI-panelen worden stapsgewijs overgezet.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section
          className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">Sleep hier je bank-CSV, XLS- of MT940-bestanden naartoe, of</p>
          <label className="inline-flex items-center gap-2 rounded-md bg-slate-900 text-stone-50 px-4 py-2 text-sm font-medium hover:bg-slate-800 cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> Bestanden kiezen
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.940,.sta,.mt940,.swi,.txt,.xml"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </section>

        {error && (
          <section className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-900 whitespace-pre-line">{error}</p>
          </section>
        )}

        {parsedFiles.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {parsedFiles.map((f) => {
              const balanceCheck = checkBalanceConsistency(allTransactions.filter((t) => t.source === f.fileName));
              return (
                <span key={f.fileName} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                  {f.fileName} <span className="text-slate-400">({f.rows.length} regels)</span>
                  {balanceCheck && (
                    balanceCheck.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700">
                        <Check className="h-2.5 w-2.5" /> saldo klopt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
                        <AlertCircle className="h-2.5 w-2.5" /> saldo klopt niet ({eur(balanceCheck.diff)})
                      </span>
                    )
                  )}
                </span>
              );
            })}
          </section>
        )}

        {classified.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Categorieën ({classified.length} transacties — automatische classificatie, rekeningtype "Beide")
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {CATEGORY_ORDER.filter((c) => c in totals).map((c) => (
                  <tr key={c} className="border-b border-slate-50">
                    <td className="py-1.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[c] || "bg-slate-200 text-slate-700"}`}>{c}</span>
                    </td>
                    <td className="py-1.5 text-right font-mono">{eur(totals[c])}</td>
                    <td className="py-1.5 text-right font-mono text-slate-400 text-xs">{eur(btwByCategory[c] || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold">
                  <td className="pt-2">Totaal</td>
                  <td className="pt-2 text-right font-mono">{eur(grandTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
