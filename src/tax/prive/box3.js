// beide-V1R8 (fase 5) — box 3 met forfaitaire rendementen (vermogen op 1 januari). Na het Kerstarrest is er
// een tegenbewijsregeling en komt er een stelsel op werkelijk rendement; per jaar kan de methode wisselen.
// Tot dat stelsel er is rekenen we forfaitair: dit is een indicatie.
import { priveTarief } from "./tarieven.js";

export const BOX3_METHODE = "forfaitair";

// vermogen = { sparen, beleggen, schulden } (samen met de partner); personen = 1 of 2
export function box3({ sparen = 0, beleggen = 0, schulden = 0 } = {}, jaar, personen = 1) {
  const t = priveTarief("box3", jaar).waarde;
  const s = Math.max(0, sparen || 0), b = Math.max(0, beleggen || 0);
  const schuld = Math.max(0, (schulden || 0) - t.schuldendrempel * personen);
  const bezittingen = s + b;
  const rendement = s * (t.sparenPct / 100) + b * (t.beleggenPct / 100) - schuld * (t.schuldenPct / 100);
  const grondslag = Math.max(0, bezittingen - schuld);
  const heffingsvrij = t.heffingsvrij * personen;
  const rendementsgrondslag = Math.max(0, grondslag);
  const pctRendement = rendementsgrondslag > 0 ? Math.max(0, rendement) / rendementsgrondslag : 0;
  const belastbaarDeel = Math.max(0, grondslag - heffingsvrij);
  const voordeel = belastbaarDeel * pctRendement;
  return { methode: BOX3_METHODE, grondslag, heffingsvrij, voordeel, belasting: voordeel * (t.tariefPct / 100), tariefPct: t.tariefPct };
}
