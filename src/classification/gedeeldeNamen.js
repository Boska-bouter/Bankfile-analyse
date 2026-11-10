// nieuw-V2R1 — gedeelde namenlijst (fase 1 van "bedrijfsnamen opzoeken bij het laden", besluit Boska 10-11).
// Bij het openen haalt de app de lijst op (/api/namen/lijst): per bedrijfsnaam welke categorie andere gebruikers kozen,
// per soort rekening (zakelijk, privé in een zakelijk dossier, privédossier) en soort bedrijf (branche uit de wizard).
// - Zeker (zelfde soort én branche, minstens ZEKER_ACCOUNTS accounts, minstens ZEKER_AANDEEL eens): de app neemt de categorie over.
// - Anders, als minstens VOORSTEL_ACCOUNTS accounts met dezelfde soort rekening het meestal eens zijn: voorstel, op "nakijken".
// Terugsturen (alleen met toestemming, standaard uit): de eigen keuze op tegenpartij, alleen voor namen die op een bedrijf lijken.
// Er gaan nooit bedragen, rekeningnummers, omschrijvingen of namen van personen mee.
import { vergelijkSleutel } from "../review/vergelijkbaar.js";
import { looksLikePerson } from "../utils/normalization.js";
import { getCategorieProfiel } from "./categories.js";
import { getBranche } from "./branche.js";

export const ZEKER_ACCOUNTS = 3;
export const ZEKER_AANDEEL = 0.8;
export const VOORSTEL_ACCOUNTS = 2;
export const VOORSTEL_AANDEEL = 0.6;

// Betaalterminals en -diensten vóór de naam ("BCK*Decathlon", "SumUp *Bakker", "Zettle_*Kiosk", "CCV*Kapper").
const TERMINAL = /^\s*(bck|ccv|sumup|zettle|iz|sq|sp|pp|paypal|pay\.nl|mollie|stripe|adyen|bcc|myp|ecom|cm)\s*[*_]+\s*_?\s*/i;
// Tekenen dat de tegenpartij een bedrijf is (en geen persoon): rechtsvorm of bedrijfswoord, pinbetaling, incasso, iDEAL of betaaldienst.
const RECHTSVORM = /\b(b\.?\s?v\.?|n\.\s?v\.?|v\.?o\.?f\.?|holding|gmbh|ltd|limited|inc|llc|bvba|s\.\s?a\.?|sarl|a\/s)(?![a-z])|groothandel|handel|winkel|shop|store|supermarkt|bouwmarkt|apotheek|tandarts|huisarts|fysio|praktijk|kliniek|ziekenhuis|verzeker|energie|telecom|garage|autobedrijf|tankstation|restaurant|caf[eé]|hotel|bakkerij|slagerij|drogist|stichting|vereniging|gemeente|waterschap/i;
const BETAALSPOOR = /pasvolgnr|\bpas: ?\d|\bterm:|betaalautomaat|incassant|machtiging|sepa.?incasso|europese incasso|doorlopende incasso|\bideal\b|via (mollie|adyen|stripe|buckaroo|pay\.nl|multisafepay|worldline|ingenico|cm\.com|ccv|sumup|zettle|paypal|klarna|riverty|afterpay)/i;

// Betaaldiensten, banken en tussenpartijen: de categorie hangt af van wie er achter zit, dus nooit in de lijst.
const TUSSENPARTIJ = /^(paypal|stripe|mollie|stichting mollie|adyen|buckaroo|klarna|riverty|afterpay|multisafepay|pay nl|worldline|ingenico|ccv|sumup|zettle|tikkie|bng|geldmaat|ing|ing bank|rabobank|abn|abn amro|bunq|knab|asn|sns|triodos|regiobank|revolut|wise|n26|stichting derdengelden|derdengelden|stichting beheer)\b/;
// Categorieën die niets over het bedrijf zeggen (onbekend, personen, eigen rekeningen): niet delen.
export const NIET_DELEN = new Set(["Overig", "Overboekingen aan personen", "Overboeking van bekenden", "Interne overboeking", "Interne overboeking: zakelijk sparen",
  "Interne overboeking: privé sparen", "Ontvangen van zakelijk", "Terugboeking naar zakelijk", "Terugboeking van privé", "Inkomsten/betalingen niet dit jaar"]);

// Sleutel voor de lijst: kleine letters, zonder plaats na " via ", zonder cijfers, terminalvoorvoegsel en rechtsvorm; eerste twee woorden.
export function naamSleutel(naam) {
  const t = String(naam || "").replace(TERMINAL, "").replace(TERMINAL, "");
  const k = vergelijkSleutel(t);
  return k && !TUSSENPARTIJ.test(k) ? k : "";
}

// Lijkt de tegenpartij van deze boeking op een bedrijf? Alleen dan mag de naam (sleutel) naar de server.
export function lijktOpBedrijf(tx, bekend = false) {
  const naam = String(tx?.counterparty || "").split(/\s+via\s+/i)[0].trim();
  if (!naam || looksLikePerson(naam) || /tikkie/i.test(`${tx?.counterparty || ""} ${tx?.description || ""}`)) return false;
  if (bekend) return true;
  return RECHTSVORM.test(naam) || BETAALSPOOR.test(`${tx?.description || ""} ${tx?.fullDescription || ""}`) || TERMINAL.test(naam);
}

// Soort rekening voor de lijst: een privédossier (profiel) heeft een eigen indeling.
export function namenSoort(accountType) {
  if (getCategorieProfiel()) return "prive-dossier";
  return accountType === "Zakelijk" ? "zakelijk" : "prive";
}
export const teken = (amount) => (Number(amount) < 0 ? "neg" : "pos");

// ---- De opgehaalde lijst ----
// Vorm van de server: { namen: { "sleutel|teken|soort|branche": { categorie: aantal accounts } } }
let _lijst = null; // Map "sleutel|teken|soort" → [{ branche, cats }]
let _versie = 0;
export function setGedeeldeNamen(data) {
  const m = new Map();
  for (const [k, cats] of Object.entries(data?.namen || {})) {
    const [s, t, o, b = ""] = k.split("|");
    if (!s || !t || !o || !cats || typeof cats !== "object") continue;
    const sl = `${s}|${t}|${o}`;
    if (!m.has(sl)) m.set(sl, []);
    m.get(sl).push({ branche: b, cats });
  }
  _lijst = m.size ? m : null;
  _versie++;
  UITKOMST.clear();
  meld();
}
// nieuw-V2R2 — uitkomsten van het opzoeken met AI (worker/namenAi.js): "sleutel|teken|soort|branche" → { categorie, zekerheid, soortBedrijf } of null.
const _ai = new Map();
export function voegAiToe(soort, branche, uitkomst) {
  let nieuw = 0;
  for (const [k, v] of Object.entries(uitkomst || {})) {
    const key = `${k}|${soort}|${branche || ""}`;
    if (_ai.has(key) && JSON.stringify(_ai.get(key)) === JSON.stringify(v ?? null)) continue;
    _ai.set(key, v && v.categorie ? { categorie: String(v.categorie), zekerheid: v.zekerheid, soortBedrijf: String(v.soortBedrijf || "") } : null);
    nieuw++;
  }
  if (nieuw) { _versie++; UITKOMST.clear(); meld(); }
  return nieuw;
}
export const aiAlGevraagd = (k) => _ai.has(k);
export function wisAi() { _ai.clear(); _versie++; UITKOMST.clear(); }
export const gedeeldeNamenVersie = () => _versie;
// nieuw-V2R4 — wie wil weten dat de lijst of een AI-uitkomst is veranderd (useGedeeldeNamenLijst: opnieuw indelen).
const _luisteraars = new Set();
export function luisterNaarNamen(f) { _luisteraars.add(f); return () => _luisteraars.delete(f); }
const meld = () => { for (const f of _luisteraars) f(_versie); };
export const heeftGedeeldeNamen = () => !!_lijst;

function meeste(cats) {
  let beste = null, n = 0, tot = 0;
  for (const [c, a] of Object.entries(cats)) { tot += a; if (a > n) { beste = c; n = a; } }
  return { categorie: beste, aantal: n, totaal: tot };
}
const UITKOMST = new Map();
// { categorie, zeker, aantal, totaal } of null. geldig(categorie) = bestaat die categorie in deze app/dit dossier?
export function gedeeldeKeuze(tx, accountType, geldig0 = () => true) {
  const geldig = (c) => !NIET_DELEN.has(c) && geldig0(c);
  if (!_lijst && !_ai.size) return null;
  const s = naamSleutel(String(tx?.counterparty || ""));
  if (!s) return null;
  const branche = getBranche() || "";
  const sl = `${s}|${teken(tx.amount)}|${namenSoort(accountType)}`;
  const ck = `${sl}|${branche}`;
  if (UITKOMST.has(ck)) return UITKOMST.get(ck);
  const rijen = _lijst?.get(sl);
  let uit = null;
  if (rijen && lijktOpBedrijf(tx, true)) {
    const eigen = rijen.find((r) => r.branche === branche);
    const z = eigen && meeste(eigen.cats);
    if (z && z.categorie && geldig(z.categorie) && z.totaal >= ZEKER_ACCOUNTS && z.aantal / z.totaal >= ZEKER_AANDEEL) uit = { ...z, zeker: true };
    else {
      const alle = {};
      for (const r of rijen) for (const [c, a] of Object.entries(r.cats)) alle[c] = (alle[c] || 0) + a;
      const v = meeste(alle);
      if (v.categorie && geldig(v.categorie) && v.totaal >= VOORSTEL_ACCOUNTS && v.aantal / v.totaal >= VOORSTEL_AANDEEL) uit = { ...v, zeker: false };
    }
  }
  // nieuw-V2R2 — niet in de lijst: wat het opzoeken met AI vond (alleen hoog of middel), altijd als voorstel.
  if (!uit) {
    const a = _ai.get(ck);
    if (a && (a.zekerheid === "hoog" || a.zekerheid === "middel") && geldig(a.categorie) && !NOOIT_AI.test(a.categorie) && lijktOpBedrijf(tx, true)) uit = { categorie: a.categorie, zeker: false, ai: true, zekerheid: a.zekerheid, soortBedrijf: a.soortBedrijf };
  }
  if (UITKOMST.size > 50000) UITKOMST.clear();
  UITKOMST.set(ck, uit);
  return uit;
}
export function gedeeldeKeuzeLabel(k) {
  if (k.ai) return `Voorstel opgezocht met AI${k.soortBedrijf ? ` (${k.soortBedrijf})` : ""}: controleer of de categorie klopt`;
  return k.zeker
    ? `Gedeelde namenlijst: ${k.aantal} van ${k.totaal} gebruikers kozen dit`
    : `Voorstel uit de gedeelde namenlijst: bij vergelijkbare bedrijven kozen ${k.aantal} van ${k.totaal} gebruikers dit`;
}

// ---- Terugsturen ----
// Uit de ingedeelde boekingen: de eigen keuzes op tegenpartij (niet per boeking) voor namen die op een bedrijf lijken.
export function stemmenUit(classified) {
  const uit = new Map();
  const branche = getBranche() || "";
  for (const tx of classified || []) {
    const c = tx?.confidence;
    if (c?.level !== "override" || /deze transactie/.test(c.label || "") || !tx.category || NIET_DELEN.has(tx.category) || tx.isMirror) continue;
    const s = naamSleutel(tx.counterparty);
    if (!s || !lijktOpBedrijf(tx)) continue;
    const at = tx.accountType || tx.type;
    const k = `${s}|${teken(tx.amount)}|${namenSoort(at)}|${branche}`;
    uit.set(k, tx.category);
  }
  return uit;
}

// ---- Opzoeken met AI (nieuw-V2R2) ----
// nieuw-V2R3 — zelfde lijst als worker/namenAi.js: deze categorieën neemt de app nooit van de AI over.
export const NOOIT_AI = /^(lease|leningen|hypotheek|prive hypotheek|interne overboeking|ontvangen van zakelijk|terugboeking|privé opnames|privé stortingen|overboekingen aan personen|overboeking van bekenden)/i;
// Welke namen moeten nog worden opgezocht? Boekingen zonder eigen keuze die in Overig/personen staan of alleen op bedrijfsnaam of
// factuurnummer als leverancier zijn geschat, met een naam die op een bedrijf lijkt en die nog niet in de lijst of bij de AI staat.
const GESCHAT = /^Geschat: (bedrijfsnaam|betaling met factuurnummer)/;
export function aiKandidaten(classified, max = 300) {
  const uit = new Map();
  const branche = getBranche() || "";
  for (const tx of classified || []) {
    if (uit.size >= max) break;
    const c = tx?.confidence;
    if (!c || c.level === "override" || tx.isMirror || tx.gedeeld || tx.transferLocked) continue;
    if (!(tx.category === "Overig" || tx.category === "Overboekingen aan personen" || GESCHAT.test(c.label || ""))) continue;
    const s = naamSleutel(tx.counterparty);
    if (!s || !lijktOpBedrijf(tx)) continue;
    const soort = namenSoort(tx.accountType || tx.type);
    const k = `${s}|${teken(tx.amount)}`;
    const key = `${k}|${soort}|${branche}`;
    if (uit.has(key) || _ai.has(key)) continue;
    const naam = String(tx.counterparty || "").split(/\s+via\s+/i)[0].replace(TERMINAL, "").replace(/\d+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    if (naam.length >= 2) uit.set(key, { soort, branche, k, naam });
  }
  return [...uit.values()];
}
