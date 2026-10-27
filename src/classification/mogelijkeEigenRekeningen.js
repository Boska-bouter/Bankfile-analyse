import { ibansMatch, normalizeIban } from "../utils/normalization.js";

// beide-V8R7 — mogelijke eigen rekeningen (wens Boska 27-10). Na het laden zoekt de app tegenrekeningen die niet als eigen
// rekening bekend zijn, maar er wel op lijken. Per rekening een score uit losse signalen; vanaf DREMPEL komt hij in het
// overzicht "Mogelijke eigen rekeningen", met de redenen erbij. De gebruiker beslist: eigen rekening (zakelijk/spaar/privé)
// of "nee" (komt niet terug). De app zet zelf niets vast.
const DREMPEL = 3;
const SPAARWOORDEN = /\b(sparen|spaarrekening|spaar|eigen rekening|naar eigen|van eigen|vermogenssparen|reserve)\b/i;
const zonderBic = (iban) => normalizeIban(iban).replace(/\/.*$/, "");
const plat = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const woorden = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const bankVan = (iban) => (/^[A-Z]{2}\d{2}([A-Z]{4})/.exec(iban) || [])[1] || null;
const rond = (b) => Math.abs(b) >= 10 && Math.abs(Math.round(b) - b) < 0.005 && Math.round(Math.abs(b)) % 5 === 0;

// Persoonsnaam: hele naam, of achternaam met de eerste voorletter ervoor ("Dion Houtman" ↔ "D. HOUTMAN", "DH Houtman").
function lijktOpPersoon(tekst, naam) {
  const n = woorden(naam).filter((w) => !["van", "de", "der", "den", "het", "ter", "ten"].includes(w));
  if (n.length === 0) return false;
  if (plat(tekst).includes(plat(naam)) && plat(naam).length >= 6) return true;
  const achternaam = n[n.length - 1];
  if (achternaam.length < 3) return false;
  const t = woorden(tekst);
  const i = t.indexOf(achternaam);
  if (i < 0) return false;
  if (n.length === 1) return true;
  return t.slice(0, i).some((w) => w[0] === n[0][0]);
}
// Bedrijfsnaam: zonder leestekens en spaties ("DH Vloeren + Projecten" ↔ "DH vloeren+projecten", "DH vloeren.projecten").
function lijktOpBedrijf(tekst, bedrijf) {
  const b = plat(bedrijf).replace(/(bv|vof|cv)$/, "");
  return b.length >= 4 && plat(tekst).includes(b);
}

export function vindMogelijkeEigenRekeningen(transacties, { eigenIbans = [], eigenNamen = null, afgewezen = [] } = {}) {
  const bekend = (iban) => eigenIbans.some((e) => ibansMatch(e, iban)) || afgewezen.some((a) => ibansMatch(a, iban));
  const eigenBanken = new Set(eigenIbans.map((e) => bankVan(zonderBic(e))).filter(Boolean));
  const per = new Map();
  for (const tx of transacties || []) {
    if (tx.isMirror || tx.transferLocked || !tx.counterpartyIban) continue;
    const iban = zonderBic(tx.counterpartyIban);
    if (iban.length < 6 || bekend(iban)) continue;
    const g = per.get(iban) || { iban, namen: {}, af: 0, bij: 0, totaalAf: 0, totaalBij: 0, rond: 0, spaarwoord: 0, rekeningen: new Set(), naamTx: 0 };
    const naam = (tx.counterparty || "").trim();
    if (naam) g.namen[naam] = (g.namen[naam] || 0) + 1;
    if (tx.amount < 0) { g.af++; g.totaalAf += -tx.amount; } else { g.bij++; g.totaalBij += tx.amount; }
    if (rond(tx.amount)) g.rond++;
    if (SPAARWOORDEN.test(`${tx.counterparty || ""} ${tx.description || ""}`)) g.spaarwoord++;
    if (tx.accountType) g.rekeningen.add(tx.accountType);
    per.set(iban, g);
  }
  const uit = [];
  for (const g of per.values()) {
    const n = g.af + g.bij;
    const naam = Object.entries(g.namen).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const redenen = [];
    let score = 0;
    const alleNamen = Object.keys(g.namen).join(" | ");
    if (eigenNamen?.bedrijf && lijktOpBedrijf(alleNamen, eigenNamen.bedrijf)) { score += 3; redenen.push(`naam lijkt op de bedrijfsnaam (${eigenNamen.bedrijf})`); }
    const persoon = [eigenNamen?.ondernemer, eigenNamen?.partner].filter(Boolean).find((p) => lijktOpPersoon(alleNamen, p));
    if (persoon) { score += 3; redenen.push(`naam lijkt op ${persoon}`); }
    if (g.af >= 2 && g.bij >= 2) { score += 2; redenen.push(`geld gaat heen en terug (${g.af}× af, ${g.bij}× bij)`); }
    if (n >= 3 && g.rond / n >= 0.6) { score += 1; redenen.push("vooral ronde bedragen"); }
    if (g.spaarwoord > 0 && g.spaarwoord / n >= 0.3) { score += 2; redenen.push("omschrijving noemt sparen of eigen rekening"); }
    const bank = bankVan(g.iban);
    if (/^\d{6,10}$/.test(g.iban)) { score += 1; redenen.push("kort rekeningnummer, zoals bij een spaar- of subrekening"); }
    else if (bank && eigenBanken.has(bank) && score > 0) { score += 1; redenen.push(`zelfde bank als een eigen rekening (${bank})`); }
    // Heen-en-weer en ronde bedragen alleen zijn niet genoeg (een incasso met storno, Tikkie, een loterij): er moet een sterk
    // signaal bij zijn — eigen naam, bedrijfsnaam, spaarwoord — of een kort (sub)rekeningnummer mét heen-en-weer en ronde bedragen.
    const sterk = persoon || (eigenNamen?.bedrijf && lijktOpBedrijf(alleNamen, eigenNamen.bedrijf)) || (g.spaarwoord > 0 && g.spaarwoord / n >= 0.3)
      || (/^\d{6,10}$/.test(g.iban) && g.af >= 2 && g.bij >= 2 && n >= 3 && g.rond / n >= 0.6);
    if (!sterk || score < DREMPEL || n < 2) continue;
    uit.push({
      iban: g.iban, naam, aantal: n, af: g.af, bij: g.bij,
      totaalAf: Math.round(g.totaalAf * 100) / 100, totaalBij: Math.round(g.totaalBij * 100) / 100,
      rekening: g.rekeningen.has("Zakelijk") ? "Zakelijk" : "Prive", score, redenen,
      spaar: g.spaarwoord > 0 || /^\d{6,10}$/.test(g.iban),
    });
  }
  return uit.sort((a, b) => b.score - a.score || b.aantal - a.aantal);
}
