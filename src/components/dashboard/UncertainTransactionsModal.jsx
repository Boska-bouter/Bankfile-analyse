import { useMemo, useState } from "react";
import { X, Check, Lock, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { mainCategoryOf, displayCategory, subtypeChoicesFor, storedCategoryForChoice, categoryForMainChange, soortenVoor, hoofdcategorieenAlfa, hoofdKleur } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { counterpartyKey } from "../../utils/normalization.js";
import { eur } from "../../utils/amounts.js";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";
import { metBolletjes } from "../shared/StatusDot.jsx";

const LEVEL_INFO = {
  heuristic: { icon: "🟡", label: "Controleren" },
  fallback: { icon: "🔴", label: "Onduidelijk" },
};

// V73 — de lijst is per GROEP (zelfde tegenpartij + teken + categorie) i.p.v. per transactie: 30
// maandelijkse incasso's zijn één beslissing. Sorteerbaar op totaalbedrag (grootste invloed eerst),
// aantal of naam, en te filteren op categorie, zodat je één categorie in één keer kunt goedkeuren.
// De samengevoegde "losse pinbetalingen" (Winkels divers zonder herkend zoekwoord) zijn één groep
// die je kunt uitklappen om per transactie te corrigeren.
export default function UncertainTransactionsModal({
  level, transactions, bulkCounts, activeYear = null, onRequestChange, onConfirmCorrect, onConfirmAll, onJumpToOverig, onJumpToPersonen, onClose,
}) {
  const info = LEVEL_INFO[level];
  const bulkTotal = (bulkCounts.overig || 0) + (bulkCounts.personen || 0);
  const [sortering, setSortering] = useState("bedrag");
  const [catFilter, setCatFilter] = useState("");
  const [zichtbaar, setZichtbaar] = useState(60);
  const [bevestigAlles, setBevestigAlles] = useState(false);
  const [openLosse, setOpenLosse] = useState(false);
  // nieuw-V2R4 — aparte lijst met alleen de voorstellen die met AI zijn opgezocht (wens Boska 10-11).
  const [alleenAi, setAlleenAi] = useState(false);
  // nieuw-V2R8 — groep openklappen om de losse transacties te zien en per stuk aan te passen (wens Boska 11-11).
  const [openGroepen, setOpenGroepen] = useState(() => new Set());
  const wisselGroep = (k) => setOpenGroepen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // nieuw-V3R0 — open punten per jaar bekijken (wens Boska 11-11). "" = alle jaren.
  // Standaard het jaar dat bovenaan gekozen is (Boska: "de 77 i.p.v. 351").
  const [jaar, setJaar] = useState(() => (activeYear && transactions.some((tx) => tx.year === activeYear) ? String(activeYear) : ""));
  const jaren = useMemo(() => {
    const n = new Map();
    for (const tx of transactions) n.set(tx.year, (n.get(tx.year) || 0) + 1);
    return [...n.entries()].sort((a, b) => b[0] - a[0]);
  }, [transactions]);
  const txsJaar = useMemo(() => (jaar ? transactions.filter((tx) => String(tx.year) === jaar) : transactions), [transactions, jaar]);
  const groepen = useMemo(() => {
    const map = new Map();
    for (const tx of txsJaar) {
      const losse = tx.category === "Winkels divers" && /losse pinbetaling/i.test(tx.confidence?.label || "");
      const k = (losse ? "__losse__" : counterpartyKey(tx.counterparty || tx.description, tx.amount) || String(tx.id)) + "|" + tx.category;
      let g = map.get(k);
      if (!g) { g = { key: k, txs: [], totaal: 0, abs: 0, losse }; map.set(k, g); }
      g.txs.push(tx); g.totaal += tx.amount; g.abs += Math.abs(tx.amount);
    }
    return [...map.values()].map((g) => ({
      ...g,
      eerste: g.txs[0],
      ai: !!g.txs[0].gedeeld?.ai && g.txs[0].confidence?.level === "heuristic",
      naam: g.losse ? "Losse pinbetalingen (geen herkend zoekwoord)" : (g.txs[0].counterparty || g.txs[0].description || "(geen omschrijving)"),
    }));
  }, [txsJaar]);

  const aiGroepen = useMemo(() => groepen.filter((g) => g.ai), [groepen]);
  const aiAan = alleenAi && aiGroepen.length > 0;
  const basis = aiAan ? aiGroepen : groepen;
  const categorieen = useMemo(() => {
    const c = new Map();
    for (const g of basis) c.set(displayCategory(g.eerste.category), (c.get(displayCategory(g.eerste.category)) || 0) + 1);
    return [...c.entries()].sort((x, y) => x[0].localeCompare(y[0], "nl", { sensitivity: "base" }));
  }, [basis]);

  const getoond = useMemo(() => {
    const l = basis.filter((g) => !catFilter || displayCategory(g.eerste.category) === catFilter);
    const cmp = sortering === "aantal" ? (x, y) => y.txs.length - x.txs.length
      : sortering === "naam" ? (x, y) => x.naam.localeCompare(y.naam, "nl")
      : (x, y) => y.abs - x.abs;
    return [...l].sort(cmp);
  }, [basis, catFilter, sortering]);
  const getoondTx = useMemo(() => getoond.flatMap((g) => g.txs), [getoond]);

  const renderRow = (tx, g, compact = false) => {
    const meer = g && g.txs.length > 1;
    return (
      <div key={tx.id} className={`flex flex-wrap items-center gap-2 text-xs ${compact ? "px-2.5 py-1.5" : "p-2.5"}`}>
        {compact ? (
        <div className="flex-1 min-w-[9rem]">
          <p className="font-medium text-slate-700">{tx.date.toLocaleDateString("nl-NL")}</p>
          <ExpandableDescription tx={tx} className="text-[11px] text-slate-500" />
        </div>
        ) : (
        <div className="flex-1 min-w-[9rem]">
          <p className="font-medium truncate">
            {g?.ai && <span className="mr-1.5 inline-flex items-center gap-0.5 rounded bg-violet-100 text-violet-800 px-1 py-px text-[10px] font-semibold align-middle" title="Categorie opgezocht met AI: controleer of hij klopt"><Sparkles className="h-2.5 w-2.5" />AI</span>}
            {g ? g.naam : (tx.counterparty || tx.description || "(geen omschrijving)")}
            {meer && <span className="ml-1.5 font-normal text-slate-500">· {g.txs.length} transacties</span>}
          </p>
          <ExpandableDescription tx={tx} className="text-[11px] text-slate-400" />
          {meer && (
            <button onClick={() => wisselGroep(g.key)} className="mt-0.5 mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-teal-700 underline underline-offset-2 hover:text-teal-900" aria-expanded={openGroepen.has(g.key)}>
              {openGroepen.has(g.key) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {openGroepen.has(g.key) ? `${g.txs.length} transacties verbergen` : `Alle ${g.txs.length} transacties bekijken`}
            </button>
          )}
          <p className="text-[11px] text-slate-400 font-mono select-all">Tegenrekening: {tx.counterpartyIban || "—"}</p>
          <p className="text-[11px] text-slate-400">
            {tx.date.toLocaleDateString("nl-NL")} · {tx.confidence.label}
          </p>
        </div>
        )}
        <span className="shrink-0 font-mono text-slate-500 w-24 text-right" title={meer ? `Totaal van ${g.txs.length} transacties` : undefined}>
          {eur(g ? g.totaal : tx.amount)}
        </span>
        {tx.transferLocked ? (
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 px-1.5 py-1 text-xs font-medium cursor-help"
            title="Overboeking tussen eigen rekeningen (herkend op rekeningnummer): de categorie ligt vast."
          >
            <Lock className="h-3 w-3 shrink-0" /> {displayCategory(tx.category)}
          </span>
        ) : (<>
          {/* beide-V5R1 / V9R3 — één keuzelijst met alle categorieën per groep (wens Boska 25-10), i.p.v. groep + soort apart. */}
        <CategorieSelect
          value={tx.category}
          onChange={(v) => onRequestChange(tx, { category: v, type: tx.type })}
          className={`shrink-0 max-w-[14rem] rounded-md px-1.5 py-1 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${hoofdKleur(mainCategoryOf(tx.category))}`}
        />
        </>)}
        <span
          className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-1 text-xs font-medium cursor-help ${(tx.accountType || tx.type) === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
          title="Type volgt altijd het bankbestand waaruit deze transactie is ingelezen en kan niet los worden aangepast."
        >
          {(tx.accountType || tx.type) === "Prive" ? "Privé" : (tx.accountType || tx.type)}
        </span>
        <button
          onClick={() => (meer ? onConfirmAll(g.txs) : onConfirmCorrect(tx))}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-medium hover:bg-emerald-100"
          title={meer ? `Klopt zo — bevestig alle ${g.txs.length} transacties van deze groep` : "Klopt zo — markeer als bevestigd (wordt voortaan 🟢)"}
        >
          <Check className="h-3 w-3" /> {meer ? `Klopt (${g.txs.length})` : "Klopt"}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">
            {aiAan ? (<>
              <Sparkles className="inline h-4 w-4 text-violet-700 -mt-0.5" /> Opgezocht met AI ({aiGroepen.length} groep{aiGroepen.length === 1 ? "" : "en"}, {aiGroepen.reduce((a, g) => a + g.txs.length, 0)} transacties)
            </>) : (<>
            {metBolletjes(info.icon)} {info.label} ({groepen.length} groep{groepen.length === 1 ? "" : "en"}
            {txsJaar.length !== groepen.length ? `, ${txsJaar.length} transacties` : ""}
            {bulkTotal > 0 ? ` + ${bulkTotal} elders` : ""})
            </>)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {/* v236 — bevestigt in één keer het huidige voorstel (categorie/type) voor alle getoonde
                groepen, zonder ze één voor één te hoeven langslopen. V73: houdt rekening met het filter. */}
            {getoondTx.length > 0 && (
              <button
                onClick={() => setBevestigAlles((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2.5 py-1.5 text-xs font-medium hover:bg-emerald-100"
                title="Bevestig het voorstel voor alle getoonde groepen in één keer (houdt rekening met het categorie-filter)"
              >
                <Check className="h-3.5 w-3.5" /> {catFilter ? `Alles in "${catFilter}" goedkeuren` : "Alles goedkeuren"} ({getoond.length})
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {bevestigAlles && (() => {
          const losseGroepen = getoond.filter((g) => g.losse);
          const losseTx = losseGroepen.flatMap((g) => g.txs);
          const zonderLosse = getoondTx.filter((tx) => !losseTx.includes(tx));
          const wat = catFilter ? `alle ${getoond.length} groepen in "${catFilter}"` : `alle ${getoond.length} groepen`;
          return (
            <div className="mx-4 mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900 shrink-0">
              <p className="font-medium">Weet je zeker dat je {wat} ({getoondTx.length} transacties) in één keer wilt goedkeuren?</p>
              {losseTx.length > 0 && (
                <p className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-900">
                  ⚠ Let op: hieronder vallen ook <strong>{losseTx.length} losse pinbetalingen</strong> ({eur(losseGroepen.reduce((a, g) => a + g.totaal, 0))}) zonder herkend zoekwoord. Die worden dan óók goedgekeurd, zonder dat je ze hebt bekeken. Kijk ze eerst even na?
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {losseTx.length > 0 && (
                  <button
                    onClick={() => { setBevestigAlles(false); setCatFilter(displayCategory(losseGroepen[0].eerste.category)); setSortering("bedrag"); setOpenLosse(true); }}
                    className="rounded-lg border border-amber-400 bg-white text-amber-900 px-2.5 py-1 font-semibold hover:bg-amber-50"
                  >
                    Eerst de losse pinbetalingen nakijken
                  </button>
                )}
                {losseTx.length > 0 && zonderLosse.length > 0 && (
                  <button onClick={() => { setBevestigAlles(false); onConfirmAll(zonderLosse); }} className="rounded-lg border border-emerald-400 bg-white text-emerald-800 px-2.5 py-1 font-semibold hover:bg-emerald-100">
                    Goedkeuren zonder losse pinbetalingen ({zonderLosse.length})
                  </button>
                )}
                <button onClick={() => { setBevestigAlles(false); onConfirmAll(getoondTx); }} className="rounded-lg bg-emerald-700 text-white px-2.5 py-1 font-semibold hover:bg-emerald-800">
                  {losseTx.length > 0 ? "Toch alles goedkeuren" : "Ja, alles goedkeuren"}
                </button>
                <button onClick={() => setBevestigAlles(false)} className="rounded-lg px-2.5 py-1 text-slate-600 underline">Annuleren</button>
              </div>
            </div>
          );
        })()}

        {aiGroepen.length > 0 && (
          <div className="mx-4 mt-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-900 shrink-0">
            {aiAan ? (
              <p>
                Je ziet alleen de voorstellen die met AI zijn opgezocht. Klopt een categorie, dan telt hij na "Klopt" als je eigen keuze.{" "}
                <button onClick={() => { setAlleenAi(false); setCatFilter(""); setZichtbaar(60); }} className="underline hover:no-underline font-medium">Alle te controleren boekingen tonen</button>
              </p>
            ) : (
              <p>
                <Sparkles className="inline h-3.5 w-3.5 -mt-0.5" /> {aiGroepen.length} groep{aiGroepen.length === 1 ? " is" : "en zijn"} opgezocht met AI.{" "}
                <button onClick={() => { setAlleenAi(true); setCatFilter(""); setZichtbaar(60); }} className="underline hover:no-underline font-medium">"Opgezocht met AI" openen</button>
              </p>
            )}
          </div>
        )}

        {bulkTotal > 0 && !aiAan && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 shrink-0">
            <p>
              ⓘ {bulkTotal} van deze transacties staan al verzameld in{" "}
              {bulkCounts.overig > 0 && <>"Overig" ({bulkCounts.overig})</>}
              {bulkCounts.overig > 0 && bulkCounts.personen > 0 && " en "}
              {bulkCounts.personen > 0 && <>"Overboekingen aan personen" ({bulkCounts.personen})</>} — check die twee
              vensters eerst, dat is vaak sneller dan hier één voor één doorlopen.
            </p>
            <div className="mt-1.5 flex gap-3">
              {bulkCounts.overig > 0 && (
                <button onClick={onJumpToOverig} className="underline hover:no-underline font-medium">
                  "Overig" openen
                </button>
              )}
              {bulkCounts.personen > 0 && (
                <button onClick={onJumpToPersonen} className="underline hover:no-underline font-medium">
                  "Overboekingen aan personen" openen
                </button>
              )}
            </div>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 text-xs shrink-0">
            <label className="text-slate-500">Sorteren</label>
            <select value={sortering} onChange={(e) => setSortering(e.target.value)} className="rounded-md border border-slate-300 px-1.5 py-1 text-xs">
              <option value="bedrag">Grootste bedrag eerst</option>
              <option value="aantal">Meeste transacties eerst</option>
              <option value="naam">Naam A–Z</option>
            </select>
            {jaren.length > 1 && (<>
              <label className="text-slate-500 ml-2">Jaar</label>
              <select value={jaar} onChange={(e) => { setJaar(e.target.value); setCatFilter(""); }} className="rounded-md border border-slate-300 px-1.5 py-1 text-xs">
                <option value="">Alle jaren ({transactions.length})</option>
                {jaren.map(([j, n]) => <option key={j} value={String(j)}>{j} ({n})</option>)}
              </select>
            </>)}
            <label className="text-slate-500 ml-2">Categorie</label>
            <select
              value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); setZichtbaar(60); }}
              className="rounded-md border border-slate-300 px-1.5 py-1 text-xs max-w-[14rem]"
            >
              <option value="">Alle categorieën ({basis.length})</option>
              {categorieen.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
            </select>
          </div>
        )}

        <div className="p-4 overflow-y-auto flex-1">
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Verder niets — de rest staat in de twee vensters hierboven.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {getoond.slice(0, zichtbaar).map((g) => g.losse ? (
                <details key={g.key} open={openLosse || undefined} onToggle={(e) => setOpenLosse(e.currentTarget.open)}>
                  <summary className="list-none cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                      <div className="flex-1 min-w-[9rem]">
                        <p className="font-medium">{g.naam} <span className="font-normal text-slate-500">· {g.txs.length} transacties ▾</span></p>
                        <p className="text-[11px] text-slate-400">Geschat als "Winkels divers" — klik om de transacties één voor één te bekijken of aan te passen</p>
                      </div>
                      <span className="shrink-0 font-mono text-slate-500 w-24 text-right">{eur(g.totaal)}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirmAll(g.txs); }}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-medium hover:bg-emerald-100"
                      >
                        <Check className="h-3 w-3" /> Alles klopt ({g.txs.length})
                      </button>
                    </div>
                  </summary>
                  <div className="bg-slate-50/60 divide-y divide-slate-100 border-t border-slate-100">
                    {g.txs.slice(0, 100).map((tx) => renderRow(tx, null))}
                    {g.txs.length > 100 && <p className="p-2 text-[11px] text-slate-400">Eerste 100 getoond van {g.txs.length}.</p>}
                  </div>
                </details>
              ) : (
                <div key={g.key}>
                  {renderRow(g.eerste, g)}
                  {g.txs.length > 1 && openGroepen.has(g.key) && (
                    <div className="ml-4 mb-2 mr-1 rounded-lg border border-slate-200 bg-slate-50/70 divide-y divide-slate-100">
                      {[...g.txs].sort((a, b) => b.date - a.date).slice(0, 100).map((tx) => renderRow(tx, null, true))}
                      {g.txs.length > 100 && <p className="p-2 text-[11px] text-slate-400">Eerste 100 getoond van {g.txs.length}.</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {getoond.length > zichtbaar && (
            <button onClick={() => setZichtbaar((z) => z + 100)} className="mt-3 w-full rounded-lg border border-slate-300 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              Toon meer ({getoond.length - zichtbaar} groepen te gaan)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
