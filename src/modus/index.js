// beide-V1R0 — de soort van een dossier (zakelijk of privé) als één profielobject. Onderdelen vragen het profiel
// wat ze moeten tonen en berekenen, in plaats van zelf te controleren welke soort actief is.
// Let op: "weergave" (Eenvoudig/Uitgebreid) is iets anders; dat blijft zoals het was.
import { useMemo } from "react";
import { ZAKELIJK_PROFIEL } from "./zakelijk/profiel.js";
import { PRIVE_PROFIEL } from "./prive/profiel.js";
import { HUISHOUD_PROFIEL } from "./huishoudboekje/profiel.js";

export const SOORTEN = Object.freeze({ zakelijk: "Zakelijk", prive: "Privé", huishoudboekje: "Huishoudboekje" });

// Een dossier zonder soort (alles van vóór beide-V1R0) is zakelijk.
// huishoudboekje-V1R0 — derde soort: "huishoudboekje".
export function dossierSoort(waarde) {
  return waarde === "prive" || waarde === "huishoudboekje" ? waarde : "zakelijk";
}
// Privé of Huishoudboekje: allebei een particulier huishouden met privérekeningen en -categorieën.
export const isParticulier = (soort) => dossierSoort(soort) !== "zakelijk";

export function kiesProfiel(soort) {
  const s = dossierSoort(soort);
  return s === "prive" ? PRIVE_PROFIEL : s === "huishoudboekje" ? HUISHOUD_PROFIEL : ZAKELIJK_PROFIEL;
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

export { ZAKELIJK_PROFIEL, PRIVE_PROFIEL, HUISHOUD_PROFIEL };
