// nieuw-V1R8 — dezelfde persoon, anders geschreven (melding Boska 9-11, Dakhlaoui): "NEIJA DAKHLAOUI" en "S REIJNHOUT" stonden
// onder "Overig" omdat namen in hoofdletters niet als persoon tellen, terwijl hetzelfde rekeningnummer elders als persoon herkend is
// ("Nejia Dakhlaoui", "S.R. Reijnhout"). Een automatisch op "Overig" ingedeelde boeking naar of van zo'n rekeningnummer komt nu bij
// "Overboekingen aan personen". Een eigen keuze blijft altijd staan.
import { normalizeIban } from "../utils/normalization.js";

const sleutel = (iban) => normalizeIban(iban || "");

export function personenViaIban(lijst) {
  const namen = new Map();
  for (const t of lijst) {
    if (t.category !== "Overboekingen aan personen" || t.transferLocked) continue;
    const k = sleutel(t.counterpartyIban);
    if (k && !namen.has(k)) namen.set(k, t.counterparty || "");
  }
  if (namen.size === 0) return lijst;
  return lijst.map((t) => {
    if (t.category !== "Overig" || t.transferLocked || t.confidence?.level === "override") return t;
    const naam = namen.get(sleutel(t.counterpartyIban));
    if (naam === undefined) return t;
    return { ...t, category: "Overboekingen aan personen", personViaIban: naam,
      confidence: { level: "heuristic", label: `Zelfde rekeningnummer als ${naam || "een persoon"} (Overboekingen aan personen)` } };
  });
}
