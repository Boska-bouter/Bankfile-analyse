// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useAutomatischeHerkenningItems(p) {
  const {
    categoryRules, instellingenDashboardCards,
  } = p;

  return useMemo(() => {
    const incomeCard = instellingenDashboardCards.find((c) => c.key === "businessIncomeEntries");
    const expenseCard = instellingenDashboardCards.find((c) => c.key === "businessExpenseEntries");
    return [
      { label: "Categorieregels", count: categoryRules.length },
      incomeCard && { label: "Zakelijke klanten herkend", count: incomeCard.value, onClick: incomeCard.onClick },
      expenseCard && { label: "Zakelijke inkoop/uitgaven", count: expenseCard.value, onClick: expenseCard.onClick },
    ].filter(Boolean);
  }, [instellingenDashboardCards, categoryRules]);
}
