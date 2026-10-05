import { useMemo, useState } from "react";
import { X, Check, Lock } from "lucide-react";
import {
  MAIN_CATEGORY_ORDER, MAIN_CATEGORY_COLOR, MAIN_CATEGORY_DEFAULT_SUBTYPE, mainCategoryOf, displayCategory, subtypeChoicesFor, storedCategoryForChoice, categoryForMainChange, soortenVoor,
} from "../../classification/categories.js";
import { counterpartyKey } from "../../utils/normalization.js";
import { eur } from "../../utils/amounts.js";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";

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
  level, transactions, bulkCounts, onRequestChange, onConfirmCorrect, onConfirmAll, onJumpToOverig, onJumpToPersonen, onClose,
}) {
  const info = LEVEL_INFO[level];
  const bulkTotal = (bulkCounts.overig || 0) + (bulkCounts.personen || 0);
  const [sortering, setSortering] = useState("bedrag");
  const [catFilter, setCatFilter] = useState("");
  const [zichtbaar, setZichtbaar] = useState(60);

  const groepen = useMemo(() => {
    const map = new Map();
    for (const tx of transactions) {
      const losse = tx.category === "Winkels divers" && /losse pinbetaling/i.test(tx.confidence?.label || "");
      const k = (losse ? "__losse__" : counterpartyKey(tx.counterparty || tx.description, tx.amount) || String(tx.id)) + "|" + tx.category;
      let g = map.get(k);
      if (!g) { g = { key: k, txs: [], totaal: 0, abs: 0, losse }; map.set(k, g); }
      g.txs.push(tx); g.totaal += tx.amount; g.abs += Math.abs(tx.amount);
    }
    return [...map.values()].map((g) => ({
      ...g,
      eerste: g.txs[0],
      naam: g.losse ? "Losse pinbetalingen (geen herkend zoekwoord)" : (g.txs[0].counterparty || g.txs[0].description || "(geen omschrijving)"),
    }));
  }, [transactions]);

  const categorieen = useMemo(() => {
    const c = new Map();
    for (const g of groepen) c.set(displayCategory(g.eerste.category), (c.get(displayCategory(g.eerste.category)) || 0) + 1);
    return [...c.entries()].sort((x, y) => y[1] - x[1]);
  }, [groepen]);

  const getoond = useMemo(() => {
    const l = groepen.filter((g) => !catFilter || displayCategory(g.eerste.category) === catFilter);
    const cmp = sortering === "aantal" ? (x, y) => y.txs.length - x.txs.length
      : sortering === "naam" ? (x, y) => x.naam.localeCompare(y.naam, "nl")
      : (x, y) => y.abs - x.abs;
    return [...l].sort(cmp);
  }, [groepen, catFilter, sortering]);
  const getoondTx = useMemo(() => getoond.flatMap((g) => g.txs), [getoond]);

  const renderRow = (tx, g) => {
    const meer = g && g.txs.length > 1;
    return (
      <div key={tx.id} className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
        <div className="flex-1 min-w-[9rem]">
          <p className="font-medium truncate">
            {g ? g.naam : (tx.counterparty || tx.description || "(geen omschrijving)")}
            {meer && <span className="ml-1.5 font-normal text-slate-500">· {g.txs.length} transacties</span>}
          </p>
          <ExpandableDescription tx={tx} className="text-[10px] text-slate-400" />
          <p className="text-[10px] text-slate-400 font-mono select-all">Tegenrekening: {tx.counterpartyIban || "—"}</p>
          <p className="text-[10px] text-slate-400">
            {tx.date.toLocaleDateString("nl-NL")} · {tx.confidence.label}
          </p>
        </div>
        <span className="shrink-0 font-mono text-slate-500 w-24 text-right" title={meer ? `Totaal van ${g.txs.length} transacties` : undefined}>
          {eur(g ? g.totaal : tx.amount)}
        </span>
        {tx.transferLocked ? (
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 px-1.5 py-1 text-[11px] font-medium cursor-help"
            title="Overboeking tussen je eigen rekeningen (herkend op rekeningnummer): de categorie ligt vast."
          >
            <Lock className="h-3 w-3 shrink-0" /> {displayCategory(tx.category)}
          </span>
        ) : (<>
          <select
            value={mainCategoryOf(tx.category)}
            onChange={(e) => onRequestChange(tx, { category: categoryForMainChange(e.target.value, tx.category), type: tx.type })}
            className={`shrink-0 rounded-md px-1.5 py-1 text-[11px] font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${MAIN_CATEGORY_COLOR[mainCategoryOf(tx.category)] || "bg-slate-200 text-slate-700"}`}
          >
            {MAIN_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={displayCategory(tx.category)}
            onChange={(e) => onRequestChange(tx, { category: storedCategoryForChoice(e.target.value, tx.category), type: tx.type })}
            className="shrink-0 rounded-md border border-slate-300 px-1.5 py-1 text-[10px] max-w-[8rem]"
            title="Subtype (bepaalt BTW-percentage en vast/variabel)"
          >
            {subtypeChoicesFor(mainCategoryOf(tx.category)).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {soortenVoor(tx.category) && (
            <select
              value={tx.category}
              onChange={(e) => onRequestChange(tx, { category: e.target.value, type: tx.type })}
              className="shrink-0 rounded-md border border-slate-200 px-1.5 py-1 text-[10px] text-slate-500 max-w-[7rem]"
              title="Soort — bepaalt het zakelijke percentage per soort"
            >
              {soortenVoor(tx.category).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          )}
        </>)}
        <span
          className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-medium cursor-help ${(tx.accountType || tx.type) === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
          title="Type volgt altijd het bankbestand waaruit deze transactie is ingelezen en kan niet los worden aangepast."
        >
          {(tx.accountType || tx.type) === "Prive" ? "Privé" : (tx.accountType || tx.type)}
        </span>
        <button
          onClick={() => (meer ? onConfirmAll(g.txs) : onConfirmCorrect(tx))}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-medium hover:bg-emerald-100"
          title={meer ? `Klopt zo — bevestig alle ${g.txs.length} transacties van deze groep` : "Klopt zo — markeer als bevestigd (wordt voortaan 🟢)"}
        >
          <Check className="h-3 w-3" /> {meer ? `Klopt (${g.txs.length})` : "Klopt"}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">
            {info.icon} {info.label} ({groepen.length} groep{groepen.length === 1 ? "" : "en"}
            {transactions.length !== groepen.length ? `, ${transactions.length} transacties` : ""}
            {bulkTotal > 0 ? ` + ${bulkTotal} elders` : ""})
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {/* v236 — bevestigt in één keer het huidige voorstel (categorie/type) voor alle getoonde
                groepen, zonder ze één voor één te hoeven langslopen. V73: houdt rekening met het filter. */}
            {getoondTx.length > 0 && (
              <button
                onClick={() => {
                  const wat = catFilter ? `alle ${getoond.length} groepen in "${catFilter}"` : `alle ${getoond.length} groepen`;
                  if (window.confirm(`Weet je zeker dat je het voorstel voor ${wat} (${getoondTx.length} transacties) in één keer wilt goedkeuren?`)) {
                    onConfirmAll(getoondTx);
                  }
                }}
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

        {bulkTotal > 0 && (
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
            <label className="text-slate-500 ml-2">Categorie</label>
            <select
              value={catFilter}
              onChange={(e) => { setCatFilter(e.target.value); setZichtbaar(60); }}
              className="rounded-md border border-slate-300 px-1.5 py-1 text-xs max-w-[14rem]"
            >
              <option value="">Alle categorieën ({groepen.length})</option>
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
                <details key={g.key}>
                  <summary className="list-none cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2 p-2.5 text-xs">
                      <div className="flex-1 min-w-[9rem]">
                        <p className="font-medium">{g.naam} <span className="font-normal text-slate-500">· {g.txs.length} transacties ▾</span></p>
                        <p className="text-[10px] text-slate-400">Geschat als "Winkels divers" — klik om de transacties één voor één te bekijken of aan te passen</p>
                      </div>
                      <span className="shrink-0 font-mono text-slate-500 w-24 text-right">{eur(g.totaal)}</span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onConfirmAll(g.txs); }}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1 text-[10px] font-medium hover:bg-emerald-100"
                      >
                        <Check className="h-3 w-3" /> Alles klopt ({g.txs.length})
                      </button>
                    </div>
                  </summary>
                  <div className="bg-slate-50/60 divide-y divide-slate-100 border-t border-slate-100">
                    {g.txs.slice(0, 100).map((tx) => renderRow(tx, null))}
                    {g.txs.length > 100 && <p className="p-2 text-[10px] text-slate-400">Eerste 100 getoond van {g.txs.length}.</p>}
                  </div>
                </details>
              ) : renderRow(g.eerste, g))}
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
