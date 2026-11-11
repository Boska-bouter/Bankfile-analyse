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

// nieuw-V3R0 — wens Boska 11-11: een teruggave in een kostencategorie (bijv. "Restitutie creditsaldo" energie in februari)
// kan bij het vorige jaar horen. Hij telt dan in december van dat jaar (kosten van dat jaar omlaag), niet in het jaar van
// ontvangst. Alleen als dat vorige jaar ook geladen is. Met de hand per boeking (bevestigdeControles.kostenVorigJaar = [ids]),
// of vanzelf als de omschrijving het jaar noemt ("Periode 2023-12", "jaarafrekening 2023"), tenzij uitgezet
// (bevestigdeControles.kostenVorigJaarNiet = [ids]). Noemt de omschrijving het eigen jaar, dan hoeft er niets gevraagd te worden.
const JAAR_IN_OMSCHRIJVING = [
  /\bperiode\s*:?\s*(20\d{2})\b/gi,
  /\b(?:jaar|eind|slot)?afrekening\s*(?:over\s*|van\s*)?(?:het\s*jaar\s*)?(20\d{2})\b/gi,
  /\b(?:verbruiks|belasting|boek)?jaar\s*:?\s*(20\d{2})\b/gi,
  /\bover\s*(?:het\s*jaar\s*)?(20\d{2})\b/gi,
];

export function jaarUitOmschrijving(tx) {
  const tekst = `${tx.description || ""} ${tx.fullDescription || ""}`;
  const jaren = new Set();
  for (const re of JAAR_IN_OMSCHRIJVING) for (const m of tekst.matchAll(re)) jaren.add(Number(m[1]));
  return jaren.size === 1 ? [...jaren][0] : null;
}

const isKostenTeruggave = (t) => !t.isMirror && t.amount > 0 && fiscalTreatmentOf(t.category) === "kosten";
const beginVanJaar = (t) => { const m = Number(String(t.month || "").split("-")[1]); return m >= 1 && m <= 6; };

export function verschuifKostenNaarVorigJaar(lijst, ids = null, niet = null) {
  const kies = new Set(ids || []);
  const nietSet = new Set(niet || []);
  const jaren = new Set(lijst.filter((t) => !t.isMirror).map((t) => t.year));
  return lijst.map((t) => {
    if (!isKostenTeruggave(t) || !jaren.has(t.year - 1)) return t;
    const vanzelf = !nietSet.has(t.id) && beginVanJaar(t) && jaarUitOmschrijving(t) === t.year - 1;
    if (!kies.has(t.id) && !vanzelf) return t;
    const vj = t.year - 1;
    return { ...t, year: vj, month: `${vj}-12`, betaaldJaar: t.year, kostenjaarVerschoven: true, ...(vanzelf && !kies.has(t.id) ? { kostenjaarUitOmschrijving: true } : {}) };
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
