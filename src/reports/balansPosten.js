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

export function balansPostenVoorJaar({ classified, year, accountTypeByFile, leaseSummary, leaseDetails, activaDetails, autoActivaDetails, autoWizardStatus, beginsaldo = null }) {
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
    // nieuw-V9R9 — Balanscheck-agent (Meijer 2020): een aanbetaling die niet vanaf de zakelijke rekening is betaald, is een
    // privéstorting in het startjaar (de auto staat voor de hele koopprijs op de balans, de leaseschuld voor het restant).
    for (const sg of segs) {
      const aan = Number(sg.aanbetaling) || 0, start = new Date(sg.startdatum);
      if (aan < 1 || start.getFullYear() !== year) continue;
      const viaBank = (classified || []).some((tx) => !tx.isMirror && tx.date && (accountTypeByFile?.[tx.source] || tx.accountType) === "Zakelijk"
        && Math.abs(tx.amount + aan) < 1 && Math.abs(new Date(tx.date) - start) <= 120 * 86400000);
      if (!viaBank) leaseElders += aan;
    }
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
  // nieuw-V9R9 — Boska 23-11: ook "Interne overboeking" vanaf de zakelijke rekening (naar een andere, niet geladen
  // zakelijke rekening, bijv. de spaarrekening uit de wizard) hoort op de balans; anders bleef het als verschil hangen.
  // Per rekening: saldo op 1-1 van het eerste jaar = ingevuld (beginsaldo["rek:IBAN"]) of berekend als het minimum
  // waarbij het saldo nooit negatief wordt (er stond al geld op als er meer af ging dan erop werd gezet).
  const rekeningen = perTegenrekening(classified, accountTypeByFile, (tx) => tx.category === "Interne overboeking: zakelijk sparen" || tx.category === "Interne overboeking");
  const sparen = { begin: 0, eind: 0 };
  const sparenRek = [];
  for (const r of rekeningen) {
    const ing = beginsaldo?.[`rek:${r.iban}`];
    const ingevuld = ing && Number.isFinite(Number(ing.bedrag)) ? Number(ing.bedrag) : null;
    const start = ingevuld ?? r.minStart;
    const begin = start + r.tot(new Date(year, 0, 1)), eind = start + r.tot(new Date(year + 1, 0, 1));
    sparen.begin += begin; sparen.eind += eind;
    sparenRek.push({ iban: r.iban, naam: r.naam, weergave: r.weergave, spaar: r.spaar, eersteJaar: r.eersteJaar, start, berekend: ingevuld == null, begin, eind });
  }
  // nieuw-V9R9 — Boska 23-11 ("borg moet gewoon mee op de balans"): betaalde borg = vordering; borg die terugkomt zonder
  // dat de betaling in de bankbestanden staat, is al eerder betaald en stond op 1-1 van het eerste jaar al als vordering.
  const borgRek = perTegenrekening(classified, accountTypeByFile, (tx) => tx.category === "Borg (waarborgsom)", true);
  const borg = { begin: 0, eind: 0, berekendBegin: 0 };
  for (const r of borgRek) {
    borg.begin += r.minStart + r.tot(new Date(year, 0, 1)); borg.eind += r.minStart + r.tot(new Date(year + 1, 0, 1));
    borg.berekendBegin += r.minStart;
  }
  return { auto, overig, overigMut, leaseschuld, autoItems, sparen, sparenRek, borg, leaseElders };
}

// nieuw-V9R9 — boekingen op de zakelijke rekening per tegenrekening (of alles samen): saldo aan "de andere kant"
// = −som van de boekingen; minStart = het kleinste beginsaldo waarbij dat saldo nooit onder nul komt.
function perTegenrekening(classified, accountTypeByFile, filter, samen = false) {
  const m = new Map();
  const norm = (x) => String(x || "").replace(/\s+/g, "").toUpperCase();
  const isZak = (tx) => (accountTypeByFile?.[tx.source] || tx.accountType) === "Zakelijk";
  // Overboekingen tussen twee GELADEN zakelijke rekeningen staan al in het banksaldo (beide kanten): niet nog eens tellen.
  const geladen = new Set((classified || []).filter((tx) => isZak(tx) && tx.ownAccount).map((tx) => norm(tx.ownAccount)));
  for (const tx of classified || []) {
    if (tx.isMirror || !tx.date || !filter(tx)) continue;
    if (!isZak(tx)) continue;
    if (!samen && tx.counterpartyIban && geladen.has(norm(tx.counterpartyIban))) continue;
    const iban = samen ? "" : String(tx.counterpartyIban || "").replace(/\s+/g, "").toUpperCase();
    if (!m.has(iban)) m.set(iban, { iban, naam: tx.counterparty || "", weergave: tx.tegenrekeningUitOmschrijving ? String(tx.counterpartyIban).trim() : null, txs: [] });
    m.get(iban).txs.push(tx);
  }
  return [...m.values()].map((r) => {
    const txs = r.txs.sort((a, b) => (new Date(a.date) - new Date(b.date)) || (a.amount - b.amount)); // zelfde dag: eerst wat erheen gaat
    let saldo = 0, laagste = 0;
    for (const tx of txs) { saldo -= tx.amount; laagste = Math.min(laagste, saldo); }
    return {
      iban: r.iban, naam: r.naam, weergave: r.weergave, spaar: txs.every((tx) => tx.category === "Interne overboeking: zakelijk sparen"), eersteJaar: new Date(txs[0].date).getFullYear(), minStart: -laagste,
      tot: (d) => -txs.filter((tx) => new Date(tx.date) < d).reduce((a, tx) => a + tx.amount, 0),
    };
  });
}
