// beide-V1R8 (fase 5) — zet de gegevens van een privédossier (budget uit de bank, antwoorden uit de wizard,
// van wie elke rekening is) om in de invoer voor tax/prive/uitkomst.js, en houdt bij welke aannames daarin
// zitten (die toont de app bij de uitkomst).
const getal = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// rekeningVan: { bestandsnaam: "eigen"|"partner"|"gezamenlijk" }; inkomsten van een partnerrekening tellen bij
// de partner, al het andere bij jezelf.
function inkomenPerPersoon(transacties, jaar, rekeningVan, metPartner) {
  const leeg = () => ({ loon: 0, uitkering: 0, pensioen: 0 });
  const zelf = leeg(), partner = leeg();
  const veld = { Loon: "loon", Uitkering: "uitkering", "Pensioen & AOW": "pensioen" };
  for (const t of transacties) {
    if (t.year !== jaar || !veld[t.category]) continue;
    const doel = metPartner && rekeningVan?.[t.source] === "partner" ? partner : zelf;
    doel[veld[t.category]] += Number(t.amount) || 0;
  }
  return { zelf, partner };
}

export function priveBelastingInvoer({ transacties, jaar, budget, antwoorden = {}, eenvoudig = false }) {
  const a = antwoorden || {};
  const metPartner = a.partner === "ja";
  const aannames = [];
  const { zelf, partner } = inkomenPerPersoon(transacties, jaar, a.rekeningVan, metPartner);
  const lh = (veld) => getal(a[veld]?.[jaar]);
  const isAow = (bron) => Array.isArray(bron) && bron.includes("aow");
  // beide-V2R8 — loonheffing van de jaaropgave, of anders bruto min netto als het bruto inkomen is opgegeven.
  const ingehouden = (lhVeld, brutoVeld, p) => {
    const l = lh(lhVeld);
    if (l != null) return l;
    const bruto = lh(brutoVeld);
    return bruto != null && bruto > 0 ? Math.max(0, bruto - (p.loon + p.uitkering + p.pensioen)) : null;
  };
  const personen = [{ rol: "zelf", ...zelf, aow: isAow(a.inkomen), loonheffing: ingehouden("loonheffing", "brutoInkomen", zelf), brutoOpgegeven: lh("brutoInkomen") }];
  if (metPartner) {
    personen.push({ rol: "partner", ...partner, aow: isAow(a.inkomenPartner), loonheffing: ingehouden("loonheffingPartner", "brutoInkomenPartner", partner), brutoOpgegeven: lh("brutoInkomenPartner") });
    if (!a.rekeningVan || Object.keys(a.rekeningVan).length === 0) aannames.push("Alle inkomsten zijn aan jou toegerekend: nog niet opgegeven welke rekening van je partner is.");
  }
  // beide-V2R8 — inkomen op de bank is netto: de belasting is al ingehouden. Alleen wat zonder inhouding binnenkwam
  // (wizardvraag), telt als bruto inkomen waarover nog belasting betaald moet worden (bij jezelf).
  const zonderVan = (keuze, veld) => (a[keuze] === "nee" ? Math.max(0, getal(a[veld]?.[jaar]) || 0) : 0);
  personen[0].zonderInhouding = zonderVan("nettoIngehouden", "zonderInhouding");
  if (a.nettoIngehouden === "nee" && !personen[0].zonderInhouding) aannames.push("Inkomen zonder ingehouden belasting: het bedrag voor dit jaar is nog niet ingevuld.");
  // beide-V2R9 — ook voor de partner.
  if (personen[1]) {
    personen[1].zonderInhouding = zonderVan("nettoIngehoudenPartner", "zonderInhoudingPartner");
    if (a.nettoIngehoudenPartner === "nee" && !personen[1].zonderInhouding) aannames.push("Inkomen van je partner zonder ingehouden belasting: het bedrag voor dit jaar is nog niet ingevuld.");
  }
  if (personen.some((p) => p.loonheffing == null && p.loon + p.uitkering + p.pensioen > 0)) {
    aannames.push("Je inkomen op de bank is netto: de belasting is al ingehouden. Wil je het controleren, vul dan bij Basisvragen het bruto inkomen van je jaaropgave in.");
  }

  const overig = Math.round(Math.max(0, -(budget?.som?.("Inkomsten") || 0)));
  if (overig >= 1000) aannames.push(`Er kwam € ${overig.toLocaleString("nl-NL")} binnen dat nog niet als loon, uitkering of pensioen is ingedeeld. Dat telt niet mee in de belasting; deel het in bij Nakijken of Controleren.`);

  let woning = null;
  if (a.wonen === "koop" || a.wonen === "koopZonder") {
    const woz = getal(a.woz?.[jaar]);
    const opgegeven = getal(a.hypotheekRente?.[jaar]);
    const bank = a.wonen === "koop" ? Math.max(0, budget?.som?.("Hypotheek") || 0) : 0;
    woning = { woz: woz || 0, rente: opgegeven ?? bank, vorm: a.hypotheekVorm || null, startJaar: getal(a.hypotheekStart) };
    if (!woz) aannames.push("WOZ-waarde onbekend: het eigenwoningforfait is niet meegeteld.");
    if (a.wonen === "koop" && opgegeven == null) aannames.push("Hypotheekrente = alles wat naar de hypotheek ging, dus mogelijk ook aflossing. Vul de rente van je jaaropgave in.");
  }

  const aftrek = {
    giften: Math.max(0, budget?.som?.("Giften") || 0),
    zorgkosten: Math.max(0, budget?.som?.("Medische uitgaven") || 0),
    lijfrente: Math.max(0, budget?.som?.("Lijfrente") || 0),
    partneralimentatie: Math.max(0, budget?.som?.("Partneralimentatie") || 0),
  };
  if (aftrek.giften > 0) aannames.push("Giften: alleen giften aan een ANBI zijn aftrekbaar. Gerekend met alle giften uit de bank.");
  if (aftrek.zorgkosten > 0) aannames.push("Zorgkosten: niet alle eigen betalingen zijn aftrekbaar (eigen risico bijvoorbeeld niet).");

  let vermogen = null;
  if (!eenvoudig && (a.vermogen === "ja" || a.vermogen === "weetNiet")) {
    const v = a.vermogen1jan?.[jaar];
    if (v && typeof v === "object") vermogen = { sparen: getal(v.sparen) || 0, beleggen: getal(v.beleggen) || 0, schulden: getal(v.schulden) || 0 };
    else aannames.push("Box 3: vermogen op 1 januari nog niet ingevuld, dus niet meegeteld.");
  }
  if (eenvoudig && a.vermogen === "ja") aannames.push("Box 3 (spaargeld en beleggingen) zit alleen in de uitgebreide weergave.");
  return { invoer: { personen, woning, aftrek, vermogen }, aannames };
}
