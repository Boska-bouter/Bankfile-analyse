// nieuw-V1R01 — rekenwerk voor de eenvoudige weergave: hoe zeker is de uitkomst (naar bedrag), en welke vragen
// leveren met zo min mogelijk antwoorden de meeste zekerheid op. Pure functies, los te testen.
import { counterpartyKey } from "../utils/normalization.js";
import { sleutelZonderNaam } from "../classification/reviewSummaries.js";
import { betaalSoort } from "../classification/classify.js";

export const DREMPEL_BETROUWBAAR = 90;
export const DREMPEL_REDELIJK = 65;

// Overboekingen tussen eigen rekeningen tellen niet mee: die zeggen niets over de uitkomst.
const NIET_MEETELLEN = new Set([
  "Interne overboeking", "Interne overboeking: zakelijk sparen", "Interne overboeking: privé sparen",
  "Ontvangen van zakelijk", "Terugboeking naar zakelijk", "Terugboeking van privé",
]);

// "herkend" | "geschat" | "onbekend" voor één boeking. Wat de gebruiker in Overig/personen al met "Klopt zo"
// heeft bevestigd, telt als herkend (zelfde regel als het blok Classificatiezekerheid).
export function zekerheidVan(tx, bevestigd) {
  const lvl = tx.confidence?.level;
  if (lvl === "override" || lvl === "keyword" || bevestigd(tx)) return "herkend";
  if (lvl === "fallback") return "onbekend";
  return "geschat";
}

export function maakBevestigd(reviewedOverigKeys = [], reviewedPersonKeys = []) {
  const overig = new Set(reviewedOverigKeys), personen = new Set(reviewedPersonKeys);
  return (tx) => {
    if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") return false;
    const k = counterpartyKey(tx.counterparty || tx.description, tx.amount) || sleutelZonderNaam(tx);
    return (tx.category === "Overig" ? overig : personen).has(k);
  };
}

// Betrouwbaarheid naar bedrag voor één jaar (of alle jaren als jaar null is).
export function berekenBetrouwbaarheid(classified, jaar, bevestigd) {
  const som = { herkend: 0, geschat: 0, onbekend: 0 };
  const aantal = { herkend: 0, geschat: 0, onbekend: 0 };
  for (const tx of classified) {
    if (tx.isMirror || !tx.amount || (jaar != null && tx.year !== jaar) || NIET_MEETELLEN.has(tx.category) || tx.transferLocked) continue;
    const z = zekerheidVan(tx, bevestigd);
    som[z] += Math.abs(tx.amount);
    aantal[z] += 1;
  }
  const totaal = som.herkend + som.geschat + som.onbekend;
  const pct = (v) => (totaal ? Math.round((v / totaal) * 1000) / 10 : 0);
  const herkend = pct(som.herkend);
  return {
    totaal, som, aantal,
    herkend, geschat: pct(som.geschat), onbekend: pct(som.onbekend),
    oordeel: totaal === 0 ? "geen" : herkend >= DREMPEL_BETROUWBAAR ? "betrouwbaar" : herkend >= DREMPEL_REDELIJK ? "redelijk" : "onzeker",
  };
}

// nieuw-V3R3 — betaaldiensten ("verzamelnamen"): achter één naam zitten veel verschillende partijen, deels zakelijk en
// deels privé. Die worden opgesplitst naar de echte partij uit de omschrijving ("…, VAN K.E.A.P. VELDHUIS, NL95…") of,
// als die er niet staat, naar het IBAN in de omschrijving. Het antwoord geldt dan per boeking van die partij.
export const BETAALDIENST = /\b(tikkie|paypal|mollie|adyen|stripe|buckaroo|multisafepay|klarna|derdengelden|betaalverzoek)\b/i;
// "Lukus via Tikkie" of "GG B.V. via Stichting Mollie": de echte partij staat al vóór "via" — dan geen verzamelnaam.
export function isBetaaldienst(tx) {
  const cp = String(tx.counterparty || "");
  const voorVia = cp.split(/\s+via\s+/i)[0];
  return BETAALDIENST.test(voorVia);
}
export function echtePartij(tx) {
  const d = String(tx.description || "");
  const m = d.match(/(?:^|,)\s*(?:van|aan)\s+([^,]{3,60}?)\s*(?:,|$)/i);
  if (m) return { sleutel: m[1].trim().toLowerCase().replace(/\s+/g, " "), naam: m[1].trim() };
  const iban = d.match(/\b[A-Z]{2}\d{2}[A-Z]{4}\d{7,}\b/);
  if (iban) return { sleutel: iban[0], naam: `rekening ${iban[0]}` };
  return null;
}

const KLEIN = 100; // kleine pinbetalingen (per tegenpartij in totaal) gaan samen in één groepsvraag

// Vragen voor "Nakijken": per tegenpartij (alle jaren samen, want het antwoord geldt overal), op volgorde van het
// onzekere bedrag in het gekozen jaar. Kleine pinbetalingen zonder herkenning worden één groepsvraag.
export function bouwVragen(classified, jaar, bevestigd) {
  const groepen = {};
  for (const tx of classified) {
    if (tx.isMirror || !tx.amount || NIET_MEETELLEN.has(tx.category) || tx.transferLocked) continue;
    if (zekerheidVan(tx, bevestigd) === "herkend") continue;
    const basis = counterpartyKey(tx.counterparty || tx.description, tx.amount);
    if (!basis) continue; // zonder naam: niet als vraag (blijft voor Uitgebreid)
    const dienst = isBetaaldienst(tx);
    const partij = dienst ? echtePartij(tx) : null;
    const key = partij ? `${basis}|${partij.sleutel}` : basis;
    const naam = partij ? `${tx.counterparty} · ${partij.naam}` : tx.counterparty || tx.description;
    // perBoeking: antwoord als keuze per boeking (rij), niet voor de hele naam — anders zou één antwoord alle partijen
    // achter de betaaldienst meenemen.
    const g = (groepen[key] ||= { key, naam, txs: [], bedragJaar: 0, bedragAlle: 0, rekening: tx.accountType || tx.type, teken: tx.amount >= 0 ? 1 : -1, perBoeking: !!partij, betaaldienst: dienst });
    g.txs.push(tx);
    g.bedragAlle += tx.amount;
    if (jaar == null || tx.year === jaar) g.bedragJaar += tx.amount;
  }
  const losse = [], kleinePin = [];
  for (const g of Object.values(groepen)) {
    if (jaar != null && g.bedragJaar === 0) continue;
    const allePin = g.txs.every((t) => betaalSoort(t) === "pin");
    if (allePin && g.teken < 0 && Math.abs(g.bedragAlle) < KLEIN) kleinePin.push(g);
    else losse.push(g);
  }
  losse.sort((a, b) => Math.abs(b.bedragJaar) - Math.abs(a.bedragJaar));
  const vragen = losse.map((g) => ({
    soort: "tegenpartij", key: g.key, naam: g.naam, aantal: g.txs.length, bedrag: Math.round(g.bedragJaar * 100) / 100,
    teken: g.teken, rekening: g.rekening, voorbeeld: g.txs[0], groepen: [g], betaaldienst: g.betaaldienst,
  }));
  if (kleinePin.length >= 3) {
    const bedrag = kleinePin.reduce((a, g) => a + g.bedragJaar, 0);
    const vraag = {
      soort: "kleinePin", key: "kleinePin", naam: `${kleinePin.length} kleine pinbetalingen bij winkels en dergelijke`,
      aantal: kleinePin.reduce((a, g) => a + g.txs.length, 0), bedrag: Math.round(bedrag * 100) / 100, teken: -1,
      rekening: kleinePin[0].rekening, voorbeeld: kleinePin[0].txs[0], groepen: kleinePin,
    };
    // op zijn plek in de volgorde van bedrag
    const i = vragen.findIndex((v) => Math.abs(v.bedrag) < Math.abs(vraag.bedrag));
    vragen.splice(i < 0 ? vragen.length : i, 0, vraag);
  } else {
    for (const g of kleinePin) vragen.push({ soort: "tegenpartij", key: g.key, naam: g.naam, aantal: g.txs.length, bedrag: Math.round(g.bedragJaar * 100) / 100, teken: g.teken, rekening: g.rekening, voorbeeld: g.txs[0], groepen: [g] });
  }
  return vragen;
}

// Welke categorie hoort bij een antwoord? keuze: "bedrijf" | "prive" | "eigen".
export function categorieVoorAntwoord(keuze, teken, rekening) {
  const zak = rekening === "Zakelijk";
  if (keuze === "bedrijf") return teken > 0 ? { category: "Zakelijke inkomsten", type: "Zakelijk" } : { category: "Zakelijke inkoop/uitgaven", type: "Zakelijk" };
  if (keuze === "prive") {
    if (zak) return teken > 0 ? { category: "Terugboeking van privé", type: "Zakelijk" } : { category: "Privé opnames", type: "Zakelijk" };
    return { category: "Privé: overig", type: "Prive" };
  }
  // eigen rekening
  if (zak) return teken > 0 ? { category: "Terugboeking van privé", type: "Zakelijk" } : { category: "Privé opnames", type: "Zakelijk" };
  return teken > 0 ? { category: "Ontvangen van zakelijk", type: "Prive" } : { category: "Terugboeking naar zakelijk", type: "Prive" };
}

// Voorstel voor het voorgeselecteerde antwoord op basis van hoe de app hem nu (onzeker) heeft ingedeeld.
export function voorstelVoor(vraag) {
  const tx = vraag.voorbeeld;
  if (vraag.soort === "kleinePin") return "prive";
  const c = tx?.category || "";
  if (/^Privé opnames$|^Ontvangen van zakelijk$|^Terugboeking/.test(c)) return "eigen";
  if (tx?.type === "Zakelijk" && !/^Privé|Overboekingen aan personen|^Overig$/.test(c)) return "bedrijf";
  return "prive";
}
