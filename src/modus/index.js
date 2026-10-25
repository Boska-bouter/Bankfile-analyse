// beide-V1R0 — de soort van een dossier (zakelijk of privé) als één profielobject. Onderdelen vragen het profiel
// wat ze moeten tonen en berekenen, in plaats van zelf te controleren welke soort actief is.
// Let op: "weergave" (Eenvoudig/Uitgebreid) is iets anders; dat blijft zoals het was.
import { useMemo } from "react";
import { ZAKELIJK_PROFIEL } from "./zakelijk/profiel.js";
import { PRIVE_PROFIEL } from "./prive/profiel.js";

export const SOORTEN = Object.freeze({ zakelijk: "Zakelijk", prive: "Privé" });

// Een dossier zonder soort (alles van vóór beide-V1R0) is zakelijk.
export function dossierSoort(waarde) {
  return waarde === "prive" ? "prive" : "zakelijk";
}

export function kiesProfiel(soort) {
  return dossierSoort(soort) === "prive" ? PRIVE_PROFIEL : ZAKELIJK_PROFIEL;
}

// Kaarten volgens het profiel: null = de lijst ongewijzigd (zelfde object, dus geen extra renders);
// een lijst met sleutels = alleen die kaarten, in die volgorde. Kaarten die het profiel noemt maar die er
// op dit moment niet zijn (bijv. nog geen transacties), worden gewoon overgeslagen.
export function kaartenVolgensProfiel(kaarten, keuze) {
  if (!Array.isArray(keuze)) return kaarten;
  const plek = new Map(keuze.map((k, i) => [k, i]));
  return kaarten.filter((k) => plek.has(k.key)).sort((a, b) => plek.get(a.key) - plek.get(b.key));
}

export function useModus(soort) {
  return useMemo(() => kiesProfiel(soort), [soort]);
}

export { ZAKELIJK_PROFIEL, PRIVE_PROFIEL };
