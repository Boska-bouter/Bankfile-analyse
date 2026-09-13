import { SPLIT_CATEGORY_NAMES } from "./categories.js";
import { looksLikePerson, counterpartyKey, ibanKey } from "../utils/normalization.js";

// Categorieën die vrijwel nooit een echte zakelijke aftrekpost zijn, ook niet wanneer ze
// toevallig vanaf een zakelijke rekening betaald zijn (bijv. een Netflix-abonnement op de
// zakelijke rekening) — die volgen daarom niet het rekeningtype zoals de meeste andere
// categorieën, maar blijven altijd Privé.
const ALWAYS_PRIVE_CATEGORIES = new Set(["Prive overige abonnementen"]);

// Categorieën die per definitie Zakelijk zijn wanneer ze via een snelkoppeling worden gekozen.
export function defaultTypeForCategory(category) {
  return category === "Zakelijke inkomsten" || category === "Uitbetaling aan prive" || category === "Prive opnames"
    ? "Zakelijk"
    : "Prive";
}

export function autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType) {
  if (tx.outOfYearRange) {
    return { category: "Inkomsten/betalingen niet dit jaar", type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
  }

  // Kopspatie: sommige trefwoorden zijn bewust met spaties omsloten (" bp ", " action ") om te
  // voorkomen dat ze als stukje van een ander woord matchen — maar zonder deze kopspatie zou zo'n
  // trefwoord nooit matchen wanneer het merk toevallig het allereerste woord is (bijv. een
  // tegenpartij "BP Boxtel" of "Action 1234 Boxtel").
  const text = ` ${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  const isIncome = tx.amount > 0;

  // "Derdengelden Intersolve" komt in de praktijk voor als inkomen (ook wanneer het incidenteel
  // als een terugboeking/afschrijving in het bankbestand staat) — altijd als inkomen behandelen,
  // los van het teken van het bedrag.
  if (text.includes("derdengelden intersolve")) {
    return accountType === "Zakelijk" ? { category: "Zakelijke inkomsten", type: "Zakelijk" } : { category: "Inkomsten", type: "Prive" };
  }

  if (isIncome && /factuur(nr|nummer)?/i.test(text)) {
    return { category: "Zakelijke inkomsten", type: "Zakelijk" };
  }

  const isBiz = businessKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (isBiz) {
    return { category: "Zakelijke inkomsten", type: "Zakelijk" };
  }

  if (isIncome) {
    if (accountType === "Zakelijk") {
      return { category: "Zakelijke inkomsten", type: "Zakelijk" };
    }
    return { category: "Inkomsten", type: "Prive" };
  }

  // Uitgaven: eerst kijken of een specifieke categorie matcht — die blijft altijd leidend,
  // ongeacht rekeningtype of tegenpartijlijst.
  for (const rule of rules) {
    if (rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase()))) {
      if (ALWAYS_PRIVE_CATEGORIES.has(rule.name)) {
        return { category: rule.name, type: "Prive" };
      }
      const isBizExpense = accountType === "Zakelijk" || businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
      const categoryName = !isBizExpense && SPLIT_CATEGORY_NAMES[rule.name] ? SPLIT_CATEGORY_NAMES[rule.name] : rule.name;
      return { category: categoryName, type: isBizExpense ? "Zakelijk" : "Prive" };
    }
  }

  const explicitBizExpense = businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (explicitBizExpense) {
    return { category: "Zakelijke uitgaven", type: "Zakelijk" };
  }

  const expenseType = accountType === "Zakelijk" ? "Zakelijk" : "Prive";
  if (looksLikePerson(tx.counterparty || tx.description)) {
    return { category: "Overboekingen aan personen", type: expenseType };
  }
  return { category: "Overig", type: expenseType };
}

export function resolveClassification(tx, rules, businessKeywords, businessExpenseKeywords, accountType, overridesByCounterparty, overridesByRow) {
  if (overridesByRow[tx.id]) return overridesByRow[tx.id];
  // IBAN is stabieler dan de naam (die per bank-export kan wisselen) — dus die heeft voorrang
  // wanneer het bankbestand een tegenrekening-IBAN bevatte.
  const ik = ibanKey(tx.counterpartyIban, tx.amount);
  if (ik && overridesByCounterparty[ik]) return overridesByCounterparty[ik];
  const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
  if (key && overridesByCounterparty[key]) return overridesByCounterparty[key];
  return autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType);
}
