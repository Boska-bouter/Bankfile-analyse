import { useState } from "react";
import { rekeningSoortVan, rekeningLabelVan } from "../classification/reviewSummaries.js";
import { counterpartyKey, extractKeywordCandidate } from "../utils/normalization.js";

// beide-V11R8 — uit App.jsx gehaald (opsplitsing): categorie-/typewijziging met de vraag voor welke boekingen en jaren.
export function useCategorieWijziging(p) {
  const {
    accountTypeByFile, setCategoryRules, setOverridesByCounterparty, overridesByCounterparty, setOverridesByRow, setKeywordSuggestion, keywordSuggestion, ownAccountByFile, snapshotBeforeAction, classified, setRekeningKeuzeOpSleutel, keuzeSleutel, exclusiveIbanKey, keyForTx, setCounterpartyOverride, setRowOverride,
  } = p;

  // ---- Vraag bij een categorie/type-wijziging: alleen deze transactie, alle jaren, of gekozen
  // jaren? Alleen gevraagd als er ook echt meerdere transacties van dezelfde tegenpartij zijn —
  // bij een unieke tegenpartij (of geen bruikbare naam) wordt de wijziging direct doorgevoerd. ----
  const [pendingCategoryChange, setPendingCategoryChange] = useState(null);
  // Een 🟡/🔴-classificatie die bij nazien gewoon klopt: dit legt 'm vast als bevestigde regel
  // (net als een echte correctie, alleen met dezelfde categorie/type als nu al gold) — voortaan
  // dus 🟢. Loopt bewust via dezelfde requestCategoryChange-vraag als een echte wijziging: bij
  // meerdere vergelijkbare transacties vraagt de app of dit voor alle jaren moet gelden, of voor
  // zelf gekozen jaren.
  // Zoekt, na een net bevestigde/gecorrigeerde tegenpartij, naar andere 🟡/🔴-transacties die op
  // dezelfde tegenpartij lijken (bijv. "Coolblue.nl" na het corrigeren van "Coolblue") — zodat je
  // in één keer een herbruikbaar trefwoord kunt vastleggen in plaats van dezelfde correctie steeds
  // opnieuw te moeten doen. Geen suggestie bij "Overig"/"Overboekingen aan personen" zelf, want dat
  // is geen bruikbaar trefwoord om aan andere transacties te koppelen.
  const suggestSimilarIfAny = (tx, patch) => {
    if (!patch.category || patch.category === "Overig" || patch.category === "Overboekingen aan personen") return;
    const keyword = extractKeywordCandidate(tx.counterparty || tx.description);
    if (!keyword) return;
    const matches = classified.filter((t) => {
      if (t.isMirror || t.id === tx.id) return false;
      if (!t.confidence || (t.confidence.level !== "heuristic" && t.confidence.level !== "fallback")) return false;
      const text = `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase();
      return text.includes(keyword);
    });
    if (matches.length > 0) {
      setKeywordSuggestion({ keyword, category: patch.category, type: patch.type, matches, sourceName: tx.counterparty || tx.description });
    }
  };

  // Legt een bevestigde suggestie vast als een echt, herbruikbaar trefwoord bij de categorie —
  // zelfde plek en mechanisme als een trefwoord dat je zelf toevoegt bij "Categorieregels". Alle
  // transacties die dat trefwoord matchen (nu en straks) worden er automatisch door herkend.
  const acceptKeywordSuggestion = () => {
    if (!keywordSuggestion) return;
    const { keyword, category } = keywordSuggestion;
    snapshotBeforeAction(`Trefwoord "${keyword}" toegevoegd`);
    setCategoryRules((prev) =>
      prev.map((r) => (r.name === category && !r.keywords.includes(keyword) ? { ...r, keywords: [...r.keywords, keyword] } : r))
    );
    setKeywordSuggestion(null);
  };

  const confirmClassificationCorrect = (tx) => {
    requestCategoryChange(tx, { category: tx.category, type: tx.type });
  };

  // v236 — Bulk-bevestigen voor de 🟡/🔴-controleer-pop-up (UncertainTransactionsModal): "Alles
  // goedkeuren" markeert in één keer alle daar getoonde transacties als "klopt zo". Gaat NIET via
  // confirmClassificationCorrect/requestCategoryChange hierboven: die opent bij tegenpartijen met
  // meerdere transacties (matches.length > 1) een scope-modal ("deze rij / alle jaren / gekozen
  // jaren?") — bij honderden transacties achter elkaar zou dat honderden keren dezelfde
  // pendingCategoryChange-state overschrijven en alleen de allerlaatste daadwerkelijk tonen, terwijl
  // de rest onbevestigd blijft. Omdat "klopt zo" de waarde niet wijzigt (enkel bevestigt), is die
  // scope-keuze hier niet nodig — elke transactie krijgt gewoon zijn eigen expliciete override.
  const confirmAllUncertain = (txs) => {
    if (!txs || txs.length === 0) return;
    snapshotBeforeAction("Alle transacties in dit venster bevestigd");
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const tx of txs) {
        if (tx.id == null) continue;
        next[tx.id] = { ...(next[tx.id] || {}), category: tx.category, type: tx.type };
      }
      return next;
    });
    // Een enkele transactie zonder bruikbaar row-id (zeldzaam) volgt dezelfde tegenpartij-override
    // als de normale (niet-bulk) bevestigingsflow (zie setCounterpartyOverride hieronder).
    const withoutId = txs.filter((tx) => tx.id == null);
    if (withoutId.length > 0) {
      setOverridesByCounterparty((prev) => {
        const next = { ...prev };
        for (const tx of withoutId) {
          const key = (tx.counterpartyIban && exclusiveIbanKey(tx.counterpartyIban, tx.amount)) || counterpartyKey(tx.counterparty || tx.description, tx.amount);
          if (!key) continue;
          next[key] = {
            ...(next[key] || {}),
            category: tx.category,
            type: tx.type,
            displayName: next[key]?.displayName || tx.counterparty || tx.description,
            sign: tx.amount >= 0 ? "pos" : "neg",
          };
        }
        return next;
      });
    }
  };

  const requestCategoryChange = (tx, patch, opts) => {
    // v303 — op verzoek: "type" (Zakelijk/Prive) van een transactie volgt uitsluitend het
    // bankbestand waaruit hij is ingelezen en mag nooit meer handmatig worden aangepast (zie
    // autoClassify in classify.js) — dit is het ene doorgeefluik waar alle categorie/type-wijzigingen
    // doorheen gaan (detailtabel, onzekere-transacties-modal, eerdere sleepfunctie, enz.), dus hier
    // negeren we een eventueel meegestuurd `type` altijd en behouden we het bestaande type van tx.
    patch = { ...patch, type: tx.type };
    // v311 (V33) — overboekingen tussen eigen rekeningen (herkend op IBAN) liggen vast, zie detectOwnAccountTransfer.
    if (tx.transferLocked) return;
    // Een spiegelboeking (zie de aanmaak van "mirrors" hierboven) is een afgeleide weergave van de
    // onderliggende zakelijke boeking — die wordt bij elke herberekening opnieuw aangemaakt, niet
    // uit een override teruggelezen. Een wijziging rechtstreeks op de spiegel opslaan komt dus
    // nergens terecht en verdwijnt bij de volgende herberekening geheid weer. Wijzig in plaats
    // daarvan de echte, onderliggende boeking — verdwijnt de reden voor een spiegel (categorie is
    // niet langer een prive/zakelijk-beweging), dan vervalt de spiegel vanzelf.
    if (tx.isMirror) {
      const originalId = typeof tx.id === "string" ? Number(tx.id.replace(/-prive-spiegel$/, "")) : tx.id;
      const original = classified.find((t) => !t.isMirror && t.id === originalId);
      // Het type van een spiegel staat vast (die is per definitie de privékant) — neem daarom
      // alleen de categorie over en behoud het type van de originele boeking. Anders zou een
      // categoriewijziging op de spiegel (die type "Prive" meestuurt) de zakelijke originele
      // boeking ongemerkt naar Prive omzetten.
      if (original) return requestCategoryChange(original, { ...patch, type: original.type }, opts);
      return;
    }
    // V53 — actieve zoekopdracht in de detailtabel: de reikwijdte is wat het zoekwoord vindt, niet de IBAN.
    const sq = (opts?.searchQuery || "").toLowerCase();
    if (sq && tx.id != null) {
      const kwMatches = classified.filter(
        (t) =>
          !t.isMirror && !t.transferLocked && (t.amount >= 0) === (tx.amount >= 0) &&
          `${t.counterparty} ${t.description} ${t.fullDescription}`.toLowerCase().includes(sq)
      );
      if (kwMatches.length > 1 && kwMatches.some((t) => t.id === tx.id)) {
        const matchYears = [...new Set(kwMatches.map((t) => t.year))].sort((a, b) => a - b);
        setPendingCategoryChange({ tx, patch, key: null, matchCount: kwMatches.length, matchYears, viaIban: false, keywordQuery: opts.searchQuery, matchIds: kwMatches.map((t) => t.id) });
        return;
      }
    }
    const key = keyForTx(tx);
    if (!key) {
      snapshotBeforeAction("Categorie/type aangepast");
      setRowOverride(tx.id, patch);
      return;
    }
    const matches = classified.filter((t) => !t.isMirror && !t.transferLocked && keyForTx(t) === key);
    if (matches.length <= 1) {
      snapshotBeforeAction("Categorie/type aangepast");
      if (tx.id != null) setRowOverride(tx.id, patch);
      else setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
      suggestSimilarIfAny(tx, patch);
      return;
    }
    const matchYears = [...new Set(matches.map((t) => t.year))].sort((a, b) => a - b);
    // beide-V11R4 — komt de tegenpartij ook op een andere rekening voor? Dan een waarschuwing en de keuze "alleen deze rekening" (wens Boska 30-10).
    const soort = rekeningSoortVan(tx);
    const perLabel = {};
    for (const t of matches) if (rekeningSoortVan(t) !== soort) { const l = rekeningLabelVan(t, accountTypeByFile, ownAccountByFile); perLabel[l] = (perLabel[l] || 0) + 1; }
    const andereRekeningen = Object.entries(perLabel).map(([label, n]) => ({ label, n }));
    const rekening = andereRekeningen.length ? { soort, label: rekeningLabelVan(tx, accountTypeByFile, ownAccountByFile), n: matches.filter((t) => rekeningSoortVan(t) === soort).length, andere: andereRekeningen, gesplitst: !!overridesByCounterparty[keuzeSleutel(tx)]?.gesplitst } : null;
    setPendingCategoryChange({ tx, patch, key, matchCount: matches.length, matchYears, viaIban: key.startsWith("IBAN::"), rekening });
  };
  const applyPendingToRowOnly = () => {
    const { tx, patch } = pendingCategoryChange;
    snapshotBeforeAction("Categorie/type aangepast");
    if (tx.id != null) setRowOverride(tx.id, patch);
    else setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyRowsOverride = (ids, patch, tx) => {
    snapshotBeforeAction("Categorie/type aangepast (zoekwoord)");
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = { ...(next[id] || {}), ...patch };
      return next;
    });
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToAllYears = () => {
    const { tx, patch, matchIds, rekening } = pendingCategoryChange;
    if (matchIds) return applyRowsOverride(matchIds, patch, tx);
    setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, patch, tx.counterpartyIban);
    // beide-V11R4 — "beide rekeningen": een eerdere splitsing per rekening vervalt, anders bleef die voorgaan.
    if (rekening) {
      const sleutels = [keyForTx(tx), keuzeSleutel(tx)];
      setOverridesByCounterparty((prev) => {
        const next = { ...prev };
        for (const k of sleutels) if (next[k]?.gesplitst || next[k]?.perRekening) { const { gesplitst: _g, perRekening: _p, ...rest } = next[k]; if (rest.category) next[k] = rest; else delete next[k]; }
        return next;
      });
    }
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToRekening = () => {
    const { tx, patch, rekening } = pendingCategoryChange;
    setRekeningKeuzeOpSleutel(keuzeSleutel(tx), rekening.soort, patch, tx.counterparty || tx.description, tx.amount);
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };
  const applyPendingToYears = (selectedYears) => {
    const { tx, key, patch, matchIds } = pendingCategoryChange;
    snapshotBeforeAction("Categorie/type aangepast (gekozen jaren)");
    const idsToPatch = matchIds
      ? classified.filter((t) => matchIds.includes(t.id) && selectedYears.includes(t.year)).map((t) => t.id)
      : classified.filter((t) => !t.isMirror && keyForTx(t) === key && selectedYears.includes(t.year)).map((t) => t.id);
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const id of idsToPatch) next[id] = { ...(next[id] || {}), ...patch };
      return next;
    });
    setPendingCategoryChange(null);
    suggestSimilarIfAny(tx, patch);
  };

  return { requestCategoryChange, confirmClassificationCorrect, pendingCategoryChange, applyPendingToRowOnly, applyPendingToAllYears, applyPendingToRekening, applyPendingToYears, setPendingCategoryChange, confirmAllUncertain, acceptKeywordSuggestion };
}
