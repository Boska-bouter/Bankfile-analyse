import { useToonFijn } from "../../utils/useToonFijn.js";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { ChevronRight, ChevronDown, Pencil, Check, X, Lock } from "lucide-react";
import { CATEGORY_COLOR, MAIN_CATEGORY_ORDER, MAIN_CATEGORY_COLOR, MAIN_CATEGORY_DEFAULT_SUBTYPE, mainCategoryOf, subtypesForMainCategory, displayCategory, subtypeChoicesFor, getToonFijn, setToonFijn, storedCategoryForChoice, categoryForMainChange, soortenVoor } from "../../classification/categories.js";
import { computeBtw } from "../../tax/btw.js";
import { eur } from "../../utils/amounts.js";
import SearchInput from "../shared/SearchInput.jsx";
import HelpHint from "../shared/HelpHint.jsx";

// Categorietotalen voor één groep (bijv. "Zakelijk 2026") — losstaand van de detailtabel zodat
// de categorie-kaarten van Zakelijk en Prive in hun eigen rij staan, en de detailtabellen
// daaronder in een eigen rij precies naast elkaar boven aan de lijn kunnen beginnen. Gegroepeerd
// op hoofdcategorie (~17 rijen) — klik op een rij om de onderliggende subtypes te zien.
export function CategorySummaryCard({ group, categoryBtwRates, btwVerlegd, onOpenHelp }) {
  const toonFijn = useToonFijn();
  const totals = useMemo(() => {
    const t = {};
    for (const tx of group.items) t[tx.category] = (t[tx.category] || 0) + tx.amount;
    return t;
  }, [group.items]);
  const btwByCategory = useMemo(() => {
    const t = {};
    for (const tx of group.items) t[tx.category] = (t[tx.category] || 0) + computeBtw(tx, categoryBtwRates, btwVerlegd);
    return t;
  }, [group.items, categoryBtwRates, btwVerlegd]);
  const mainTotals = useMemo(() => {
    const t = {};
    for (const [subtype, amount] of Object.entries(totals)) t[mainCategoryOf(subtype)] = (t[mainCategoryOf(subtype)] || 0) + amount;
    return t;
  }, [totals]);
  const mainBtwTotals = useMemo(() => {
    const t = {};
    for (const [subtype, amount] of Object.entries(btwByCategory)) t[mainCategoryOf(subtype)] = (t[mainCategoryOf(subtype)] || 0) + amount;
    return t;
  }, [btwByCategory]);
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const grandBtw = Object.values(btwByCategory).reduce((a, b) => a + b, 0);
  const [expandedMain, setExpandedMain] = useState(null);

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        Categorieën — {group.label}
        {onOpenHelp && <HelpHint chapter="categorieen-overzicht" onOpen={onOpenHelp} />}
        <label className="ml-auto inline-flex items-center gap-1 text-[10px] font-normal normal-case text-slate-400 cursor-pointer select-none" title="Toon de fijne categorieën (huur, energie-water, …) in plaats van de samengevoegde keuzes">
          <input type="checkbox" checked={toonFijn} onChange={(e) => setToonFijn(e.target.checked)} className="h-3 w-3" />
          fijne categorieën
        </label>
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase">
            <th className="text-left font-medium pb-1.5">Categorie</th>
            <th className="text-right font-medium pb-1.5 px-2">Bruto</th>
            <th className="text-right font-medium pb-1.5 px-2">BTW</th>
            <th className="text-right font-medium pb-1.5">Netto</th>
          </tr>
        </thead>
        <tbody>
          {MAIN_CATEGORY_ORDER.filter((c) => c in mainTotals).map((c) => {
            // V76 — privé-subtypes worden samengevoegd tot hun weergavenaam (9 i.p.v. 29 rijen).
            const subRows = {};
            for (const s of subtypesForMainCategory(c).filter((x) => x in totals)) {
              const d = displayCategory(s);
              const r = (subRows[d] ||= { amount: 0, btw: 0 });
              r.amount += totals[s]; r.btw += btwByCategory[s] || 0;
            }
            const subtypesPresent = Object.keys(subRows);
            const canExpand = subtypesPresent.length > 1;
            const isOpen = expandedMain === c;
            return (
              <Fragment key={c}>
                <tr
                  className={`border-b border-slate-50 ${canExpand ? "cursor-pointer hover:bg-slate-50" : ""}`}
                  onClick={() => canExpand && setExpandedMain((v) => (v === c ? null : c))}
                >
                  <td className="py-1">
                    <span className="inline-flex items-center gap-1">
                      {canExpand && (isOpen ? <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />)}
                      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium truncate max-w-[9rem] ${MAIN_CATEGORY_COLOR[c] || "bg-slate-200 text-slate-700"}`}>{c}</span>
                    </span>
                  </td>
                  <td className="py-1 px-2 text-right font-mono text-xs whitespace-nowrap">{eur(mainTotals[c])}</td>
                  <td className="py-1 px-2 text-right font-mono text-xs whitespace-nowrap text-slate-400">{eur(mainBtwTotals[c] || 0)}</td>
                  <td className="py-1 text-right font-mono text-xs whitespace-nowrap">{eur(mainTotals[c] - (mainBtwTotals[c] || 0))}</td>
                </tr>
                {isOpen &&
                  subtypesPresent.map((s) => (
                    <tr key={`${c}__${s}`} className="border-b border-slate-50 bg-slate-50/60">
                      <td className="py-1 pl-6">
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate max-w-[8rem] ${CATEGORY_COLOR[s] || "bg-slate-200 text-slate-700"}`}>{s}</span>
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-[11px] whitespace-nowrap text-slate-500">{eur(subRows[s].amount)}</td>
                      <td className="py-1 px-2 text-right font-mono text-[11px] whitespace-nowrap text-slate-400">{eur(subRows[s].btw)}</td>
                      <td className="py-1 text-right font-mono text-[11px] whitespace-nowrap text-slate-500">{eur(subRows[s].amount - subRows[s].btw)}</td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 font-semibold">
            <td className="pt-2">Totaal</td>
            <td className="pt-2 px-2 text-right font-mono">{eur(grandTotal)}</td>
            <td className="pt-2 px-2 text-right font-mono">{eur(grandBtw)}</td>
            <td className="pt-2 text-right font-mono">{eur(grandTotal - grandBtw)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Detailtabel: elke transactie apart, met Categorie en Type direct als dropdown aanpasbaar.
// Een wijziging wordt tegenpartij-breed opgeslagen (geldt dan voor alle transacties van
// diezelfde tegenpartij, in alle jaren) — tenzij er geen bruikbare tegenpartijnaam is, dan
// alleen voor deze ene transactie.
export function DetailTable({
  group, onRequestChange, onConfirmCorrect, isExpanded, onToggleExpand, onOpenHelp,
  fingerprintByTxId, transactionNotes, onSetNote,
}) {
  const [query, setQuery] = useState("");
  const [showAmountFilter, setShowAmountFilter] = useState(false);
  const [amountFilterAlign, setAmountFilterAlign] = useState("right"); // "right" | "left"
  const amountFilterBtnRef = useRef(null);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [amountSign, setAmountSign] = useState("beide"); // "beide" | "neg" | "pos"
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterAlign, setDateFilterAlign] = useState("right"); // "right" | "left"
  const dateFilterBtnRef = useRef(null);
  const amountWrapRef = useRef(null);
  const dateWrapRef = useRef(null);
  // V83 — een open filtervenster sluit zodra je buiten het venster klikt/tikt (en dus ook als je een ander
  // filter opent); er is zo nooit meer dan één venster tegelijk open.
  useEffect(() => {
    if (!showAmountFilter && !showDateFilter) return undefined;
    const onOutside = (e) => {
      if (showAmountFilter && amountWrapRef.current && !amountWrapRef.current.contains(e.target)) setShowAmountFilter(false);
      if (showDateFilter && dateWrapRef.current && !dateWrapRef.current.contains(e.target)) setShowDateFilter(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    return () => { document.removeEventListener("mousedown", onOutside); document.removeEventListener("touchstart", onOutside); };
  }, [showAmountFilter, showDateFilter]);

  // Deze twee filterknoppen openen een klein, absoluut gepositioneerd venstertje eronder. Bij een
  // rechts-uitgelijnd venster (het gebruikelijke geval — de knop staat meestal niet aan de uiterste
  // linkerkant) klopt dat prima, maar staat de knop wél dicht tegen de linkerrand (bijv. doordat de
  // knoppenrij op een smal scherm is afgebroken/gewrapt), dan schiet een rechts-uitgelijnd venster
  // met een vaste breedte voorbij de linkerrand van het scherm — precies het "niet goed aligned"-
  // beeld met de invulvakken die er half af vallen. Bij het openen wordt daarom even gemeten of er
  // vanaf de knop genoeg ruimte naar links is; zo niet, dan lijnt het venster voortaan links uit
  // (en groeit het dus naar rechts, waar meestal wel ruimte is).
  const openFilterPopup = (btnRef, popupWidthPx, setAlign, setOpen) => {
    setOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen && btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect();
        setAlign(rect.right - popupWidthPx < 8 ? "left" : "right");
      }
      return willOpen;
    });
  };
  const [filterHeuristic, setFilterHeuristic] = useState(false); // 🟡 Controleren
  const [filterFallback, setFilterFallback] = useState(false); // 🔴 Onduidelijk
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedCell, setExpandedCell] = useState(null); // `${txId}:cp` of `${txId}:desc`
  // v203: eigen toelichting bij een transactie (bijv. "naheffing Q2 2025 LB"), voor als de
  // bank-omschrijving zelf niet duidelijk is. Eén rij tegelijk in bewerkstand.
  const [editingNoteTxId, setEditingNoteTxId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const startEditNote = (tx) => {
    setEditingNoteTxId(tx.id);
    setNoteDraft((transactionNotes && fingerprintByTxId && transactionNotes[fingerprintByTxId[tx.id]]) || "");
  };
  const saveNote = (tx) => {
    onSetNote?.(tx, noteDraft);
    setEditingNoteTxId(null);
  };

  // V53 — met een actieve zoekopdracht geldt een wijziging voor wat het zoekwoord vindt (niet voor alles met dezelfde IBAN).
  const applyChange = (tx, patch) => onRequestChange(tx, patch, { searchQuery: query.trim() });

  const confidenceCounts = useMemo(() => {
    let heuristic = 0;
    let fallback = 0;
    for (const t of group.items) {
      if (t.confidence?.level === "heuristic") heuristic++;
      else if (t.confidence?.level === "fallback") fallback++;
    }
    return { heuristic, fallback };
  }, [group.items]);

  const searchSuggestions = useMemo(() => {
    const names = new Set();
    for (const t of group.items) {
      if (t.counterparty) names.add(t.counterparty);
      names.add(mainCategoryOf(t.category));
      names.add(displayCategory(t.category));
    }
    return [...names];
  }, [group.items]);

  const filteredItems = useMemo(() => {
    let rows = group.items;
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((t) =>
        `${t.counterparty} ${t.description} ${t.fullDescription} ${t.category} ${displayCategory(t.category)} ${mainCategoryOf(t.category)}`.toLowerCase().includes(q)
      );
    }
    const min = amountMin.trim() === "" ? null : Math.abs(parseFloat(amountMin));
    const max = amountMax.trim() === "" ? null : Math.abs(parseFloat(amountMax));
    if (min !== null || max !== null || amountSign !== "beide") {
      rows = rows.filter((t) => {
        if (amountSign === "neg" && t.amount >= 0) return false;
        if (amountSign === "pos" && t.amount < 0) return false;
        const abs = Math.abs(t.amount);
        if (min !== null && !Number.isNaN(min) && abs < min) return false;
        if (max !== null && !Number.isNaN(max) && abs > max) return false;
        return true;
      });
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(...dateFrom.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) : null;
      const to = dateTo ? new Date(...dateTo.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))) : null;
      if (to) to.setHours(23, 59, 59, 999);
      rows = rows.filter((t) => {
        if (from && t.date < from) return false;
        if (to && t.date > to) return false;
        return true;
      });
    }
    if (filterHeuristic || filterFallback) {
      rows = rows.filter((t) => {
        if (!t.confidence) return false;
        if (filterHeuristic && t.confidence.level === "heuristic") return true;
        if (filterFallback && t.confidence.level === "fallback") return true;
        return false;
      });
    }
    return rows;
  }, [group.items, query, amountMin, amountMax, amountSign, dateFrom, dateTo, filterHeuristic, filterFallback]);

  const hasActiveFilter = query.trim() !== "" || amountMin.trim() !== "" || amountMax.trim() !== "" || amountSign !== "beide" || dateFrom || dateTo || filterHeuristic || filterFallback;

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detail ({filteredItems.length} van {group.items.length})</h3>
            {onOpenHelp && <HelpHint chapter="detailtabel" onOpen={onOpenHelp} />}
            {onToggleExpand && (
              <button onClick={onToggleExpand} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700" title={isExpanded ? "Terug naar naast elkaar" : "Deze tabel over de volle breedte tonen"}>
                {isExpanded ? (
                  <>Verkleinen <ChevronRight className="h-3.5 w-3.5 rotate-180" /></>
                ) : (
                  <>Uitvergroten <ChevronRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SearchInput value={query} onChange={setQuery} placeholder="Zoeken op naam, omschrijving of categorie…" className="w-56" suggestions={searchSuggestions} />
            <div className="relative shrink-0" ref={amountWrapRef}>
              <button
                ref={amountFilterBtnRef}
                onClick={() => { setShowDateFilter(false); openFilterPopup(amountFilterBtnRef, 240, setAmountFilterAlign, setShowAmountFilter); }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  amountMin || amountMax || amountSign !== "beide" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                Bedrag{(amountMin || amountMax || amountSign !== "beide") ? " ✓" : ""}
              </button>
              {showAmountFilter && (
                <div className={`absolute ${amountFilterAlign === "left" ? "left-0" : "right-0"} z-10 mt-1 w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-lg`}>
                  <p className="text-xs text-slate-500 mb-2">Filter op bedrag</p>
                  <div className="flex gap-1 mb-2">
                    <button onClick={() => setAmountSign("beide")} className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium ${amountSign === "beide" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>Beide</button>
                    <button onClick={() => setAmountSign("neg")} className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium ${amountSign === "neg" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>Betaald (–)</button>
                    <button onClick={() => setAmountSign("pos")} className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium ${amountSign === "pos" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>Ontvangen (+)</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" inputMode="decimal" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} placeholder="Min" className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                    <span className="text-slate-400 text-xs">t/m</span>
                    <input type="number" inputMode="decimal" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} placeholder="Max" className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                  </div>
                  {(amountMin || amountMax || amountSign !== "beide") && (
                    <button onClick={() => { setAmountMin(""); setAmountMax(""); setAmountSign("beide"); }} className="mt-2 text-xs text-slate-400 hover:text-rose-600">
                      Filter wissen
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="relative shrink-0" ref={dateWrapRef}>
              <button
                ref={dateFilterBtnRef}
                onClick={() => { setShowAmountFilter(false); openFilterPopup(dateFilterBtnRef, 256, setDateFilterAlign, setShowDateFilter); }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  dateFrom || dateTo ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                Datum{(dateFrom || dateTo) ? " ✓" : ""}
              </button>
              {showDateFilter && (
                <div className={`absolute ${dateFilterAlign === "left" ? "left-0" : "right-0"} z-10 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-lg`}>
                  <p className="text-xs text-slate-500 mb-2">Filter op periode</p>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Van</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full min-w-0 max-w-full box-border rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" style={{ minWidth: 0, maxWidth: "100%", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", display: "block" }} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Tot en met</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full min-w-0 max-w-full box-border rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" style={{ minWidth: 0, maxWidth: "100%", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none", display: "block" }} />
                    </div>
                  </div>
                  {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="mt-2 text-xs text-slate-400 hover:text-rose-600">
                      Filter wissen
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setFilterHeuristic((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                filterHeuristic ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-white text-slate-600"
              }`}
              title="Toon alleen transacties met classificatiezekerheid 🟡 Controleren"
            >
              🟡 Controleren ({confidenceCounts.heuristic}){filterHeuristic ? " ✓" : ""}
            </button>
            <button
              onClick={() => setFilterFallback((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                filterFallback ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-300 bg-white text-slate-600"
              }`}
              title="Toon alleen transacties met classificatiezekerheid 🔴 Onduidelijk"
            >
              🔴 Onduidelijk ({confidenceCounts.fallback}){filterFallback ? " ✓" : ""}
            </button>
          </div>
        </div>
        {hasActiveFilter && (
          <p className="text-xs font-mono text-slate-500 mb-1">Totaal getoond: {eur(filteredItems.reduce((a, t) => a + t.amount, 0))}</p>
        )}
        <p className="text-xs text-slate-400">
          Categorie geldt voor alle jaren van dezelfde tegenpartij. Type volgt het bankbestand.
        </p>
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left font-medium px-4 py-2">Datum</th>
              <th className="text-center font-medium px-2 py-2" title="Classificatiezekerheid — klik ✓ om een 🟡/🔴-indeling te bevestigen">OK?</th>
              <th className="text-right font-medium px-4 py-2">Bedrag</th>
              <th className="text-left font-medium px-4 py-2">Categorie</th>
              <th className="text-left font-medium px-4 py-2">Type</th>
              <th className="text-left font-medium px-4 py-2">Tegenpartij</th>
              <th className="text-left font-medium px-4 py-2">Tegenrekening</th>
              <th className="text-left font-medium px-4 py-2">Omschrijving</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredItems
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 whitespace-nowrap text-slate-500 font-mono text-xs">
                    {t.date.toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {t.confidence && t.confidence.level !== "heuristic" && t.confidence.level !== "fallback" && (
                      <span title={t.confidence.label}>🟢</span>
                    )}
                    {t.confidence && (t.confidence.level === "heuristic" || t.confidence.level === "fallback") && (
                      <span className="inline-flex items-center gap-1" title={t.confidence.label}>
                        <span>{t.confidence.level === "heuristic" ? "🟡" : "🔴"}</span>
                        {onConfirmCorrect && (
                          <button
                            onClick={() => onConfirmCorrect(t)}
                            className="inline-flex items-center gap-0.5 rounded-md border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                            title="Categorie en subtype kloppen — bevestigen (wordt voortaan 🟢)"
                          >
                            ✓ OK
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-slate-700"}`}>{eur(t.amount)}</td>
                  <td className="px-4 py-2">
                    {t.transferLocked ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium cursor-help ${MAIN_CATEGORY_COLOR[mainCategoryOf(t.category)] || "bg-slate-200 text-slate-700"}`}
                        title="Overboeking tussen je eigen rekeningen (herkend op rekeningnummer). Deze categorie ligt vast en kan niet worden aangepast, zodat beide kanten van de overboeking blijven kloppen."
                      >
                        <Lock className="h-3 w-3 shrink-0" /> {displayCategory(t.category)}
                      </span>
                    ) : (<>
                    <select
                      value={mainCategoryOf(t.category)}
                      onChange={(e) => applyChange(t, { category: categoryForMainChange(e.target.value, t.category), type: t.type })}
                      className={`block rounded-md px-1.5 py-0.5 text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${MAIN_CATEGORY_COLOR[mainCategoryOf(t.category)] || "bg-slate-200 text-slate-700"}`}
                    >
                      {MAIN_CATEGORY_ORDER.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {subtypeChoicesFor(mainCategoryOf(t.category)).length > 1 && (
                    <select
                      value={displayCategory(t.category)}
                      onChange={(e) => applyChange(t, { category: storedCategoryForChoice(e.target.value, t.category), type: t.type })}
                      className="block mt-1 rounded-md px-1 py-0 text-[10px] text-slate-500 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 max-w-[9rem]"
                      title="Subtype (bepaalt BTW-percentage en vast/variabel)"
                    >
                      {subtypeChoicesFor(mainCategoryOf(t.category)).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    )}
                    {soortenVoor(t.category) && (
                      <select
                        value={t.category}
                        onChange={(e) => applyChange(t, { category: e.target.value, type: t.type })}
                        className="block mt-0.5 rounded-md px-1 py-0 text-[10px] text-slate-400 border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-400 max-w-[9rem]"
                        title="Soort — bepaalt BTW, aangifte-rubriek en het zakelijke percentage per soort"
                      >
                        {soortenVoor(t.category).map((o) => (
                          <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                      </select>
                    )}
                    </>)}
                  </td>
                  <td className="px-4 py-2">
                    {t.isMirror ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-help whitespace-nowrap"
                        title={"Spiegelboeking — geen echte bankregel. Dit is automatisch de privékant van een " +
                          `"${t.category}" die op de zakelijke rekening staat (zelfde bedrag, omgekeerd teken), ` +
                          "omdat de privérekening zelf niet is ingeladen. Het type ligt daarom vast op Privé. " +
                          "Wijzig je de categorie, dan wordt de originele zakelijke boeking aangepast; " +
                          "is die geen privé-opname/terugboeking meer, dan verdwijnt deze spiegel vanzelf."}
                      >
                        Privé <span className="text-[10px] font-normal">↔ spiegel</span>
                      </span>
                    ) : (
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap cursor-help ${(t.accountType || t.type) === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      title="Type volgt altijd het bankbestand waaruit deze transactie is ingelezen (Zakelijk of Privé) en kan niet los worden aangepast — zo blijft zichtbaar wat er per rekening is betaald."
                    >
                      {(t.accountType || t.type) === "Prive" ? "Privé" : (t.accountType || t.type)}
                    </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2 cursor-pointer ${expandedCell === `${t.id}:cp` ? "whitespace-normal break-words max-w-xs" : "max-w-[10rem] truncate"}`}
                    onClick={() => setExpandedCell((cur) => (cur === `${t.id}:cp` ? null : `${t.id}:cp`))}
                    title="Klik om de volledige tekst te tonen/verbergen"
                  >
                    {t.counterparty}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500 whitespace-nowrap select-all">{t.counterpartyIban || "—"}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-sm">
                    <div
                      className={`cursor-pointer ${expandedCell === `${t.id}:desc` ? "whitespace-normal break-words" : "max-w-[14rem] truncate"}`}
                      onClick={() => setExpandedCell((cur) => (cur === `${t.id}:desc` ? null : `${t.id}:desc`))}
                      title="Klik om de volledige tekst te tonen/verbergen"
                    >
                      {expandedCell === `${t.id}:desc` ? (t.fullDescription || t.description) : t.description}
                    </div>
                    {onSetNote && (
                      editingNoteTxId === t.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="text"
                            autoFocus
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(t);
                              if (e.key === "Escape") setEditingNoteTxId(null);
                            }}
                            placeholder="Toelichting, bijv. naheffing Q2 2025 LB"
                            className="flex-1 min-w-0 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs"
                          />
                          <button onClick={() => saveNote(t)} className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100" title="Opslaan">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={() => setEditingNoteTxId(null)} className="shrink-0 rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50" title="Annuleren">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        (() => {
                          const note = transactionNotes?.[fingerprintByTxId?.[t.id]];
                          return note ? (
                            <button
                              onClick={() => startEditNote(t)}
                              className="mt-1 flex items-start gap-1 text-left text-xs italic text-sky-700 hover:text-sky-900"
                              title="Toelichting bewerken"
                            >
                              <Pencil className="h-3 w-3 shrink-0 mt-0.5" /> <span className="break-words">{note}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => startEditNote(t)}
                              className="mt-1 text-xs text-slate-300 hover:text-slate-600"
                              title="Toelichting toevoegen"
                            >
                              + toelichting
                            </button>
                          );
                        })()
                      )
                    )}
                  </td>
                </tr>
              ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">Geen transacties gevonden voor "{query}".</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
