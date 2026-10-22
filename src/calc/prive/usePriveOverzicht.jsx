// beide-V1R8 (fase 5) — budget en belastingindicatie per jaar voor een privédossier, op één plek berekend
// zodat Overzicht, Eenvoudig, het aangiftevoorstel, print en Excel dezelfde cijfers tonen.
import { useMemo } from "react";
import { budgetJaar } from "./budget.js";
import { priveBelastingInvoer } from "./belastingInvoer.js";
import { berekenPriveJaar } from "../../tax/prive/index.js";

export function berekenPriveOverzicht({ transacties, jaren, vasteCategorieen, antwoorden, eenvoudig }) {
  const perJaar = {};
  for (const jaar of jaren) {
    const budget = budgetJaar(transacties, jaar, vasteCategorieen);
    const { invoer, aannames } = priveBelastingInvoer({ transacties, jaar, budget, antwoorden, eenvoudig });
    const belasting = berekenPriveJaar(invoer, jaar);
    if (belasting.tariefStatus === "benadering") aannames.push(`Voor ${jaar} zijn nog niet alle tarieven bekend: gerekend met die van een eerder jaar.`);
    perJaar[jaar] = { budget, invoer, belasting, aannames };
  }
  return { perJaar };
}

export function usePriveOverzicht({ actief, transacties, jaren, vasteCategorieen, antwoorden, eenvoudig }) {
  return useMemo(
    () => (actief ? berekenPriveOverzicht({ transacties, jaren, vasteCategorieen, antwoorden, eenvoudig }) : null),
    [actief, transacties, jaren, vasteCategorieen, antwoorden, eenvoudig],
  );
}
