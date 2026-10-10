// Btw-correctie voor privégebruik van een auto die tot het bedrijfsvermogen hoort (alleen zzp).
// Bron: Belastingdienst, "Privégebruik auto van de zaak". Kern:
//  - Alleen als er btw op de auto is afgetrokken: gekocht incl. btw (standaard aan), financiële lease
//    met een ingevuld bedrag bij "Te betalen BTW" (aan), operationele lease alleen als de gebruiker
//    aanvinkt dat er btw op de leasetermijnen is afgetrokken (standaard uit).
//  - Forfait: 2,7% van de catalogusprijs (incl. btw en bpm) per jaar; 1,5% vanaf het vijfde jaar na het
//    jaar van ingebruikname. In het jaar van ingebruikname naar evenredigheid (aankoop 1 sept = 4/12).
//  - Maximum: btw op onderhoud/gebruik die dat jaar is afgetrokken + (tot en met het 4e jaar na het
//    aankoopjaar) 1/5 van de btw op de aanschaf.
//  - Alternatief: werkelijk privégebruik (privé-% van dezelfde grondslag), of geen correctie.
// De correctie hoort in de laatste btw-aangifte van het jaar (Q4, rubriek privégebruik).
import { AUTOKOSTEN_CATEGORIEN, groupSegmentenOpKenteken } from "./autoBijtelling.js";
import { rawBtw } from "./categorySplit.js";

const GEBRUIK_CATEGORIEEN = [...AUTOKOSTEN_CATEGORIEN, "Lease (operationeel)"];
export const BTW_PRIVE_METHODES = ["forfait", "werkelijk", "geen"];

function jaarMaand(datum) {
  if (!datum) return null;
  const d = new Date(datum);
  if (isNaN(d)) return null;
  return { jaar: d.getFullYear(), maand: d.getMonth() + 1 };
}

// Verzamelt de bedrijfsauto's waarvoor een btw-correctie kan gelden.
function verzamelAutos(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus) {
  const autos = [];
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    for (const group of groupSegmentenOpKenteken(segments)) {
      const primary = group[0];
      if (primary.soort !== "auto") continue;
      const laatste = group[group.length - 1];
      const btwAanschaf = Number(primary.teBetalenBtw) || 0;
      autos.push({
        naam: lease.name || "Auto (financiële lease)",
        bron: "financieel",
        btwAfgetrokken: btwAanschaf > 0,
        btwAanschaf,
        btwAanschafBekend: true,
        catalogus: Number(primary.cataloguswaarde) || 0,
        start: jaarMaand(primary.startdatum),
        einde: laatste.contractBeeindigd ? jaarMaand(laatste.einddatumContract) : null,
      });
    }
  }
  const soort = autoWizardStatus?.soort;
  if ((soort === "koop" || soort === "operational") && autoActivaDetails) {
    const d = autoActivaDetails;
    const koop = soort === "koop";
    autos.push({
      naam: koop ? "Auto (eigendom)" : "Auto (operationele lease)",
      bron: soort,
      btwAfgetrokken: koop ? d.btwAfgetrokken !== false : d.btwAfgetrokken === true,
      btwAanschaf: koop ? (d.btwAanschaf != null && d.btwAanschaf !== "" ? Number(d.btwAanschaf) : 0) : 0,
      // Operationele lease: er is geen aanschaf-btw, dus het maximum is alleen de btw op gebruik.
      btwAanschafBekend: koop ? d.btwAanschaf != null && d.btwAanschaf !== "" : true,
      catalogus: Number(d.cataloguswaarde) || 0,
      start: koop ? jaarMaand(d.aanschafdatum) : jaarMaand(d.ingebruiknamedatum),
      einde: null,
    });
  }
  return autos;
}

// Afgetrokken btw op onderhoud en gebruik van de auto in dit jaar (basis voor het maximum).
function btwOpGebruik(classified, year, categoryBtwRates, btwVerlegd) {
  let som = 0;
  for (const tx of classified || []) {
    if (tx.isMirror || tx.year !== year || !GEBRUIK_CATEGORIEEN.includes(tx.category)) continue;
    som += -rawBtw(tx, categoryBtwRates || {}, btwVerlegd);
  }
  return Math.max(0, som);
}

// Geeft null als er dit jaar niets te corrigeren valt.
export function computeBtwPrivegebruikAuto(year, ctx) {
  const { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates, btwVerlegd, rechtsvorm } = ctx;
  if (rechtsvorm === "bv" || !year) return null;
  const status = autoStatus?.[year];
  if (status === "prive" || status === "geen") return null;
  const autos = verzamelAutos(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus).filter((a) => a.btwAfgetrokken);
  if (autos.length === 0) return null;

  const instelling = autoActivaDetails?.btwPrivegebruikPerJaar?.[year] || {};
  const methode = BTW_PRIVE_METHODES.includes(instelling.methode) ? instelling.methode : "forfait";
  const gebruik = btwOpGebruik(classified, year, categoryBtwRates, btwVerlegd);

  const items = [];
  for (const auto of autos) {
    const meldingen = [];
    if (auto.start && year < auto.start.jaar) continue;
    if (auto.einde && year > auto.einde.jaar) continue;
    // Aandeel van het jaar waarin de auto bij de zaak hoorde.
    let fractie = 1;
    if (auto.start && auto.start.jaar === year) fractie = (13 - auto.start.maand) / 12;
    if (auto.einde && auto.einde.jaar === year) {
      const vanaf = auto.start && auto.start.jaar === year ? auto.start.maand : 1;
      fractie = Math.max(0, (auto.einde.maand - vanaf + 1) / 12);
    }
    const binnenAanschafperiode = auto.start ? year <= auto.start.jaar + 4 : true;
    if (!auto.start) meldingen.push("Datum ingebruikname ontbreekt: 2,7% voor het hele jaar toegepast.");

    // Maximum
    let maximum = gebruik;
    let maximumControleerbaar = true;
    if (binnenAanschafperiode) {
      if (auto.btwAanschafBekend) maximum += auto.btwAanschaf / 5;
      else { maximumControleerbaar = false; meldingen.push("Vul de btw bij aanschaf in om het wettelijke maximum te kunnen controleren."); }
    }

    let pct = null;
    let berekend = 0;
    if (methode === "forfait") {
      pct = binnenAanschafperiode ? 2.7 : 1.5;
      if (!(auto.catalogus > 0)) meldingen.push("Cataloguswaarde (incl. btw en bpm) ontbreekt: vul die in bij de bijtelling-gegevens.");
      berekend = auto.catalogus * (pct / 100) * fractie;
    } else if (methode === "werkelijk") {
      const privePct = Math.min(100, Math.max(0, Number(instelling.privePct) || 0));
      pct = privePct;
      berekend = (gebruik + (binnenAanschafperiode && auto.btwAanschafBekend ? auto.btwAanschaf / 5 : 0)) * (privePct / 100);
      meldingen.push("Werkelijk privégebruik: indicatieve berekening (privé-% × btw op gebruik en 1/5 aanschaf-btw). Controleer met je km-administratie.");
    }
    let bedrag = berekend;
    let afgetopt = false;
    if (methode === "forfait" && maximumControleerbaar && berekend > maximum) { bedrag = maximum; afgetopt = true; }
    items.push({ naam: auto.naam, bron: auto.bron, methode, pct, fractie, catalogus: auto.catalogus, berekend, maximum: maximumControleerbaar ? maximum : null, bedrag, afgetopt, meldingen });
  }
  if (items.length === 0) return null;
  const bedrag = methode === "geen" ? 0 : items.reduce((a, i) => a + i.bedrag, 0);
  return { year, methode, bedrag, items };
}
