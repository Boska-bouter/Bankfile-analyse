import { fiscalTreatmentOf } from "../classification/categories.js";
import { factuurjaarRegel } from "../classification/factuurjaar.js";
import { computeQuarterlyBtwForYear, computeBtw } from "../tax/btw.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";
import {
  estimateIncomeTax, estimateZvw, estimateHeffingskortingen, computeMogelijkeKia,
  getIbParams, computeOndernemersaftrekMetReserve, estimateIncomeTaxMetOndernemersaftrek,
  estimateZvwMetOndernemersaftrek, estimateHeffingskortingenMetOndernemersaftrek, startersaftrekBedrag,
  resolveZelfstandigenaftrekStatusForYear, computeBelastbareWinstUitsplitsing,
} from "../tax/incomeTax.js";
import { computeIbBoxMapping, zakItemsVoorIb } from "../tax/boxMapping.js";
import { werkruimteRegelHtml } from "./werkruimteBlok.js";
import { computeChecklistLikeDataForYear } from "../tax/checklist.js";
import { classifyContinuityGap } from "../importers/transactions.js";
import { computeActivaSummary, computeActivaAfschrijvingForYear, computeInvesteringenForYear } from "../tax/activa.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, isCompleteFinancialLeaseDetails } from "../tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar, computeLeaseInvesteringenForYear, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN } from "../tax/autoBijtelling.js";
import { computeAutoActivaKostenVoorJaar, combineAutoKosten, metBtwPrivegebruik } from "../tax/autoActiva.js";
import { computeBtwPrivegebruikAuto } from "../tax/btwPrivegebruikAuto.js";
import { computeKmVergoedingVoorJaar } from "../tax/kmVergoeding.js";
import { computeGedeeldeHuurVoorJaar, computeGedeeldeEnergieVoorJaar, computeGedeeldeGemeentelijkeKostenVoorJaar } from "../tax/gedeeldeHuur.js";
import { eur } from "../utils/amounts.js";
import { normalizeIban } from "../utils/normalization.js";
import { downloadRapport } from "./download.js";
import { balansPostenVoorJaar } from "./balansPosten.js";

// De statustekst is een functie van het aantal openstaande punten (niet een vaste tekst per kleur)
// — "groen" betekent hier altijd alléén dat de gegevenscontrole voldoende compleet is, NIET dat de
// aangifte fiscaal correct is (zie ook de vaste toelichting die overal waar deze tekst verschijnt
// naast staat).
const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
// V19 — verzamelt per jaarsectie het totaal voor de meerjaren-slotregel (zie buildAangiftevoorstelHtml).
let JAAR_TOTALEN = [];
// nieuw-V7R9 — de jaartotalen van het laatst gemaakte rapport (winst, IB ná heffingskorting, Zvw, btw-saldo), voor de fiscale regressietest.
export function laatsteJaarTotalen() { return JAAR_TOTALEN.map((j) => ({ ...j })); }

// nieuw-V8R4 — banksaldo van de zakelijke rekening(en) op 1-1 en 31-12 uit "saldo na mutatie" (per bestand in
// bestandsvolgorde, nieuwste-eerst herkend zoals checkBalanceConsistency). null als een bestand geen saldo heeft.
// nieuw-V9R0 — wens Boska 19-11 (Knab-CSV zonder saldo): heeft een rekening geen saldo, dan telt het banksaldo op 1-1
// dat de gebruiker één keer invult (beginsaldo[rekening] = { jaar, bedrag }) plus alle boekingen sindsdien.
export const rekeningSleutel = (t) => normalizeIban(t.ownAccount || "") || t.source;
function zakelijkPerRekening(classified, accountTypeByFile) {
  const perRek = new Map();
  for (const t of classified || []) {
    const soort = accountTypeByFile?.[t.source] || t.type;
    if (t.isMirror || soort !== "Zakelijk") continue;
    const k = rekeningSleutel(t);
    if (!perRek.has(k)) perRek.set(k, []);
    perRek.get(k).push(t);
  }
  return perRek;
}
const jrVan = (t) => new Date(t.date).getFullYear();
// Zakelijke rekeningen waarvan het bankbestand geen saldo heeft: [{ key, label, eersteJaar }].
export function rekeningenZonderSaldo(classified, accountTypeByFile = null) {
  const uit = [];
  for (const [key, lijst] of zakelijkPerRekening(classified, accountTypeByFile)) {
    if (!lijst.some((t) => t.balance == null)) continue;
    const eersteJaar = Math.min(...lijst.map(jrVan).filter((j) => Number.isFinite(j)));
    uit.push({ key, label: key, eersteJaar });
  }
  return uit;
}
export function banksaldiVoorJaar(classified, year, accountTypeByFile = null, beginsaldo = null) {
  let begin = 0, eind = 0, gevonden = false;
  for (const [key, rek] of zakelijkPerRekening(classified, accountTypeByFile)) {
    if (rek.some((t) => t.balance == null)) {
      const bs = beginsaldo?.[key];
      if (!bs || !Number.isFinite(Number(bs.bedrag)) || !Number.isFinite(Number(bs.jaar))) return null;
      if (year < bs.jaar) return null;
      const som = (f) => rek.filter(f).reduce((a, t) => a + (t.amount || 0), 0);
      const b = Number(bs.bedrag) + som((t) => jrVan(t) >= bs.jaar && jrVan(t) < year);
      begin += b; eind += b + som((t) => jrVan(t) === year);
      gevonden = true;
      continue;
    }
    const perBron = new Map();
    for (const t of rek) { if (!perBron.has(t.source)) perBron.set(t.source, []); perBron.get(t.source).push(t); }
    for (const lijst of perBron.values()) {
      const opId = [...lijst].sort((a, b) => a.id - b.id);
      const chrono = opId.length > 1 && opId[0].date > opId[opId.length - 1].date ? opId.reverse() : opId;
      // nieuw-V8R7 — op kalenderjaar van de boekingsdatum (niet het toegerekende jaar): het banksaldo op 31-12 is wat de bank dan liet zien.
      const voor = chrono.filter((t) => jrVan(t) < year), dit = chrono.filter((t) => jrVan(t) === year);
      if (!dit.length && !voor.length) continue;
      if (dit.length) { begin += dit[0].balance - dit[0].amount; eind += dit[dit.length - 1].balance; }
      else { const l = voor[voor.length - 1]; if (chrono.some((t) => jrVan(t) > year)) { begin += l.balance; eind += l.balance; } else continue; }
      gevonden = true;
    }
  }
  return gevonden ? { begin: Math.round(begin * 100) / 100, eind: Math.round(eind * 100) / 100 } : null;
}

function statusTekst(status, aantalPunten) {
  if (status === "rood") return "Nog onvoldoende gegevens voor een betrouwbare reconstructie";
  if (status === "oranje") return `Berekening beschikbaar — ${aantalPunten} punt${aantalPunten === 1 ? "" : "en"} controleren`;
  return "Berekening kan worden opgesteld";
}
// v262 — de statuskaart (zie samenvattingHtml) kleurt mee met de status: amber bij oranje/rood
// (er is iets om te bekijken) en een rustige, neutrale kaart bij groen (niets bijzonders te melden
// hoeft niet dezelfde "let op"-kleur te krijgen als een dossier met echte openstaande punten).
const STATUS_KAART_CLASS = { groen: "status-kaart-groen", oranje: "status-kaart-oranje", rood: "status-kaart-rood" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Eén rij in de winst-en-verliesrekening-stijl weergave — optioneel met toelichting en een
// uitsplitsing naar categorie eronder (zodat het bedrag terug te vinden is in de app zelf).
function rubriekBlok(nr, naam, totaal, toelichting, perCategorie) {
  if (!totaal) return "";
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}
  ${categorieDetailHtml(perCategorie)}`;
}

// Zelfde als rubriekBlok, maar toont de rij ALTIJD (ook bij € 0,00) — voor rubrieken die expliciet
// als € 0,00 zichtbaar moeten blijven in plaats van stilzwijgend te verdwijnen (bijv. de nieuwe
// "Afschrijving auto's"/"Afschrijving machines" en de 3-voudige inkoopkosten-uitsplitsing).
function rubriekBlokAltijd(nr, naam, totaal, toelichting, perCategorie) {
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal || 0)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}
  ${categorieDetailHtml(perCategorie)}`;
}

// Uitsplitsing per categorie onder een rubriek — zodat een bedrag in dit document direct terug te
// vinden is bij de gelijknamige categorie in de app zelf (zie ook het categorieoverzicht onderaan).
// A1 — elke categorieregel klapt open ("bron") naar de transacties erachter. Alleen op het scherm:
// in de print blijft alleen de gewone regel staan (de onderbouwing voor op papier is A2).
let BRON_CTX = null; // { classified, year } — gezet door buildYearSection
const MAX_BRON_RIJEN = 100;
function bronTabelHtml(categorie) {
  if (!BRON_CTX) return "";
  const cats = Array.isArray(categorie) ? categorie : [categorie];
  const rijen = BRON_CTX.classified
    .filter((t) => !t.isMirror && t.year === BRON_CTX.year && cats.includes(t.category))
    .sort((a, b) => a.date - b.date);
  if (rijen.length === 0) return "";
  const totaal = rijen.reduce((a, t) => a + (t.amount || 0), 0);
  return `<div class="bron-inhoud"><table>
    <tr><th>Datum</th><th>Tegenpartij</th><th>Omschrijving</th><th class="num">Bedrag (bank)</th></tr>
    ${rijen.slice(0, MAX_BRON_RIJEN).map((t) => `<tr><td>${fmtDatum(t.date)}</td><td>${esc(t.counterparty)}</td><td>${esc(String(t.description || "").slice(0, 70))}</td><td class="num">${eur(t.amount)}</td></tr>`).join("")}
    ${rijen.length > MAX_BRON_RIJEN ? `<tr><td colspan="4"><em>… en ${rijen.length - MAX_BRON_RIJEN} meer — zie de app (Categorieën) voor de volledige lijst.</em></td></tr>` : ""}
    <tr class="total"><td colspan="3">${rijen.length} transactie${rijen.length === 1 ? "" : "s"}</td><td class="num">${eur(totaal)}</td></tr>
  </table><p class="toelichting">Bedragen zoals op het afschrift (incl. BTW). In dit voorstel staan ze netto (excl. BTW) en, waar van toepassing, na het zakelijke percentage.</p></div>`;
}
function categorieDetailHtml(perCategorie) {
  if (!perCategorie || perCategorie.length === 0) return "";
  return perCategorie.map((r) => {
    const bron = bronTabelHtml(r.bronCats || r.categorie);
    return bron
      ? `<details class="bron"><summary class="categorie-detail"><span>${esc(r.categorie)} <span class="bron-knop" title="Waar komt dit bedrag vandaan?">ⓘ bron</span></span><span class="num">${eur(r.totaal)}</span></summary>${bron}</details>`
      : `<div class="categorie-detail"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`;
  }).join("");
}

// nieuw-V8R7 — Boska 18-11: de onderdelen van de privéonttrekkingen/-stortingen openklappen naar de boekingen erachter.
function boekingenLijstHtml(txs, noot) {
  const rijen = [...txs].sort((a, b) => a.date - b.date);
  const totaal = rijen.reduce((a, t) => a + (t.amount || 0), 0);
  const perCat = {};
  for (const t of rijen) { const c = perCat[t.category] || (perCat[t.category] = { n: 0, som: 0 }); c.n++; c.som += t.amount || 0; }
  const catRijen = Object.entries(perCat).sort((a, b) => a[1].som - b[1].som);
  return `<div class="bron-inhoud"><table>
    <tr><th>Per categorie</th><th class="num">Boekingen</th><th class="num">Bedrag (bank)</th></tr>
    ${catRijen.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="num">${v.n}</td><td class="num">${eur(v.som)}</td></tr>`).join("")}
  </table><table>
    <tr><th>Datum</th><th>Tegenpartij</th><th>Categorie</th><th>Omschrijving</th><th class="num">Bedrag (bank)</th></tr>
    ${rijen.slice(0, MAX_BRON_RIJEN).map((t) => `<tr><td>${fmtDatum(t.date)}</td><td>${esc(t.counterparty)}</td><td>${esc(t.category)}</td><td>${esc(String(t.description || "").slice(0, 60))}</td><td class="num">${eur(t.amount)}</td></tr>`).join("")}
    ${rijen.length > MAX_BRON_RIJEN ? `<tr><td colspan="5"><em>… en ${rijen.length - MAX_BRON_RIJEN} meer — zie de app (Categorieën) voor de volledige lijst.</em></td></tr>` : ""}
    <tr class="total"><td colspan="4">${rijen.length} boeking${rijen.length === 1 ? "" : "en"}</td><td class="num">${eur(totaal)}</td></tr>
  </table><p class="toelichting">${noot || "Bedragen zoals op het afschrift."}</p></div>`;
}
const fmtDatum = (d) => (d ? new Date(d).toLocaleDateString("nl-NL") : "onbekend");

// "Algemene gegevens" — welke bestanden, welke periode en hoeveel transacties aan dit jaar ten
// grondslag liggen, en of er bekende gaten in de bestandscontinuïteit zijn rond dit jaar. Puur
// samengesteld uit data die de app al had (importdiagnostiek/bestandscontinuïteit) — geen nieuwe
// administratie, alleen zichtbaar gemaakt.
function buildAlgemeneGegevensHtml(year, importDiagnostics, accountTypeByFile, classified, gatenDitJaar, geelGatenDitJaar) {
  if (!importDiagnostics || importDiagnostics.length === 0) return "";
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const relevanteBestanden = importDiagnostics.filter((d) => d.from && d.to && d.from <= yearEnd && d.to >= yearStart);

  const bestandRows = relevanteBestanden
    .map((d) => {
      const type = accountTypeByFile?.[d.fileName] || "onbekend";
      return `<tr><td>${esc(d.fileName)}</td><td>${esc(type)}</td><td>${fmtDatum(d.from)} — ${fmtDatum(d.to)}</td><td class="num">${d.importedCount}</td></tr>`;
    })
    .join("");

  const zakTxDitJaar = classified.filter((tx) => (tx.viewType || tx.type) === "Zakelijk" && !tx.isMirror && tx.year === year).length;

  const gatenHtml = gatenDitJaar.length > 0
    ? `<p class="toelichting" style="color:#b45309;">⚠ Mogelijk ontbreekt een periode: tussen ${esc(gatenDitJaar[0].fileA)} (t/m ${fmtDatum(gatenDitJaar[0].aTo)}) en ${esc(gatenDitJaar[0].fileB)} (vanaf ${fmtDatum(gatenDitJaar[0].bFrom)}) sluit het saldo niet aan (verschil ${eur(gatenDitJaar[0].diff)}, groter dan €1000) — de moeite waard om na te gaan of daar nog een bestand bij hoort.</p>`
    : "";
  // v260 — €500–€999 is nog geen "gat" (dat blijft ≥€1000), maar wel meer dan de gebruikelijke
  // afronding — een lichtere, informatieve opmerking i.p.v. de rode waarschuwing hierboven.
  const geelGatenHtml = gatenDitJaar.length === 0 && geelGatenDitJaar.length > 0
    ? `<p class="toelichting">Let op: tussen ${esc(geelGatenDitJaar[0].fileA)} (t/m ${fmtDatum(geelGatenDitJaar[0].aTo)}) en ${esc(geelGatenDitJaar[0].fileB)} (vanaf ${fmtDatum(geelGatenDitJaar[0].bFrom)}) sluit het saldo niet helemaal aan (verschil ${eur(geelGatenDitJaar[0].diff)}) — nog geen echt gat, maar wel de moeite waard om even te bekijken.</p>`
    : "";

  return `
  <h2>Algemene gegevens</h2>
  <table>
    <thead><tr><th>Bankbestand</th><th>Type</th><th>Periode gedekt</th><th class="num">Transacties</th></tr></thead>
    <tbody>${bestandRows}</tbody>
  </table>
  <p class="toelichting">Aantal zakelijke transacties in ${year}: ${zakTxDitJaar}.</p>
  ${gatenHtml}${geelGatenHtml}`;
}

// Alleen de winst voor een jaar — gebruikt in een pre-pass over alle te rapporteren jaren om de
// verrekening van niet-gerealiseerde zelfstandigenaftrek (die de jaren chronologisch aan elkaar
// koppelt) te kunnen berekenen vóórdat de eigenlijke jaarsecties worden opgebouwd.
function computeWinstVoorJaar(year, classified, categoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaDetails, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus) {
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  const leaseAutoKostenForYear = metBtwPrivegebruik(combineAutoKosten(
    computeLeaseAutoKostenVoorJaar(leaseSummary || [], leaseDetails || {}, year, classified, categoryBtwRates, btwVerlegd),
    computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, year, classified, categoryBtwRates, btwVerlegd),
    autoStatus, year
  ), computeBtwPrivegebruikAuto(year, { leaseSummary: leaseSummary || [], leaseDetails: leaseDetails || {}, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm: "zzp" }));
  const gedeeldeHuurForYear = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  // v291 — zelfde correctie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
  const gedeeldeEnergieForYear = computeGedeeldeEnergieVoorJaar(classified, year, energieZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const gedeeldeGemeentelijkeKostenForYear = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, year, gemeentelijkeKostenZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const kmVergoedingForYear = computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year);
  // "Zakelijk - apparatuur/machines" telt niet als volledige kosten mee (zie yearlySummary.js) — in
  // plaats daarvan telt hier de daadwerkelijk berekende afschrijving mee, exact dezelfde constructie
  // als de financiële-lease-afschrijving hierboven.
  const activaSummary = computeActivaSummary(classified, activaDetails);
  const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummary, activaDetails || {}, year);
  const winstCorrectie =
    (leaseAutoKostenForYear?.winstCorrectie || 0) - (gedeeldeHuurForYear?.nietAftrekbaarBedrag || 0) -
    (gedeeldeEnergieForYear?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKostenForYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  return computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, winstCorrectie, categoryZakelijkPercentage, autoStatus).winst;
}

// Bij "onbekend" urencriterium moeten beide scenario's (mét/zonder zelfstandigenaftrek) volledig
// los van elkaar worden doorgerekend, inclusief hun eigen heffingskortingen — niet één gedeelde
// heffingskortingen-figuur die stilzwijgend van één scenario uitgaat. Startersaftrek is alleen
// relevant in het
// "mét zelfstandigenaftrek"-scenario: het is een aanvulling óp de zelfstandigenaftrek, niet een los
// toe te passen aftrekpost (zie ook de toelichting bij STARTERSAFTREK_BEDRAG in tax/incomeTax.js).
function buildOnbekendScenario(winst, year, metZelfstandigenaftrek, startersaftrekToegepast) {
  const basisBedrag = getIbParams(year).zelfstandigenaftrek;
  const staToegepast = metZelfstandigenaftrek && startersaftrekToegepast;
  const ondernemersaftrekBedrag = metZelfstandigenaftrek ? basisBedrag + (staToegepast ? startersaftrekBedrag(year) : 0) : 0;
  return {
    startersaftrekToegepast: staToegepast,
    ondernemersaftrekBedrag,
    winstUitsplitsing: computeBelastbareWinstUitsplitsing(winst, year, ondernemersaftrekBedrag, staToegepast),
    ib: estimateIncomeTaxMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staToegepast),
    zvw: estimateZvwMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staToegepast),
    heffingskortingen: estimateHeffingskortingenMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staToegepast),
  };
}

function buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, ondernemersaftrekVoorJaar, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, werkruimteStatus = null, balans = "zonder", beginsaldo = null) {
  // Route B: gebaseerd op de categorie (fiscalTreatmentOf), niet op tx.type — een privé-uitgave
  // betaald vanaf de zakelijke rekening hoort hier niet in, en een zakelijke uitgave betaald
  // vanaf de privérekening juist wél.
  const zakItems = zakItemsVoorIb(classified, year, categoryZakelijkPercentage, autoStatus);
  BRON_CTX = { classified, year };
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  const leaseAutoKostenForYear = metBtwPrivegebruik(combineAutoKosten(
    computeLeaseAutoKostenVoorJaar(leaseSummary || [], leaseDetails || {}, year, classified, categoryBtwRates, btwVerlegd),
    computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, year, classified, categoryBtwRates, btwVerlegd),
    autoStatus, year
  ), computeBtwPrivegebruikAuto(year, { leaseSummary: leaseSummary || [], leaseDetails: leaseDetails || {}, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm: "zzp" }));
  const gedeeldeHuurForYear = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  // v291 — zelfde correctie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
  const gedeeldeEnergieForYear = computeGedeeldeEnergieVoorJaar(classified, year, energieZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const gedeeldeGemeentelijkeKostenForYear = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, year, gemeentelijkeKostenZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const kmVergoedingForYear = computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year);
  // activaSummary/activaAfschrijvingForYear moeten vóór de winstCorrectie berekend worden: "Zakelijk
  // - apparatuur/machines" telt niet als volledige kosten mee in yearlySummary.js, dus de
  // daadwerkelijk berekende afschrijving moet hier alsnog worden meegeteld, exact dezelfde
  // constructie als de financiële-lease-afschrijving hierboven.
  const activaSummary = computeActivaSummary(classified, activaDetails);
  const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummary, activaDetails || {}, year);
  const winstCorrectie =
    (leaseAutoKostenForYear?.winstCorrectie || 0) - (gedeeldeHuurForYear?.nietAftrekbaarBedrag || 0) -
    (gedeeldeEnergieForYear?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKostenForYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, winstCorrectie, categoryZakelijkPercentage, autoStatus);
  // Zelfstandigenaftrek: "nee" berekent zonder, "onbekend" toont zo dadelijk beide scenario's. Een
  // onbeantwoord jaar (zaStatusRaw null) valt terug op resolveZelfstandigenaftrekStatusForYear —
  // "ja" voor een dossier dat al bestond vóór deze regel werd ingevoerd (zaLegacyJaDefault, zodat
  // eerder opgeslagen dossieren dezelfde cijfers blijven tonen), "onbekend" (beide scenario's) voor
  // een nieuw dossier.
  const zaStatusRaw = zelfstandigenaftrekStatus?.[year];
  const zaStatus = resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, year, zaLegacyJaDefault);
  const zelfstandigenaftrekToegepast = zaStatus !== "nee";
  const startersaftrekToegepast = startersaftrekStatus?.[year] === "ja";
  const zaScenarios = zaStatus === "onbekend" ? {
    metZelfstandigenaftrek: buildOnbekendScenario(summary.winst, year, true, startersaftrekToegepast),
    zonderZelfstandigenaftrek: buildOnbekendScenario(summary.winst, year, false, startersaftrekToegepast),
  } : null;
  // ondernemersaftrekVoorJaar komt uit de pre-pass (computeOndernemersaftrekMetReserve) en houdt
  // rekening met verrekening van niet-gerealiseerde zelfstandigenaftrek uit eerdere jaren in dit
  // rapport, en met startersaftrek. Voor "onbekend"-jaren wordt dit bewust niet gebruikt (zie
  // hieronder bij zaScenarios) — die jaren doen niet mee in de reserveketen.
  const ondernemersaftrekBedrag = ondernemersaftrekVoorJaar
    ? ondernemersaftrekVoorJaar.zelfstandigenaftrekBedrag + ondernemersaftrekVoorJaar.startersaftrekBedrag
    : (zelfstandigenaftrekToegepast ? getIbParams(year).zelfstandigenaftrek : 0);
  const ibEstimate = ondernemersaftrekVoorJaar
    ? estimateIncomeTaxMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateIncomeTax(summary.winst, year, zelfstandigenaftrekToegepast);
  const zvwEstimate = ondernemersaftrekVoorJaar
    ? estimateZvwMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateZvw(summary.winst, year, zelfstandigenaftrekToegepast);
  const heffingskortingen = ondernemersaftrekVoorJaar
    ? estimateHeffingskortingenMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateHeffingskortingen(summary.winst, year, zelfstandigenaftrekToegepast);
  // Uitsplitsing winst → ondernemersaftrek → MKB-winstvrijstelling → belastbare winst voor het
  // compacte dashboard bovenaan (samenvattingHtml hieronder). staatNegatiefToe volgt exact
  // dezelfde regel als hierboven bij ibEstimate: alleen relevant (en dus "aan") in het
  // ondernemersaftrekVoorJaar-pad, mét startersaftrek — anders altijd "uit" (nooit onder € 0).
  const winstUitsplitsing = computeBelastbareWinstUitsplitsing(summary.winst, year, ondernemersaftrekBedrag, ondernemersaftrekVoorJaar ? startersaftrekToegepast : false);
  // KIA-grondslag: activaregister + financiële-lease-objecten (auto/machine) samen — zie
  // computeLeaseInvesteringenForYear in tax/autoBijtelling.js voor waarom een geleasede personenauto
  // daar bewust NIET in meetelt (KIA geldt daar fiscaal niet voor), en een bestelauto/machine wel.
  const activaInvesteringenForYear = computeInvesteringenForYear(activaSummary, activaDetails || {}, year);
  const leaseInvesteringenForYear = computeLeaseInvesteringenForYear(leaseSummary, leaseDetails, year);
  const investeringenForYear = {
    totaalInvestering: activaInvesteringenForYear.totaalInvestering + leaseInvesteringenForYear.totaalInvestering,
    onvolledig: activaInvesteringenForYear.onvolledig + leaseInvesteringenForYear.onvolledig,
  };
  const mogelijkeKia = investeringenForYear.totaalInvestering > 0 ? computeMogelijkeKia(investeringenForYear.totaalInvestering, year) : 0;
  // De "mogelijke KIA" hierboven is alleen getoond, niet verwerkt in de IB-schatting hierboven: KIA
  // is een aftrekpost op de winst zelf (vóór zelfstandigenaftrek/mkb-winstvrijstelling), dus wordt
  // hier een VOLLEDIG los, tweede scenario
  // doorgerekend op (winst − mogelijke KIA) — de bestaande ibEstimate/zvwEstimate/heffingskortingen
  // hierboven (op de winst ZONDER KIA) blijven het hoofdcijfer, ongewijzigd: niet elk bedrijfsmiddel
  // kwalificeert voor KIA (personenauto's, grond, een drempel per bedrijfsmiddel — deze app kent dat
  // onderscheid niet uit bankgegevens), dus "ná KIA" is expliciet een scenario, geen vaststaand
  // bedrag. Bij mogelijkeKia === 0 zijn beide scenario's vanzelf aan elkaar gelijk.
  const winstNaKia = summary.winst - mogelijkeKia;
  const ibEstimateNaKia = ondernemersaftrekVoorJaar
    ? estimateIncomeTaxMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateIncomeTax(winstNaKia, year, zelfstandigenaftrekToegepast);
  const zvwEstimateNaKia = ondernemersaftrekVoorJaar
    ? estimateZvwMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateZvw(winstNaKia, year, zelfstandigenaftrekToegepast);
  const heffingskortingenNaKia = ondernemersaftrekVoorJaar
    ? estimateHeffingskortingenMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateHeffingskortingen(winstNaKia, year, zelfstandigenaftrekToegepast);
  const zaScenariosNaKia = zaScenarios ? {
    metZelfstandigenaftrek: buildOnbekendScenario(winstNaKia, year, true, startersaftrekToegepast),
    zonderZelfstandigenaftrek: buildOnbekendScenario(winstNaKia, year, false, startersaftrekToegepast),
  } : null;
  const ib = computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear, activaAfschrijvingForYear, categoryBtwRates, btwVerlegd, leaseAutoKostenForYear, year, categoryZakelijkPercentage, autoStatus, kmVergoedingForYear, { huur: huurZakelijkPercentageStatus, energie: energieZakelijkPercentageStatus, gemeentelijk: gemeentelijkeKostenZakelijkPercentageStatus });

  // "Inkoopkosten, uitbesteed werk en andere externe kosten" hier uitgesplitst in 3 losse regels,
  // rechtstreeks uit dezelfde al berekende ib.inkoopkosten.perCategorie
  // (netto, exclusief BTW, zelfde sumCatNetto-conventie als de rest van boxMapping.js) — geen nieuwe
  // berekening, puur een andere weergave van precies dezelfde bedragen. "Andere externe kosten" heeft
  // in deze app (nog) geen categorie gekoppeld en is daardoor altijd € 0,00.
  const INKOOP = ["Zakelijke inkoop non-voedingsmiddelen", "Zakelijke inkoop voedingsmiddelen"]; // nieuw-V3R7
  const inkoopkostenBedrag = ib.inkoopkosten.perCategorie.filter((r) => INKOOP.includes(r.categorie)).reduce((t, r) => t + (r.totaal || 0), 0);
  const uitbesteedWerkBedrag = ib.inkoopkosten.perCategorie.find((r) => r.categorie === "Inhuur personeel")?.totaal || 0;
  const andereExterneKostenBedrag = 0;

  // "Afschrijvingen" (Activa-register + financiële-lease-afschrijving) hier uitgesplitst naar
  // "Afschrijving auto's" en "Afschrijving machines", op basis van het `soort`-veld dat elk
  // leasecontract in ib.leaseAutoKosten.contracten al heeft (zie computeLeaseAutoKostenVoorJaar in
  // tax/autoBijtelling.js) — het Activa-register zelf bevat per definitie geen auto's (dat is
  // uitsluitend "apparatuur/machines"), dus die afschrijving telt volledig mee bij "machines".
  const leaseAfschrijvingAuto = ib.leaseAutoKosten
    ? ib.leaseAutoKosten.contracten.filter((c) => c.soort === "auto").reduce((a, c) => a + c.afschrijving, 0)
    : 0;
  const leaseAfschrijvingMachine = ib.leaseAutoKosten
    ? ib.leaseAutoKosten.contracten.filter((c) => c.soort === "machine").reduce((a, c) => a + c.afschrijving, 0)
    : 0;
  const apparatuurAfschrijving = ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0;

  // Gaten in de bestandscontinuïteit die dit jaar raken — eenmalig bepaald, gebruikt voor zowel de
  // status bovenaan als de "Algemene gegevens"-bijlage verderop. v260 — twee niveaus: gatenDitJaar
  // is de rode grens (≥€1000, telt als een echt gat); geelGatenDitJaar (€500–€999) is een lichtere
  // opmerking die de status wel op zijn minst "oranje" houdt, maar geen "openstaand punt" is.
  const gatenDitJaar = (fileContinuity || []).filter(
    (g) => !g.ok && classifyContinuityGap(g.diff) === "rood" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year)
  );
  const geelGatenDitJaar = (fileContinuity || []).filter(
    (g) => !g.ok && classifyContinuityGap(g.diff) === "geel" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year)
  );
  const algemeneGegevensHtml = buildAlgemeneGegevensHtml(year, importDiagnostics, accountTypeByFile, classified, gatenDitJaar, geelGatenDitJaar);

  const kwartalen = korRegeling ? [] : computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, false, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(year, { leaseSummary: leaseSummary || [], leaseDetails: leaseDetails || {}, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm: "zzp" }));
  // Alle vier kwartalen tonen, ook als er in een kwartaal niets te betalen of terug te vragen is (dan € 0,00).
  const kwartalenVol = kwartalen.length ? [1, 2, 3, 4].map((n) => kwartalen.find((q) => q.kwartaal === n) || { kwartaal: n, verschuldigdBtw21: 0, verschuldigdBtw9: 0, voorbelasting: 0 }) : [];

  // Dossierstatus + openstaande punten — hergebruikt dezelfde signalen als de live Aangifte-
  // checklist in de app zelf (computeChecklistLikeDataForYear), zodat het rapport nooit iets
  // anders beweert dan wat je in de app ook al ziet. IB-status (het "afgevinkt"-vinkje) telt
  // bewust niet mee — dat is een persoonlijke herinnering, geen signaal over de betrouwbaarheid
  // van deze reconstructie.
  const zakItemsChecklist = classified.filter((tx) => (tx.viewType || tx.type) === "Zakelijk" && tx.year === year);
  const priItemsChecklist = classified.filter((tx) => (tx.viewType || tx.type) === "Prive" && tx.year === year);
  const priveRekeningGeladen = Object.values(accountTypeByFile || {}).includes("Prive");
  const yc = computeChecklistLikeDataForYear(zakItemsChecklist, priItemsChecklist, kwartalen, kwartaalStatus || {}, priveRekeningGeladen);
  // nieuw-V4R8 — wat in de app al is afgehandeld ("Klopt zo" in Overig/personen, kleine bedragen; tx.afgehandeld, gezet in
  // useRapporten) is geen open punt meer, net als in Controleren (melding Boska 13-11: app "geen open punten", rapport wel).
  const overigOpen = [...zakItemsChecklist, ...priItemsChecklist].filter((tx) => !tx.isMirror && tx.category === "Overig" && !tx.afgehandeld).length;
  const onzekerDitJaar = [...zakItemsChecklist, ...priItemsChecklist].filter(
    (tx) => !tx.isMirror && !tx.afgehandeld && tx.confidence?.level !== "override" && tx.confidence?.level !== "keyword" && tx.confidence?.level !== "heuristic"
  ).length;
  const yearStatus =
    gatenDitJaar.length > 0
      ? "rood"
      : overigOpen === 0 && onzekerDitJaar === 0 && geelGatenDitJaar.length === 0
      ? "groen"
      : "oranje";

  // "Aannames/onzekerheden" bundelt ook de persoonlijke-aannames-signalen
  // (urencriterium/KIA/kilometervergoeding), als korte fragmenten, niet als volledige zinnen (de
  // uitleg zelf staat één keer in de Bijlage: Toelichtingen, hier alleen het signaal).
  const openPunten = [];
  if (zaStatusRaw == null) openPunten.push(`Urencriterium: niet aangegeven<!--V--> (zie Bijlage)<!--/V-->`);
  if (mogelijkeKia > 0) openPunten.push(`KIA: mogelijk, nog te bevestigen`);
  if (overigOpen > 0) openPunten.push(`${overigOpen} transactie${overigOpen === 1 ? "" : "s"} nog in "Overig"`);
  if (gatenDitJaar.length > 0) openPunten.push(`Saldo tussen ${esc(gatenDitJaar[0].fileA)} en ${esc(gatenDitJaar[0].fileB)} sluit niet aan`);
  else if (geelGatenDitJaar.length > 0) openPunten.push(`Saldo tussen ${esc(geelGatenDitJaar[0].fileA)} en ${esc(geelGatenDitJaar[0].fileB)} sluit niet helemaal aan (verschil ${eur(geelGatenDitJaar[0].diff)}, nog geen echt gat)`);
  if (onzekerDitJaar > 0) openPunten.push(`${onzekerDitJaar} transactie${onzekerDitJaar === 1 ? "" : "s"} nog onzeker geclassificeerd`);
  if (yc.priveTransferMissingMirrors.length > 0) openPunten.push(`${yc.priveTransferMissingMirrors.length} privé-overboeking(en) zonder spiegelboeking`);
  if (yc.loonheffingBoetes.length > 0) openPunten.push(`${yc.loonheffingBoetes.length} boete(s) bij loonheffing (niet aftrekbaar)`);
  // v205: vroegtijdige beëindiging (verkoop/veiling) van een leaseauto/-machine dit jaar — zie de
  // toelichting bij winstCorrectie/computeLeaseAutoKostenVoorJaar<!--V--> en de Bijlage<!--/V-->.
  const beeindigdeLeaseContracten = (leaseAutoKostenForYear?.contracten || []).filter((c) => c.beeindigingsresultaat);
  for (const c of beeindigdeLeaseContracten) {
    const b = c.beeindigingsresultaat;
    if (b.boekresultaat != null) {
      openPunten.push(
        `${esc(c.leaseName)}: leaseobject verkocht/geveild voor ${eur(b.opbrengst)} — boekwaarde ${eur(b.boekwaardeBijBeeindiging)}, dus boekresultaat ${b.boekresultaat >= 0 ? "+" : "−"}${eur(Math.abs(b.boekresultaat))} (${b.boekresultaat >= 0 ? "plus = winst" : "min = aftrekpost"}, al verwerkt in de winst hierboven).<!--V--> Zie Bijlage.<!--/V-->`
      );
    } else {
      openPunten.push(`${esc(c.leaseName)}: leaseobject verkocht/geveild voor ${eur(b.opbrengst)} — boekwinst/-verlies niet te bepalen (vul "Soort" in bij dit leasecontract).<!--V--> Zie Bijlage.<!--/V-->`);
    }
    if (b.restschuldOfOverwaarde != null) {
      openPunten.push(
        b.restschuldOfOverwaarde >= 0
          ? `${esc(c.leaseName)}: naar schatting nog ${eur(b.restschuldOfOverwaarde)} restschuld bij de leasemaatschappij (geen winst-/verliespost<!--V-->, zie Bijlage)<!--/V-->`
          : `${esc(c.leaseName)}: naar schatting ${eur(Math.abs(b.restschuldOfOverwaarde))} overwaarde die de leasemaatschappij nog moet terugbetalen (geen winst-/verliespost<!--V-->, zie Bijlage)<!--/V-->`
      );
    }
  }

  // Totaal zakelijke kosten (rubrieken 2 t/m 5) — voor de samenvatting, geen nieuwe berekening,
  // gewoon dezelfde bedragen als in de W&V hieronder bij elkaar opgeteld, inclusief de 5
  // gecategoriseerde autokosten (ib.autokostenOverig) — die hebben een eigen veld (zie boxMapping.js)
  // omdat ze in de "Auto's en machines"-rubriek getoond worden, niet bij "overigeBedrijfskosten".
  const kostenTotaal =
    (ib.inkoopkosten.totaal || 0) +
    (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) +
    (ib.afschrijvingen.berekendeLeaseAfschrijving || 0) +
    (ib.autokostenOverig.totaal || 0) +
    ib.overigeBedrijfskosten.reduce((a, r) => a + (r.totaal || 0), 0) +
    ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0) +
    renteAftrekbaar +
    (ib.leaseAutoKosten?.btwPrivegebruikKosten || 0) -
    (ib.leaseAutoKosten?.onttrekking || 0);

  // Omzet excl. BTW (ib.opbrengsten.totaal) plus de over het jaar verschuldigde BTW op de omzet
  // (som van box 1a/1b per kwartaal) geeft de omzet inclusief BTW — dus wat er daadwerkelijk
  // binnenkomt/is gefactureerd, in plaats van alleen het nettobedrag dat in de winstberekening zit.
  const btwOverOmzetTotaal = kwartalen.reduce((a, q) => a + (q.verschuldigdBtw21 || 0) + (q.verschuldigdBtw9 || 0), 0);
  const omzetInclBtw = (ib.opbrengsten.totaal || 0) + btwOverOmzetTotaal;
  // Welk tarief hoort bij de omzet incl. BTW hierboven — gebaseerd op welke van de twee
  // btw-tarieven dit jaar daadwerkelijk verschuldigd is (niet aangenomen), zodat een dossier met
  // uitsluitend 9%-omzet niet ten onrechte "21%" toont.
  const btwTariefLabel = (() => {
    const gebruikt21 = kwartalen.some((q) => (q.verschuldigdBtw21 || 0) > 0);
    const gebruikt9 = kwartalen.some((q) => (q.verschuldigdBtw9 || 0) > 0);
    if (gebruikt21 && gebruikt9) return "21% en 9%";
    return gebruikt9 ? "9%" : "21%";
  })();

  // Compact fiscaal dashboard bovenaan, met élke stap van winst → belastbare winst → IB/Zvw als
  // eigen regel (in plaats van alleen het eindresultaat) — zodat in één oogopslag duidelijk is wat
  // de app ongeveer als aangifte verwacht. Bij "onbekend" urencriterium (zaScenarios) vervangen de
  // losse regels een compacte twee-scenario-tabel (zie "Indicatieve inkomstenbelasting en
  // Zvw-bijdrage" hieronder, met alleen de aanvullende details).
  // v262 — presentatie-verbetering van de indicatieve aangifteberekening (op verzoek, na een eigen
  // voorstel): de winst en de twee uiteindelijke cijfers (indicatieve IB/Zvw) krijgen nu duidelijk
  // meer visueel gewicht dan de tussenstappen (aftrek, MKB-vrijstelling) — voorheen stonden alle
  // bedragen in één grid met exact dezelfde grootte, waardoor niet opviel welke twee cijfers de
  // "uitkomst" zijn. Kerncijfers, BTW-saldo en dossierstatus/aannames staan nu ook in 3 losse
  // kaarten in plaats van in één dicht grijs vlak (zie samenvattingHtml hieronder).
  const kerncijfersHtml = zaScenarios
    ? `
    <div class="kerncijfers-hoofd">
      <span class="label">Winst uit onderneming</span>
      <span class="bedrag-groot">${eur(summary.winst)}</span>
    </div>
    <div class="kerncijfers-stappen">
      ${btwOverOmzetTotaal > 0 ? `<div><span>Omzet incl. BTW (${btwTariefLabel})</span><span>${eur(omzetInclBtw)}</span></div>` : ""}
      <div><span>Omzet excl. BTW</span><span>${eur(ib.opbrengsten.totaal)}</span></div>
      <div><span>Zakelijke kosten</span><span>- ${eur(kostenTotaal)}</span></div>
    </div>
    <p class="kerncijfers-voetnoot">Urencriterium onbekend — twee scenario's, zie "Aannames/onzekerheden" hiernaast.</p>
    <table class="samenvatting-scenarios">
      <thead><tr><th>Urencriterium onbekend</th><th>Zelfstandigen- en startersaftrek</th><th>Belastbare winst</th><th>Indicatieve IB*</th><th>Indicatieve Zvw</th></tr></thead>
      <tbody>
        <tr><td>Mét zelfstandigenaftrek</td><td class="num">${eur(zaScenarios.metZelfstandigenaftrek.ondernemersaftrekBedrag)}</td><td class="num">${eur(zaScenarios.metZelfstandigenaftrek.winstUitsplitsing.belastbaar)}</td><td class="num">${eur(Math.max(0, zaScenarios.metZelfstandigenaftrek.ib.belasting - zaScenarios.metZelfstandigenaftrek.heffingskortingen.totaal))}</td><td class="num">${eur(zaScenarios.metZelfstandigenaftrek.zvw.bijdrage)}</td></tr>
        <tr><td>Zonder zelfstandigenaftrek</td><td class="num">€ 0</td><td class="num">${eur(zaScenarios.zonderZelfstandigenaftrek.winstUitsplitsing.belastbaar)}</td><td class="num">${eur(Math.max(0, zaScenarios.zonderZelfstandigenaftrek.ib.belasting - zaScenarios.zonderZelfstandigenaftrek.heffingskortingen.totaal))}</td><td class="num">${eur(zaScenarios.zonderZelfstandigenaftrek.zvw.bijdrage)}</td></tr>
      </tbody>
    </table>
    <p class="kerncijfers-voetnoot">* Ná heffingskortingen; overig inkomen alleen voor zover opgegeven in de wizard.</p>`
    : `
    <div class="kerncijfers-hoofd">
      <span class="label">Winst uit onderneming</span>
      <span class="bedrag-groot">${eur(summary.winst)}</span>
    </div>
    <div class="kerncijfers-stappen">
      ${btwOverOmzetTotaal > 0 ? `<div><span>Omzet incl. BTW (${btwTariefLabel})</span><span>${eur(omzetInclBtw)}</span></div>` : ""}
      <div><span>Omzet excl. BTW</span><span>${eur(ib.opbrengsten.totaal)}</span></div>
      <div><span>Zakelijke kosten</span><span>- ${eur(kostenTotaal)}</span></div>
    </div>
    <div class="kerncijfers-stappen">
      ${(() => {
        // beide-V9R3 — zelfde woorden als op het scherm (kaart Indicatieve aangifte): zelfstandigenaftrek en startersaftrek apart.
        const sta = ondernemersaftrekVoorJaar ? ondernemersaftrekVoorJaar.startersaftrekBedrag : 0;
        return `<div><span>Zelfstandigenaftrek</span><span>- ${eur(ondernemersaftrekBedrag - sta)}</span></div>${sta > 0 ? `<div><span>Startersaftrek</span><span>- ${eur(sta)}</span></div>` : ""}`;
      })()}
      <div><span>MKB-winstvrijstelling (${winstUitsplitsing.mkbPct}%)</span><span>- ${eur(winstUitsplitsing.mkbVrijstellingBedrag)}</span></div>
      <div class="tussentotaal"><span>Indicatieve belastbare winst</span><span>${eur(winstUitsplitsing.belastbaar)}</span></div>
      ${(ibEstimate.giftenAftrek || 0) > 0 ? `<div><span>Aftrek giften (betaald ${eur(ibEstimate.giften)}, na drempel)</span><span>- ${eur(ibEstimate.giftenAftrek)}</span></div>` : ""}
    </div>
    ${(ibEstimate.overigInkomen || 0) > 0 ? `<div class="kerncijfers-stappen">
      <div><span>Overig inkomen box 1 (loon/uitkering, bruto per jaar, opgegeven)</span><span>${eur(ibEstimate.overigInkomen)}</span></div>
      <p class="kerncijfers-voetnoot">Niet bij de winst opgeteld: hierover is al loonheffing ingehouden. Heffingskorting toegepast op: ${heffingskortingen.kortingOp === "overig" ? "dit overig inkomen" : "de winst"} (zie de totaalkaart).</p>
    </div>` : ""}
    <div class="kerncijfers-resultaat">
      <div><span class="label">Indicatieve IB*</span><span class="bedrag-groot">${eur(ibEstimate.belasting)}</span></div>
      <div><span class="label">Indicatieve Zvw</span><span class="bedrag-groot">${eur(zvwEstimate.bijdrage)}</span></div>
    </div>
    <p class="kerncijfers-voetnoot">* Vóór heffingskortingen — zie "Geschatte heffingskortingen" hieronder.</p>`;

  // nieuw-V8R3 — toelichting btw privégebruik auto, nu bij de tabel BTW per kwartaal.
  const btwPrivegebruikNoot = (() => {
      const d = kwartalen.map((q) => q.btwPrivegebruikAutoDetail).find(Boolean);
      if (!d) return "";
      if (!(d.bedrag > 0.004)) return `<p style="font-size:11px;color:#b45309;margin:6px 0 0">⚠ Btw-correctie privégebruik auto nog niet berekend: ${d.items.flatMap((i) => i.meldingen).join(" ")}</p>`;
      const regels = d.items.map((i) => `${i.naam}: ${i.methode === "forfait" ? `forfait ${String(i.pct).replace(".", ",")}%${i.fractie < 1 ? ` × ${Math.round(i.fractie * 12)}/12` : ""} van catalogusprijs ${eur(i.catalogus)}${i.afgetopt ? `, afgetopt op het maximum van ${eur(i.maximum)}` : ""}` : `werkelijk privégebruik ${i.pct}%`} = ${eur(i.bedrag)}${i.meldingen.length ? ` (${i.meldingen.join(" ")})` : ""}`);
      return `<p style="font-size:11px;color:#475569;margin:6px 0 0">Het saldo in Q4 bevat <strong>${eur(d.bedrag)}</strong> btw-correctie privégebruik auto (rubriek 1d van de laatste aangifte van het jaar). ${regels.join("; ")}.</p>`;
    })();
  const btwKaartHtml =
    kwartalen.length > 0
      ? `
  <div class="btw-kaart">
    <table class="samenvatting-btw"><thead><tr><th>BTW-saldo per kwartaal</th>${kwartalenVol.map((q) => `<th>Q${q.kwartaal}</th>`).join("")}<th>Totaal jaar</th></tr></thead>
    <tbody>${kwartalenVol.some((q) => (q.btwPrivegebruikAuto || 0) > 0.004) ? `<tr><td>Waarvan privégebruik auto (1d)</td>${kwartalenVol.map((q) => `<td class="num">${(q.btwPrivegebruikAuto || 0) > 0.004 ? eur(q.btwPrivegebruikAuto) : ""}</td>`).join("")}<td class="num">${eur(kwartalenVol.reduce((a, q) => a + (q.btwPrivegebruikAuto || 0), 0))}</td></tr>` : ""}<tr><td>Saldo</td>${kwartalenVol
      .map((q) => {
        const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0);
        return `<td class="num">${eur(Math.abs(saldo))}${Math.abs(saldo) < 0.005 ? "" : saldo >= 0 ? " te betalen" : " terug"}</td>`;
      })
      .join("")}${(() => { const t = kwartalen.reduce((a, q) => a + q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0), 0); return `<td class="num"><strong>${eur(Math.abs(t))} ${t >= 0 ? "te betalen" : "terug"}</strong></td>`; })()}</tr></tbody></table>
  </div>`
      : "";

  // V19 — slotregel: totaal te betalen / te ontvangen over het jaar = IB ná heffingskorting (dus incl.
  // zelfstandigenaftrek, startersaftrek, MKB-winstvrijstelling en heffingskortingen) + Zvw + BTW-saldo
  // (4 kwartalen; bij KOR geen BTW). Voorschotten/voorlopige aanslagen zijn bewust niet verrekend.
  const btwJaarSaldo = korRegeling ? 0 : kwartalen.reduce((a, q) => a + q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0), 0);
  const totaalTekst = (t) => `${eur(Math.abs(t))} ${t < 0 ? "te ontvangen" : "te betalen"}`;
  const ibNa = (ibE, hk) => Math.max(0, (ibE.belasting || 0) - (hk.totaal || 0));
  const btwRegelHtml = korRegeling ? "" : `<div class="totaal-regel"><span>BTW-saldo ${year} (per kwartaal aangegeven, niet in het jaartotaal)</span><span>${eur(Math.abs(btwJaarSaldo))} ${btwJaarSaldo < 0 ? "terug te ontvangen" : "te betalen"}</span></div>`;
  let jaarTotaalHtml;
  if (zaScenarios) {
    const rij = (label, sc) => {
      const i = ibNa(sc.ib, sc.heffingskortingen);
      const t = i + sc.zvw.bijdrage;
      return `<tr><td>${label}</td><td class="num">${eur(i)}</td><td class="num">${eur(sc.zvw.bijdrage)}</td><td class="num"><strong>${totaalTekst(t)}</strong></td></tr>`;
    };
    jaarTotaalHtml = `<div class="totaal-kaart"><table class="samenvatting-scenarios"><thead><tr><th>Totaal ${year} (urencriterium onbekend)</th><th>IB na heffingskorting</th><th>Zvw</th><th>Totaal (jaarlijks)</th></tr></thead><tbody>
      ${rij("Mét zelfstandigenaftrek", zaScenarios.metZelfstandigenaftrek)}
      ${rij("Zonder zelfstandigenaftrek", zaScenarios.zonderZelfstandigenaftrek)}
    </tbody></table>${btwRegelHtml}<p class="kerncijfers-voetnoot">Indicatief, overig inkomen alleen voor zover opgegeven in de wizard, zonder verrekening van voorschotten of voorlopige aanslagen.</p></div>`;
    JAAR_TOTALEN.push({ year, onbekend: true, winst: summary.winst, btw: korRegeling ? null : btwJaarSaldo });
  } else {
    const i = ibNa(ibEstimate, heffingskortingen);
    const t = i + zvwEstimate.bijdrage;
    JAAR_TOTALEN.push({ year, totaal: t, winst: summary.winst, ib: i, zvw: zvwEstimate.bijdrage, btw: korRegeling ? null : btwJaarSaldo });
    // nieuw-V4R4 — IB vóór korting, heffingskortingen en het effect van overig inkomen zichtbaar (Boska 13-11:
    // "de te betalen belasting verandert, maar het is niet te zien waardoor").
    const overigInk = ibEstimate.overigInkomen || 0;
    const hk = heffingskortingen.totaal || 0;
    jaarTotaalHtml = `<div class="totaal-kaart">
      <div class="totaal-regel"><span>Indicatieve IB vóór heffingskorting</span><span>${eur(ibEstimate.belasting || 0)}</span></div>
      <div class="totaal-regel"><span>Heffingskortingen over de winst${overigInk > 0 && heffingskortingen.kortingOp === "overig" ? " (korting toegepast op het overig inkomen)" : ""}</span><span>${hk >= 0 ? "- " : "+ "}${eur(Math.abs(hk))}</span></div>
      <div class="totaal-regel"><span>Indicatieve IB na heffingskorting</span><span>${eur(i)}</span></div>
      <div class="totaal-regel"><span>Indicatieve Zvw</span><span>${eur(zvwEstimate.bijdrage)}</span></div>
      <div class="totaal-regel totaal-eind"><span>Totaal ${year} (jaarlijks: IB + Zvw)</span><span>${totaalTekst(t)}</span></div>
      ${btwRegelHtml}
      ${overigInk > 0
        ? `<p class="kerncijfers-voetnoot">Overig inkomen box 1: ${eur(overigInk)} bruto (loon/uitkering), opgegeven bij Aannames &amp; percentages. Daarover is al loonheffing ingehouden. De heffingskorting krijg je maar één keer en is toegepast op ${heffingskortingen.kortingOp === "overig" ? `het overig inkomen (via de loonheffing, ${eur(heffingskortingen.gebruiktOpOverig || 0)}); over de winst telt dus geen korting meer mee` : "de winst; op het overig inkomen is dan geen korting toegepast"}. Te wijzigen bij Aannames &amp; percentages. De IB is het extra deel door de winst.</p>`
        : `<p class="kerncijfers-voetnoot">Geen overig inkomen opgegeven: de volledige heffingskortingen zijn tegen de winst weggestreept.</p>`}
      <p class="kerncijfers-voetnoot">Indicatief, na zelfstandigenaftrek, startersaftrek, MKB-winstvrijstelling en heffingskortingen; zonder verrekening van voorschotten of voorlopige aanslagen.</p>
    </div>`;
  }

  const statusKaartHtml = openPunten.length > 0
    ? `
  <div class="status-kaart ${STATUS_KAART_CLASS[yearStatus]}">
    <p class="aannames-kop">⚠ Aannames/onzekerheden</p><ul>${openPunten.map((p) => `<li>${p}</li>`).join("")}</ul>
  </div>`
    : "";
  // nieuw-V8R3 — één kaart per jaar in de volgorde en met de schermen van de Belastingdienst (mockup akkoord Boska 18-11:
  // "WUO staat groot bovenaan, bij de Belastingdienst begin ik met de opbrengsten"). Vervangt de kaart "Winst uit
  // onderneming", de btw-kaart en de totaalkaart; de toelichting op btw privégebruik auto staat bij "BTW per kwartaal".
  const eh = (n) => `€ ${Math.round(Math.abs(n) || 0).toLocaleString("nl-NL")}`;
  const af = (n) => (Math.round(n) === 0 ? eh(0) : `− ${eh(n)}`);
  const rij = (label, bedrag, cls = "") => `<div class="ak-r${cls ? " " + cls : ""}"><span>${label}</span><span class="num">${bedrag}</span></div>`;
  const scherm = (naam) => `<div class="ak-scherm">${naam}</div>`; // nieuw-V8R4 — zonder "Scherm:" (Boska 18-11)
  const inkoopGroep = (ib.inkoopkosten.totaal || 0) + andereExterneKostenBedrag;
  const machineAfschr = apparatuurAfschrijving + leaseAfschrijvingMachine;
  const overigeRubrieken = ib.overigeBedrijfskosten.filter((r) => Math.abs(r.totaal || 0) >= 0.005);
  const overigeSom = overigeRubrieken.reduce((a, r) => a + (r.totaal || 0), 0);
  const nogNietSom = ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0);
  const autoNetto = kostenTotaal - inkoopGroep - machineAfschr - overigeSom - nogNietSom - renteAftrekbaar;
  const autoOnttrekking = ib.leaseAutoKosten?.onttrekking || 0;
  const heeftAuto = Math.abs(autoNetto) >= 0.5 || autoOnttrekking > 0;
  // nieuw-V8R7 — de Belastingdienst vraagt bij privégebruik auto de totale autokosten en verrekent zelf de bijtelling
  // (Boska 18-11): autokosten dus volledig bij de kosten; sinds V9R3 de bijtelling als overige opbrengst in de W&V (OLA-test).
  // nieuw-V9R0 — besluit Boska 19-11: rente financial lease bij de autokosten (zo ingevuld in OLA), niet bij "Financiële baten en lasten".
  const leaseRente = ib.leaseAutoKosten?.leaseRenteTotaal || 0;
  const renteFinancieel = renteAftrekbaar - leaseRente;
  const autoTotaal = autoNetto + autoOnttrekking + leaseRente;
  const overigeGroep = overigeSom + nogNietSom + (heeftAuto || leaseRente >= 0.5 ? autoTotaal : 0);
  const correctie = summary.winst - ((ib.opbrengsten.totaal || 0) - kostenTotaal);
  // nieuw-V9R3 — OLA-test Meijer 2024 (19-11, akkoord Boska): de bijtelling hoort in de W&V bij Opbrengsten > overige
  // opbrengsten, anders keurt OLA de winstberekening af (onttrekkingen ≠ winst volgens W&V).
  const wvHtml = `${scherm("Winst-en-verliesrekening")}
    ${rij("Opbrengsten (omzet zonder btw)", eh(ib.opbrengsten.totaal || 0))}
    ${autoOnttrekking > 0 ? rij(`Overige opbrengsten: bijtelling privégebruik auto (niet hoger dan de autokosten)`, eh(autoOnttrekking)) : ""}
    ${rij("Inkoopkosten, uitbesteed werk en andere externe kosten", eh(inkoopGroep))}
    ${machineAfschr >= 0.5 ? rij("Afschrijvingen (apparatuur en machines)", eh(machineAfschr)) : ""}
    ${rij("Overige bedrijfskosten", eh(overigeGroep))}
    ${overigeRubrieken.map((r) => rij(esc(r.naam), eh(r.totaal), "sub")).join("")}
    ${heeftAuto || leaseRente >= 0.5 ? rij(`Auto- en transportkosten${autoOnttrekking > 0 ? " (totale autokosten)" : ""}`, eh(autoTotaal), "sub") : ""}
    ${leaseRente >= 0.5 ? rij("waarvan rente financial lease", eh(leaseRente), "sub sub2") : ""}
    ${(ib.leaseAutoKosten?.btwPrivegebruikKosten || 0) >= 0.5 ? rij("waarvan btw-correctie privégebruik auto", eh(ib.leaseAutoKosten.btwPrivegebruikKosten), "sub sub2") : ""}
    ${nogNietSom >= 0.5 ? rij("Nog niet ingedeeld", eh(nogNietSom), "sub") : ""}
    ${renteFinancieel >= 0.5 ? rij(`Financiële baten en lasten (rente${renteFinancieel - (loanRenteForYear?.totaalRente || 0) >= 0.5 ? " lease" : ""})`, af(renteFinancieel)) : ""}
    ${Math.abs(correctie) >= 0.5 ? rij("Overige correcties (zie de winst-en-verliesrekening hieronder)", `${correctie < 0 ? "− " : ""}${eh(correctie)}`) : ""}
    ${rij("Resultaat = winst uit onderneming", `${summary.winst < 0 ? "− " : ""}${eh(summary.winst)}`, "tot")}
    <p class="ak-noot">Vul de opbrengsten en de kosten apart in; de winst rekent de Belastingdienst zelf uit.${autoOnttrekking > 0 ? ` De bijtelling (${eh(autoOnttrekking)}) vult u één keer in: bij Opbrengsten onder overige opbrengsten. Op het scherm Privégebruik auto rekent de Belastingdienst hetzelfde bedrag zelf uit; dat telt niet dubbel, het is de tegenboeking.` : ""}</p>`;
  // nieuw-V8R4 — met of zonder balans (wens Boska 18-11: "de balans van het banksaldo staat er niet bij").
  // Banksaldo zakelijke rekening(en) uit "saldo na mutatie"; kosten die vanaf een privérekening zijn betaald tellen
  // als privéstorting; wat dan nog overblijft zijn balansmutaties die de bank niet laat zien (auto, leaseschuld, btw).
  const saldi = banksaldiVoorJaar(classified, year, accountTypeByFile, beginsaldo);
  const zonderSaldo = rekeningenZonderSaldo(classified, accountTypeByFile);
  const priveItems = zakItems.filter((tx) => (accountTypeByFile?.[tx.source] || tx.type) === "Prive");
  const ibPrive = priveItems.length ? computeIbBoxMapping(priveItems, null, null, 0, categoryBtwRates, btwVerlegd, leaseAutoKostenForYear ? { contracten: [] } : null, year, categoryZakelijkPercentage, autoStatus, null, { huur: huurZakelijkPercentageStatus, energie: energieZakelijkPercentageStatus, gemeentelijk: gemeentelijkeKostenZakelijkPercentageStatus }) : null;
  const priveBetaald = ibPrive ? (ibPrive.inkoopkosten.totaal || 0) + (ibPrive.autokostenOverig.totaal || 0) + ibPrive.overigeBedrijfskosten.reduce((x, r) => x + (r.totaal || 0), 0) + ibPrive.nogNietIngedeeld.reduce((x, r) => x + (r.totaal || 0), 0) : 0;
  // De btw op kosten die vanaf privé zijn betaald komt als voorbelasting terug in de zaak: de storting is het brutobedrag.
  const btwPriveBetaald = ibPrive ? -priveItems.filter((tx) => tx.amount < 0 && fiscalTreatmentOf(tx.category) !== "geen").reduce((a, tx) => a + computeBtw(tx, categoryBtwRates || {}, btwVerlegd), 0) : 0;
  const opnames = ib.priveOnttrekkingen.totaal || 0, stortGeld = ib.priveStortingen.totaal || 0;
  // nieuw-V8R7 — Boska 18-11 ("€ 4.898 snap ik niet"): privé-uitgaven die vanaf de zakelijke rekening zijn betaald
  // (boodschappen, privélening, sport …) zijn ook privéonttrekkingen; privé-ontvangsten daarop zijn privéstortingen.
  // Niet als privé: posten die op de balans horen (btw, loonheffing, sparen zakelijk, borg) of nog onduidelijk zijn (Overig).
  const NIET_PRIVE = new Set(["Privé opnames", "Ontvangen van zakelijk", "Terugboeking van privé", "Terugboeking naar zakelijk", "Inkomsten", "Inkomsten/betalingen niet dit jaar", "Verkoop activa",
    "Interne overboeking: zakelijk sparen", "Interne overboeking", "Overig", "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: LH", "Belastingen: OB",
    "Borg (waarborgsom)", "Dividenduitkering", "Rekening-courant DGA", "Kapitaalstorting"]);
  const privePosten = classified.filter((tx) => !tx.isMirror && tx.year === year && (accountTypeByFile?.[tx.source] || tx.type) === "Zakelijk" && fiscalTreatmentOf(tx.category) === "geen" && !NIET_PRIVE.has(tx.category));
  const priveUitZak = -privePosten.filter((tx) => tx.amount < 0).reduce((a, tx) => a + tx.amount, 0);
  const priveInZak = privePosten.filter((tx) => tx.amount > 0).reduce((a, tx) => a + tx.amount, 0);
  // Kilometervergoeding privéauto: kosten zonder betaling van de zaak, dus een privéstorting (in natura).
  const kmStorting = kmVergoedingForYear?.bedrag || 0;
  // nieuw-V8R7 — Boska 18-11: meldingen als gegevens ontbreken die het overzicht (en vooral de balans) onbetrouwbaar maken.
  const inJaar = (l) => (l.transactions || []).some((tx) => tx.year === year || new Date(tx.date).getFullYear() === year);
  const naamVan = (l) => esc(l.counterparty || l.name || l.naam || l.key || "onbekend");
  const meldingen = [];
  for (const l of leaseSummary || []) {
    if (!inJaar(l) || leaseDetails?.[l.key]?.onbekend) continue;
    if (l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails?.[l.key])) meldingen.push(`Leasecontract ${naamVan(l)}: gegevens ontbreken. Auto, leaseschuld, afschrijving en rente kloppen daardoor niet.`);
  }
  for (const l of loanSummary || []) {
    if (!inJaar(l) || loanDetails?.[l.key]?.onbekend) continue;
    if (!(loanDetails?.[l.key]?.leningbedrag && loanDetails?.[l.key]?.startdatum)) meldingen.push(`Lening ${naamVan(l)}: bedrag of startdatum ontbreekt. De schuld en de rente kloppen daardoor niet.`);
  }
  const overigZak = classified.filter((tx) => !tx.isMirror && tx.year === year && (accountTypeByFile?.[tx.source] || tx.type) === "Zakelijk" && tx.category === "Overig");
  if (overigZak.length) meldingen.push(`${overigZak.length} boeking${overigZak.length === 1 ? "" : "en"} op de zakelijke rekening nog in "Overig" (samen ${eur(overigZak.reduce((a, tx) => a + tx.amount, 0))}). Deel ze in, anders tellen ze niet goed mee.`);
  let metBalansHtml = "";
  if (saldi) {
    // Balans zoals de Belastingdienst die controleert: activa = passiva, met het ondernemingsvermogen als sluitpost.
    // Btw: het saldo van Q4 wordt pas in januari betaald of ontvangen, dus staat op 31-12 als schuld of vordering.
    const R = Math.round;
    const stortTot = stortGeld + priveBetaald + btwPriveBetaald;
    const bp = balansPostenVoorJaar({ classified, year, accountTypeByFile, leaseSummary, leaseDetails, activaDetails, autoActivaDetails, autoWizardStatus });
    const q4 = (ks) => { const q = ks.find((k) => k.kwartaal === 4); return q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0) : 0; };
    const btwVorig = korRegeling ? [] : computeQuarterlyBtwForYear(classified, year - 1, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, false, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(year - 1, { leaseSummary: leaseSummary || [], leaseDetails: leaseDetails || {}, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm: "zzp" }));
    // nieuw-V8R7 — Boska 18-11 ("btw alleen Q4?"): de btw-schuld op 31-12 is alle btw die nog niet is betaald, niet alleen Q4.
    // Verschuldigd (per jaar, vanaf het eerste jaar met gegevens) min wat er volgens de bank aan de Belastingdienst is betaald
    // (categorie "Belastingen: OB", op betaaldatum). Betalingen in januari van het eerste jaar horen bij het jaar daarvoor.
    const jaarVan = (tx) => new Date(tx.date).getFullYear();
    const zakTx = classified.filter((tx) => !tx.isMirror && tx.date && (accountTypeByFile?.[tx.source] || tx.type) === "Zakelijk");
    const eersteJaar = zakTx.reduce((m, tx) => Math.min(m, tx.year ?? jaarVan(tx)), year);
    const btwJaar = (y) => y === year ? kwartalen : y === year - 1 ? btwVorig : (korRegeling ? [] : computeQuarterlyBtwForYear(classified, y, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, false, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(y, { leaseSummary: leaseSummary || [], leaseDetails: leaseDetails || {}, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm: "zzp" })));
    const btwVerschuldigd = (ks) => ks.reduce((a, q) => a + q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0), 0);
    // nieuw-V8R9 — Boska 18-11: kwartalen die in de app zijn afgevinkt als "betaald" tellen als betaald. Bankbetalingen in
    // februari t/m januari erna horen bij dat jaar (Q4 wordt in januari betaald); in een jaar met afgevinkte kwartalen tellen
    // bankbetalingen alleen nog voor de kwartalen die niet zijn afgevinkt.
    const isOB = (tx) => tx.category === "Belastingen: OB" || tx.category === "Belastingen: Naheffingen OB voorgaande jaren";
    const btwJaarRegel = (y, tot) => {
      const ks = btwJaar(y);
      const af = ks.filter((q) => kwartaalStatus?.[`${y}-Q${q.kwartaal}`]?.betaald && !(y === tot && q.kwartaal === 4));
      const te = btwVerschuldigd(ks), afgevinkt = btwVerschuldigd(af);
      const van = new Date(y, 1, 1), tot2 = new Date(Math.min(new Date(y + 1, 1, 1), new Date(tot + 1, 0, 1)));
      let bank = zakTx.filter((tx) => isOB(tx) && new Date(tx.date) >= van && new Date(tx.date) < tot2).reduce((a, tx) => a + tx.amount, 0);
      if (af.length) { const rest = te - afgevinkt; bank = rest > 0 ? Math.max(bank, -rest) : 0; }
      return { y, te, afgevinkt, bank, saldo: te - afgevinkt + bank };
    };
    const btwOpen = (tot) => { let open = 0; for (let y = eersteJaar; y <= tot; y++) open += btwJaarRegel(y, tot).saldo; return open; };
    const btw = korRegeling ? { begin: 0, eind: 0 } : { begin: R(year - 1 >= eersteJaar ? btwOpen(year - 1) : q4(btwVorig)), eind: R(btwOpen(year)) };
    // nieuw-V8R7 — boekingen die aan een ander jaar zijn toegerekend dan waarin de bank ze liet zien (bijv. een teruggave
    // in februari die bij vorig jaar hoort): op 31-12 een vordering (nog te ontvangen) of schuld (nog te betalen).
    const overloop = (tot) => zakTx.filter((tx) => fiscalTreatmentOf(tx.category) !== "geen" && tx.year != null).reduce((a, tx) => {
      const dj = jaarVan(tx);
      if (tx.year <= tot && dj > tot) return a + tx.amount;   // geboekt in/voor dit jaar, geld komt later
      if (tx.year > tot && dj <= tot) return a - tx.amount;   // geld al ontvangen/betaald, hoort bij later jaar
      return a;
    }, 0);
    const ovl = { begin: R(overloop(year - 1)), eind: R(overloop(year)) };
    // nieuw-V8R7 — privé-deel van gemengde kosten (bijv. huur, energie, auto deels privé) die vanaf de zakelijke rekening zijn
    // betaald: de bank betaalde het hele bedrag, de winst telt alleen het zakelijke deel. Dat verschil is een privéonttrekking.
    // = bankbedrag kosten (zakelijke rekening) − aftrekbare btw daarop − kosten in de winst die via die rekening liepen.
    const bankKostenBruto = -zakTx.filter((tx) => tx.year === year && fiscalTreatmentOf(tx.category) === "kosten").reduce((a, tx) => a + tx.amount, 0);
    const voorbelastingJaar = kwartalen.reduce((a, q) => a + (q.voorbelasting || 0), 0);
    const nietViaBank = (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) + (ib.afschrijvingen.berekendeLeaseAfschrijving || 0) + renteAftrekbaar + kmStorting + (ib.leaseAutoKosten?.btwPrivegebruikKosten || 0);
    const kostenViaBank = kostenTotaal + autoOnttrekking - nietViaBank - priveBetaald;
    const gemengdPrive = Math.max(0, bankKostenBruto - (voorbelastingJaar - btwPriveBetaald) - kostenViaBank);
    const p2 = (f) => ({ begin: f("begin"), eind: f("eind") });
    const bank = p2((k) => R(saldi[k]));
    const sparen = p2((k) => Math.max(0, R(bp.sparen[k]))), auto = p2((k) => R(bp.auto[k])), overig = p2((k) => R(bp.overig[k])), lease = p2((k) => R(bp.leaseschuld[k]));
    const btwVord = p2((k) => Math.max(0, -btw[k])), btwSchuld = p2((k) => Math.max(0, btw[k]));
    // nieuw-V8R8 — Boska 18-11: waar de btw-schuld vandaan komt, per heel jaar: te betalen (berekend), betaald/terug (bank), nog open.
    const btwPerJaar = [];
    if (!korRegeling) { let open = 0; for (let y = eersteJaar; y <= year; y++) { const r = btwJaarRegel(y, year); open += r.saldo; btwPerJaar.push({ y, te: R(r.te), af: R(r.afgevinkt), bank: R(r.bank), open: R(open) }); } }
    const metAf = btwPerJaar.some((r) => r.af !== 0);
    const btwTabel = btwPerJaar.length && (btw.begin !== 0 || btw.eind !== 0) ? `<div class="ak-sub2">Waar komt de btw-schuld vandaan? (per jaar, ter controle)</div>
    <table class="ak-tabel"><tr><th>Jaar</th><th class="num">Btw te betalen (berekend)</th>${metAf ? `<th class="num">Afgevinkt als betaald</th>` : ""}<th class="num">Betaald (−) of terug (+) volgens de bank</th><th class="num">Nog open</th></tr>
    ${btwPerJaar.map((r) => `<tr><td>${r.y}</td><td class="num">${r.te < 0 ? "− " : ""}${eh(r.te)}</td>${metAf ? `<td class="num">${r.af ? (r.af < 0 ? "+ " : "− ") + eh(r.af) : "—"}</td>` : ""}<td class="num">${r.bank < 0 ? "− " : r.bank > 0 ? "+ " : ""}${eh(r.bank)}</td><td class="num">${r.open < 0 ? "terug " : ""}${eh(r.open)}</td></tr>`).join("")}</table>
    <p class="ak-noot">Een negatief "te betalen" is btw die je terugkrijgt. Kwartalen die je in de app als betaald hebt afgevinkt, tellen als betaald; alleen Q4 van ${year} blijft op 31-12 open, want die betaal je in januari. Bankbetalingen in januari horen bij het jaar daarvoor. Wijkt dit af van je ingediende aangiften of betalingen, controleer dan de indeling van de btw-betalingen (categorie "Belastingen: OB").</p>` : "";
    const liquide = p2((k) => Math.max(0, bank[k])), rcSchuld = p2((k) => Math.max(0, -bank[k]));
    const ovlVord = p2((k) => Math.max(0, ovl[k])), ovlSchuld = p2((k) => Math.max(0, -ovl[k]));
    const activa = p2((k) => auto[k] + overig[k] + btwVord[k] + ovlVord[k] + liquide[k] + sparen[k]);
    const schulden = p2((k) => lease[k] + btwSchuld[k] + ovlSchuld[k] + rcSchuld[k]);
    const vermogen = p2((k) => activa[k] - schulden[k]);
    const lR = R(bp.leaseElders || 0);
    const wR = R(summary.winst), oR = R(opnames + priveUitZak + gemengdPrive), bR = R(autoOnttrekking), sR = R(stortTot + priveInZak + kmStorting) + lR;
    const verschil = wR - (vermogen.eind - vermogen.begin + oR + bR - sR);
    if (balans === "met") {
      const q3q4 = btwVerschuldigd(kwartalen.filter((q) => q.kwartaal >= 3));
      if (btw.eind > Math.max(500, q3q4 + 250)) meldingen.push(`Volgens de bank is er ${eh(btw.eind)} btw nog niet betaald, meer dan het laatste kwartaal. Klopt dat? Als de btw van een andere rekening is betaald of anders is ingedeeld, zet die betalingen dan op de categorie "Belastingen: OB".`);
      if (!classified.some((tx) => !tx.isMirror && tx.year === year && (accountTypeByFile?.[tx.source] || tx.type) === "Prive")) meldingen.push("Geen privérekening geladen: zakelijke kosten die privé zijn betaald (privéstortingen) ontbreken mogelijk.");
      const somCat = (c) => zakTx.filter((tx) => tx.year === year && tx.category === c).reduce((x, tx) => x + tx.amount, 0);
      const intern = somCat("Interne overboeking"), borg = somCat("Borg (waarborgsom)");
      if (Math.abs(intern) >= 250) meldingen.push(`Interne overboekingen per saldo ${intern < 0 ? "naar" : "van"} een eigen rekening die niet is geladen: ${eh(intern)}. Is dat een privérekening, dan is het een privé${intern < 0 ? "onttrekking" : "storting"}; is het een zakelijke (spaar)rekening, laad die dan ook in, want het saldo hoort op de balans.`);
      if (Math.abs(borg) >= 250) meldingen.push(`Borg (waarborgsom) per saldo ${borg < 0 ? "betaald" : "terugontvangen"}: ${eh(borg)}. Een betaalde borg is een vordering op de balans; die staat er nog niet automatisch op.`);
      if (Math.abs(verschil) >= 250) meldingen.push(`Er blijft een verschil van ${eh(Math.abs(verschil))} dat de app niet kan verklaren. Controleer of alle zakelijke rekeningen (ook spaarrekeningen), leasecontracten en leningen zijn ingevoerd.`);
    }
    const bedrag = (n) => `${n < 0 ? "− " : ""}${eh(n)}`;
    const rijBron = (label, waarde, txs, noot) => txs.length
      ? `<details class="bron"><summary class="ak-r sub"><span>${label} <span class="bron-knop" title="Welke boekingen?">ⓘ boekingen</span></span><span class="num">${waarde}</span></summary>${boekingenLijstHtml(txs, noot)}</details>`
      : rij(label, waarde, "sub");
    const vanJaar = zakTx.filter((tx) => tx.year === year);
    const txOpnames = vanJaar.filter((tx) => ["Privé opnames", "Ontvangen van zakelijk"].includes(tx.category));
    const txStort = vanJaar.filter((tx) => ["Terugboeking van privé", "Terugboeking naar zakelijk"].includes(tx.category));
    const txGemengd = vanJaar.filter((tx) => fiscalTreatmentOf(tx.category) === "kosten");
    const txPriveBetaald = priveItems.filter((tx) => fiscalTreatmentOf(tx.category) !== "geen");
    const be = (o) => `${bedrag(o.begin)} en ${bedrag(o.eind)}`;
    const heeft = (o) => o.begin !== 0 || o.eind !== 0;
    metBalansHtml = `    <div class="ak-sub2">Scherm "Balans: activa" (bedragen op 1 januari en 31 december)</div>
    ${heeft(auto) ? rij("Auto, boekwaarde (materiële vaste activa)", be(auto), "in") : ""}
    ${bp.autoItems.map((a) => `${rij(`Aanschafwaarde${a.aanschafdatum ? ` (${new Date(a.aanschafdatum).toLocaleDateString("nl-NL")})` : ""}`, eh(a.aanschafwaarde), "sub")}${rij(`Afschrijving ${year}`, af(a.afschrijving), "sub")}`).join("")}
    ${heeft(overig) ? rij("Overige bedrijfsmiddelen, boekwaarde (materiële vaste activa)", be(overig), "in") : ""}
    ${heeft(overig) ? (() => { const m = bp.overigMut || { aanschaf: 0, afschrijving: 0 }; const aan = R(m.aanschaf), afs = R(m.afschrijving), weg = R(overig.begin + aan - afs - overig.eind);
      return `${aan >= 1 ? rij(`Aanschaf ${year}`, `+ ${eh(aan)}`, "sub") : ""}${afs >= 1 ? rij(`Afschrijving ${year}`, af(afs), "sub") : ""}${weg >= 1 ? rij(`Verkocht of afgeboekt in ${year}`, af(weg), "sub") : ""}`; })() : ""}
    ${heeft(btwVord) ? rij("Vordering omzetbelasting (btw nog terug te krijgen)", be(btwVord), "in") : ""}
    ${heeft(ovlVord) ? rij("Overige vorderingen (nog te ontvangen, hoort bij dit jaar)", be(ovlVord), "in") : ""}
    ${rij("Liquide middelen (banksaldo zakelijke rekening)", be(liquide), "in")}
    ${zonderSaldo.length ? `<p class="ak-noot">Het bankbestand heeft geen saldo. Het banksaldo is berekend: het ingevulde saldo op 1-1-${zonderSaldo.map((r) => beginsaldo?.[r.key]?.jaar).filter(Boolean).join(" en 1-1-")} plus alle boekingen daarna. Vergelijk het saldo op 31-12 met je bankafschrift.</p>` : ""}
    ${heeft(sparen) ? rij("Liquide middelen (zakelijke spaarrekening, uit de overboekingen)", be(sparen), "in") : ""}
    ${rij("Totaal activa", be(activa), "tot")}
    <div class="ak-sub2">Scherm "Balans: passiva" (bedragen op 1 januari en 31 december)</div>
    ${heeft(lease) ? rij("Leaseschuld", be(lease), "in") : ""}
    ${heeft(btwSchuld) ? rij("Schuld omzetbelasting (btw nog niet betaald)", be(btwSchuld), "in") : ""}
    ${heeft(ovlSchuld) ? rij("Overige schulden (nog te betalen, hoort bij dit jaar)", be(ovlSchuld), "in") : ""}
    ${heeft(rcSchuld) ? rij("Overige kortlopende schulden (negatief banksaldo)", be(rcSchuld), "in") : ""}
    ${rij("Totaal schulden", be(schulden), "sub")}
    ${rij("Ondernemingsvermogen = totaal activa min totaal schulden", be(vermogen), "in")}
    ${rij("Totaal passiva (gelijk aan totaal activa)", be(activa), "tot")}
    <p class="ak-noot">Het ondernemingsvermogen is wat de onderneming bezit min wat ze schuldig is. Het komt niet van de bank maar volgt uit de balans; daardoor zijn activa en passiva altijd gelijk.</p>
    ${btwTabel}
    <!--AUTO-->
    <div class="ak-sub2">Scherm "Privéonttrekkingen en -stortingen"</div>
    ${rij("Overige privéonttrekkingen", eh(oR + Math.max(0, verschil)), "in")}
    ${rij("Overige privéstortingen", eh(sR + Math.max(0, -verschil)), "in")}
    <div class="ak-sub2">Ter controle (niet invullen)</div>
    ${bR > 0 ? rij("Onttrekking privégebruik auto (telt de Belastingdienst zelf op)", eh(bR)) : ""}
    ${rij("Totaal privéonttrekkingen (zo hoort de Belastingdienst het te tonen)", eh(oR + bR + Math.max(0, verschil)))}
    ${rij("Totaal privéstortingen", eh(sR + Math.max(0, -verschil)))}
    ${rij("Saldo privé (onttrekkingen min stortingen)", bedrag(oR + bR - sR + verschil))}
    ${rij(`Controle: vermogensverschil (${bedrag(vermogen.eind - vermogen.begin)}) + saldo privé = winst`, bedrag(wR), "tot")}
    <div class="ak-sub2">Toelichting op de bedragen die je invult (klik op een regel voor de boekingen)</div>
    ${rijBron("Overige privéonttrekkingen: opnames van de bank", eh(R(opnames)), txOpnames)}
    ${priveUitZak >= 0.5 ? rijBron("Overige privéonttrekkingen: privé-uitgaven betaald vanaf de zakelijke rekening", eh(R(priveUitZak)), privePosten.filter((tx) => tx.amount < 0)) : ""}
    ${gemengdPrive >= 0.5 ? rijBron("Overige privéonttrekkingen: privé-deel van kosten betaald vanaf de zakelijke rekening (bijv. huur, energie, auto)", eh(R(gemengdPrive)), txGemengd, "Alle kosten die vanaf de zakelijke rekening zijn betaald (incl. btw). Alleen het privé-deel (wat niet in de winst telt, na het zakelijke percentage) is hierboven als onttrekking meegenomen.") : ""}
    ${verschil > 0 ? rij("Overige privéonttrekkingen: verschil (controleren)", eh(verschil), "sub") : ""}
    ${stortGeld >= 0.5 ? rijBron("Overige privéstortingen: teruggestort van privé naar zakelijk", eh(stortGeld), txStort) : ""}
    ${priveBetaald >= 0.5 ? rijBron("Overige privéstortingen: zakelijke kosten betaald vanaf de privérekening (inclusief btw)", eh(priveBetaald + btwPriveBetaald), txPriveBetaald, "Bedragen zoals op het afschrift van de privérekening. Alleen het zakelijke deel (na het zakelijke percentage) telt als storting.") : ""}
    ${priveInZak >= 0.5 ? rijBron("Overige privéstortingen: privé-ontvangsten op de zakelijke rekening", eh(R(priveInZak)), privePosten.filter((tx) => tx.amount > 0)) : ""}
    ${kmStorting >= 0.5 ? rij("Overige privéstortingen: kilometervergoeding privéauto (kosten zonder betaling)", eh(R(kmStorting)), "sub") : ""}
    ${lR > 0 ? rij("Overige privéstortingen: leasetermijnen betaald van een andere rekening", eh(lR), "sub") : ""}
    ${verschil < 0 ? rij("Overige privéstortingen: verschil (controleren)", eh(-verschil), "sub") : ""}`;
  }
  // nieuw-V8R7 — Boska 18-11 (schermafdruk BD): bij privégebruik auto vraagt de BD cataloguswaarde, kosten voor deze
  // auto en "vanuit privémiddelen betaalde kosten" (alleen kosten die níet in de onderneming zijn opgevoerd → hier € 0).
  // De BD rekent de onttrekking zelf uit en telt die op bij de privéonttrekkingen; daarom bij A en B alleen de rest.
  const autoContracten = (ib.leaseAutoKosten?.contracten || []).filter((c) => c.privegebruikMeerDan500km);
  const autoBlok = autoOnttrekking > 0 ? `<div class="ak-sub2">Scherm "Privégebruik auto" (meer dan 500 km privé)</div>
    ${autoContracten.filter((c) => c.cataloguswaarde).map((c) => rij(`Cataloguswaarde${c.kenteken ? ` (${esc(c.kenteken)})` : ""}`, eh(Number(c.cataloguswaarde)), "in")).join("")}
    ${rij(`Kosten voor deze auto (totale autokosten${(() => { const d = [leaseRente >= 0.5 ? "rente lease" : "", (ib.leaseAutoKosten?.btwPrivegebruikKosten || 0) >= 0.5 ? "btw-correctie privégebruik" : ""].filter(Boolean); return d.length ? `, inclusief ${d.join(" en ")}` : ""; })()})`, eh(autoTotaal), "in")}
    ${rij("Vanuit privémiddelen betaalde kosten voor deze auto", eh(0), "in")}
    ${rij("Onttrekking privégebruik auto (rekent de Belastingdienst zelf uit)", eh(autoOnttrekking), "sub")}
    <p class="ak-noot">Bij "vanuit privémiddelen betaald" alleen autokosten invullen die privé zijn betaald en níet bij de onderneming zijn opgevoerd; die zitten hier al allemaal in de kosten. Jaar van eerste toelating en soort energie vul je in zoals gevraagd; het percentage bepaalt de Belastingdienst.</p>` : "";
  const aOnt = Math.max(0, Math.round(summary.winst) - Math.round(autoOnttrekking));
  const metBalans = balans === "met" && !!metBalansHtml;
  const aRegels = `${autoBlok}
    <div class="ak-sub2">Scherm "Privéonttrekkingen en -stortingen"</div>
    ${rij(autoOnttrekking > 0 ? "Overige privéonttrekkingen" : "Privéonttrekkingen in geld", eh(aOnt), "in")}
    ${summary.winst < 0 ? rij("Overige privéstortingen", eh(-summary.winst), "in") : ""}
    ${autoOnttrekking > 0 ? rij("Onttrekking privégebruik auto (telt de Belastingdienst zelf op, niet invullen)", eh(Math.round(autoOnttrekking))) : ""}
    <p class="ak-noot">Zonder balans (activa en passiva € 0) geldt: onttrekkingen min stortingen = winst.${autoOnttrekking > 0 ? " De Belastingdienst telt het privégebruik auto zelf op; samen is dat precies de winst." : ""}</p>`;
  const priveHtmlKaart = `${scherm(metBalans ? "Balans en privéonttrekkingen" : "Privéonttrekkingen en -stortingen")}
    <p class="ak-noot"><b style="background:#eff6ff;padding:0 4px">Blauw</b> = invullen bij de Belastingdienst; de andere regels zijn ter controle.${metBalans ? " Dit overzicht is voor een aangifte mét balans (bedragen op 1 januari en 31 december)." : " Dit overzicht is voor een aangifte zonder balans."}</p>
    ${meldingen.length ? `<div class="ak-meld"><b>Let op, gegevens ontbreken of zijn onzeker:</b><ul>${meldingen.map((m) => `<li>${m}</li>`).join("")}</ul></div>` : ""}
    ${balans === "met" && !metBalansHtml ? `<p class="ak-noot">Een balans is niet te maken: er is geen banksaldo van de zakelijke rekening. Vul bij "Met balans" het banksaldo op 1 januari in (staat op je bankafschrift). Hieronder staat daarom de versie zonder balans.</p>` : ""}
    ${metBalans ? metBalansHtml.replace("<!--AUTO-->", autoBlok) : aRegels}`;
  let aftrekEnBelastingHtml;
  if (zaScenarios) {
    const kol = (sc) => { const i = ibNa(sc.ib, sc.heffingskortingen); return { aftrek: sc.ondernemersaftrekBedrag || 0, mkb: sc.winstUitsplitsing.mkbVrijstellingBedrag || 0, bel: sc.winstUitsplitsing.belastbaar, ibV: sc.ib.belasting || 0, hk: sc.heffingskortingen.totaal || 0, ibN: i, zvw: sc.zvw.bijdrage, tot: i + sc.zvw.bijdrage }; };
    const m = kol(zaScenarios.metZelfstandigenaftrek), z = kol(zaScenarios.zonderZelfstandigenaftrek);
    const r2 = (label, a, b, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td class="num">${a}</td><td class="num">${b}</td></tr>`;
    aftrekEnBelastingHtml = `${scherm("Ondernemersaftrek en belasting")}
    <p class="ak-noot">Urencriterium onbekend: beide mogelijkheden naast elkaar.</p>
    <table class="ak-tabel"><thead><tr><th></th><th class="num">Mét zelfstandigenaftrek</th><th class="num">Zonder zelfstandigenaftrek</th></tr></thead><tbody>
      ${r2("Zelfstandigen- en startersaftrek", af(m.aftrek), af(z.aftrek))}
      ${r2("Mkb-winstvrijstelling", af(m.mkb), af(z.mkb))}
      ${r2("Belastbare winst", eh(m.bel), eh(z.bel), "tot")}
      ${r2("Inkomstenbelasting vóór heffingskortingen", eh(m.ibV), eh(z.ibV))}
      ${r2("Heffingskortingen", af(m.hk), af(z.hk))}
      ${r2("Te betalen inkomstenbelasting en premie volksverzekeringen", eh(m.ibN), eh(z.ibN), "tot")}
      ${r2("Te betalen bijdrage Zorgverzekeringswet", eh(m.zvw), eh(z.zvw), "tot")}
      ${r2(`Totaal te betalen ${year}`, eh(m.tot), eh(z.tot), "groot")}
    </tbody></table>`;
  } else {
    const sta = ondernemersaftrekVoorJaar ? ondernemersaftrekVoorJaar.startersaftrekBedrag : 0;
    const i = ibNa(ibEstimate, heffingskortingen);
    const hkD = heffingskortingen;
    const overigInk = ibEstimate.overigInkomen || 0;
    aftrekEnBelastingHtml = `${scherm("Ondernemersaftrek")}
    ${rij(`Zelfstandigenaftrek (urencriterium: ${zaStatus === "ja" ? "ja" : "nee"})`, af(ondernemersaftrekBedrag - sta))}
    ${sta > 0 ? rij("Startersaftrek", af(sta)) : ""}
    ${rij(`Mkb-winstvrijstelling ${String(winstUitsplitsing.mkbPct).replace(".", ",")}%`, af(winstUitsplitsing.mkbVrijstellingBedrag))}
    ${rij("Belastbare winst", eh(winstUitsplitsing.belastbaar), "tot")}
    ${(ibEstimate.giftenAftrek || 0) > 0 ? rij(`Aftrek giften (betaald ${eh(ibEstimate.giften)}, na drempel)`, af(ibEstimate.giftenAftrek)) : ""}
    ${overigInk > 0 ? rij("Overig inkomen box 1 (loon/uitkering, bruto)", eh(overigInk)) : ""}
    ${scherm("Belasting en premies")}
    ${rij("Inkomstenbelasting vóór heffingskortingen", eh(ibEstimate.belasting || 0))}
    ${rij(`Heffingskortingen${!hkD.werkelijkIngevuld && hkD.algemeneHeffingskorting != null && hkD.arbeidskorting != null ? ` (algemeen ${eh(hkD.algemeneHeffingskorting)}, arbeidskorting ${eh(hkD.arbeidskorting)})` : ""}${overigInk > 0 && hkD.kortingOp === "overig" ? " (toegepast op het overig inkomen)" : ""}`, af(hkD.totaal || 0))}
    ${rij("Te betalen inkomstenbelasting en premie volksverzekeringen", eh(i), "tot")}
    ${rij("Te betalen bijdrage Zorgverzekeringswet", eh(zvwEstimate.bijdrage), "tot")}
    ${rij(`Totaal te betalen ${year}`, eh(i + zvwEstimate.bijdrage), "groot")}
    ${overigInk > 0 ? `<p class="ak-noot">Over het overig inkomen is al loonheffing ingehouden; de inkomstenbelasting hierboven is het extra deel door de winst. De heffingskorting telt maar één keer.</p>` : ""}`;
  }
  const btwJaarRegel = korRegeling ? "" : `<div class="ak-btw"><span>Btw ${year} (apart, per kwartaal aangegeven)</span><span>${eh(btwJaarSaldo)} ${btwJaarSaldo < 0 ? "terug" : "te betalen"}</span></div>`;
  const samenvattingHtml = `
  <div class="aangifte-kaart">
    <div class="ak-kop"><b>Indicatief aangifteoverzicht inkomstenbelasting ${year} (${metBalans ? "met" : "zonder"} balans)</b><span></span></div>
    ${wvHtml}
    ${priveHtmlKaart}
    ${aftrekEnBelastingHtml}
    ${btwJaarRegel}
    <p class="ak-noot">Indicatief; zonder verrekening van voorschotten of voorlopige aanslagen.</p>
  </div>${statusKaartHtml}`;
  void kerncijfersHtml; void btwKaartHtml; void jaarTotaalHtml;

  const overigeBedrijfskostenHtml =
    ib.overigeBedrijfskosten.length > 0
      ? `
  <div class="rubriek"><span>4. Overige bedrijfskosten</span><span></span></div>
  ${ib.overigeBedrijfskosten
    .map(
      (r) =>
        `<div class="subrubriek"><span>${esc(r.naam)}</span><span class="num">${eur(r.totaal)}</span></div>${
          r.toelichting ? `<p class="toelichting">${esc(r.toelichting)}</p>` : ""
        }${categorieDetailHtml(r.perCategorie)}`
    )
    .join("")}`
      : "";

  // De rente van een financiële lease (auto of machine) is een aparte financieringskost, geen
  // "autokostenpost" — die blijft daarom altijd hier staan, volledig en ongewijzigd aftrekbaar, en
  // wordt nooit meegeteld in de bijtelling-aftopping bij "Auto's en machines" hieronder.
  const financieelTotaalRente = ib.financieleBatenLasten.renteLeningen + ib.financieleBatenLasten.renteLease;
  const financieelTotaalAflossing = ib.financieleBatenLasten.aflossingLeningen + ib.financieleBatenLasten.aflossingLease;
  const financieelHtml =
    financieelTotaalRente > 0 || ib.leningenTotal > 0 || ib.leaseFinancieelTotal > 0
      ? `
  <div class="rubriek"><span>5. Financiële baten en lasten</span><span class="num">${eur(financieelTotaalRente)}</span></div>
  <p class="toelichting">Aflossing (niet aftrekbaar): ${eur(financieelTotaalAflossing)}.${
          ib.financieleBatenLasten.onvolledig > 0 ? ` ⚠ ${ib.financieleBatenLasten.onvolledig} lening(en)/leasecontract(en) nog niet volledig ingevuld in de app.` : ""
        }${
          ib.financieleBatenLasten.schattingLease > 0 ? ` ⚠ SCHATTING: bij ${ib.financieleBatenLasten.schattingLeases} financiële lease(s) zonder contractgegevens tellen de betaalde termijnen van dit jaar (${eur(ib.financieleBatenLasten.schattingLease)}) als rente + afschrijving. Vul de contractgegevens in voor de juiste verdeling.` : ""
        }${
          ib.financieleBatenLasten.renteNietBerekenbaar > 0
            ? ` ⚠ Bij ${ib.financieleBatenLasten.renteNietBerekenbaar} leasecontract(en) kon het rentepercentage niet berekend worden, omdat de ingevulde bedragen niet bij elkaar aansluiten (de opgetelde termijnen dekken de te financieren hoofdsom niet) — controleer de invoer bij dat leasecontract. De rente hierover ontbreekt hierdoor (nog) in dit cijfer.`
            : ""
        }<!--V--> <span class="toelichting">Zie Bijlage: Toelichtingen voor de algemene uitleg (rente versus aflossing).</span><!--/V--></p>
  ${categorieDetailHtml([
    { categorie: "Rente Leningen", totaal: ib.financieleBatenLasten.renteLeningen },
    { categorie: "Rente Lease (financieel)", totaal: ib.financieleBatenLasten.renteLease - (ib.financieleBatenLasten.schattingLease || 0) },
    ...(ib.financieleBatenLasten.schattingLease > 0 ? [{ categorie: "Lease (financieel) zonder contract: GESCHAT (termijnen als rente + afschrijving)", totaal: ib.financieleBatenLasten.schattingLease }] : []),
  ])}`
      : "";

  // "Auto's en machines" als ÉÉN samengevoegde bedrijfskostenpost, in dezelfde stijl als de
  // officiële Belastingdienst-voorbeelden (bevestigd door de gebruiker) — één "totale autokosten"-
  // bedrag voor de auto (afschrijving + de 5 gecategoriseerde autokosten — NIET de lease-rente, die
  // blijft een aparte financieringskost bij "Financiële baten en lasten" hierboven), waar bij
  // privégebruik de bijtelling in zijn GEHEEL van wordt afgetrokken (afgetopt op nul, nooit een
  // negatief bedrag). Machines hebben geen bijtelling en blijven daarom een gewone, volledige
  // aftrekpost; ook een auto zonder bijtellingssituatie (geen privégebruik >500km, of geen lease)
  // blijft een gewone volledige aftrekpost — zie de "Auto — autokosten"-regel hieronder, die dan
  // gewoon gelijk is aan "totale autokosten".
  const autokostenOverigBedrag = ib.autokostenOverig.totaal || 0;
  const onttrekking = ib.leaseAutoKosten?.onttrekking || 0;
  // De werkelijke, normale bijtelling (bijtellingspercentage × cataloguswaarde, vóór de aftopping op
  // de totale autokosten) — op verzoek erbij getoond zodat je in één oogopslag ziet hóéveel er precies
  // wordt afgetopt, in plaats van alleen het (mogelijk lagere) afgetopte bedrag. Bij geen aftopping
  // (onttrekking === normaleBijtellingTotaal) is dit gewoon hetzelfde bedrag, dus dan voegt het niets
  // toe — de tekst hieronder toont het verschil dan ook niet apart.
  const normaleBijtelling = ib.leaseAutoKosten?.normaleBijtellingTotaal || 0;
  const heeftBijtelling = onttrekking > 0;
  const totaleAutokosten = leaseAfschrijvingAuto + autokostenOverigBedrag;
  const aftrekbareAutokosten = Math.max(0, totaleAutokosten - onttrekking);
  // Zeldzame edge case: als in hetzelfde jaar zowel een auto ALS een machine financieel geleased is
  // én er bijtelling van toepassing is, wordt de aftopping intern (computeLeaseAutoKostenVoorJaar,
  // bestaand en ongewijzigd gedrag) berekend tegen de afschrijving van auto ÉN machine samen — terwijl
  // de bijtelling zelf uitsluitend een auto-mechanisme is. Dit rapport waarschuwt in dat zeldzame
  // geval dat dit met de hand gecontroleerd moet worden; de bedragen hierboven/hieronder tellen in dat
  // geval nog steeds correct op tot het echte "Resultaat uit onderneming", alleen de verdeling tussen
  // de "Auto"- en "Machines"-subregels kan er in dat geval technisch iets anders uitzien.
  const gemengdLeaseWaarschuwing = heeftBijtelling && leaseAfschrijvingMachine > 0;

  const autoMachineKostenHtml = (() => {
    const machineBedrag = leaseAfschrijvingMachine + apparatuurAfschrijving;
    const machineRegel = `
  <div class="subrubriek"><span>Afschrijving machines</span><span class="num">${eur(machineBedrag)}</span></div>
  ${ib.afschrijvingen.activaOnvolledig > 0 ? `<p class="toelichting">⚠ ${ib.afschrijvingen.activaOnvolledig} bedrijfsmiddel(en) nog niet volledig ingevuld bij Activa.</p>` : ""}
  ${categorieDetailHtml(ib.afschrijvingen.perCategorie)}`;

    const autoCategorieDetail = categorieDetailHtml([
      { categorie: "Afschrijving", totaal: leaseAfschrijvingAuto },
      { categorie: "Overige autokosten (MRB, verzekering, brandstof, parkeren, onderhoud)", totaal: autokostenOverigBedrag, bronCats: ib.autokostenOverig.categorieen },
    ]);
    const renteVerwijzing =
      ib.leaseAutoKosten && ib.leaseAutoKosten.leaseRenteTotaal > 0
        ? ` Rente op de auto-lease (${eur(ib.leaseAutoKosten.leaseRenteTotaal)}) telt mee in deze aftopping: het is een kost van de auto.`
        : "";
    // Korte, duidelijke tekst WAT er bij de auto als aftrek is verrekend (op verzoek): per situatie.
    const kmDec = (n) => Number(n).toFixed(2).replace(".", ",");
    const autoContracten = (ib.leaseAutoKosten?.contracten || []).filter((c) => c.soort === "auto");
    const bronnen = new Set(autoContracten.map((c) => c.bron));
    const bijtellingTekst = (c) => (c.privegebruikMeerDan500km
      ? `privégebruik > 500 km: bijtelling ${c.bijtellingspercentage ? c.bijtellingspercentage + "% van " + eur(c.cataloguswaarde) + " " : ""}in mindering gebracht${onttrekking < normaleBijtelling && normaleBijtelling > 0 ? " (afgetopt op de autokosten)" : ""}`
      : "privégebruik ≤ 500 km: geen bijtelling");
    const autoUitleg = [];
    if (autoStatus?.[year] === "prive" && autoContracten.length === 0) {
      autoUitleg.push(kmVergoedingForYear
        ? `Privéauto zakelijk gebruikt: ${kmVergoedingForYear.zakelijkeKilometers} km × € ${kmDec(kmVergoedingForYear.vergoedingPerKm)} per km = ${eur(kmVergoedingForYear.bedrag)} aftrek (bij Overige bedrijfskosten); werkelijke autokosten tellen niet mee.`
        : "Privéauto zakelijk gebruikt, maar geen kilometers ingevuld — daardoor nog geen autoaftrek.");
    }
    for (const c of autoContracten) {
      if (c.bron === "financieel") autoUitleg.push(`Financiële lease${c.leaseName ? " (" + c.leaseName + ")" : ""}: afschrijving + autokosten aftrekbaar; ${bijtellingTekst(c)}.`);
      else if (c.bron === "operational") autoUitleg.push(`Operationele lease: leasetermijnen en autokosten zijn volledig aftrekbaar; ${bijtellingTekst(c)}.`);
      else if (c.bron === "koop") autoUitleg.push(`Auto in eigendom: afschrijving + autokosten aftrekbaar; ${bijtellingTekst(c)}.`);
    }
    const autoUitlegHtml = autoUitleg.length ? `<p class="toelichting"><strong>Verrekend als aftrek:</strong> ${autoUitleg.join(" ")}</p>` : "";
    const autoDetailHtml = !heeftBijtelling
      ? `
  <div class="subrubriek"><span>Auto — autokosten (afschrijving + gecategoriseerde kosten)</span><span class="num">${eur(totaleAutokosten)}</span></div>
  ${autoCategorieDetail}
  ${autoUitlegHtml}
  ${totaleAutokosten > 0 ? `<p class="toelichting">${autoUitleg.length ? "" : "Volledig aftrekbaar — geen bijtelling van toepassing. "}${renteVerwijzing}<!--V--> Zie Bijlage: Toelichtingen voor de algemene uitleg.<!--/V--></p>` : ""}`
      : `
  <div class="subrubriek"><span>Auto — totale autokosten (afschrijving + gecategoriseerde kosten)</span><span class="num">${eur(totaleAutokosten)}</span></div>
  ${autoCategorieDetail}
  <div class="subrubriek"><span>Auto — bijtelling privégebruik (afgetopt op de totale autokosten${normaleBijtelling > onttrekking ? `; werkelijke bijtelling ${eur(normaleBijtelling)}` : ""})</span><span class="num">- ${eur(onttrekking)}</span></div>
  <div class="subrubriek"><span>Auto — aftrekbare autokosten</span><span class="num">${eur(aftrekbareAutokosten)}</span></div>
  ${autoUitlegHtml}
  <p class="toelichting">${aftrekbareAutokosten <= 0 ? "Bij deze aftopping is per saldo niets van de autokosten dit jaar aftrekbaar. " : ""}${
        gemengdLeaseWaarschuwing
          ? "⚠ Dit jaar is zowel een auto als een machine financieel geleased — controleer de aftopping handmatig, de app berekent deze nu tegen de afschrijving van auto én machine samen. "
          : ""
      }${renteVerwijzing}<!--V--> Zie Bijlage: Toelichtingen voor de algemene uitleg van dit mechanisme — de volledige berekening per contract staat in de app zelf.<!--/V--></p>`;

    const totaalAutoMachine = machineBedrag + (heeftBijtelling ? aftrekbareAutokosten : totaleAutokosten);
    return `
  <div class="rubriek"><span>3. Auto's en machines</span><span class="num">${eur(totaalAutoMachine)}</span></div>
  ${machineRegel}
  ${autoDetailHtml}`;
  })();

  // Transparante uitsplitsing van "Huur (deels zakelijk)" en, sinds v291, dezelfde uitsplitsing voor
  // "Energie-water (deels zakelijk)"/"Gemeentelijke kosten (deels zakelijk)" — elk alleen zichtbaar
  // zodra er dit jaar daadwerkelijk transacties in die categorie zijn (computeGedeelde...VoorJaar
  // geeft anders null terug). Zelfde stijl als de financiële-lease-auto-uitsplitsing hierboven.
  // De zakelijke delen van de "(deels zakelijk)"-categorieën staan sinds 14V8 als regel in rubriek 4 (zie boxMapping.js).
  const gedeeldeHuisvestingHtml = werkruimteRegelHtml(year, classified, categoryZakelijkPercentage, werkruimteStatus, categoryBtwRates);

  const priveHtml =
    ib.priveOnttrekkingen.totaal > 0 || ib.priveStortingen.totaal > 0
      ? `
  <div class="rubriek"><span>6. Privéonttrekkingen en -stortingen</span><span></span></div>
  ${ib.priveOnttrekkingen.totaal > 0 ? `<div class="subrubriek"><span>Privéonttrekkingen</span><span class="num">${eur(ib.priveOnttrekkingen.totaal)}</span></div>${categorieDetailHtml(ib.priveOnttrekkingen.perCategorie)}` : ""}
  ${ib.priveStortingen.totaal > 0 ? `<div class="subrubriek"><span>Privéstortingen</span><span class="num">${eur(ib.priveStortingen.totaal)}</span></div>${categorieDetailHtml(ib.priveStortingen.perCategorie)}` : ""}`
      : "";

  const belastingenHtml = rubriekBlok(null, ib.belastingenGeenKostenpost.naam, ib.belastingenGeenKostenpost.totaal, ib.belastingenGeenKostenpost.toelichting, ib.belastingenGeenKostenpost.perCategorie);
  const verkoopActivaHtml = rubriekBlok(
    null, "Verkoop activa", ib.verkoopActivaTotal,
    "Kan een boekwinst of -verlies opleveren — deze app kent de boekwaarde niet en berekent dat niet automatisch."
  );
  const nogNietIngedeeldHtml =
    ib.nogNietIngedeeld.length > 0
      ? `
  <div class="rubriek"><span>Nog niet ingedeeld in deze structuur</span><span></span></div>
  ${ib.nogNietIngedeeld.map((r) => `<div class="subrubriek"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("")}`
      : "";

  return `
  <h1>Indicatieve aangifteberekening / fiscale reconstructie — ${year}</h1>
  <p class="subtitle">
    Status: ${STATUS_EMOJI[yearStatus]} ${statusTekst(yearStatus, openPunten.length)} <span>(gegevenscontrole, geen fiscale beoordeling)</span><br>
    <span>Indicatieve fiscale uitkomst op basis van de gereconstrueerde bankadministratie en de gekozen aannames — geen werkelijke aangifte.</span><br>
    <span>Uitgangspunten (uit de basisvragen): ${korRegeling ? "valt onder de KOR" : `${btwVerlegd ? "BTW-verlegd" : "gewone BTW-plicht"} · geen KOR`} · urencriterium: ${zaStatus === "ja" ? "ja" : zaStatus === "nee" ? "nee" : "onbekend (beide scenario's getoond)"}${zaStatusRaw == null && zaStatus !== "onbekend" ? " (niet aangegeven)" : ""} · op basis van beschikbare bankgegevens</span>${factuurjaarRegel(classified, year) ? `<br>
    <span>${factuurjaarRegel(classified, year)}</span>` : ""}
  </p>
  ${samenvattingHtml}

  <h2>Winst-en-verliesrekening — in de volgorde van de IB-aangifte</h2>
  <p class="toelichting">Alle bedragen hieronder zijn netto, exclusief BTW (niet het bruto bankbedrag), tenzij anders vermeld.</p>
  <div class="wvr">
    ${rubriekBlok(1, ib.opbrengsten.naam, ib.opbrengsten.totaal, null, ib.opbrengsten.perCategorie)}
    ${rubriekBlokAltijd(2, "Inkoopkosten", inkoopkostenBedrag, null, ib.inkoopkosten.perCategorie.filter((r) => ["Zakelijke inkoop non-voedingsmiddelen", "Zakelijke inkoop voedingsmiddelen"].includes(r.categorie) && r.totaal))}
    ${rubriekBlokAltijd(null, "Uitbesteed werk", uitbesteedWerkBedrag, "Inhuur van derden/freelancers.", ib.inkoopkosten.perCategorie.filter((r) => r.categorie === "Inhuur personeel" && r.totaal))}
    ${rubriekBlokAltijd(null, "Andere externe kosten", andereExterneKostenBedrag, "Op dit moment zijn hier geen categorieën aan gekoppeld.")}
    ${autoMachineKostenHtml}
    ${overigeBedrijfskostenHtml}
    ${financieelHtml}
    ${gedeeldeHuisvestingHtml}
    <div class="rubriek total"><span>Resultaat uit onderneming (winst, netto)</span><span class="num">${eur(summary.winst)}</span></div>
    ${priveHtml}
    ${belastingenHtml}
    ${verkoopActivaHtml}
    ${nogNietIngedeeldHtml}
  </div>

  ${!korRegeling && kwartalen.length > 0 ? `
  <h2>BTW per kwartaal</h2>
  <table>
    <thead><tr><th>Aangifterubriek</th>${kwartalen.map((q) => `<th class="num">Q${q.kwartaal}</th>`).join("")}<th class="num">Totaal jaar</th></tr></thead>
    <tbody>
      <tr><td>1a Omzet 21%</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBruto21 - q.verschuldigdBtw21)}</td>`).join("")}<td class="num"><strong>${eur(kwartalen.reduce((a, q) => a + (q.omzetBruto21 - q.verschuldigdBtw21), 0))}</strong></td></tr>
      <tr><td>1b Omzet 9%</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBruto9 - q.verschuldigdBtw9)}</td>`).join("")}<td class="num"><strong>${eur(kwartalen.reduce((a, q) => a + (q.omzetBruto9 - q.verschuldigdBtw9), 0))}</strong></td></tr>
      <tr><td>1e Verlegd</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBrutoVerlegd)}</td>`).join("")}<td class="num"><strong>${eur(kwartalen.reduce((a, q) => a + (q.omzetBrutoVerlegd), 0))}</strong></td></tr>
      <tr><td>5b Voorbelasting</td>${kwartalen.map((q) => `<td class="num">${eur(q.voorbelasting)}</td>`).join("")}<td class="num"><strong>${eur(kwartalen.reduce((a, q) => a + (q.voorbelasting), 0))}</strong></td></tr>
      ${kwartalen.some((q) => (q.btwPrivegebruikAuto || 0) > 0.004) ? `<tr><td>1d Privégebruik auto</td>${kwartalen.map((q) => `<td class="num">${(q.btwPrivegebruikAuto || 0) > 0.004 ? eur(q.btwPrivegebruikAuto) : ""}</td>`).join("")}<td class="num"><strong>${eur(kwartalen.reduce((a, q) => a + (q.btwPrivegebruikAuto || 0), 0))}</strong></td></tr>` : ""}
      <tr class="total"><td>Saldo</td>${kwartalen
        .map((q) => {
          const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0);
          return `<td class="num">${eur(Math.abs(saldo))}${Math.abs(saldo) < 0.005 ? "" : saldo >= 0 ? " te betalen" : " terug"}</td>`;
        })
        .join("")}${(() => { const t = kwartalen.reduce((a, q) => a + q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0), 0); return `<td class="num"><strong>${eur(Math.abs(t))} ${t >= 0 ? "te betalen" : "terug"}</strong></td>`; })()}</tr>
    </tbody>
  </table>
  <p class="vergelijk-hint">Vergelijk het saldo per kwartaal hierboven met wat er daadwerkelijk is aangegeven en betaald.</p>` : ""}
  ${btwPrivegebruikNoot}
  <p class="toelichting">Details van de onderliggende BTW-analyse per kwartaal en het volledige categorieoverzicht zijn in de app zelf terug te vinden.</p>

  ${(() => {
    // nieuw-V8R4 — alleen wat niet al in het aangifteoverzicht bovenaan staat (Boska 18-11: dubbel, voegt niets toe).
    const delen = [];
    if (!zaScenarios && ondernemersaftrekVoorJaar && (ondernemersaftrekVoorJaar.verrekendUitReserve > 0 || ondernemersaftrekVoorJaar.nietGerealiseerdNieuw > 0)) {
      if (ondernemersaftrekVoorJaar.verrekendUitReserve > 0) delen.push(`<p>Zelfstandigenaftrek: ${eur(ondernemersaftrekVoorJaar.verrekendUitReserve)} verrekend uit eerdere jaren.</p>`);
      if (ondernemersaftrekVoorJaar.nietGerealiseerdNieuw > 0) delen.push(`<p>⚠ ${eur(ondernemersaftrekVoorJaar.nietGerealiseerdNieuw)} zelfstandigenaftrek niet benut (winst te laag), gereserveerd voor later.</p>`);
    }
    if (!zaScenarios && heffingskortingen.werkelijkIngevuld) delen.push(`<p class="toelichting">Heffingskorting: werkelijk ingevuld bedrag gebruikt (geschat was ${eur(heffingskortingen.geschatTotaal)}).</p>`);
    if (!zaScenarios && ibEstimate.beperkingAftrek > 0) delen.push(`<p>Beperking aftrek (aftrekposten in de hoogste schijf beperkt aftrekbaar): ${eur(ibEstimate.beperkingAftrek)} extra IB, al meegeteld.</p>`);
    if (ibEstimate.tariefStatus && ibEstimate.tariefStatus !== "standaard") delen.push(`<p class="toelichting">⚠ Tarieven ${year}: ${ibEstimate.tariefStatus === "aangepast" ? "door jou aangepast" : ibEstimate.tariefStatus === "voorlopig" ? "voorlopig, uit het Belastingplan (kan nog wijzigen)" : "benadering met de waarden van het dichtstbijzijnde bekende jaar"}.</p>`);
    if (investeringenForYear.totaalInvestering > 0) {
      delen.push(`<p>Investeringen ${year}: <strong>${eur(investeringenForYear.totaalInvestering)}</strong> → mogelijke KIA: <strong>${eur(mogelijkeKia)}</strong>${investeringenForYear.onvolledig > 0 ? ` <span style="color:#b45309;">(⚠ ${investeringenForYear.onvolledig} bedrijfsmiddel(en) onvolledig ingevuld)</span>` : ""}<!--V--> <span class="toelichting">Zie Bijlage.</span><!--/V--></p>`);
      if (mogelijkeKia > 0) {
        delen.push(zaScenarios
          ? `<p>Ná mogelijke KIA: mét zelfstandigenaftrek → IB ${eur(Math.max(0, zaScenariosNaKia.metZelfstandigenaftrek.ib.belasting - zaScenariosNaKia.metZelfstandigenaftrek.heffingskortingen.totaal))}, Zvw ${eur(zaScenariosNaKia.metZelfstandigenaftrek.zvw.bijdrage)}; zonder → IB ${eur(Math.max(0, zaScenariosNaKia.zonderZelfstandigenaftrek.ib.belasting - zaScenariosNaKia.zonderZelfstandigenaftrek.heffingskortingen.totaal))}, Zvw ${eur(zaScenariosNaKia.zonderZelfstandigenaftrek.zvw.bijdrage)}.</p>`
          : `<p>Ná mogelijke KIA: IB ${eur(Math.max(0, ibEstimateNaKia.belasting - heffingskortingenNaKia.totaal))} (na heffingskortingen), Zvw ${eur(zvwEstimateNaKia.bijdrage)}.</p>`);
        delen.push(`<p class="toelichting">⚠ Dit is een scenario, geen vaststaand bedrag: controleer per bedrijfsmiddel de KIA-beoordeling (Activa-paneel/leasegegevens) voordat de KIA wordt toegepast.</p>`);
      }
    }
    return delen.length ? `<h2>Aanvullende toelichting</h2>\n  ${delen.join("\n  ")}` : "";
  })()}

  ${algemeneGegevensHtml}`;
}

export function buildAangiftevoorstelHtml(yearsToInclude, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, aandachtspuntenBlok = "", werkruimteStatus = null, balans = "zonder", beginsaldo = null) {
  // Pre-pass: winst per jaar bepalen (los van de rest van de sectie-opbouw hieronder) zodat de
  // verrekening van niet-gerealiseerde zelfstandigenaftrek chronologisch over de jaren in DIT
  // rapport kan worden doorgerekend, vóórdat de jaarsecties zelf worden gebouwd. Jaren die
  // resolven naar zelfstandigenaftrekStatus "onbekend" (expliciet, of een onbeantwoord jaar in een
  // niet-legacy dossier) doen bewust niet mee in deze keten (die tonen hun eigen twee
  // scenario's, los van reserveverrekening).
  // nieuw-V7R8 — reserve over ALLE jaren met bankgegevens, net als het scherm (useOndernemersaftrekPerJaar), ook als het rapport later
  // begint. Zo telt niet-gerealiseerde zelfstandigenaftrek van eerdere jaren altijd mee; de algemene waarschuwing daarover verviel (Boska 18-11).
  const alleJarenMetData = [...new Set(classified.filter((tx) => !tx.isMirror).map((tx) => tx.year))].sort((a, b) => a - b);
  // nieuw-V9R1 — alleen jaren MET bankgegevens (Boska 19-11: samenvatting voor klant DB 2026 week af als het rapport ook
  // 2024/2025 zonder gegevens bevatte; die bouwden een reserve zelfstandigenaftrek op die er niet is).
  const jarenVoorReserve = alleJarenMetData
    .filter((year) => resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, year, zaLegacyJaDefault) !== "onbekend")
    .map((year) => ({
      year,
      winst: computeWinstVoorJaar(year, classified, categoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaDetails, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus),
      zelfstandigenaftrekStatus: zelfstandigenaftrekStatus?.[year],
      startersaftrekToegepast: startersaftrekStatus?.[year] === "ja",
    }));
  const ondernemersaftrekPerJaar = computeOndernemersaftrekMetReserve(jarenVoorReserve);

  // Paginascheiding tussen jaarsecties (en vóór de bijlage) — zowel de oudere `page-break-before`
  // als de moderne `break-before` (browsers/PDF-generators op bijv. iPad/tablet ondersteunen niet
  // altijd dezelfde variant, dus beide staan op hetzelfde element).
  const PAGE_BREAK_DIVIDER = '\n  <div style="page-break-before: always; break-before: page;"></div>\n';

  JAAR_TOTALEN = [];
  const sections = yearsToInclude
    .map((year) => buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, ondernemersaftrekPerJaar[year], startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, werkruimteStatus, balans, beginsaldo))
    .join(PAGE_BREAK_DIVIDER);
  const bepaald = JAAR_TOTALEN.filter((j) => !j.onbekend);
  const onbekendeJaren = JAAR_TOTALEN.filter((j) => j.onbekend).map((j) => j.year);
  const grandTotaal = bepaald.reduce((a, j) => a + j.totaal, 0);
  // release33V5 — bij meerdere jaren bovenaan een overzicht per jaar met totaal (vervangt het losse totaalblok onderaan).
  const somVan = (k) => bepaald.reduce((a, j) => a + (j[k] || 0), 0);
  const btwTekst = (v) => v == null ? "KOR" : `${eur(Math.abs(v))} ${v < 0 ? "terug" : "te betalen"}`;
  const heeftBtw = JAAR_TOTALEN.some((j) => j.btw != null);
  const overzichtJarenHtml = yearsToInclude.length > 1 && JAAR_TOTALEN.length > 0
    ? `<h2>Overzicht ${Math.min(...yearsToInclude)} – ${Math.max(...yearsToInclude)}</h2>
  <div class="totaal-kaart"><table class="samenvatting-scenarios overzicht-jaren"><thead><tr><th>Jaar</th><th>Winst uit onderneming</th><th>IB ná heffingskorting</th><th>Zvw-bijdrage</th><th>IB + Zvw</th>${heeftBtw ? "<th>BTW-saldo jaar</th>" : ""}</tr></thead><tbody>
    ${JAAR_TOTALEN.map((j) => j.onbekend
      ? `<tr><td><strong>${j.year}</strong></td><td class="num">${eur(j.winst)}</td><td class="num" colspan="3">urencriterium onbekend — zie de twee scenario's in dat jaar</td>${heeftBtw ? `<td class="num btw">${btwTekst(j.btw)}</td>` : ""}</tr>`
      : `<tr><td><strong>${j.year}</strong></td><td class="num">${eur(j.winst)}</td><td class="num">${eur(j.ib)}</td><td class="num">${eur(j.zvw)}</td><td class="num"><strong>${eur(j.totaal)}</strong></td>${heeftBtw ? `<td class="num btw">${btwTekst(j.btw)}</td>` : ""}</tr>`).join("")}
    <tr class="totaal"><td>Totaal${onbekendeJaren.length ? ` (zonder ${onbekendeJaren.join(", ")})` : ""}</td><td class="num">${eur(somVan("winst"))}</td><td class="num">${eur(somVan("ib"))}</td><td class="num">${eur(somVan("zvw"))}</td><td class="num">${eur(grandTotaal)}</td>${heeftBtw ? `<td class="num btw">${btwTekst(bepaald.reduce((a, j) => a + (j.btw || 0), 0))}</td>` : ""}</tr>
  </tbody></table><p class="kerncijfers-voetnoot">Indicatief, op basis van de bankgegevens. Zonder verrekening van voorschotten, voorlopige aanslagen of wat al is betaald.${heeftBtw ? " De BTW wordt per kwartaal aangegeven en staat daarom apart, niet in het totaal IB + Zvw." : ""} Per jaar volgt hieronder de volledige berekening.</p></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><title>Indicatieve aangifteberekening ${yearsToInclude.join(", ")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 24px 32px; font-size: 11px; line-height: 1.35; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  h2 { font-size: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin: 24px 0 10px; page-break-after: avoid; }
  h3 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  th { font-size: 9px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
  tr.total td { font-weight: bold; border-top: 1px solid #0f172a; border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .wvr { margin-bottom: 8px; }
  .wvr .rubriek { display: flex; justify-content: space-between; padding: 5px 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
  .wvr .subrubriek { display: flex; justify-content: space-between; padding: 3px 6px 3px 18px; border-bottom: 1px solid #f8fafc; color: #475569; font-weight: 400; }
  details.bron > summary { list-style: none; cursor: pointer; }
  details.bron > summary::-webkit-details-marker { display: none; }
  details.bron > summary:hover { background: #f8fafc; }
  .bron-knop { color: #0f766e; font-size: 9px; font-weight: 600; margin-left: 4px; }
  details.bron[open] > summary { background: #f0fdfa; }
  .bron-inhoud { margin: 2px 0 8px 32px; padding: 6px 8px; border-left: 2px solid #99f6e4; background: #f8fafc; }
  .bron-inhoud table { font-size: 9.5px; margin-bottom: 4px; }
  .bron-inhoud th, .bron-inhoud td { padding: 2px 5px; }
  @media print { .bron-knop, .bron-inhoud { display: none !important; } }
  .wvr .categorie-detail { display: flex; justify-content: space-between; padding: 2px 6px 2px 32px; color: #94a3b8; font-weight: 400; font-size: 9.5px; }
  .wvr .rubriek.total { border-top: 2px solid #0f172a; border-bottom: none; margin-top: 4px; padding-top: 8px; background: #f0fdf4; }
  .wvr .toelichting { color: #64748b; font-size: 9.5px; font-style: italic; margin: 0 0 6px 6px; }
  /* Belangrijke blokken niet halverwege laten afbreken over een paginagrens (zowel de moderne
     break-inside als de oudere page-break-inside — browsers/PDF-generators gebruiken wat ze
     kennen; vooral bij printen/opslaan-als-PDF op tablets is dit niet altijd betrouwbaar zonder
     beide varianten). */
  .rubriek, .wvr .rubriek { break-inside: avoid; page-break-inside: avoid; }
  /* v262 — 3 losse kaarten i.p.v. 1 dicht "samenvatting"-vlak: kerncijfers (met de winst en de
     indicatieve IB/Zvw duidelijk groter dan de tussenstappen), het BTW-saldo, en de dossierstatus/
     aannames — elk met eigen witruimte, zodat in één oogopslag duidelijk is wat bij elkaar hoort. */
  .kerncijfers-kaart { margin: 0 0 12px; padding: 14px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .kerncijfers-hoofd { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
  .kerncijfers-hoofd .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; color: #64748b; }
  .kerncijfers-hoofd .bedrag-groot { font-size: 22px; font-weight: bold; color: #0f172a; }
  .kerncijfers-stappen { margin: 0 0 8px; }
  .kerncijfers-stappen > div { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10.5px; color: #64748b; }
  .kerncijfers-stappen > div.tussentotaal { font-weight: 600; color: #1e293b; border-top: 1px solid #f1f5f9; margin-top: 3px; padding-top: 6px; }
  .kerncijfers-resultaat { display: flex; flex-wrap: wrap; gap: 24px; padding-top: 10px; margin-top: 4px; border-top: 1px solid #e2e8f0; }
  .kerncijfers-resultaat > div { display: flex; flex-direction: column; }
  .kerncijfers-resultaat .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.02em; color: #64748b; }
  .kerncijfers-resultaat .bedrag-groot { font-size: 19px; font-weight: bold; color: #0f172a; }
  .kerncijfers-voetnoot { font-size: 9.5px; color: #94a3b8; margin: 6px 0 0; }
  .aangifte-kaart { margin: 0 0 12px; padding: 12px 16px; background: #fff; border: 2px solid #0f172a; border-radius: 10px; }
  .ak-kop { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .ak-kop b { font-size: 15px; } .ak-kop span { color: #64748b; font-size: 11px; }
  .ak-scherm { margin-top: 12px; font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #1d4ed8; break-after: avoid; page-break-after: avoid; }
  .ak-r { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; font-size: 12px; border-bottom: 1px dotted #e2e8f0; break-inside: avoid; }
  .ak-r.sub { padding-left: 14px; color: #64748b; font-size: 11px; }
  .ak-r.sub.sub2 { padding-left: 28px; font-style: italic; }
  .ak-r.tot, .ak-tabel tr.tot td { font-weight: 700; border-bottom: 1px solid #0f172a; }
  .ak-r.groot, .ak-tabel tr.groot td { font-size: 15px; font-weight: 800; border-bottom: 0; padding-top: 8px; }
  .ak-tabel { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; } .ak-tabel td, .ak-tabel th { padding: 3px 4px; border-bottom: 1px dotted #e2e8f0; text-align: left; } .ak-tabel .num { text-align: right; }
  .ak-sub { margin-top: 6px; font-size: 11px; font-weight: 700; color: #334155; }
  .ak-blok { margin-top: 8px; border: 1.5px solid #94a3b8; border-radius: 8px; padding: 4px 10px 8px; break-inside: auto; }
  .ak-meld { margin: 6px 0; padding: 6px 10px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; font-size: 11px; color: #9a3412; } .ak-meld ul { margin: 2px 0 0 16px; padding: 0; }
  .ak-r.in { background: #eff6ff; font-weight: 600; padding-left: 6px; padding-right: 6px; border-bottom: 1px solid #fff; }
  .ak-sub2 { margin-top: 4px; font-size: 10.5px; font-weight: 600; color: #64748b; font-style: italic; }
  .ak-noot { font-size: 10.5px; color: #64748b; margin: 4px 0 0; }
  .ak-btw { margin-top: 10px; background: #f8fafc; border-radius: 6px; padding: 6px 10px; font-size: 12px; display: flex; justify-content: space-between; }
  .totaal-kaart { margin: 0 0 12px; padding: 10px 14px; background: #f0f9ff; border: 2px solid #0f172a; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .totaal-regel { display: flex; justify-content: space-between; gap: 16px; padding: 2px 0; }
  .totaal-eind { border-top: 1px solid #94a3b8; margin-top: 4px; padding-top: 6px; font-size: 14px; font-weight: bold; color: #0f172a; }
  .btw-kaart { margin: 0 0 12px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .samenvatting-btw { margin: 0; }
  .samenvatting-btw th, .samenvatting-btw td { border-bottom: 1px solid #e2e8f0; padding: 3px 6px; }
  .samenvatting-btw th:not(:first-child), .samenvatting-btw td.num { text-align: right; }
  .status-kaart { margin: 0 0 20px; padding: 12px 14px; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .status-kaart p { margin: 0; }
  .status-kaart-groen { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .status-kaart-groen .toelichting { color: #166534; opacity: 0.85; }
  .status-kaart-oranje, .status-kaart-rood { background: #fffbeb; border: 1px solid #fde68a; }
  .status-kaart-oranje .toelichting, .status-kaart-rood .toelichting { color: #92400e; opacity: 0.85; }
  .status-kaart ul { margin: 4px 0 0 16px; padding: 0; font-size: 10px; color: #78350f; }
  .status-kaart li { margin-bottom: 2px; }
  .status-kaart .aannames-kop { margin: 6px 0 0; font-size: 10px; font-weight: bold; color: #78350f; }
  .samenvatting-scenarios { width: 100%; margin: 8px 0; font-size: 10px; }
  .samenvatting-scenarios th, .samenvatting-scenarios td { border-bottom: 1px solid #e2e8f0; padding: 3px 6px; text-align: left; }
  .samenvatting-scenarios th:not(:first-child), .samenvatting-scenarios td.num { text-align: right; }
  .overzicht-jaren { font-size: 11px; } .overzicht-jaren td.btw { color: #64748b; } .overzicht-jaren tr.totaal td { font-weight: bold; border-top: 2px solid #0f172a; border-bottom: none; }
  .controledoel { margin: 20px 0; padding: 10px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; color: #1e3a5f; font-size: 10.5px; line-height: 1.5; }
  .onzekerheden { margin: 0 0 20px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; color: #78350f; font-size: 10.5px; line-height: 1.5; }
  .onzekerheden ul { margin: 6px 0 6px 16px; padding: 0; }
  .onzekerheden li { margin-bottom: 3px; }
  .onzekerheden p { margin: 6px 0; }
  .vergelijk-hint { color: #2563eb; font-size: 9.5px; font-style: italic; margin: -4px 0 8px; }
  .disclaimer { margin-top: 28px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; font-size: 9.5px; }
  @page { size: A4 portrait; margin: 16mm; }
</style></head>
<body>
  <p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
  ${overzichtJarenHtml}
  ${sections}
  ${PAGE_BREAK_DIVIDER}
  <h2>Lees dit vóór het gebruik van de cijfers</h2>
  <div class="controledoel">
    <strong>Waar is dit voor?</strong> Dit overzicht is een <strong>onafhankelijke reconstructie</strong>: het laat
    zien wat er volgens uitsluitend de bankgegevens aangegeven en betaald had moeten worden. Vergelijk de bedragen
    hierboven gerust met een eerder ingediende aangifte — maar een verschil betekent niet automatisch dat er iets
    misging in die eerdere aangifte, en ook niet automatisch dat deze reconstructie klopt. Een eerdere aangifte kan
    bijvoorbeeld gebaseerd zijn op facturen die niet via deze bankrekening liepen, memoriaalboekingen, correcties of
    suppleties — dingen die niet uit bankgegevens blijken. Een verschil is dus vooral een signaal om samen na te gaan
    waar het vandaan komt, niet een oordeel op zichzelf. De winst-en-verliesrekening hierboven staat bewust in
    dezelfde volgorde als de IB-aangifte zelf.
  </div>
  <div class="onzekerheden">
    <strong>Wat deze app niet kan weten</strong>
    <p>Deze reconstructie is gebaseerd op uitsluitend de banktransacties. Een aantal dingen dat voor de aangifte
    relevant kan zijn, staat niet (of niet volledig) op een bankrekening, en zit dus niet in dit overzicht:</p>
    <ul>
      <li>Contante ontvangsten en uitgaven</li>
      <li>Openstaande facturen — nog te ontvangen bedragen (debiteuren) en nog te betalen bedragen (crediteuren) die aan het einde van het jaar nog niet via de bank zijn verwerkt</li>
      <li>Voorraad — inkoopwaarde en verkoopwaarde van onverkochte goederen aan het begin/einde van het jaar${
        heeftVoorraad ? " (opgegeven is dat er voorraad is — dat vraagt een eigen registratie, dit overzicht neemt dat niet mee)" : ""
      }</li>
      <li>Privégebruik van bedrijfsmiddelen (bijv. een auto) voor zover dat niet als aparte correctie is vastgelegd</li>
      <li>Inkomsten of kosten die buiten deze bankrekening om liepen (bijv. via een andere rekening, contant, of in natura)</li>
      <li>Fiscale situaties die niet uit bankgegevens blijken (bijv. specifieke regelingen rond de eigen woning of andere ondernemingen)</li>
      <li>Correcties, memoriaalboekingen of suppleties uit een eerdere administratie</li>
    </ul>
    <p>Dit maakt de reconstructie niet minder waardevol — het is juist onderdeel van een betrouwbare aanpak om
    zichtbaar te maken wat wél en niet uit de bankgegevens kan worden vastgesteld.</p>
  </div>
  <div class="disclaimer">
    Dit is een <strong>voorstel</strong>, samengesteld uit de eigen bankgegevens en categorie-indeling in deze app —
    geen officiële aangifte en geen belastingadvies. Controleer de cijfers altijd zelf of met een boekhouder voordat
    er aangifte wordt gedaan.
  </div>
  ${aandachtspuntenBlok}
  <!--UITLEG-START-->
  ${PAGE_BREAK_DIVIDER}
  ${buildBijlageToelichtingenHtml()}
  <!--UITLEG-END-->
</body></html>`;
}

// Bijlage met de algemene, niet-jaargebonden toelichtingen bij buildYearSection — één keer, aan het
// eind van het hele (meerjaren-)rapport, in plaats van herhaald per jaar. In elke jaarsectie staat
// op de plek waar zo'n toelichting zou staan alleen het jaarspecifieke bedrag/de
// jaarspecifieke waarschuwing (indien van toepassing) plus een verwijzing hierheen. Puur tekst,
// géén bedragen die uit een jaarsectie zijn weggehaald — elk bedrag blijft in de jaarsectie zelf
// staan.
function buildBijlageToelichtingenHtml() {
  return `
  <h1>Bijlage: Toelichtingen</h1>
  <p class="subtitle">Algemene uitleg bij een aantal rubrieken hierboven — hier maar één keer uitgeschreven in plaats van per jaar.</p>

  <h2>Financiële baten en lasten — rente versus aflossing</h2>
  <p class="toelichting">
    Alleen de rente is een kostenpost — de rest van elke termijn is aflossing op de financiering, een
    balansmutatie, geen bedrijfskosten. Is bij een leasecontract de "soort" (auto/machine) ingevuld,
    dan is het geleasde object wél een eigen bedrijfsmiddel van de zzp'er dat gekapitaliseerd en
    afgeschreven wordt — zie dan "Afschrijving auto's"/"Afschrijving machines" in de jaarsectie (en
    bij een auto met privégebruik &gt;500 km/jaar ook de onttrekking, zie hieronder). Zonder ingevulde
    "soort" (het gebruikelijke geval tot nu toe) staat bij "Financiële baten en lasten" alleen de
    rente, zoals voorheen.
  </p>

  <h2>Afschrijvingen — algemeen</h2>
  <p class="toelichting">
    Een bedrijfsmiddel (auto, apparatuur of machine) mag niet in één keer als kosten worden
    afgetrokken — dit zijn bedrijfsmiddelen (activa) die over de gebruiksduur afgeschreven moeten
    worden (aanschafwaarde minus restwaarde, verdeeld over de jaren). Zodra bedrijfsmiddelen zijn
    geregistreerd bij "Activa" (aanschafwaarde, -datum, afschrijvingstermijn, restwaarde) gebruikt
    deze app de daadwerkelijk berekende afschrijving voor het betreffende jaar; is dat nog niet
    ingevuld, dan berekent deze app geen afschrijvingsschema en staat het bruto aanschafbedrag in de
    jaarsectie alleen ter herkenning.
  </p>

  <h2>Financiële lease auto/machine — kapitalisatie en (bij privégebruik) onttrekking</h2>
  <p class="toelichting">
    Bij financiële lease is het geleasde object (auto of machine) een eigen bedrijfsmiddel van de
    zzp'er, dat gekapitaliseerd en afgeschreven wordt (aanschafwaarde = het gefinancierde bedrag bij
    aanvang van het contract, niet de cataloguswaarde; bij een auto geldt een fiscale minimale
    afschrijvingstermijn van ${MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN} jaar). Bij een geleasede auto
    met meer dan 500 km privégebruik per jaar geldt daarnaast een "onttrekking": de normale bijtelling
    (bijtellingspercentage × cataloguswaarde) wordt afgetopt op de werkelijke totale autokosten van
    dat jaar — dit is geen gewone bijtelling zoals bij een werknemer, maar een correctie op de
    aftrekbare kosten van de zzp'er zelf.
  </p>
  <p class="toelichting">
    "Totale autokosten" voor deze aftopping bestaat uit de afschrijving plus de 5 gecategoriseerde
    autokosten (MRB, verzekering, brandstof, parkeren, onderhoud) — dezelfde bedragen die bij
    "Auto's en machines" in de jaarsectie staan, plus de rente van de financiële lease: die rente is
    een kost van de auto en hoort bij "kosten voor deze auto" in de aangifte.
  </p>
  <p class="toelichting">
    Bij "Auto's en machines" in de jaarsectie staat daarom één samengevoegd bedrag: de "totale
    autokosten" (afschrijving + gecategoriseerde kosten) minus de bijtelling, afgetopt op nul — nooit
    een negatieve aftrekpost. Is de bijtelling hoger dan of gelijk aan de totale autokosten, dan is er
    per saldo niets van die kosten (ook de lease-rente niet) dat jaar aftrekbaar.
  </p>
  <p class="toelichting" style="color:#b45309;">
    ⚠ Bij een tussentijds vervangen/geherfinancierd leasecontract van dezelfde auto (herkend op een
    gelijk kenteken) telt de afschrijving maar één keer mee, doorlopend vanaf de OORSPRONKELIJKE
    aanschaf/financiering — het bedrag van een later, gekoppeld contract wordt bewust NIET nogmaals
    als afschrijvingsbasis meegeteld (dat zou dubbel tellen), ook al kan het financieel om een nieuw,
    hoger bedrag gaan. Dit is een gangbare, maar door de gebruiker te controleren aanname: klopt het
    niet dat de herfinanciering puur het openstaande saldo van dezelfde auto oversluit (bijv. omdat er
    feitelijk extra in de auto is geïnvesteerd), controleer dan handmatig of de afschrijvingsbasis nog
    aansluit. De rente van elk gekoppeld contract blijft wel gewoon apart doorlopen over zijn eigen
    bedrag/periode.
  </p>

  <h2>Vroegtijdige verkoop/veiling van een leaseauto of -machine</h2>
  <p class="toelichting">
    Wordt een financieel-geleased bedrijfsmiddel vroegtijdig verkocht of geveild (bijv. bij niet
    nakomen van betalingen), dan spelen twee onafhankelijke bedragen — vaak door elkaar gehaald, maar
    fiscaal wezenlijk verschillend:
  </p>
  <p class="toelichting">
    <strong>1. Boekresultaat</strong> = de verkoop-/veilingopbrengst minus de fiscale boekwaarde op de
    einddatum (aanschafwaarde minus de tot dan toe berekende afschrijving). Dit is een gewone
    winst-/verliespost van de onderneming en is al verwerkt in de winst hierboven: een <strong>plus</strong>
    (opbrengst hoger dan de boekwaarde) is winst en verhóógt de winst, een <strong>min</strong> (opbrengst
    lager dan de boekwaarde) is een aftrekpost en verlaagt de winst. De afschrijving zelf stopt vanaf de
    einddatum (geen afschrijving meer in latere jaren).
  </p>
  <p class="toelichting">
    <strong>2. Restschuld of overwaarde</strong> = de opbrengst vergeleken met de nog openstaande
    lease-hoofdsom (dus NIET de boekwaarde) op dat moment. Is de opbrengst lager dan de openstaande
    hoofdsom, dan blijft er een restschuld over die nog aan de leasemaatschappij moet worden betaald — dat
    is een balansmutatie (aflossing), GEEN kostenpost, en telt dus niet mee in de winst hierboven. Is de
    opbrengst hoger, dan wordt het verschil (overwaarde) normaal gesproken door de leasemaatschappij
    terugbetaald — ook dat is geen aparte winstpost (de eventuele winst zit al in punt 1 verwerkt).
    Deze app berekent de openstaande hoofdsom op basis van de daadwerkelijke bankbetalingen tot aan de
    einddatum — dit kan afwijken van wat de leasemaatschappij zelf als afkoopsom rekent (bijv. bij
    afwijkende voorwaarden bij vroegtijdige beëindiging), dus controleer dit bedrag altijd bij de
    leasemaatschappij zelf.
  </p>
  <p class="toelichting" style="color:#b45309;">
    ⚠ Zonder "Soort" (auto/machine) ingevuld bij dit leasecontract kent deze app geen fiscale
    boekwaarde van het object, en kan dus ook geen boekresultaat worden bepaald — alleen de
    restschuld/overwaarde wordt dan getoond.
  </p>
  <p class="toelichting">
    Zijn (een deel van) de leasetermijnen betaald vanaf een rekening die niet in dit dossier is
    geïmporteerd, geef dan bij het leasecontract onder "Termijnen van een andere rekening" aan tot en
    met welke datum alle termijnen zijn betaald — anders denkt deze app ten onrechte dat die termijnen
    nooit zijn betaald, met een te hoog berekend openstaande saldo (en dus een onjuiste
    restschuld/overwaarde bij verkoop) tot gevolg.
  </p>

  <h2>Huur, energie en gemeentelijke lasten — werkruimte</h2>
  <p class="toelichting">
    Wordt de huur, energie of gemeentelijke lasten (deels) vanaf de privérekening betaald, dan hangt de
    behandeling af van waarvoor het is: (1) een zakelijk gehuurde bedrijfsruimte — gewone zakelijke
    huisvestingskosten voor het zakelijke deel; (2) een zelfstandige werkruimte in de eigen woning — de
    kosten zijn voor het zakelijke deel bedrijfskosten van de werkruimte (geen aparte aftrekpost naast de
    zelfstandigenaftrek); (3) een kamer of hoek in de eigen woning die niet zelfstandig is — huur, energie en
    gemeentelijke lasten zijn niet aftrekbaar. Per jaar staat bij de berekening welke keuze is gemaakt.
    Controleer de voorwaarden voor een zelfstandige werkruimte zelf; dit is een indicatie, geen advies.</p>

  <h2>Zelfstandigenaftrek, startersaftrek en de 9-jaars-reserve</h2>
  <p class="toelichting">
    Startersaftrek mag maximaal 3 keer worden toegepast in de eerste 5 jaar van het ondernemerschap —
    controleer zelf of dat hier van toepassing is. Kan de zelfstandigenaftrek in een jaar niet (of niet
    volledig) worden benut omdat de winst te laag is, dan wordt het niet-gerealiseerde deel
    gereserveerd om tot 9 jaar later alsnog te verrekenen, mits in dit rapport ook een later jaar met
    voldoende winst wordt meegenomen (deze app verrekent dit automatisch tussen de jaren die samen in
    één rapport zijn opgenomen).
  </p>

  <h2>Indicatieve inkomstenbelasting en Zvw-bijdrage — algemeen</h2>
  <p class="toelichting">
    Deze schatting gaat uit van het urencriterium (doorgaans: minimaal 1.225 uur per jaar aan de
    onderneming besteed) voor de zelfstandigenaftrek — geef in de app aan ("Persoonlijke aannames
    voor IB") of daaraan is voldaan zodra dat bekend is; zonder die aangave rekent de app voorlopig
    mét zelfstandigenaftrek. De IB-schatting is exclusief heffingskortingen (die
    volgen apart hieronder in de jaarsectie); overig inkomen box 1 telt alleen mee voor zover opgegeven in de wizard. Zijn de belastingschijven of het Zvw-percentage van een
    jaar nog niet officieel bekend, dan benadert de app die met de dichtstbijzijnde bekende
    schijven/het dichtstbijzijnde bekende percentage. Dit is in alle gevallen een indicatie, geen
    belastingadvies — vergelijk het altijd met wat daadwerkelijk is aangegeven/betaald.
  </p>

  <h2>Heffingskortingen — aannames</h2>
  <p class="toelichting">
    ⚠ Persoonlijke heffingskortingen zijn niet volledig meegenomen: deze schatting gaat ervan uit dat
    de winst uit onderneming het enige inkomen is (tenzij overig inkomen box 1 in de wizard is opgegeven), dat de AOW-leeftijd nog niet is bereikt, en dat er
    geen fiscale partner is om mee te verrekenen. Klopt een van die aannames niet, dan is deze
    indicatie minder betrouwbaar. Geen belastingadvies.
  </p>

  <h2>Investeringsaftrek (KIA) — algemene regels</h2>
  <p class="toelichting">
    De getoonde mogelijke KIA is een mógelijke, geen definitieve aftrek — niet elk bedrijfsmiddel telt
    mee voor de KIA (bijv. personenauto's en grond meestal niet, en elk bedrijfsmiddel moet minimaal
    circa €450 hebben gekost). Controleer dit zelf per aanschaf.
  </p>`;
}

// beide-V4R1 — soort: "pdf" | "excel" | "html" (zie download.js).
export function downloadAangiftevoorstel(html, years, soort = "html") {
  return downloadRapport({ soort, html, naam: `Indicatieve_aangifteberekening_${years.join("-")}` });
}

// Voor download en print: het voorstel zonder de interactieve "ⓘ bron"-uitklappers (die zijn alleen
// bedoeld voor op het scherm in de app).
export function stripBronHtml(html) {
  return String(html || "")
    .replace(/<div class="bron-inhoud">[\s\S]*?<\/p><\/div>/g, "")
    .replace(/ ?<span class="bron-knop"[^>]*>[^<]*<\/span>/g, "")
    .replace(/<details class="bron"><summary class="categorie-detail">/g, '<div class="categorie-detail">')
    .replace(/<\/summary><\/details>/g, "</div>");
}

// De uitgebreide uitleg achteraan (Bijlage: Toelichtingen) is optioneel: weglaten voor een korter document.
export function zonderUitlegHtml(html) {
  return String(html || "").replace(/<!--UITLEG-START-->[\s\S]*?<!--UITLEG-END-->/g, "").replace(/<!--V-->[\s\S]*?<!--\/V-->/g, "");
}
