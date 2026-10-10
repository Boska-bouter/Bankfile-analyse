import { useState } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle, Trash2 } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { INTRA_FILE_BALANCE_THRESHOLD, classifyContinuityGap, saldoControleSleutel } from "../../importers/transactions.js";

// Tolerantie voor de saldocontrole bínnen één bestand (klopt begin- + mutaties = eindsaldo van dit
// ene bestand) — losstaand van de drie niveaus voor de aansluiting tússen bestanden bij een
// jaarovergang (continuity, zie classifyContinuityGap in transactions.js). Onder dit bedrag is een
// afwijking hier vrijwel altijd gewoon afronding; vroeger liet deze controle al bij een paar euro's
// verschil een amber waarschuwing zien, terwijl de rest van de app dat allang als verwaarloosbaar
// behandelde.
const isMinorDiff = (diff) => Math.abs(diff) < INTRA_FILE_BALANCE_THRESHOLD;

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
// extra stap te zijn: de rest van de app blijft gewoon meteen bruikbaar.
export default function ImportControlPanel({ diagnostics, onReviewFile, continuity = [], onRemoveFile, accountTypeByFile = {}, bevestigd = {}, onBevestig, onHerroep }) {
  // v243 — null = "auto" (open zodra er een echt punt is, ingeklapt zodra alles klopt), zelfde
  // patroon als de andere Controleren-secties — een expliciete klik wint daarna, ongeacht of er
  // later nog een bestand bijkomt.
  const [openOverride, setOpenOverride] = useState(null);
  if (diagnostics.length === 0) return null;

  const anyIssue =
    diagnostics.some(
      (d) => d.skippedNoDate > 0 || d.skippedBadAmount > 0 || d.missingCounterparty > 0 || (d.balanceCheck && !d.balanceCheck.ok && !isMinorDiff(d.balanceCheck.diff) && !bevestigd[saldoControleSleutel(d)])
    ) || continuity.some((c) => !c.ok && classifyContinuityGap(c.diff) !== "groen");
  const open = openOverride === null ? anyIssue : openOverride;

  return (
    <section className={`rounded-xl border-2 ${anyIssue ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button onClick={() => setOpenOverride(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {anyIssue ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> : <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className={`text-sm font-semibold ${anyIssue ? "text-amber-900" : "text-emerald-900"}`}>
          Importcontrole — {diagnostics.length} bestand{diagnostics.length === 1 ? "" : "en"} ingelezen
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {onRemoveFile && (
            <p className="text-xs text-slate-500">Klik op het prullenbakje bij een bestand om dat bestand en al zijn transacties te verwijderen.</p>
          )}
          {diagnostics.map((d) => {
            const totalSkipped = d.skippedNoDate + d.skippedBadAmount;
            return (
              <div key={d.fileName} className="rounded-lg bg-white border border-slate-100 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-slate-700 flex-1">
                    {d.fileName}
                    {/* v286 — op verzoek: welke rekening (Zakelijk/Prive) een bestand is, stond
                        nergens bij het bestand zelf — alleen af te leiden via de wizard-instellingen
                        elders. accountTypeByFile komt uit diezelfde bron (de basisvragen-wizard). */}
                    {accountTypeByFile[d.fileName] && (
                      <span
                        className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold align-middle ${
                          accountTypeByFile[d.fileName] === "Zakelijk" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {accountTypeByFile[d.fileName] === "Prive" ? "Privé" : accountTypeByFile[d.fileName]}
                      </span>
                    )}
                  </p>
                  {onRemoveFile && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Bestand "${d.fileName}" en alle bijbehorende transacties verwijderen?`)) onRemoveFile(d.fileName);
                      }}
                      className="shrink-0 text-slate-300 hover:text-rose-600 p-1"
                      title="Dit bestand verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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
                    <StatusLine ok={d.balanceCheck.ok || isMinorDiff(d.balanceCheck.diff) || !!bevestigd[saldoControleSleutel(d)]} warn={!d.balanceCheck.ok && !isMinorDiff(d.balanceCheck.diff)}>
                      {d.balanceCheck.ok ? (
                        <>
                          Saldo sluit aan (begin- en eindsaldo kloppen met de som van de transacties)
                          {d.balanceCheck.isCorrected && " — met een handmatig gecorrigeerd beginsaldo"}
                        </>
                      ) : isMinorDiff(d.balanceCheck.diff) ? (
                        <>
                          Saldo sluit nagenoeg aan (verschil {eur(d.balanceCheck.diff)}) — waarschijnlijk gewoon afronding, geen actie nodig, maar{" "}
                          <button onClick={() => onReviewFile(d.fileName)} className="underline hover:no-underline">
                            toch even bekijken kan altijd
                          </button>
                        </>
                      ) : bevestigd[saldoControleSleutel(d)] ? (
                        <>
                          Saldoverschil {eur(d.balanceCheck.diff)} — door jou als akkoord aangemerkt
                          {onHerroep && (
                            <>
                              {" "}(<button onClick={() => onHerroep(saldoControleSleutel(d))} className="underline hover:no-underline">toch weer als open punt tonen</button>)
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          Saldo sluit <strong>niet</strong> aan (verschil {eur(d.balanceCheck.diff)}) —{" "}
                          <button onClick={() => onReviewFile(d.fileName)} className="underline hover:no-underline">
                            bekijk waar het misgaat, of corrigeer het beginsaldo
                          </button>
                          {onBevestig && (
                            <>
                              {" "}·{" "}
                              <button
                                onClick={() => onBevestig(saldoControleSleutel(d))}
                                title="Je hebt gekeken en het verschil is bekend of bewust zo. Het blijft dan niet als open punt staan; verandert het verschil later, dan komt de melding terug."
                                className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Saldoverschil is akkoord
                              </button>
                            </>
                          )}
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
            <div className="rounded-lg bg-white border border-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Aansluiting tussen bestanden</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {/* v260 — drie niveaus i.p.v. twee: groen tot €500 (verwaarloosbaar voor het
                    dossier, alleen een opmerking), geel €500–€999 (de moeite waard om te bekijken),
                    rood vanaf €1000 (telt als een echt gat, zie classifyContinuityGap). */}
                {continuity.map((c) => {
                  const severity = c.ok ? "groen" : classifyContinuityGap(c.diff);
                  return (
                    <StatusLine key={`${c.fileA}__${c.fileB}`} ok={severity === "groen"} warn={severity === "geel"}>
                      <strong>{c.fileA}</strong> (eindigt {c.aTo.toLocaleDateString("nl-NL")}, saldo {eur(c.aLastBalance)}) →{" "}
                      <strong>{c.fileB}</strong> (begint {c.bFrom.toLocaleDateString("nl-NL")}, saldo {eur(c.bOpeningBalance)})
                      {c.bevestigd ? (
                        <>
                          {" "}— verschil {eur(c.diff)}, door jou als akkoord aangemerkt
                          {onHerroep && (
                            <>
                              {" "}(<button onClick={() => onHerroep(c.sleutel)} className="underline hover:no-underline">toch weer als open punt tonen</button>)
                            </>
                          )}
                        </>
                      ) : c.ok ? (
                        " — sluit aan."
                      ) : severity === "groen" ? (
                        <> — verschil {eur(c.diff)}. Een verschil tot €500 is meestal gewoon afronding of een periodegrens en maakt voor het dossier weinig uit — dit telt daarom nergens elders mee als een gemiste periode.</>
                      ) : (
                        <>
                          {" "}— verschil {eur(c.diff)}.{" "}
                          {severity === "geel"
                            ? "Nog geen echt gat, maar wel de moeite waard om even te bekijken."
                            : "Dat is groter dan gebruikelijk (vanaf €1000) — de moeite waard om na te gaan of er tussenin iets ontbreekt."}
                          {onBevestig && (
                            <>
                              {" "}
                              <button
                                onClick={() => onBevestig(c.sleutel)}
                                title="Je hebt gekeken en het verschil is bekend of bewust zo (bijvoorbeeld een ontbrekende periode zonder transacties). Het blijft dan niet als open punt staan; verandert het verschil later, dan komt de melding terug."
                                className="ml-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Verschil is akkoord
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </StatusLine>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
