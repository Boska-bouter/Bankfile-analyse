// Vaste voorbeeldsituaties voor de zakelijke berekening. De uitkomsten staan in vastgelegd/zakelijk.json
// (gemaakt met release nieuw-V6R7). Verandert een uitkomst, dan is de zakelijke berekening verschoven.
import * as ib from "../src/tax/incomeTax.js";
import * as btw from "../src/tax/btw.js";
import { computeYearlySummary } from "../src/tax/yearlySummary.js";
import { DEFAULT_FIXED_CATEGORIES, INCOME_TRANSFER_CATEGORIES } from "../src/classification/categories.js";

const tx = (d, amount, category, type = "Zakelijk") => ({ date: d, year: +d.slice(0, 4), month: d.slice(0, 7), amount, category, type, description: category });

export const VOORBEELD_TRANSACTIES = [
  tx("2025-02-10", 12100, "Zakelijke inkomsten"),
  tx("2025-03-01", -121, "Boekhouder, accountant & administratie"),
  tx("2025-05-03", -60.5, "Software & Online diensten"),
  tx("2025-08-01", 6050, "Zakelijke inkomsten"),
  tx("2025-09-15", -500, "Boodschappen", "Prive"),
];

export function berekenAlles() {
  const uit = {};
  for (const jaar of [2024, 2025, 2026]) {
    for (const winst of [20000, 45000, 90000]) {
      uit[`ib_${jaar}_${winst}`] = {
        ibMetZa: ib.estimateIncomeTax(winst, jaar, true).belasting,
        ibZonderZa: ib.estimateIncomeTax(winst, jaar, false).belasting,
        zvw: ib.estimateZvw(winst, jaar, true),
        ahk: ib.computeAlgemeneHeffingskorting(winst, jaar),
        arbeidskorting: ib.computeArbeidskorting(winst, jaar),
      };
    }
  }
  uit.btwKwartalen = btw.computeQuarterlyBtwForYear(VOORBEELD_TRANSACTIES, 2025, btw.DEFAULT_BTW_RATES, false, btw.DEFAULT_VOORBELASTING_EXCLUDED);
  uit.jaaroverzicht = computeYearlySummary(VOORBEELD_TRANSACTIES, 2025, btw.DEFAULT_BTW_RATES, false, DEFAULT_FIXED_CATEGORIES, INCOME_TRANSFER_CATEGORIES, btw.DEFAULT_VOORBELASTING_EXCLUDED);
  return uit;
}
