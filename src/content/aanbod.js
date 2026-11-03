// beide-V13R3 — vaste teksten over privacy, abonnement en Eenvoudig/Uitgebreid op één plek (wens Boska 31-10).
// Zowel de app als de welkomstpagina van de worker lezen hieruit, zodat ze niet meer uit elkaar kunnen lopen.
// Gewone JavaScript (geen JSX), zodat de worker het ook kan importeren.

// Privacy: steeds "apparaat" en "niet op een server opgeslagen".
export const PRIVACY_LABEL = "Verwerkt op je eigen apparaat";
export const PRIVACY_KERN = "Bankbestanden en het dossier worden op het eigen apparaat verwerkt en bewaard. Voor de analyse en de berekeningen is geen server nodig.";
export const PRIVACY_SERVER = "Op de server staan alleen het account (mailadres, abonnement) en het logboek van de beheerder.";

// Abonnement (zelfde termijn als voorwaarden artikel 5).
export const GRATIS_DAGEN = 30;
export const GRATIS_KORT = `Gratis, ${GRATIS_DAGEN} dagen na goedkeuring`;
export const GRATIS_UITLEG = `Gratis abonnement van ${GRATIS_DAGEN} dagen. Daarna kan verlenging worden aangevraagd; vooraf komt een herinnering.`;

// Bankkoppeling: overal dezelfde status.
export const BANKKOPPELING_STATUS = "in ontwikkeling, nog niet beschikbaar";

// Waarom kies je welke soort (wens Boska 2-11, overgenomen in beide-V13R5): één zin per soort, bovenaan elke kaart.
export const KEUZE = {
  zakelijk: "Zakelijke inkomsten en uitgaven, aftrekposten en afschrijvingen, met een indicatie voor de btw- en IB-aangifte.",
  prive: "Inzicht in je privégeld, met een indicatie voor de aangifte inkomstenbelasting.",
};
// Korte regel per soort bovenaan de welkomstpagina.
export const SOORT_KORT = {
  zakelijk: "voor zzp, eenmanszaak en BV: winst, aftrekposten, afschrijvingen, indicatie btw- en IB-aangifte.",
  prive: "voor particulieren: inzicht in je privégeld en voorbereiding op de IB-aangifte.",
};

// Wat zit in Eenvoudig en wat alleen in Uitgebreid (welkomstpagina, Help, uitleg in de app, beheerdersuitleg).
export const INZICHTEN = {
  prive: {
    beide: ["Inkomsten en uitgaven per maand", "Indicatie inkomstenbelasting", "Samenvatting om te bewaren of printen"],
    uitgebreid: ["Vaste lasten", "Sparen en vermogen (box 3)", "Eigen woning", "Meerdere jaren naast elkaar", "Downloaden in PDF, HTML of Excel"],
  },
  zakelijk: {
    beide: ["Omzet, kosten en winst", "Btw per kwartaal", "Indicatie inkomstenbelasting en Zvw", "Samenvatting om te bewaren of printen"],
    uitgebreid: ["Aangifteberekening", "Inkomen per maand", "Bedrijfsmiddelen, leningen en lease", "Meerdere jaren naast elkaar", "Downloaden in PDF, HTML of Excel"],
  },
};

const opsomming = (l) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} en ${l[l.length - 1]}`);
const klein = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// Lopende zin: "vaste lasten, sparen en vermogen (box 3), eigen woning, … en overzichten downloaden (…)".
export const uitgebreidExtra = (soort) => opsomming(INZICHTEN[soort === "prive" ? "prive" : "zakelijk"].uitgebreid.map(klein));

// beide-V14R0 — omzetten naar de andere soort (wens Boska 3-11): tekst onder de abonnemententabel en op de
// welkomstpagina. De zin over korting alleen als er een korting is ingesteld (PRIJZEN.korting); zolang alles gratis is niet.
export const OMZETTEN = {
  zakelijk: "Ook box 3 of de eigen woning? Met één druk op de knop maak je van je zakelijke dossier een privédossier. Daarvoor heb je naast Zakelijk ook Privé nodig.",
  prive: "Een eigen onderneming gestart? Met één druk op de knop maak je van je privédossier een zakelijk dossier. Daarvoor heb je naast Privé ook Zakelijk nodig.",
};
export const OMZETTEN_KORTING = {
  zakelijk: (pct) => `Met een zakelijk abonnement krijg je ${pct}% korting op een privéabonnement.`,
  prive: (pct) => `Met een privéabonnement krijg je ${pct}% korting op een zakelijk abonnement.`,
};
export const OMZETTEN_WELKOM = "Wil je een zakelijk dossier omzetten naar een privédossier, of andersom? Dat kan met één druk op de knop. Daarna vul je alleen nog de extra gegevens in die bij het nieuwe dossier horen. Hiervoor heb je wel een abonnement voor allebei nodig: Zakelijk én Privé. Heb je er nu één, dan vraag je het andere erbij aan.";
export const OMZETTEN_WELKOM_KORTING = (pct) => `Op dat tweede abonnement krijg je ${pct}% korting.`;
