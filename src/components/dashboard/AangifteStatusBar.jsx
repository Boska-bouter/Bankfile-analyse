import { Check, AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";

// Eén statusblok voor het actieve jaar. Was eerder twee losse panelen (een compacte statusbalk met
// een korte "openstaande punten"-lijst, en een uitgebreide "Aangifte-checklist" eronder) die allebei
// uit dezelfde checklistData putten — dat stond dubbel. Nu: één kop met status + workflow-stappen,
// gevolgd door de volledige checklist (met uitleg per punt, ook de punten die al in orde zijn).
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
const STATUS_TEKST = {
  groen: "Klaar voor aangiftecontrole — geen belangrijke openstaande punten",
  oranje: "Controlepunten aanwezig — zie hieronder wat nog beoordeeld moet worden",
  rood: "Mogelijk ontbreekt een periode — het saldo tussen twee bestanden van deze rekening sluit dit jaar niet aan, met een verschil groter dan een gewoon afrondingsverschil",
};

// Eén workflow-stap: "done" (✓), "groen"/"oranje"/"rood" (hergebruikt dezelfde jaarstatus-kleuren
// voor de Jaarcontrole-stap), "todo" (nog niet begonnen) of "cta" (actie, geen eigen status).
function StepIcon({ state }) {
  if (state === "done") return <Check className="h-3.5 w-3.5 text-emerald-600" />;
  if (state === "groen") return <span>🟢</span>;
  if (state === "oranje") return <span>🟠</span>;
  if (state === "rood") return <span>🔴</span>;
  return <span className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300" />;
}

export default function AangifteStatusBar({
  activeYear,
  yearStatus,
  workflowSteps,
  onOpenAangiftevoorstel,
  checklistData,
  rechtsvorm,
  korRegeling,
  btwVerlegd,
  ibGedaan,
  zvwGedaan,
  onOpenHelp,
  onRequestChange,
  onConfirmCorrect,
}) {
  if (!activeYear) return null;
  return (
    <section className="rounded-lg border-2 border-slate-900 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-stone-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            Aangifte {activeYear}
            {onOpenHelp && <HelpHint chapter="aangifte-checklist" onOpen={onOpenHelp} />}
          </p>
          <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
            <span>{STATUS_EMOJI[yearStatus]}</span>
            <span>{STATUS_TEKST[yearStatus]}</span>
          </p>
        </div>
        <button
          onClick={onOpenAangiftevoorstel}
          className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100"
        >
          Indicatieve aangifteberekening bekijken
        </button>
      </div>
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-slate-600 border-b border-slate-100">
        {workflowSteps.map((step, i) => (
          <span key={step.label} className="flex items-center gap-1">
            <span className="flex items-center gap-1">
              <StepIcon state={step.state} />
              {step.label}
            </span>
            {i < workflowSteps.length - 1 && <span className="text-slate-300 mx-1.5">→</span>}
          </span>
        ))}
      </div>

      <ul className="px-4 py-3 space-y-1.5 text-sm">
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
        {rechtsvorm === "bv" ? (
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Gewone BTW-plicht (KOR en BTW-verlegd zijn niet van toepassing voor een BV)</span>
          </li>
        ) : (
          <>
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
          </>
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
        <li className="flex items-center gap-2">
          {ibGedaan ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <span>{ibGedaan ? "IB/IH afgevinkt als gedaan" : "IB/IH nog niet afgevinkt als gedaan"}</span>
        </li>
        <li className="flex items-center gap-2">
          {zvwGedaan ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
          <span>{zvwGedaan ? "Zvw afgevinkt als gedaan" : "Zvw nog niet afgevinkt als gedaan"}</span>
        </li>
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
                  <ExpandableDescription
                    key={it.tx.id} tx={it.tx} className="block"
                    prefix={`${it.tx.date.toLocaleDateString("nl-NL")} (${eur(it.tx.amount)}, Q${it.txQuarter}) — omschrijving noemt ${it.descDate.toLocaleDateString("nl-NL")} (Q${it.descQuarter}): `}
                    short={it.tx.counterparty || it.tx.description}
                  />
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
                  <span key={tx.id} className="flex items-center gap-2">
                    <ExpandableDescription tx={tx} className="flex-1 min-w-0" prefix={`${tx.date.toLocaleDateString("nl-NL")} (${eur(tx.amount)}): `} short={tx.counterparty || tx.description} />
                    {onRequestChange && (
                      <button
                        onClick={() => onRequestChange(tx, { category: tx.category, type: "Zakelijk" })}
                        className="shrink-0 rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
                        title="Klopt deze transactie eigenlijk toch bij Zakelijk? Zet 'm dan direct op type Zakelijk (categorie blijft gelijk)."
                      >
                        Zet op Zakelijk
                      </button>
                    )}
                  </span>
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
                  <ExpandableDescription key={tx.id} tx={tx} className="block" prefix={`${tx.date.toLocaleDateString("nl-NL")} (${eur(tx.amount)}): `} short={tx.counterparty || tx.description} />
                ))}
                {checklistData.priveTransferMissingMirrors.length > 5 && <span className="block">en {checklistData.priveTransferMissingMirrors.length - 5} meer…</span>}
              </span>
            </span>
          </li>
        )}
        {checklistData.priveCategorieOpZakelijkeRekening.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.priveCategorieOpZakelijkeRekening.length} duidelijk privé-uitgave
              {checklistData.priveCategorieOpZakelijkeRekening.length === 1 ? "" : "n"} betaald vanaf de <strong>zakelijke</strong> rekening — fiscaal al correct verwerkt (telt niet mee
              als bedrijfskosten), maar de moeite waard om de cliënt te laten weten dat dit eigenlijk vanaf de privérekening had gemoeten. Terug te vinden in het detailoverzicht.
            </span>
          </li>
        )}
        {checklistData.zakelijkeCategorieOpPriveRekening.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.zakelijkeCategorieOpPriveRekening.length} duidelijk zakelijke uitgave/omzet
              {checklistData.zakelijkeCategorieOpPriveRekening.length === 1 ? "" : "n"} betaald/ontvangen op de <strong>privé</strong>rekening — fiscaal al correct verwerkt (telt gewoon mee
              in de winst/BTW), maar de moeite waard om de cliënt te laten weten dat dit eigenlijk vanaf de zakelijke rekening had gemoeten. Terug te vinden in het detailoverzicht.
            </span>
          </li>
        )}
        {checklistData.inkomstenZonderOmschrijving.length > 0 && (
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {checklistData.inkomstenZonderOmschrijving.length} bijschrijving{checklistData.inkomstenZonderOmschrijving.length === 1 ? "" : "en"} op de zakelijke rekening
              <strong> zonder omschrijving of tegenpartijnaam</strong> — de aanname is dat dit gewoon zakelijke omzet is (zoals elke bijschrijving op deze
              rekening), maar zonder omschrijving is dat niet te toetsen. Allemaal zakelijk?
              <span className="block mt-1.5">
                {onConfirmCorrect && (
                  <button
                    onClick={() => checklistData.inkomstenZonderOmschrijving.forEach((tx) => onConfirmCorrect(tx))}
                    className="rounded border border-emerald-300 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
                  >
                    Ja, allemaal zakelijk
                  </button>
                )}
              </span>
              <span className="block mt-1.5 text-xs text-slate-500">
                {checklistData.inkomstenZonderOmschrijving.slice(0, 5).map((tx) => (
                  <span key={tx.id} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0">{tx.date.toLocaleDateString("nl-NL")} ({eur(tx.amount)})</span>
                    {onRequestChange && (
                      <button
                        onClick={() => onRequestChange(tx, { category: "Overig", type: tx.type })}
                        className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                        title="Toch niet zakelijk? Zet 'm op Overig, voor verdere beoordeling."
                      >
                        Toch niet zakelijk
                      </button>
                    )}
                  </span>
                ))}
                {checklistData.inkomstenZonderOmschrijving.length > 5 && <span className="block">en {checklistData.inkomstenZonderOmschrijving.length - 5} meer…</span>}
              </span>
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}
