import { fiscalTreatmentOf } from "./categories.js";

// beide-V11R7 — omzet in het jaar van de factuur (factuurstelsel), zoals de accountant (vergelijking Koenders, wens Boska 30-10).
// Een ontvangst in januari–juni met een eigen factuurnummer dat met het vorige jaar begint ("2024144", "Factuur 2023103",
// "2024-067", "2025-8-M") hoort bij de omzet van dat vorige jaar. Bij Koenders: begin 2024 € 46.627 voor facturen 2023,
// begin 2025 € 5.001 voor facturen 2024 — precies de debiteuren op de balans van de accountant.
// Alleen als dat vorige jaar ook geladen is (anders zou er een jaar met alleen omzet ontstaan). De boeking krijgt dan
// year = factuurjaar en month = december van dat jaar (btw: vierde kwartaal); de boekdatum blijft. Uit te zetten per
// dossier of per boeking (bevestigdeControles.factuurjaar = { uit, niet: [ids] }).
const NUMMER = /(?:^|[^0-9a-z])(20\d{2})(?:[-/](\d{1,4})(?![0-9])(?![-./]\d)|(\d{2,4})(?![0-9]))/gi;
const geldigeMaandDag = (s) => { const m = Number(s.slice(0, 2)), d = Number(s.slice(2)); return m >= 1 && m <= 12 && d >= 1 && d <= 31; };

export function factuurjarenInTekst(tekst) {
  const jaren = [];
  for (const m of String(tekst || "").matchAll(NUMMER)) {
    if (m[3] && m[3].length === 4 && geldigeMaandDag(m[3])) continue; // 20240105 is een datum
    jaren.push(Number(m[1]));
  }
  return jaren;
}

export function factuurjaarVan(tx) {
  if (tx.isMirror || !(tx.amount > 0) || fiscalTreatmentOf(tx.category) !== "omzet") return null;
  const maand = Number(String(tx.month || "").split("-")[1]);
  if (!(maand >= 1 && maand <= 6)) return null;
  const jaren = factuurjarenInTekst(`${tx.description || ""} ${tx.fullDescription || ""}`);
  return jaren.length > 0 && jaren.every((j) => j === tx.year - 1) ? tx.year - 1 : null;
}

export function verschuifNaarFactuurjaar(lijst, keuze = null) {
  const jaren = new Set(lijst.filter((t) => !t.isMirror).map((t) => t.year));
  const niet = new Set(keuze?.niet || []);
  return lijst.map((t) => {
    const fj = factuurjaarVan(t);
    if (fj == null || !jaren.has(fj)) return t;
    const kandidaat = { ...t, factuurjaar: fj, betaaldJaar: t.year };
    if (keuze?.uit || niet.has(t.id)) return kandidaat;
    return { ...kandidaat, year: fj, month: `${fj}-12`, factuurjaarVerschoven: true };
  });
}

// Overzicht voor het scherm en het rapport: per factuurjaar wat er uit het volgende jaar bij is gekomen.
export function factuurjaarOverzicht(classified) {
  const perJaar = {};
  for (const t of classified) {
    if (t.factuurjaar == null) continue;
    const r = (perJaar[t.factuurjaar] ||= { jaar: t.factuurjaar, aantal: 0, bedrag: 0, aantalUit: 0, bedragUit: 0, items: [] });
    if (t.factuurjaarVerschoven) { r.aantal += 1; r.bedrag += t.amount; } else { r.aantalUit += 1; r.bedragUit += t.amount; }
    r.items.push(t);
  }
  return Object.values(perJaar).sort((a, b) => a.jaar - b.jaar);
}

// Eén regel voor het rapport van `jaar`: wat er uit het volgende jaar bij is gekomen en wat naar het vorige jaar is gegaan.
export function factuurjaarRegel(classified, jaar) {
  let erbij = 0, nErbij = 0, weg = 0, nWeg = 0;
  for (const t of classified) {
    if (!t.factuurjaarVerschoven) continue;
    if (t.factuurjaar === jaar) { erbij += t.amount; nErbij += 1; }
    if (t.betaaldJaar === jaar) { weg += t.amount; nWeg += 1; }
  }
  if (!nErbij && !nWeg) return "";
  const eur = (v) => `€ ${v.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const delen = [];
  if (nErbij) delen.push(`${nErbij} ontvangst${nErbij === 1 ? "" : "en"} uit ${jaar + 1} voor facturen van ${jaar} (${eur(erbij)} incl. btw) tellen mee in ${jaar}`);
  if (nWeg) delen.push(`${nWeg} ontvangst${nWeg === 1 ? "" : "en"} in ${jaar} voor facturen van ${jaar - 1} (${eur(weg)} incl. btw) tellen in ${jaar - 1}`);
  return `Omzet in het jaar van de factuur (factuurstelsel): ${delen.join("; ")}.`;
}
