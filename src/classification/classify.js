import { SPLIT_CATEGORY_NAMES } from "./categories.js";
import { looksLikePerson, counterpartyKey } from "../utils/normalization.js";

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

  const text = `${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  const isIncome = tx.amount > 0;

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

  for (const rule of rules) {
    if (rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase()))) {
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
  const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
  if (key && overridesByCounterparty[key]) return overridesByCounterparty[key];
  return autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType);
}
