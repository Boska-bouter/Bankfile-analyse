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

// Wat zit in Eenvoudig en wat alleen in Uitgebreid (welkomstpagina, Help, uitleg in de app, beheerdersuitleg).
export const INZICHTEN = {
  prive: {
    beide: ["Inkomsten en uitgaven per maand en per categorie", "Indicatie van de inkomstenbelasting", "Samenvatting om te bewaren of printen"],
    uitgebreid: ["Vaste lasten", "Sparen en vermogen (box 3)", "Eigen woning", "Meerdere jaren naast elkaar", "Overzichten downloaden (PDF, HTML, Excel)"],
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
