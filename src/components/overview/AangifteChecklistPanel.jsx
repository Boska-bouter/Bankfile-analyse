import { Check, AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

export default function AangifteChecklistPanel({ checklistData, activeYear, korRegeling, btwVerlegd, onOpenHelp }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        Aangifte-checklist {activeYear}
        {onOpenHelp && <HelpHint chapter="aangifte-checklist" onOpen={onOpenHelp} />}
      </h3>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          {checklistData.categorizedPct === 100 ? (
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span>
            {checklistData.categorizedPct}% gecategoriseerd
            {checklistData.overigCount > 0 ? ` — nog ${checklistData.overigCount} transactie${checklistData.overigCount === 1 ? "" : "s"} in "Overig"` : " — alles ingedeeld"}
          </span>
        </li>
        <li className="flex items-center gap-2">
          {korRegeling !== null ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <span>{korRegeling === null ? "KOR-vraag nog niet beantwoord" : korRegeling ? "Valt onder de KOR (geen BTW-plicht)" : "Geen KOR — gewone BTW-plicht"}</span>
        </li>
        {!korRegeling && (
          <li className="flex items-center gap-2">
            {btwVerlegd !== null ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
            <span>{btwVerlegd === null ? "BTW-verlegd-vraag nog niet beantwoord" : btwVerlegd ? "BTW-verlegd: ja" : "BTW-verlegd: nee"}</span>
          </li>
        )}
        {!korRegeling && checklistData.quartersForYear.length > 0 && (
          <li className="flex items-center gap-2">
            {checklistData.quartersOpen.length === 0 ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span>
              {checklistData.quartersOpen.length === 0 ? (
                "Alle kwartalen van dit jaar zijn aangegeven en betaald"
              ) : (
                <>
                  {checklistData.quartersNietAangegeven.length > 0 && <>Nog niet aangegeven: {checklistData.quartersNietAangegeven.map((q) => `Q${q.kwartaal}`).join(", ")}. </>}
                  {checklistData.quartersAangegevenNietBetaald.length > 0 && <>Wel aangegeven, nog niet betaald: {checklistData.quartersAangegevenNietBetaald.map((q) => `Q${q.kwartaal}`).join(", ")}.</>}
                </>
              )}
            </span>
          </li>
        )}
        {checklistData.loonheffingPct !== null && (
          <li className="flex items-center gap-2">
            {checklistData.loonheffingInVerwachteBereik ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span>
              Indicatieve loonheffing-verhouding: {eur(checklistData.totaalLH)} loonheffing op {eur(checklistData.totaalNettoLoon)} netto uitbetaald loon — ca.{" "}
              <strong>{checklistData.loonheffingPct.toFixed(1)}%</strong> van het (geschatte) brutoloon.{" "}
              {checklistData.loonheffingInVerwachteBereik
                ? "Dit ligt in de buurt van een gebruikelijk percentage (indicatief 20–40%)."
                : "Dit wijkt af van een gebruikelijk percentage (indicatief 20–40%) — kan kloppen, maar is de moeite waard om te checken."}
            </span>
          </li>
        )}
        {checklistData.monthsMissingLH.length > 0 && (
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Loon uitbetaald zonder duidelijke loonheffing erna: {checklistData.monthsMissingLH.join(", ")}. Check of de loonheffing hierbij nog moet volgen.</span>
          </li>
        )}
        {checklistData.loonheffingBoetes.length > 0 && (
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              {checklistData.loonheffingBoetes.length} transactie{checklistData.loonheffingBoetes.length === 1 ? "" : "s"} met "boete" bij Belastingen: LH/naheffingen (totaal{" "}
              {eur(Math.abs(checklistData.loonheffingBoetes.reduce((a, tx) => a + tx.amount, 0)))}) — een boete is fiscaal <strong>niet aftrekbaar</strong>.
            </span>
          </li>
        )}
        {checklistData.inkomstenAndereKwartaal.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.inkomstenAndereKwartaal.length} zakelijke inkomst{checklistData.inkomstenAndereKwartaal.length === 1 ? "" : "en"} met een datum in de omschrijving die in een{" "}
              <strong>ander kwartaal</strong> valt dan de betaaldatum zelf. Puur een aanwijzing, niets is automatisch verplaatst.
              <span className="block mt-1 text-xs text-slate-500">
                {checklistData.inkomstenAndereKwartaal.slice(0, 5).map((it) => (
                  <span key={it.tx.id} className="block">
                    {it.tx.date.toLocaleDateString("nl-NL")} ({eur(it.tx.amount)}, Q{it.txQuarter}) — omschrijving noemt {it.descDate.toLocaleDateString("nl-NL")} (Q{it.descQuarter}): {it.tx.counterparty || it.tx.description}
                  </span>
                ))}
                {checklistData.inkomstenAndereKwartaal.length > 5 && <span className="block">en {checklistData.inkomstenAndereKwartaal.length - 5} meer…</span>}
              </span>
            </span>
          </li>
        )}
        {checklistData.priveTransferOrphans.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.priveTransferOrphans.length} transactie{checklistData.priveTransferOrphans.length === 1 ? "" : "s"} aan de <strong>Prive</strong>-kant met categorie
              "Uitbetaling aan prive"/"Prive opnames" die <strong>geen spiegelboeking</strong> is — dus een losse, echte transactie in een categorie die eigenlijk bedoeld is voor geld
              dat vanuit Zakelijk overkomt.
              <span className="block mt-1 text-xs text-slate-500">
                {checklistData.priveTransferOrphans.slice(0, 5).map((tx) => (
                  <span key={tx.id} className="block">{tx.date.toLocaleDateString("nl-NL")} ({eur(tx.amount)}): {tx.counterparty || tx.description}</span>
                ))}
                {checklistData.priveTransferOrphans.length > 5 && <span className="block">en {checklistData.priveTransferOrphans.length - 5} meer…</span>}
              </span>
            </span>
          </li>
        )}
        {checklistData.priveTransferMissingMirrors.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.priveTransferMissingMirrors.length} zakelijke transactie{checklistData.priveTransferMissingMirrors.length === 1 ? "" : "s"} ("Uitbetaling aan prive"/"Prive opnames")
              zonder spiegelboeking aan de Prive-kant — dit zou eigenlijk nooit mogen voorkomen, dus dit is de moeite van het navragen waard.
              <span className="block mt-1 text-xs text-slate-500">
                {checklistData.priveTransferMissingMirrors.slice(0, 5).map((tx) => (
                  <span key={tx.id} className="block">{tx.date.toLocaleDateString("nl-NL")} ({eur(tx.amount)}): {tx.counterparty || tx.description}</span>
                ))}
                {checklistData.priveTransferMissingMirrors.length > 5 && <span className="block">en {checklistData.priveTransferMissingMirrors.length - 5} meer…</span>}
              </span>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
