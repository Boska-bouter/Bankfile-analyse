import { bedrijfsnaamVan, horecaPinVan } from "./classify.js";
import { inkoopEten, INKOOP_ETEN } from "./branche.js";
// beide-V16R1 — leren van je eigen keuzes (trefkans-onderzoek 5-11, wens Boska). Een boeking die de app niet herkent ("Overig" of
// "Overboekingen aan personen") krijgt een voorstel als je bij vergelijkbare onbekende boekingen in hetzelfde dossier meestal
// hetzelfde kiest. Vergelijkbaar = zelfde soort rekening (zakelijk/privé), zelfde richting (betaald/ontvangen), zelfde soort
// betaling (pin of overboeking), zelfde uitkomst van de app, en bij voorkeur ook dezelfde bedraggroep (< €25, €25–100,
// €100–500, > €500). Er wordt geteld per tegenpartij, niet per boeking: 40 keer dezelfde kiosk telt als één keuze.
// Voorwaarden: minstens 5 tegenpartijen; binnen de bedraggroep 70% dezelfde keuze, anders over alle bedragen samen 80%.
// Meting op 8 testdossiers: ca. 800 voorstellen, 81% gelijk aan de eigen keuze. Een voorstel staat altijd op "nakijken".
// Elk dossier leert alleen van zichzelf (wat bij de één privé is, is bij de ander inkoop).
export const LEER_ONBEKEND = new Set(["Overig", "Overboekingen aan personen"]);
export const LEER_MIN_PARTIJEN = 5;
const PIN = /pasvolgnr|\bpas: ?\d|\bterm:|\bbetaalautomaat \d{1,2}:\d{2}\b/i; // huishoudboekje-V6R4 — ook Rabobank
// beide-V16R2 — partijen waarbij de tegenpartij niets zegt over de soort uitgave: betaaldiensten en creditcardafrekeningen (PayPal,
// Klarna, International Card Services) en de eigen naam. Die leren niet mee en krijgen geen voorstel (meting huishoudboekje 5-11:
// bijna alle foute privévoorstellen kwamen van PayPal, ICS en "GERITS P H").
const GEEN_LEERPARTIJ = /paypal|klarna|afterpay|riverty|international card services|\bics\b|icscards|american express|\bamex\b|creditcard|mastercard|\bvisa\b/i;
const GEEN_PRIVE_OPNAME = /deurwaarder|incasso|administratie|advocat|notaris|gerechts|\bcjib\b|belasting|gemeente|tech\b|\bbv\b/i;
export function leertNiet(tx, eigenNamen = []) {
  const naam = String(tx.counterparty || "");
  if (GEEN_LEERPARTIJ.test(naam)) return true;
  const laag = ` ${naam.toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, " ").replace(/\s+/g, " ")} `;
  return (eigenNamen || []).some((n) => {
    const achternaam = String(n || "").split(" ").filter(Boolean).pop();
    return achternaam && achternaam.length >= 3 && laag.includes(` ${achternaam} `);
  });
}

export function bedragGroep(bedrag) {
  const a = Math.abs(Number(bedrag) || 0);
  return a < 25 ? 0 : a < 100 ? 1 : a < 500 ? 2 : 3;
}
export const BEDRAG_GROEP_LABEL = ["onder € 25", "€ 25–100", "€ 100–500", "boven € 500"];

export function leerSleutel(tx, accountType, autoCategorie) {
  const pin = PIN.test(`${tx.description || ""} ${tx.fullDescription || ""}`);
  return `${accountType === "Zakelijk" ? "Z" : "P"}|${Number(tx.amount) > 0 ? "+" : "-"}|${pin ? "pin" : "ov"}|${autoCategorie}`;
}

// Tegenpartij als groep: naam vóór " via ", alleen letters (zodat "v.d. Linden" en "vd Linden" samenvallen).
export function groepVan(tx) {
  return String(tx.counterparty || tx.description || "").toLowerCase().split(/\s+(?:via|by|door)\s+/)[0].replace(/[^a-zà-ÿ]/g, "").slice(0, 24);
}

// keuzes: [{ tx, accountType, auto, categorie }] — boekingen met een eigen keuze, `auto` = wat de app zonder die keuze zou kiezen.
export function maakLeerModel(keuzes) {
  const tabel = new Map();
  const voegToe = (sleutel, categorie, groep) => {
    let perCat = tabel.get(sleutel);
    if (!perCat) tabel.set(sleutel, (perCat = new Map()));
    let groepen = perCat.get(categorie);
    if (!groepen) perCat.set(categorie, (groepen = new Set()));
    groepen.add(groep);
  };
  for (const { tx, accountType, auto: auto0, categorie } of keuzes) {
    // beide-V16R3 — een horeca-/tabakspin die de app alleen daarom schat (vrije tijd/boodschappen), telt hier als onbekend: anders vallen die
    // eigen keuzes uit het leren en zakt de gewoonte voor de andere onbekende pinbetalingen onder de drempel (test RG).
    const auto = accountType === "Zakelijk" && auto0 && horecaPinVan(tx) === auto0 ? "Overig" : auto0;
    if (!categorie || categorie === "Overig" || !LEER_ONBEKEND.has(auto) || leertNiet(tx)) continue; // eigen naam telt wel als bron: één tegenpartij, en weglaten verschoof de verhoudingen (JvS)
    const s = leerSleutel(tx, accountType, auto), g = groepVan(tx);
    if (!g) continue;
    // nieuw-V3R7 — inkoop van eten (9%) telt hier als gewone inkoop; het tarief volgt per tegenpartij uit de naam (branche.js).
    const c = categorie === INKOOP_ETEN ? "Zakelijke inkoop non-food" : categorie;
    voegToe(s, c, g);
    voegToe(`${s}|${bedragGroep(tx.amount)}`, c, g);
  }
  return tabel;
}

function kies(model, sleutel, drempel, zonderGroep) {
  const perCat = model.get(sleutel);
  if (!perCat) return null;
  let totaal = 0, beste = null, besteN = 0;
  for (const [categorie, groepen] of perCat) {
    const n = groepen.size - (zonderGroep && groepen.has(zonderGroep) ? 1 : 0);
    totaal += n;
    if (n > besteN) { beste = categorie; besteN = n; }
  }
  if (totaal < LEER_MIN_PARTIJEN || besteN / totaal < drempel) return null;
  return { categorie: beste, aantal: besteN, totaal };
}

// Voorstel voor een boeking zonder eigen keuze. zonderGroep: laat de keuzes voor deze tegenpartij weg (alleen voor de trefkans-meting).
export function leerVoorstel(model, tx, accountType, autoCategorie, { zonderGroep = null, eigenNamen = [] } = {}) {
  if (!model || !LEER_ONBEKEND.has(autoCategorie) || leertNiet(tx, eigenNamen)) return null;
  const s = leerSleutel(tx, accountType, autoCategorie);
  const groep = bedragGroep(tx.amount);
  const metBedrag = kies(model, `${s}|${groep}`, 0.7, zonderGroep);
  const alle = metBedrag ? null : kies(model, s, 0.8, zonderGroep);
  const v = metBedrag ? { ...metBedrag, bedragGroep: groep } : alle ? { ...alle, bedragGroep: null } : null;
  // beide-V16R3 — "Privé opnames" niet voorstellen bij een bedrijf, deurwaarder of administratiekantoor (meting huishoudboekje 5-11:
  // Janssen + Janssen gerechtsdeurwaarder, Florijn administratie, Novatech kregen Privé opnames, gekozen was iets anders).
  if (v?.categorie === "Privé opnames" && (bedrijfsnaamVan(tx, eigenNamen) || GEEN_PRIVE_OPNAME.test(String(tx.counterparty || "")))) return null;
  if (v && inkoopEten(tx, v.categorie, accountType)) return { ...v, categorie: INKOOP_ETEN };
  return v;
}

export function leerLabel(v, tx) {
  const soort = PIN.test(`${tx.description || ""} ${tx.fullDescription || ""}`) ? "onbekende pinbetalingen" : Number(tx.amount) > 0 ? "onbekende ontvangsten" : "onbekende betalingen";
  const bedrag = v.bedragGroep != null ? ` ${BEDRAG_GROEP_LABEL[v.bedragGroep]}` : "";
  return `Voorstel uit je eigen keuzes: zo deed je het bij ${v.aantal} van ${v.totaal} ${soort}${bedrag} op deze rekening`;
}
