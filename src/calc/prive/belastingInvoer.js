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
  const personen = [{ rol: "zelf", ...zelf, aow: isAow(a.inkomen), loonheffing: lh("loonheffing") }];
  if (metPartner) {
    personen.push({ rol: "partner", ...partner, aow: isAow(a.inkomenPartner), loonheffing: lh("loonheffingPartner") });
    if (!a.rekeningVan || Object.keys(a.rekeningVan).length === 0) aannames.push("Alle inkomsten zijn aan jou toegerekend: nog niet opgegeven welke rekening van je partner is.");
  }
  if (personen.some((p) => p.loonheffing == null && p.loon + p.uitkering + p.pensioen > 0)) {
    aannames.push("Ingehouden loonheffing is geschat uit wat er netto binnenkwam. Vul het bedrag van je jaaropgave in voor een betere uitkomst.");
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
