// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { computeOndernemersaftrekMetReserve, resolveZelfstandigenaftrekStatusForYear } from "../tax/incomeTax.js";

export function useOndernemersaftrekPerJaar(p) {
  const {
    rechtsvorm, startersaftrekStatus, yearlySummaries, years, zaLegacyJaDefault,
    zelfstandigenaftrekStatus,
  } = p;

  return useMemo(() => {
    if (rechtsvorm === "bv" || years.length === 0) return {};
    const jarenData = years.map((y) => ({
      year: y,
      winst: yearlySummaries[y]?.winst || 0,
      zelfstandigenaftrekStatus: resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, y, zaLegacyJaDefault),
      startersaftrekToegepast: startersaftrekStatus?.[y] === "ja",
    }));
    return computeOndernemersaftrekMetReserve(jarenData);
  }, [rechtsvorm, years, yearlySummaries, zelfstandigenaftrekStatus, zaLegacyJaDefault, startersaftrekStatus]);
}
