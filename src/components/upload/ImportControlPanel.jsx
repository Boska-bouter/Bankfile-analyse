import { useState } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";

function StatusLine({ ok, warn, children }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${warn ? "text-amber-500" : "text-rose-500"}`} />
      )}
      <span>{children}</span>
    </li>
  );
}

// Een korte "APK" per geüpload bestand, vóór je verder gaat met classificeren — geeft vertrouwen
// dat een bestand goed is ingelezen (of laat direct zien waar het misgaat) zonder een verplichte
// extra stap te zijn: de rest van de tool blijft gewoon meteen bruikbaar.
export default function ImportControlPanel({ diagnostics, onReviewFile, continuity = [] }) {
  const [open, setOpen] = useState(false);
  if (diagnostics.length === 0) return null;

  const anyIssue =
    diagnostics.some((d) => d.skippedNoDate > 0 || d.skippedBadAmount > 0 || d.missingCounterparty > 0 || (d.balanceCheck && !d.balanceCheck.ok)) ||
    continuity.some((c) => !c.ok);

  return (
    <section className={`rounded-lg border ${anyIssue ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {anyIssue ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> : <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className={`text-sm font-semibold ${anyIssue ? "text-amber-900" : "text-emerald-900"}`}>
          Importcontrole — {diagnostics.length} bestand{diagnostics.length === 1 ? "" : "en"} ingelezen
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {diagnostics.map((d) => {
            const totalSkipped = d.skippedNoDate + d.skippedBadAmount;
            return (
              <div key={d.fileName} className="rounded-md bg-white border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-1.5">{d.fileName}</p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <StatusLine ok={totalSkipped === 0} warn>
                    {d.importedCount} transactie{d.importedCount === 1 ? "" : "s"} gelezen (van {d.totalRows} regel{d.totalRows === 1 ? "" : "s"} in het bestand)
                    {totalSkipped > 0 && (
                      <>
                        {" — "}
                        <strong>{totalSkipped} overgeslagen</strong>
                        {d.skippedNoDate > 0 && ` (${d.skippedNoDate}x geen leesbare datum)`}
                        {d.skippedBadAmount > 0 && ` (${d.skippedBadAmount}x geen leesbaar bedrag)`}
                      </>
                    )}
                  </StatusLine>
                  {d.from && d.to && (
                    <StatusLine ok>
                      Periode: {d.from.toLocaleDateString("nl-NL")} t/m {d.to.toLocaleDateString("nl-NL")}
                    </StatusLine>
                  )}
                  <StatusLine ok={d.missingCounterparty === 0} warn>
                    {d.missingCounterparty === 0
                      ? "Alle transacties hebben een tegenpartij of omschrijving"
                      : `${d.missingCounterparty} transactie(s) zonder tegenpartij én zonder omschrijving`}
                  </StatusLine>
                  {d.balanceCheck ? (
                    <StatusLine ok={d.balanceCheck.ok} warn>
                      {d.balanceCheck.ok ? (
                        <>
                          Saldo sluit aan (begin- en eindsaldo kloppen met de som van de transacties)
                          {d.balanceCheck.isCorrected && " — met een handmatig gecorrigeerd beginsaldo"}
                        </>
                      ) : (
                        <>
                          Saldo sluit <strong>niet</strong> aan (verschil {eur(d.balanceCheck.diff)}) —{" "}
                          <button onClick={() => onReviewFile(d.fileName)} className="underline hover:no-underline">
                            bekijk waar het misgaat, of corrigeer het beginsaldo
                          </button>
                        </>
                      )}
                    </StatusLine>
                  ) : (
                    <StatusLine ok>Geen saldokolom gevonden om op te controleren (geen probleem, alleen niet te verifiëren)</StatusLine>
                  )}
                </ul>
              </div>
            );
          })}
          {continuity.length > 0 && (
            <div className="rounded-md bg-white border border-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Aansluiting tussen bestanden</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {continuity.map((c) => (
                  <StatusLine key={`${c.fileA}__${c.fileB}`} ok={c.ok} warn>
                    <strong>{c.fileA}</strong> (eindigt {c.aTo.toLocaleDateString("nl-NL")}, saldo {eur(c.aLastBalance)}) →{" "}
                    <strong>{c.fileB}</strong> (begint {c.bFrom.toLocaleDateString("nl-NL")}, saldo {eur(c.bOpeningBalance)})
                    {c.ok ? " — sluit aan." : (
                      <>
                        {" "}— verschil {eur(c.diff)}. Dat kan een periodegrens zijn die niet exact aansluit (geen
                        probleem), of het is de moeite waard om na te gaan of er tussenin iets ontbreekt.
                      </>
                    )}
                  </StatusLine>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
