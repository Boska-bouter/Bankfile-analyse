// huishoudboekje-V1R0 — budgetten per categorie (wens Boska 2-11): bedrag per maand; in een week 12/52 daarvan.
// budgetten = { [categorie]: bedrag per maand }. Status: "over" (>100%), "bijna" (≥90%), "ok".
export const weekFactor = 12 / 52;

export function schoonBudgetten(b) {
  const uit = {};
  for (const [k, v] of Object.entries(b && typeof b === "object" ? b : {})) {
    const n = Number(String(v).replace(",", "."));
    if (typeof k === "string" && k && Number.isFinite(n) && n > 0 && n < 1e6) uit[k] = Math.round(n * 100) / 100;
  }
  return uit;
}

export function budgetStatus(periode, budgetten, soort = "maand") {
  const f = soort === "week" ? weekFactor : 1;
  const lijst = [];
  for (const [cat, perMaand] of Object.entries(schoonBudgetten(budgetten))) {
    const budget = perMaand * f;
    const besteed = periode?.perCategorie?.get(cat)?.bedrag || 0;
    const pct = budget > 0 ? (besteed / budget) * 100 : 0;
    lijst.push({ categorie: cat, budget, besteed, pct, rest: budget - besteed, status: pct > 100 ? "over" : pct >= 90 ? "bijna" : "ok" });
  }
  return lijst.sort((a, b) => b.pct - a.pct);
}
