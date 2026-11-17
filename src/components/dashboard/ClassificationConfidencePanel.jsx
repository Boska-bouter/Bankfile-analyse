import { counterpartyKey, korteJaren } from "../../utils/normalization.js";
import { sleutelZonderNaam, bevestigdVoor } from "../../classification/reviewSummaries.js";
import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, Check } from "lucide-react";
import { CATEGORY_COLOR, displayCategory, keuzeLabel, mainCategoryOf, hoofdKleur } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { Lock } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import { telOpenPunten } from "../../review/openPunten.js";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";
import { metBolletjes } from "../shared/StatusDot.jsx";

const LEVEL_ICON = { override: "🟢", keyword: "🟢", heuristic: "🟡", fallback: "🔴" };

// Maakt zichtbaar hoe zeker de automatische classificatie is — niet als vervanging van
// resolveClassification (die blijft de bron van waarheid), maar als hulp om te zien welke
// transacties de moeite waard zijn om te controleren, in plaats van alles na te lopen.
export default function ClassificationConfidencePanel({ classified, jaar = null, andereJaren = [], onKiesJaar, onOpenOverig, onOpenPersonen, onOpenHelp, onConfirmCorrect, onOpenLevel, onRequestChange, reviewedOverigKeys = [], reviewedPersonKeys = [] }) {
  const [open, setOpen] = useState(false);
  const nonMirror = classified.filter((tx) => !tx.isMirror);
  if (nonMirror.length === 0) return null;

  // release31V0 — "Klopt zo" in het venster Overig / Overboekingen aan personen telt als beoordeeld, net als
  // in de telling op de kaart en in het venster dat je hier opent. Voorheen telde dit blok ze nog als
  // "controleren", terwijl het geopende venster er 0 toonde.
  const overigSet = new Set(reviewedOverigKeys), personenSet = new Set(reviewedPersonKeys);
  const bevestigd = (tx) => {
    if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") return false;
    const k = counterpartyKey(tx.counterparty || tx.description, tx.amount) || sleutelZonderNaam(tx);
    return bevestigdVoor(tx.category === "Overig" ? overigSet : personenSet, k, tx);
  };
  // nieuw-V4R7 — een klein bedrag (kleineBedragen.js) telt nergens als open punt, dus hier ook niet: anders opende "controleren"
  // een venster zonder boekingen dat meteen weer sloot (melding Boska 13-11). In de lijst blijven ze wel staan, met keuzevak.
  const open_ = (tx) => (tx.confidence.level === "heuristic" || tx.confidence.level === "fallback") && !bevestigd(tx);
  const klein = nonMirror.filter((tx) => tx.kleinBedrag && open_(tx));
  const approved = nonMirror.filter((tx) => tx.confidence.level === "override" || tx.confidence.level === "keyword" || bevestigd(tx) || (tx.kleinBedrag && open_(tx)));
  // nieuw-V6R6 — "Nog niet ingedeeld" (Overig) en "Personen en onbekende tegenpartijen" hebben een eigen kaart en venster: hier niet
  // meetellen, wel noemen (regressietest 16-11: blok 216, venster 184 + 32 elders).
  const elders = (tx) => tx.category === "Overig" || tx.category === "Overboekingen aan personen";
  const review = nonMirror.filter((tx) => tx.confidence.level === "heuristic" && !bevestigd(tx) && !tx.kleinBedrag && !elders(tx));
  const unclear = nonMirror.filter((tx) => tx.confidence.level === "fallback" && !bevestigd(tx) && !tx.kleinBedrag && !elders(tx));
  const eldersOverig = nonMirror.filter((tx) => tx.category === "Overig" && open_(tx) && !tx.kleinBedrag).length;
  const eldersPersonen = nonMirror.filter((tx) => tx.category === "Overboekingen aan personen" && open_(tx) && !tx.kleinBedrag).length;
  const needsReview = [...unclear, ...review, ...klein]; // onduidelijk eerst — dat verdient de meeste aandacht; kleine bedragen achteraan
  const total = nonMirror.length;
  // nieuw-V6R0 — 7 van 2282 is geen "0%" (Boska 16-11)
  const pct = (n) => (n > 0 && Math.round((n / total) * 100) === 0 ? "<1" : Math.round((n / total) * 100));
  const nOpen = review.length + unclear.length;
  const nGroepen = telOpenPunten([...review, ...unclear]); // nieuw-V6R8 — kop telt groepen én boekingen (analyse 17-11, punt 3)

  return (
    // nieuw-V6R0 — zelfde stijl als Importcontrole: oranje met aantal als er iets te controleren is, anders groen (Boska 16-11)
    <section className={`rounded-xl border-2 ${nOpen > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      {/* v253 — <div role="button"> i.p.v. <button>: de HelpHint hieronder is zelf ook een button,
          en een button-in-button is ongeldige HTML (en liet een klik op "uitleg" ook de sectie
          in-/uitklappen). Zelfde patroon als QuarterlyBtwPanel.jsx. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="w-full flex items-center gap-2 p-4 text-left cursor-pointer"
      >
        {nOpen > 0 ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> : <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className={`text-sm font-semibold flex items-center gap-2 ${nOpen > 0 ? "text-amber-900" : "text-emerald-900"}`}>
          Classificatiezekerheid{jaar ? ` ${jaar}` : ""} — {nOpen > 0 ? `${nGroepen} groep${nGroepen === 1 ? "" : "en"} · ${nOpen} boeking${nOpen === 1 ? "" : "en"} te controleren` : "alles zeker"}
          {onOpenHelp && <HelpHint chapter="classificatiezekerheid" onOpen={onOpenHelp} />}
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </div>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 py-2">
            <p className="text-lg font-semibold text-emerald-800">{approved.length}</p>
            <p className="text-xs text-emerald-700">{metBolletjes(`🟢 automatisch goedgekeurd (${pct(approved.length)}%)`)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 py-2">
            <p className="text-lg font-semibold text-amber-800">{review.length}</p>
            {onOpenLevel && review.length > 0 ? (
              <button onClick={() => onOpenLevel("heuristic")} className="text-xs text-amber-700 underline hover:no-underline">
                {metBolletjes(`🟡 controleren (${pct(review.length)}%)`)}
              </button>
            ) : (
              <p className="text-xs text-amber-700">{metBolletjes(`🟡 controleren (${pct(review.length)}%)`)}</p>
            )}
          </div>
          <div className="rounded-lg bg-rose-50 border border-rose-200 py-2">
            <p className="text-lg font-semibold text-rose-800">{unclear.length}</p>
            {onOpenLevel && unclear.length > 0 ? (
              <button onClick={() => onOpenLevel("fallback")} className="text-xs text-rose-700 underline hover:no-underline">
                {metBolletjes(`🔴 onduidelijk (${pct(unclear.length)}%)`)}
              </button>
            ) : (
              <p className="text-xs text-rose-700">{metBolletjes(`🔴 onduidelijk (${pct(unclear.length)}%)`)}</p>
            )}
          </div>
        </div>
        {(eldersOverig > 0 || eldersPersonen > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <span>Daarnaast {[eldersOverig > 0 ? `${eldersOverig} in Nog niet ingedeeld` : null, eldersPersonen > 0 ? `${eldersPersonen} in Personen en onbekende tegenpartijen` : null].filter(Boolean).join(", ")}{jaar ? ` (${jaar})` : ""}</span>
            <span className="flex-1" />
            {eldersOverig > 0 && onOpenOverig && <button type="button" onClick={(e) => { e.stopPropagation(); onOpenOverig(); }} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-100">Nog niet ingedeeld</button>}
            {eldersPersonen > 0 && onOpenPersonen && <button type="button" onClick={(e) => { e.stopPropagation(); onOpenPersonen(); }} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-100">Personen</button>}
          </div>
        )}
        {/* nieuw-V6R2 — open punten in andere jaren tonen, met knop naar dat jaar (Boska 16-11: kaart 4, blok 0) */}
        {andereJaren.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-medium">Open punten in: {korteJaren([...new Set([...andereJaren, ...(nOpen > 0 && jaar ? [jaar] : [])].map(Number))].sort((a, b) => a - b))}{jaar ? ` · getoond: ${jaar}` : ""}</span>
            <span className="flex-1" />
            {onKiesJaar && andereJaren.map((y) => (
              <button key={y} type="button" onClick={(e) => { e.stopPropagation(); onKiesJaar(Number(y)); }} className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold hover:bg-amber-100">Naar {y}</button>
            ))}
          </div>
        )}
        {open && needsReview.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-400 mb-2">
              De groene transacties matchen een specifieke regel of zijn al eens door jou bevestigd. Onderstaande hebben dat
              (nog) niet — geen foutmelding, alleen een seintje dat een blik erop de moeite waard is.
            </p>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {needsReview.slice(0, 200).map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 p-2 text-xs">
                  <span className="shrink-0">{metBolletjes(tx.kleinBedrag ? "🟢" : LEVEL_ICON[tx.confidence.level])}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
                    <ExpandableDescription tx={tx} className="text-[11px] text-slate-400" />
                    <p className="text-[11px] text-slate-400">{tx.confidence.label}{tx.kleinBedrag ? " · klein bedrag, telt niet als open punt" : ""}</p>
                  </div>
                  {onRequestChange && !tx.transferLocked ? (
                    <CategorieSelect
                      value={tx.category}
                      onChange={(v) => onRequestChange(tx, { category: v, type: tx.type })}
                      className={`shrink-0 max-w-[14rem] rounded-md px-1.5 py-1 text-[11px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${hoofdKleur(mainCategoryOf(tx.category))}`}
                    />
                  ) : (
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLOR[displayCategory(tx.category)] || "bg-slate-200 text-slate-700"}`}>{tx.transferLocked && <Lock className="h-3 w-3" />}{keuzeLabel(tx.category)}</span>
                  )}
                  <span className="shrink-0 font-mono text-slate-500 w-20 text-right">{eur(tx.amount)}</span>
                  {onConfirmCorrect && (
                    <button
                      onClick={() => onConfirmCorrect(tx)}
                      className="shrink-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md px-1 py-0.5"
                      title="Klopt zo — markeer deze indeling als bevestigd (wordt voortaan 🟢)"
                    >
                      ✓ Klopt zo
                    </button>
                  )}
                </div>
              ))}
            </div>
            {needsReview.length > 200 && <p className="mt-1.5 text-[11px] text-slate-400">Eerste 200 getoond van {needsReview.length}.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
