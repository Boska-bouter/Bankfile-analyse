import { normKey, counterpartyKey, textHasKeyword } from "../utils/normalization.js";

// Categorieën die de classificatie (zie classify.js) al met harde zekerheid heeft bepaald als een
// verschuiving tussen de eigen rekeningen van dezelfde rekeninghouder (IBAN-match met een eigen
// andere rekening, of tekstherkenning van een eigen gekoppelde spaarrekening) — per definitie geen
// klant/opdrachtgever, dus deze hoeven de "is dit een zakelijke klant?"-vraag niet meer te doorlopen.
// Zonder deze uitsluiting kreeg je bij het laden van een privérekening met veel onderlinge
// overboekingen (bijv. naar de al bekende zakelijke rekening, of naar een eigen spaarrekening) een
// lange rij overbodige controlevragen over geld dat feitelijk al verklaard is.
const GEEN_KLANT_CATEGORIES = [
  "Privé opnames", "Terugboeking van privé", // zakelijke kant (zie functie hieronder: wordt hier niet bereikt, maar voor de volledigheid)
  "Ontvangen van zakelijk", "Terugboeking naar zakelijk", // privé kant (v213)
  "Interne overboeking: privé sparen",
  "Interne overboeking",
  // Geld van een bekende (zie classify.js) is per definitie ook geen klant/opdrachtgever.
  "Overboeking van bekenden",
];

// Groepeert binnenkomende betalingen per tegenpartij — voor de vraag "is dit een zakelijke
// klant, of loondienst/privé-inkomen?". Bestanden die op rekeningniveau al als "Zakelijk" zijn
// aangemerkt slaan deze vraag over (dat is al beantwoord), net als transacties die de classificatie
// al met zekerheid als eigen-rekening-verschuiving heeft herkend (zie GEEN_KLANT_CATEGORIES).
export function computeIncomeSummary(classified, accountTypeByFile, businessKeywords = []) {
  const map = {};
  // V67 — een tegenpartij die je zelf al als opdrachtgever hebt opgegeven (wizard of eerdere bevestiging)
  // hoeft niet nogmaals bevestigd: dezelfde tekstmatch als in classify.js (autoClassify).
  const kws = (businessKeywords || []).map((k) => String(k || "").toLowerCase()).filter(Boolean);
  for (const tx of classified) {
    if (tx.isMirror) continue;
    if (tx.amount <= 0) continue;
    if (accountTypeByFile[tx.source] === "Zakelijk") continue;
    if (GEEN_KLANT_CATEGORIES.includes(tx.category)) continue;
    if (kws.length > 0) {
      const text = ` ${tx.counterparty || ""} ${tx.description || ""} ${tx.fullDescription || ""}`.toLowerCase();
      if (kws.some((kw) => textHasKeyword(text, kw))) continue;
    }
    const key = normKey(tx.counterparty || tx.description);
    if (!key) continue;
    if (!map[key]) {
      map[key] = { key, name: tx.counterparty || tx.description, total: 0, count: 0, source: tx.source, description: "", years: new Set() };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].years.add(tx.year);
    map[key].description = tx.fullDescription || tx.description || map[key].description;
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// Groepeert transacties in één categorie per tegenpartij + teken (ontvangen/betaald) — gebruikt
// voor zowel "Overboekingen aan personen" als "Overig" opruimen (zelfde soort werkstroom).
export function computeCategorySummary(classified, category) {
  const map = {};
  for (const tx of classified) {
    if (tx.category !== category || tx.isMirror) continue;
    const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        key, name: tx.counterparty || tx.description, amount: tx.amount, total: 0, count: 0,
        category: tx.category, type: tx.type, description: "", years: new Set(), btwVerlegd: tx.btwVerlegd,
      };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].years.add(tx.year);
    map[key].description = tx.fullDescription || tx.description || map[key].description;
  }
  return Object.values(map).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

// Zelfde soort samenvatting als hierboven, maar dan over de VIER "Zakelijke inkomsten"-categorieën
// heen (algemeen + 0%/9%/21%) in plaats van precies één ervan — anders verdwijnt een klant zodra
// je er zelf al een specifiek tarief aan hebt gegeven, en is nooit meer te zien dat een klant
// intussen op meerdere tarieven tegelijk staat. `gemengd: true` betekent dat deze tegenpartij
// transacties heeft in meer dan één van de vier categorieën — `category` blijft dan gewoon de
// eerst-gevonden ervan (representatief, niet leidend), zodat mainCategoryOf/kleur elders normaal
// blijven werken; de UI zelf toont het "gemengd" gegeven apart.
const INKOMSTEN_CATEGORIEEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"];
export function computeIncomeCategorySummary(classified) {
  const map = {};
  for (const tx of classified) {
    if (!INKOMSTEN_CATEGORIEEN.includes(tx.category) || tx.isMirror) continue;
    const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        key, name: tx.counterparty || tx.description, amount: tx.amount, total: 0, count: 0,
        category: tx.category, categorieen: new Set(), type: tx.type, description: "", years: new Set(), btwVerlegd: tx.btwVerlegd,
      };
    }
    map[key].total += tx.amount;
    map[key].count += 1;
    map[key].categorieen.add(tx.category);
    map[key].years.add(tx.year);
    map[key].description = tx.fullDescription || tx.description || map[key].description;
  }
  return Object.values(map)
    .map((item) => ({ ...item, gemengd: item.categorieen.size > 1 }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}
