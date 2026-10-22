// beide-V1R7 (fase 4) — de privéwizard als gegevens. Een vraag toevoegen = een regel in deze lijst; de component
// (components/prive/PriveWizardModal.jsx) tekent elk type vanzelf. Antwoorden staan in één object per dossier
// (priveAntwoorden); namen gaan naar eigenNamen, zodat de herkenning van overboekingen naar jezelf blijft werken.
//
// Vraagtypes:
//   keuze        één antwoord uit `opties`
//   meerkeuze    één of meer antwoorden uit `opties` (lijst)
//   naam         tekstveld; bewaard in eigenNamen[veld]
//   jaartal      één jaartal
//   bedragPerJaar           per dossierjaar één bedrag          { 2025: 1234 }
//   bedragenPerJaar         per dossierjaar enkele bedragen     { 2025: { sparen: 1, … } }  (velden)
//   perBestand   per geladen bankbestand één keuze uit `opties` { "bestand.csv": "eigen" }
// `uitgebreid: true` = alleen in de uitgebreide weergave (in Eenvoudig blijft de vraag open voor later).
// `toon(a, ctx)` = alleen vragen als dit waar is (a = antwoorden, ctx = { eigenNamen, jaren, bestanden }).

const JA_NEE = [{ waarde: "ja", label: "Ja" }, { waarde: "nee", label: "Nee" }];
const BRONNEN = [
  { waarde: "loon", label: "Loon of salaris" },
  { waarde: "uitkering", label: "Uitkering (WW, WIA, bijstand)" },
  { waarde: "aow", label: "AOW" },
  { waarde: "pensioen", label: "Pensioen" },
  { waarde: "anders", label: "Anders of geen" },
];
const metPartner = (a) => a.partner === "ja";
const heeftLoonheffing = (bron) => (bron || []).some((b) => ["loon", "uitkering", "aow", "pensioen"].includes(b));

export const PRIVE_WIZARD_STAPPEN = Object.freeze([
  {
    id: "huishouden", titel: "Huishouden",
    vragen: [
      { key: "naam", type: "naam", veld: "ondernemer", vraag: "Je naam", uitleg: "Zoals op je bankrekening. Zo herkent de app overboekingen naar en van jezelf.", placeholder: "Bijv. J. de Vries" },
      { key: "partner", type: "keuze", opties: JA_NEE, vraag: "Heb je een fiscale partner?", uitleg: "Je echtgenoot of geregistreerd partner, of iemand met wie je samenwoont en bijvoorbeeld een koopwoning of kind hebt." },
      { key: "partnerNaam", type: "naam", veld: "partner", vraag: "Naam van je partner", placeholder: "Bijv. M. de Vries", toon: metPartner, optioneel: true },
    ],
  },
  {
    id: "inkomen", titel: "Inkomen",
    vragen: [
      { key: "inkomen", type: "meerkeuze", opties: BRONNEN, vraag: "Waar komt je inkomen vandaan?", uitleg: "Meer dan één kan. De app herkent deze bijschrijvingen dan ook beter." },
      { key: "inkomenPartner", type: "meerkeuze", opties: BRONNEN, vraag: "En het inkomen van je partner?", toon: metPartner },
    ],
  },
  {
    id: "wonen", titel: "Wonen",
    vragen: [
      { key: "wonen", type: "keuze", vraag: "Heb je een koopwoning met hypotheek, of huur je?", opties: [
        { waarde: "koop", label: "Koopwoning met hypotheek" }, { waarde: "koopZonder", label: "Koopwoning zonder hypotheek" },
        { waarde: "huur", label: "Huurwoning" }, { waarde: "anders", label: "Anders (inwonend e.d.)" },
      ] },
      { key: "hypotheekVorm", type: "keuze", uitgebreid: true, vraag: "Wat voor hypotheek is het?", toon: (a) => a.wonen === "koop", opties: [
        { waarde: "annuitair", label: "Annuïtair" }, { waarde: "lineair", label: "Lineair" },
        { waarde: "aflossingsvrij", label: "Aflossingsvrij" }, { waarde: "combinatie", label: "Combinatie of weet ik niet" },
      ] },
      { key: "hypotheekStart", type: "jaartal", uitgebreid: true, vraag: "In welk jaar is de hypotheek begonnen?", uitleg: "Na 2013 is de renteaftrek alleen mogelijk bij annuïtair of lineair aflossen.", toon: (a) => a.wonen === "koop" },
      { key: "woz", type: "bedragPerJaar", uitgebreid: true, vraag: "WOZ-waarde per jaar", uitleg: "Staat op de aanslag gemeentelijke belastingen. Nodig voor het eigenwoningforfait.", toon: (a) => a.wonen === "koop" || a.wonen === "koopZonder" },
    ],
  },
  {
    id: "vermogen", titel: "Sparen en beleggen",
    vragen: [
      { key: "vermogen", type: "keuze", vraag: "Heb je spaargeld of beleggingen boven de vrijstelling?", uitleg: "De vrijstelling in box 3 is ongeveer € 57.000 per persoon; met een fiscale partner het dubbele.", opties: [
        { waarde: "ja", label: "Ja" }, { waarde: "nee", label: "Nee" }, { waarde: "weetNiet", label: "Weet ik niet" },
      ] },
      { key: "vermogen1jan", type: "bedragenPerJaar", uitgebreid: true, vraag: "Vermogen op 1 januari", uitleg: "Samen met je partner. Schulden zonder je hypotheek voor de eigen woning.", toon: (a) => a.vermogen === "ja" || a.vermogen === "weetNiet",
        velden: [{ key: "sparen", label: "Spaargeld" }, { key: "beleggen", label: "Beleggingen" }, { key: "schulden", label: "Schulden" }] },
    ],
  },
  {
    id: "aftrek", titel: "Aftrekposten",
    vragen: [
      { key: "giften", type: "keuze", opties: JA_NEE, uitgebreid: true, vraag: "Geef je aan goede doelen (ANBI's)?", uitleg: "Giften boven een drempel zijn aftrekbaar." },
      { key: "zorgkosten", type: "keuze", opties: JA_NEE, uitgebreid: true, vraag: "Heb je zorgkosten die de verzekering niet vergoedt?", uitleg: "Bijvoorbeeld hulpmiddelen of reiskosten voor ziekenbezoek. Het eigen risico telt niet mee." },
      { key: "lijfrente", type: "keuze", opties: JA_NEE, uitgebreid: true, vraag: "Leg je in voor een lijfrente of banksparen voor je pensioen?" },
    ],
  },
  {
    id: "rekeningen", titel: "Rekeningen",
    vragen: [
      { key: "rekeningVan", type: "perBestand", uitgebreid: true, vraag: "Van wie is elke rekening?", toon: (a, ctx) => metPartner(a) && ctx.bestanden.length > 0, opties: [
        { waarde: "eigen", label: "Van mij" }, { waarde: "partner", label: "Van mijn partner" }, { waarde: "gezamenlijk", label: "Gezamenlijk" },
      ] },
    ],
  },
  {
    id: "loonheffing", titel: "Ingehouden loonheffing",
    vragen: [
      { key: "loonheffing", type: "bedragPerJaar", uitgebreid: true, vraag: "Ingehouden loonheffing per jaar", uitleg: "Staat op je jaaropgave. Dan laat de app zien of je ongeveer geld terugkrijgt of moet bijbetalen.", toon: (a) => heeftLoonheffing(a.inkomen) },
      { key: "loonheffingPartner", type: "bedragPerJaar", uitgebreid: true, vraag: "Ingehouden loonheffing van je partner", toon: (a) => metPartner(a) && heeftLoonheffing(a.inkomenPartner) },
    ],
  },
]);

const PER_JAAR = new Set(["bedragPerJaar", "bedragenPerJaar"]);

export function isBeantwoord(v, a, ctx) {
  if (v.type === "naam") return v.optioneel ? ctx.eigenNamen !== null : !!ctx.eigenNamen?.[v.veld];
  const w = a?.[v.key];
  if (v.type === "meerkeuze") return Array.isArray(w) && w.length > 0;
  if (PER_JAAR.has(v.type) || v.type === "perBestand") return !!w && typeof w === "object" && Object.keys(w).length > 0;
  return w !== undefined && w !== null && w !== "";
}

// Hoort deze vraag nu bij dit dossier? (los van of hij al beantwoord is)
export function vraagRelevant(v, a, ctx, { eenvoudig = false } = {}) {
  if (eenvoudig && v.uitgebreid) return false;
  if (PER_JAAR.has(v.type) && ctx.jaren.length === 0) return false;
  if (v.type === "perBestand" && ctx.bestanden.length === 0) return false;
  return !v.toon || !!v.toon(a || {}, ctx);
}

// Nog open vragen, voor de kaart "Nog niet beantwoord" (zelfde vorm als de zakelijke openBasisvragen).
// In Eenvoudig tellen alleen de vragen die daar ook gesteld worden.
export function openPriveVragen(a, ctx, opties = {}) {
  const lijst = [];
  for (const s of PRIVE_WIZARD_STAPPEN) {
    for (const v of s.vragen) {
      if (v.optioneel) continue;
      if (vraagRelevant(v, a, ctx, opties) && !isBeantwoord(v, a, ctx)) lijst.push({ key: v.key, label: v.vraag });
    }
  }
  return lijst;
}

// Teksten op de welkomkaart van een leeg privédossier (components/dashboard/WelkomKaart.jsx).
const TEKSTEN = Object.freeze({
  onderwerpen: "huishouden, inkomen, wonen en dergelijke",
  basis: "Huishouden, partner, inkomen en wonen — zo deelt de app je geld goed in.",
  bestanden: "Je eigen rekeningen (en die van je partner) · CSV, Excel, MT940 of CAMT.053 · per jaar of meerdere jaren.",
  controleren: "Indeling van je uitgaven en inkomsten nalopen. Beschikbaar na de import.",
});

export const PRIVE_WIZARD = Object.freeze({ stappen: PRIVE_WIZARD_STAPPEN, openVragen: openPriveVragen, isBeantwoord, vraagRelevant, teksten: TEKSTEN });
