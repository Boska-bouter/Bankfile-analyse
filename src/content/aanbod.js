// beide-V13R3 — vaste teksten over privacy, abonnement en Eenvoudig/Uitgebreid op één plek (wens Boska 31-10).
// Zowel de app als de welkomstpagina van de worker lezen hieruit, zodat ze niet meer uit elkaar kunnen lopen.
// Gewone JavaScript (geen JSX), zodat de worker het ook kan importeren.

// Privacy: steeds "apparaat" en "niet op een server opgeslagen".
export const PRIVACY_LABEL = "Verwerkt op je eigen apparaat";
export const PRIVACY_KERN = "Bankbestanden en het dossier worden op het eigen apparaat verwerkt en bewaard, niet op een server.";
export const PRIVACY_SERVER = "Op de server staan alleen het account (mailadres, abonnement) en het logboek van de beheerder.";

// Abonnement (zelfde termijn als voorwaarden artikel 5).
export const GRATIS_DAGEN = 30;
export const GRATIS_KORT = `Gratis, ${GRATIS_DAGEN} dagen per aanvraag`;
export const GRATIS_UITLEG = `Gratis abonnement van ${GRATIS_DAGEN} dagen. Daarna kan verlenging worden aangevraagd; vooraf komt een herinnering.`;

// Bankkoppeling: overal dezelfde status.
export const BANKKOPPELING_STATUS = "in ontwikkeling, nog niet beschikbaar";

// Waarom kies je welke soort (wens Boska 2-11): één zin per soort, op de welkomstpagina bovenaan elke kaart.
export const KEUZE = {
  prive: "Inzicht in je privégeld en een voorbereiding op de aangifte inkomstenbelasting (indicatie).",
  zakelijk: "Inzicht in de zakelijke inkomsten en uitgaven, indicaties voor de btw- en IB-aangifte, en inzicht in aftrekposten en afschrijvingen.",
  huishoudboekje: "Je wilt per week en per maand weten waar je geld blijft.",
};

// Wat zit in Eenvoudig en wat alleen in Uitgebreid (welkomstpagina, Help, uitleg in de app, beheerdersuitleg).
export const INZICHTEN = {
  prive: {
    beide: ["Inkomsten en uitgaven per maand en per categorie", "Indicatie van de inkomstenbelasting", "Samenvatting om te bewaren of printen"],
    uitgebreid: ["Vaste lasten", "Sparen en vermogen (box 3)", "Eigen woning", "Meerdere jaren naast elkaar", "Overzichten downloaden (PDF, HTML, Excel)"],
  },
  // Huishoudboekje (wens Boska 2-11): één abonnement, geen belasting en geen aangifte.
  huishoudboekje: {
    alles: [
      "Inkomsten, vaste lasten en variabele uitgaven per maand en per week",
      "Hoger of lager dan de vorige maand, in procenten",
      "Eigen budget per categorie, met een waarschuwing als je erover gaat",
      "Past het bij je inkomen: woonlasten en vaste lasten naast Nibud- en CBS-cijfers",
      "Waar je het meest kunt besparen als de uitgaven hoger zijn dan de inkomsten",
    ],
  },
  zakelijk: {
    beide: ["Omzet, kosten en winst", "Btw per kwartaal", "Indicatie van de inkomstenbelasting en Zvw", "Samenvatting om te bewaren of printen"],
    uitgebreid: ["Aangifteberekening", "Inkomen per maand", "Bedrijfsmiddelen en leningen (ook lease)", "Meerdere jaren naast elkaar", "Overzichten downloaden (PDF, HTML, Excel)"],
  },
};

const opsomming = (l) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} en ${l[l.length - 1]}`);
const klein = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// Lopende zin: "vaste lasten, sparen en vermogen (box 3), eigen woning, … en overzichten downloaden (…)".
export const uitgebreidExtra = (soort) => opsomming(INZICHTEN[soort === "prive" ? "prive" : "zakelijk"].uitgebreid.map(klein));

// beide-V14R0 — omzetten naar de andere soort (wens Boska 3-11): tekst onder de abonnemententabel en op de
// welkomstpagina. De zin over korting alleen als er een korting is ingesteld (PRIJZEN.korting); zolang alles gratis is niet.
export const OMZETTEN = {
  zakelijk: "Ook box 3 en de eigen woning berekenen? Dan is ook een privéabonnement nodig. Daarmee maak je met één knop een privédossier van je zakelijke dossier; de privérekeningen die je al hebt opgegeven gaan mee.",
  prive: "Een bedrijf gestart? Dan is ook een zakelijk abonnement nodig. Daarmee maak je met één knop een zakelijk dossier van je privédossier: personen, rekeningen en boekingen gaan mee.",
  // huishoudboekje-V2R0 — het Huishoudboekje maak je ook met één knop van een zakelijk of privédossier.
  huishoudboekje: "Al een zakelijk of privédossier? Dan is ook een Huishoudboekje-abonnement nodig. Daarmee maak je er met één knop een Huishoudboekje van: de privérekeningen en je keuzes gaan mee.",
};
export const OMZETTEN_KORTING = {
  zakelijk: (pct) => `Met een zakelijk abonnement krijg je ${pct}% korting op een privéabonnement.`,
  prive: (pct) => `Met een privéabonnement krijg je ${pct}% korting op een zakelijk abonnement.`,
};
export const OMZETTEN_WELKOM = "Meer dan één soort? Daarvoor heb je voor elke soort een eigen abonnement nodig. Heb je die, dan hoef je niets dubbel in te voeren: een dossier zet je met één knop om naar een andere soort.";
// huishoudboekje-V2R0 — met drie soorten: de procentkorting geldt tussen Zakelijk en Privé.
export const OMZETTEN_WELKOM_KORTING = (pct) => `Heb je al Zakelijk of Privé, dan krijg je ${pct}% korting op de andere van die twee.`;
