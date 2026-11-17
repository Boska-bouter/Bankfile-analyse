import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, X, Plus, AlertTriangle } from "lucide-react";
import { DEFAULT_RULES, registerCategory, mainCategoryOf, groepeerPerWeergave, hoofdcategorieen, hoofdKleur, getCategorieProfiel, categorieLabel } from "../../classification/categories.js";
import SearchInput from "../shared/SearchInput.jsx";
import { zoekwoordBereik, fmtAantal } from "../../utils/zoekwoordBereik.js";

const STANDAARD = new Map(DEFAULT_RULES.map((r) => [r.name, new Set((r.keywords || []).map((k) => String(k).toLowerCase()))]));

// nieuw-V7R6 — waarschuwing bij een zoekwoord dat veel verschillende tegenpartijen raakt (mockup akkoord Boska 17-11).
function BreedMelding({ children }) {
  return (
    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
      {children}
    </div>
  );
}

// Zoekwoorden per subtype — gegroepeerd onder de hoofdcategorie waar dat subtype bij hoort (net
// als bij BTW-percentages en Vaste/variabele kosten), zodat de ~54 subtypes overzichtelijk
// blijven in plaats van één lange platte lijst.
export default function CategoryRulesPanel({ categoryRules, setCategoryRules, transacties = [] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [newKeywordByCategory, setNewKeywordByCategory] = useState({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryMain, setNewCategoryMain] = useState("Zakelijk");
  const [newCategoryError, setNewCategoryError] = useState("");
  const [breedVraag, setBreedVraag] = useState(null); // { categoryName, kw, b }

  // beide-V1R6 — in een privédossier alleen de privécategorieën, met hun privélabel en privéhoofdcategorieën.
  const cp = getCategorieProfiel();
  const isSearching = search.trim() !== "";
  const filteredRules = useMemo(() => {
    const eigen = cp ? categoryRules.filter((r) => cp.bevat(r.name)) : categoryRules;
    const sorted = [...eigen].sort((a, b) => categorieLabel(a.name).localeCompare(categorieLabel(b.name)));
    if (!isSearching) return sorted;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return sorted.filter((r) => r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) || categorieLabel(r.name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q) || r.keywords.some((kw) => kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q)));
  }, [categoryRules, search, isSearching, cp]);

  const groupedByMain = useMemo(() => {
    const groups = {};
    for (const r of filteredRules) {
      const main = mainCategoryOf(r.name);
      if (!groups[main]) groups[main] = [];
      groups[main].push(r);
    }
    return groups;
  }, [filteredRules]);

  const toggleCard = (name) => setExpandedCards((prev) => ({ ...prev, [name]: !prev[name] }));
  const toggleGroup = (main) => setOpenGroups((prev) => ({ ...prev, [main]: !prev[main] }));

  // Eigen zoekwoorden (niet uit de standaardlijst) die al in het dossier staan en te breed zijn: geel gemarkeerd.
  const breedBestaand = useMemo(() => {
    const uit = {};
    if (!open || !transacties.length) return uit;
    for (const r of categoryRules) {
      const std = STANDAARD.get(r.name) || new Set();
      for (const kw of r.keywords || []) {
        if (std.has(String(kw).toLowerCase())) continue;
        const b = zoekwoordBereik(kw, transacties);
        if (b?.breed) (uit[r.name] ||= {})[kw] = b;
      }
    }
    return uit;
  }, [open, categoryRules, transacties]);

  const voegToe = (categoryName, kw) => {
    setCategoryRules((prev) => prev.map((r) => (r.name === categoryName && !r.keywords.includes(kw) ? { ...r, keywords: [...r.keywords, kw] } : r)));
    setNewKeywordByCategory((prev) => ({ ...prev, [categoryName]: "" }));
    setBreedVraag(null);
  };
  const addKeyword = (categoryName) => {
    const kw = (newKeywordByCategory[categoryName] || "").trim().toLowerCase();
    if (!kw) return;
    const b = transacties.length ? zoekwoordBereik(kw, transacties) : null;
    if (b?.breed) { setBreedVraag({ categoryName, kw, b }); return; }
    voegToe(categoryName, kw);
  };
  const removeKeyword = (categoryName, kw) => {
    setCategoryRules((prev) => prev.map((r) => (r.name === categoryName ? { ...r, keywords: r.keywords.filter((k) => k !== kw) } : r)));
  };
  const addCustomCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setNewCategoryError("Vul een naam in.");
      return;
    }
    if (categoryRules.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setNewCategoryError("Deze categorie bestaat al.");
      return;
    }
    if (cp) {
      // Privédossier: een privéregel onder de gekozen privéhoofdcategorie (telt nooit als zakelijk).
      const hoofd = cp.hoofden.includes(newCategoryMain) ? newCategoryMain : "Overig";
      cp.registreer(name, hoofd);
      setCategoryRules((prev) => [...prev, { name, color: "bg-slate-200 text-slate-700", keywords: [], mainCategory: hoofd, prive: true }]);
      setNewCategoryName("");
      setNewCategoryError("");
      return;
    }
    const mainCategory = newCategoryMain === "Privé" ? "Privé" : "Inkoop & zakelijke uitgaven";
    registerCategory(name, undefined, mainCategory);
    setCategoryRules((prev) => [...prev, { name, color: "bg-slate-200 text-slate-700", keywords: [], mainCategory }]);
    setNewCategoryName("");
    setNewCategoryMain("Zakelijk");
    setNewCategoryError("");
  };

  return (
    <section className="rounded-paneel border border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between p-5 text-sm font-semibold">
        <span>Categorieregels — zoekwoorden per subtype</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Zoeken op categorie of zoekwoord…" className="w-72 mb-3" />
          {filteredRules.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Geen categorieën gevonden voor "{search}".</p>}
          <div className="space-y-1.5">
            {hoofdcategorieen().filter((main) => groupedByMain[main]?.length > 0).map((main) => {
              const rules = groupedByMain[main];
              const isGroupOpen = !!openGroups[main] || isSearching;
              return (
                <div key={main} className="rounded-lg border border-slate-100">
                  <button onClick={() => toggleGroup(main)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className={`rounded-md px-2 py-0.5 font-medium truncate ${hoofdKleur(main)}`}>
                      {main} <span className="opacity-60">({rules.length})</span>
                    </span>
                    {isGroupOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </button>
                  {isGroupOpen && (
                    <div className="grid sm:grid-cols-2 gap-2 px-3 pb-3">
                      {(() => {
                        const kaart = (r) => {
                        const isOpenCard = !!expandedCards[r.name] || isSearching;
                        return (
                          <div key={r.name} className="rounded-lg border border-slate-100">
                            <button onClick={() => toggleCard(r.name)} className="w-full flex items-center justify-between gap-2 p-3 text-left">
                              <span className="flex items-center gap-2 min-w-0">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium truncate ${r.color}`}>{categorieLabel(r.name)}</span>
                                <span className="text-[11px] text-slate-400 shrink-0 whitespace-nowrap">{r.keywords.length} zoekwoord{r.keywords.length === 1 ? "" : "en"}</span>
                              </span>
                              {isOpenCard ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                            </button>
                            {isOpenCard && (
                              <div className="px-3 pb-3">
                                {r.description && <p className="text-xs text-slate-500 mb-2">{r.description}</p>}
                                <div className="flex flex-wrap gap-1.5">
                                  {r.keywords.map((kw) => (
                                    <span key={kw} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${breedBestaand[r.name]?.[kw] ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
                                      {breedBestaand[r.name]?.[kw] && <AlertTriangle className="h-3 w-3" />}
                                      {kw}
                                      <button onClick={() => removeKeyword(r.name, kw)} className="hover:text-rose-600">
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  ))}
                                  {r.keywords.length === 0 && <span className="text-xs text-slate-400">Nog geen zoekwoorden</span>}
                                </div>
                                {Object.values(breedBestaand[r.name] || {}).map((b) => (
                                  <BreedMelding key={b.keyword}>
                                    <p className="font-semibold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Zoekwoord "{b.keyword}" raakt {fmtAantal(b.tegenpartijen)} tegenpartijen</p>
                                    <p>{b.plaatsnaam ? "Dit lijkt een plaatsnaam. " : ""}Haal het weg met het kruisje, of laat het staan als het zo bedoeld is.</p>
                                  </BreedMelding>
                                ))}
                                <div className="mt-2 flex gap-1.5">
                                  <input
                                    value={newKeywordByCategory[r.name] || ""}
                                    onChange={(e) => setNewKeywordByCategory((prev) => ({ ...prev, [r.name]: e.target.value }))}
                                    onKeyDown={(e) => e.key === "Enter" && addKeyword(r.name)}
                                    placeholder="bijv. albert heijn, shell, kpn…"
                                    className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                  <button onClick={() => addKeyword(r.name)} className="shrink-0 rounded-lg bg-teal-700 text-white px-2 py-1 text-xs hover:bg-teal-800">
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                {breedVraag?.categoryName === r.name && (() => {
                                  const b = breedVraag.b;
                                  return (
                                    <BreedMelding>
                                      <p className="font-semibold mb-1">Dit woord raakt veel verschillende boekingen</p>
                                      <p className="mb-1">
                                        "{b.keyword}" staat in <strong>{fmtAantal(b.boekingen)} boekingen</strong> bij <strong>{fmtAantal(b.tegenpartijen)} tegenpartijen</strong>
                                        {b.plaatsnaam ? <>. Het lijkt een plaatsnaam: het staat in de naam van winkels als {b.voorbeelden.map((v) => v.naam).join(", ")}.</> : <>, zoals {b.voorbeelden.map((v) => `${v.naam} (${fmtAantal(v.aantal)})`).join(", ")}.</>}
                                      </p>
                                      {b.perCategorie.length > 0 && <p className="mb-1">Die boekingen staan nu vooral op {b.perCategorie.map(([c, n]) => `${categorieLabel(c)} (${fmtAantal(n)})`).join(", ")}.</p>}
                                      <p>Vaste banktekst zoals "Transactie:" telt niet mee. Kies liever een woord dat alleen bij de bedoelde partij hoort.</p>
                                      <div className="flex gap-1.5 mt-2">
                                        <button onClick={() => setBreedVraag(null)} className="rounded-lg bg-teal-700 text-white px-2.5 py-1 text-xs hover:bg-teal-800">Niet toevoegen</button>
                                        <button onClick={() => voegToe(r.name, breedVraag.kw)} className="rounded-lg border border-slate-300 bg-white text-slate-700 px-2.5 py-1 text-xs hover:bg-slate-50">Toch toevoegen</button>
                                      </div>
                                    </BreedMelding>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                        };
                        const perNaam = Object.fromEntries(rules.map((r) => [r.name, r]));
                        return groepeerPerWeergave(rules.map((r) => r.name)).map((blok) =>
                          !blok.groep ? kaart(perNaam[blok.leden[0]]) : (
                            <details key={blok.naam} open={isSearching} className="sm:col-span-2 rounded-lg border border-slate-100 px-3 py-2">
                              <summary className="cursor-pointer text-xs font-medium text-slate-700">
                                {blok.naam} <span className="font-normal text-slate-400">({blok.leden.length} soorten)</span>
                              </summary>
                              <div className="grid sm:grid-cols-2 gap-2 pt-2">{blok.leden.map((n) => kaart(perNaam[n]))}</div>
                            </details>
                          )
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg border-2 border-dashed border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-600 mb-2">Nieuwe categorie toevoegen</p>
            <div className="flex gap-1.5">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                placeholder="Naam van de nieuwe categorie…"
                className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {cp ? (
                <select
                  value={cp.hoofden.includes(newCategoryMain) ? newCategoryMain : "Overig"}
                  onChange={(e) => setNewCategoryMain(e.target.value)}
                  className="shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  {cp.hoofden.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              ) : (<>
              <button
                onClick={() => setNewCategoryMain("Zakelijk")}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium border ${newCategoryMain === "Zakelijk" ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
              >
                Zakelijk
              </button>
              <button
                onClick={() => setNewCategoryMain("Privé")}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium border ${newCategoryMain === "Privé" ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
              >
                Privé
              </button>
              </>)}
              <button onClick={addCustomCategory} className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700">
                <Plus className="h-3.5 w-3.5" /> Toevoegen
              </button>
            </div>
            {newCategoryError && <p className="mt-1.5 text-xs text-rose-600">{newCategoryError}</p>}
            <p className="mt-1.5 text-xs text-slate-400">
              {cp ? "Komt onder de gekozen hoofdcategorie te staan. Voeg daarna zoekwoorden toe, dan herkent de app de boekingen zelf."
                : newCategoryMain === "Zakelijk"
                ? "Komt onder \"Inkoop & zakelijke uitgaven\" te staan en telt mee als aftrekbare zakelijke kostenpost."
                : "Komt onder \"Privé\" te staan en telt nooit mee in de zakelijke BTW/winst-berekening, ongeacht op welke rekening de transactie stond."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
