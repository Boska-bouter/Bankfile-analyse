// nieuw-V8R4 — balansposten per jaar voor de aangiftekaart "Met balans" (wens Boska 18-11: auto in financial
// lease is een activum, daartegenover staat de leaseschuld). Boekwaarde op 1-1 en 31-12 per bedrijfsmiddel en
// het openstaande saldo van de financiële lease uit hetzelfde aflosschema als de renteaftrek.
import { computeAfschrijvingPerJaar, computeActivaSummary } from "../tax/activa.js";
import { buildLeaseActivumFromSegment, groupSegmentenOpKenteken } from "../tax/autoBijtelling.js";
import { buildKoopActivum } from "../tax/autoActiva.js";
import { computeFinancialLeaseAmortizationMultiSegment } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, getLeaseSegments } from "../tax/financialLease.js";

// Boekwaarde aan het eind van jaar j; 0 vóór aanschaf en vanaf het jaar van verkoop/beëindiging.
function boekwaardeEindVan(activum, j) {
  if (!activum?.aanschafdatum) return 0;
  if (j < new Date(activum.aanschafdatum).getFullYear()) return 0;
  if (activum.einddatum && j >= new Date(activum.einddatum).getFullYear()) return 0;
  const r = computeAfschrijvingPerJaar(activum, j);
  return r ? r.boekwaardeEindJaar : 0;
}
const beginEind = (activum, year) => ({ begin: boekwaardeEindVan(activum, year - 1), eind: boekwaardeEindVan(activum, year) });

export function balansPostenVoorJaar({ classified, year, accountTypeByFile, leaseSummary, leaseDetails, activaDetails, autoActivaDetails, autoWizardStatus }) {
  let leaseElders = 0;
  const auto = { begin: 0, eind: 0 }, overig = { begin: 0, eind: 0 }, leaseschuld = { begin: 0, eind: 0 };
  const autoItems = [];
  // nieuw-V9R0 — Boska 19-11 ("de bedrijfsmiddelen worden zelfs hoger?"): aanschaf en afschrijving van het jaar zichtbaar onder de boekwaarde.
  const overigMut = { aanschaf: 0, afschrijving: 0 };
  const tel = (doel, be, activum = null) => {
    doel.begin += be.begin; doel.eind += be.eind;
    if (doel === overig && activum) {
      if (new Date(activum.aanschafdatum).getFullYear() === year) overigMut.aanschaf += Number(activum.aanschafwaarde) || 0;
      if (be.begin >= 0.5 || be.eind >= 0.5) { const r = computeAfschrijvingPerJaar(activum, year); overigMut.afschrijving += r ? r.afschrijving || 0 : 0; }
    }
    if (doel === auto && activum && (be.begin >= 0.5 || be.eind >= 0.5)) {
      const r = computeAfschrijvingPerJaar(activum, year);
      autoItems.push({ aanschafwaarde: Number(activum.aanschafwaarde) || 0, aanschafdatum: activum.aanschafdatum, afschrijving: r ? r.afschrijving : 0 });
    }
  };
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    let einde = null;
    for (const group of groupSegmentenOpKenteken(segments)) {
      const laatste = group[group.length - 1];
      const eind = laatste.contractBeeindigd && laatste.verkoopsom != null && laatste.einddatumContract ? laatste.einddatumContract : null;
      if (eind) einde = eind;
      const activum = buildLeaseActivumFromSegment(group[0], eind);
      if (activum) tel(group[0].soort === "auto" ? auto : overig, beginEind(activum, year), activum);
    }
    const am = computeFinancialLeaseAmortizationMultiSegment(lease.transactions || [], details, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
    const segs = getLeaseSegments(details).filter((s) => s.startdatum).sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum));
    if (!am || !segs.length) continue;
    const saldoVoor = (datum) => {
      if (datum <= new Date(segs[0].startdatum)) return 0;
      if (einde && datum > new Date(einde)) return 0;
      const rijen = am.rows.filter((r) => r.tx.date < datum);
      if (rijen.length) return rijen[rijen.length - 1].saldoNa;
      return computeOnbetaaldGedeelteKoop(segs[0]) || 0;
    };
    // Termijnen die als "elders betaald" zijn aangevuld (geen banktransactie): betaald vanaf privé of een andere rekening.
    leaseElders += am.rows.filter((r) => r.tx.synthetic && r.tx.date.getFullYear() === year).reduce((a, r) => a + Math.abs(r.tx.amount), 0);
    leaseschuld.begin += saldoVoor(new Date(year, 0, 1));
    leaseschuld.eind += saldoVoor(new Date(year + 1, 0, 1));
  }
  for (const a of computeActivaSummary(classified || [], activaDetails || {})) {
    const d = activaDetails?.[a.key];
    if (!d || d.onbekend || !d.aanschafwaarde || !d.aanschafdatum || !d.afschrijvingstermijnJaren) continue;
    tel(overig, beginEind(d, year), d);
  }
  if (autoWizardStatus?.soort === "koop" && autoActivaDetails) {
    const activum = buildKoopActivum(autoActivaDetails);
    if (activum) tel(auto, beginEind(activum, year), activum);
  }
  // Zakelijke spaarrekening die niet als bestand is geladen: saldo = som van de overboekingen ernaartoe.
  const sparen = { begin: 0, eind: 0 };
  for (const tx of classified || []) {
    if (tx.isMirror || tx.category !== "Interne overboeking: zakelijk sparen" || !tx.date) continue;
    if ((accountTypeByFile?.[tx.source] || tx.accountType) !== "Zakelijk") continue;
    const d = new Date(tx.date);
    if (d < new Date(year, 0, 1)) sparen.begin -= tx.amount;
    if (d < new Date(year + 1, 0, 1)) sparen.eind -= tx.amount;
  }
  return { auto, overig, overigMut, leaseschuld, autoItems, sparen, leaseElders };
}
