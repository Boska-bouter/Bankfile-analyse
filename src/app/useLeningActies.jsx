// Trefwoorden toevoegen en leningen (wel/niet lening, privé/zakelijk, verwachte match).
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { LENING_CATS, hoortBijLening } from "../classification/leningBoeking.js";
import { overrideSleutel, resolveClassification } from "../classification/classify.js";

export function useLeningActies(invoer) {
  const { accountTypeByFile, businessExpenseKeywords, businessKeywords, categoryRules, classified, eigenNamenKeywords, overridesByCounterparty, ownAccountsElsewhereByFile, setBusinessExpenseKeywords, setBusinessKeywords, setOpdrachtgeversGevraagd, setOverridesByCounterparty, setOverridesByRow, setVerwachteAOV, setVerwachteAangeboden, setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setVerwachteMatchSuggestie, snapshotBeforeAction, verwachteMatchSuggestie, zakelijkeSpaarKeywords } = invoer;
  const setCounterpartyOverride = (...args) => invoer.appLaat.setCounterpartyOverride(...args);
  const addBusinessKeywords = (namen) => {
    if (namen.length > 0) {
      snapshotBeforeAction("Grootste opdrachtgevers ingevuld");
      setBusinessKeywords((prev) => [...prev, ...namen.filter((n) => !prev.includes(n))]);
    }
    setOpdrachtgeversGevraagd(true);
  };
  const addBusinessExpenseKeywords = (namen) => {
    if (namen.length > 0) {
      snapshotBeforeAction("Grootste leveranciers ingevuld");
      setBusinessExpenseKeywords((prev) => [...prev, ...namen.filter((n) => !prev.includes(n))]);
    }
    setOpdrachtgeversGevraagd(true);
  };
  const markLoanNotALoan = (loan, category = "Overig") => {
    snapshotBeforeAction(`Lening op ${category} gezet`);
    for (const tx of loan.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category, type: tx.type }, tx.counterpartyIban);
    }
  };
  // beide-V17R9 — een keuze in het leningenpaneel geldt alleen voor de boekingen die zelf een lening zijn (de app herkent ze zonder
  // eigen keuzes als lening, meestal door "lening" in de omschrijving). Voorheen ging de keuze op de hele tegenpartij (IBAN), zodat
  // ook "voorgeschoten inkopen", "annulering order" en "privé storting" van dezelfde persoon als lening telden (Boska 6-11, Dakhlaoui).
  // Besluit Boska 6-11: alleen met "lening" (of iets wat erop lijkt, ook "voorgeschoten") in de omschrijving, of een herkende geldverstrekker.
  const isLeningBoeking = (tx) => hoortBijLening(tx) || LENING_CATS.has(resolveClassification(tx, categoryRules, businessKeywords, businessExpenseKeywords,
    accountTypeByFile[tx.source], {}, {}, ownAccountsElsewhereByFile[tx.source] || [], eigenNamenKeywords, zakelijkeSpaarKeywords)?.category);
  const nietLeningAantal = (loan) => {
    const echt = loan.transactions.filter(isLeningBoeking).length;
    return echt > 0 ? loan.transactions.length - echt : 0;
  };
  const zetLening = (loan, category, label) => {
    const echt = loan.transactions.filter(isLeningBoeking);
    snapshotBeforeAction(label);
    if (echt.length === 0) {
      // Zelf als lening aangewezen (geen lening-woord): zoals voorheen op de tegenpartij.
      for (const tx of loan.transactions) setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category, type: tx.type }, tx.counterpartyIban);
      return;
    }
    // Een keuze op de tegenpartij die alleen een leningcategorie zet, vervalt; de andere boekingen krijgen weer hun eigen indeling.
    const weg = new Set(loan.transactions.map((tx) => overrideSleutel(tx, overridesByCounterparty, accountTypeByFile[tx.source])).filter((k) => k && LENING_CATS.has(overridesByCounterparty[k]?.category)));
    if (weg.size) setOverridesByCounterparty((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !weg.has(k))));
    setOverridesByRow((prev) => {
      const next = { ...prev };
      for (const tx of loan.transactions) if (LENING_CATS.has(next[tx.id]?.category)) delete next[tx.id];
      for (const tx of echt) next[tx.id] = { ...(prev[tx.id] || {}), category, type: tx.type };
      return next;
    });
  };
  // De lening zelf is feitelijk PRIVÉ (bijv. een DUO-studieschuld of een privélening van familie) —
  // ongeacht van/naar welke rekening betaald wordt. "Leningen (privé)" heeft geen fiscale
  // aftrekbaarheid (fiscalTreatmentOf "geen"), in tegenstelling tot "Leningen" waar de rente wél
  // aftrekbaar is — zie categories.js/autoBijtelling.js-achtige toelichting bij SPLIT_CATEGORY_NAMES.
  const markLoanAsPrive = (loan) => zetLening(loan, "Leningen (privé)", "Lening op Leningen (privé) gezet");
  // Omgekeerde correctie: een eerder als privé gemarkeerde lening blijkt toch zakelijk — terug naar "Leningen".
  const markLoanAsZakelijk = (loan) => zetLening(loan, "Leningen", "Lening op Leningen (zakelijk) gezet");
  // Alleen de echte leningboekingen houden, met de categorie die de lening nu heeft.
  const leningOpschonen = (loan) => zetLening(loan, loan.transactions[0]?.category === "Leningen (privé)" ? "Leningen (privé)" : "Leningen", "Lening opgeschoond");
  const acceptVerwachteMatch = () => {
    const { type, idx, matches, targetCategory } = verwachteMatchSuggestie;
    snapshotBeforeAction("Verwachte lease/lening/AOV ingedeeld");
    for (const tx of matches) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: targetCategory, type: "Zakelijk" }, tx.counterpartyIban);
    }
    if (type === "lease") setVerwachteLease((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
    if (type === "lease-overig") setVerwachteLeaseOverig((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
    if (type === "lening") setVerwachteLening((prev) => prev.map((item, i) => (i === idx ? { ...item, gevonden: true } : item)));
    if (type === "aov") setVerwachteAOV((prev) => ({ ...prev, gevonden: true }));
    setVerwachteMatchSuggestie(null);
  };
  const dismissVerwachteMatch = () => {
    const aangebodenKey = `${verwachteMatchSuggestie.type}${verwachteMatchSuggestie.idx ?? ""}`;
    setVerwachteAangeboden((prev) => ({ ...prev, [aangebodenKey]: classified.length }));
    setVerwachteMatchSuggestie(null);
  };
  return { acceptVerwachteMatch, addBusinessExpenseKeywords, addBusinessKeywords, dismissVerwachteMatch, leningOpschonen, markLoanAsPrive, markLoanAsZakelijk, markLoanNotALoan, nietLeningAantal };
}
