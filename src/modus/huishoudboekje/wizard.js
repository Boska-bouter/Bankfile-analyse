// huishoudboekje-V1R0 — de korte vragenlijst van het Huishoudboekje: alleen wat nodig is om de uitgaven goed in te
// delen en te vergelijken met wat gebruikelijk is (Nibud/CBS). Geen fiscale vragen. Zelfde vorm als de privéwizard,
// zodat PriveWizardModal hem tekent; de antwoorden staan ook in priveAntwoorden.
import { isBeantwoord, vraagRelevant } from "../prive/wizard.js";
import { RICHTWAARDEN as R } from "../../calc/huishoudboekje/richtwaarden.js";

// huishoudboekje-V1R1 (wens Boska 2-11) — in de wizard ook meteen de vaste lasten en de budgetten. De waarden van de
// vaste lasten zijn categorienamen: wat je aankruist telt als vaste last en de app meldt het als het niet in de
// bankgegevens staat. De budgetten komen in hetzelfde antwoord als het venster Budgetten (budgetten, per maand).
export const HUISHOUD_VASTE_LASTEN_KEUZE = Object.freeze([
  { waarde: "Privé - huur", label: "Huur" }, { waarde: "Hypotheek", label: "Hypotheek" },
  { waarde: "Privé - energie", label: "Energie" }, { waarde: "Privé - water", label: "Water" },
  { waarde: "Privé - gemeentelijke kosten", label: "Gemeentelijke belastingen" },
  { waarde: "Zorgverzekering", label: "Zorgverzekering" }, { waarde: "Verzekeringen", label: "Andere verzekeringen" },
  { waarde: "Privé - internet/TV", label: "Internet & tv" }, { waarde: "Privé - mobiel", label: "Mobiel" },
  { waarde: "Privé overige abonnementen", label: "Streaming & andere abonnementen" },
  { waarde: "Kinderopvang", label: "Kinderopvang" }, { waarde: "Leningen (privé)", label: "Aflossing lening" },
  { waarde: "Private lease", label: "Private lease" },
]);
export const HUISHOUD_BUDGET_VELDEN = Object.freeze([
  { key: "Boodschappen", label: "Boodschappen" }, { key: "Drogist & huishouden", label: "Drogist & huishouden" },
  { key: "Uit eten & afhalen", label: "Uit eten & afhalen" }, { key: "Vakantie & dagjes uit", label: "Vakantie & dagjes uit" },
  { key: "Cultuur & concerten", label: "Bioscoop, theater & concerten" }, { key: "Sport & hobby", label: "Sport & hobby" },
  { key: "Kleding & schoenen", label: "Kleding & schoenen" },
]);
const personen = (a) => (a.partner === "ja" ? 2 : 1) + Math.max(0, Math.min(3, Number(a.kinderen) || 0));
// Voorbeeldbedragen (Nibud, afgeleid) als hulp bij het invullen; niets wordt vanzelf ingevuld.
export function budgetSuggestie(a = {}) {
  const volw = a.partner === "ja" ? 2 : 1, kind = Math.max(0, Math.min(3, Number(a.kinderen) || 0));
  const p = personen(a);
  return {
    Boodschappen: (volw === 2 ? R.boodschappen.tweeVolwassenen : R.boodschappen.eenVolwassene) + kind * R.boodschappen.perKind,
    "Kleding & schoenen": R.kledingPerPersoon * p,
    "Uit eten & afhalen": Math.round((R.vrijeTijdPerPersoon * p) / 3),
    "Vakantie & dagjes uit": Math.round((R.vrijeTijdPerPersoon * p) / 3),
  };
}

const JA_NEE = [{ waarde: "ja", label: "Ja" }, { waarde: "nee", label: "Nee" }];
export const HUISHOUD_WIZARD_STAPPEN = Object.freeze([
  {
    id: "huishouden", titel: "Huishouden",
    vragen: [
      { key: "naam", type: "naam", veld: "ondernemer", vraag: "Naam rekeninghouder", uitleg: "Zoals op de bankrekening. Zo herkent de app overboekingen naar en van je eigen rekeningen.", placeholder: "Bijv. J. de Vries" },
      { key: "partner", type: "keuze", opties: JA_NEE, vraag: "Woon je samen met een partner?", uitleg: "Dan vergelijkt de app de uitgaven met die van een huishouden van twee volwassenen." },
      { key: "partnerNaam", type: "naam", veld: "partner", vraag: "Naam van de partner", placeholder: "Bijv. M. de Vries", toon: (a) => a.partner === "ja", optioneel: true },
      { key: "kinderen", type: "keuze", vraag: "Hoeveel kinderen wonen er thuis?", uitleg: "Voor de vergelijking van bijvoorbeeld de boodschappen.", opties: [
        { waarde: "0", label: "Geen" }, { waarde: "1", label: "1" }, { waarde: "2", label: "2" }, { waarde: "3", label: "3 of meer" },
      ] },
    ],
  },
  {
    id: "wonen", titel: "Wonen",
    vragen: [
      { key: "wonen", type: "keuze", vraag: "Huur je of heb je een koopwoning?", uitleg: "De app vergelijkt je woonlasten met het gemiddelde van huurders of van kopers.", opties: [
        { waarde: "huurCorporatie", label: "Huur bij een woningcorporatie" }, { waarde: "huurParticulier", label: "Huur bij een particuliere verhuurder" },
        { waarde: "koop", label: "Koopwoning" }, { waarde: "anders", label: "Anders (inwonend e.d.)" },
      ] },
    ],
  },
  {
    id: "vasteLasten", titel: "Vaste lasten",
    vragen: [
      { key: "vasteLasten", type: "meerkeuze", vraag: "Welke vaste lasten heb je?", uitleg: "Kruis alles aan wat je elke maand (of elk jaar) betaalt. Die bedragen tellen als vaste lasten, en de app meldt het als iets niet in je bankgegevens staat, bijvoorbeeld omdat je het van een andere rekening betaalt.",
        opties: HUISHOUD_VASTE_LASTEN_KEUZE },
    ],
  },
  {
    id: "budget", titel: "Budget per maand",
    vragen: [
      { key: "budgetten", type: "bedragen", optioneel: true, vraag: "Hoeveel wil je per maand uitgeven?", uitleg: "Ga je erover, dan waarschuwt de app. Laat leeg wat je niet wilt bijhouden; later aanpassen kan met de knop Budgetten. Het voorbeeldbedrag komt van het Nibud voor jouw huishouden.",
        velden: HUISHOUD_BUDGET_VELDEN, suggestie: budgetSuggestie },
      { key: "spaardoel", type: "bedrag", optioneel: true, vraag: "Hoeveel wil je per maand sparen?", uitleg: `Het Nibud raadt aan minstens ${R.sparen.minimaal}% van je netto inkomen opzij te zetten. De app laat zien of je het haalt.` },
    ],
  },
]);

export function openHuishoudVragen(a, ctx, opties = {}) {
  const lijst = [];
  for (const s of HUISHOUD_WIZARD_STAPPEN) for (const v of s.vragen) {
    if (v.optioneel) continue;
    if (vraagRelevant(v, a, ctx, opties) && !isBeantwoord(v, a, ctx)) lijst.push({ key: v.key, label: v.vraag });
  }
  return lijst;
}

const TEKSTEN = Object.freeze({
  onderwerpen: "huishouden, wonen, vaste lasten en budget",
  basis: "Wie er in het huishouden wonen, of je huurt of koopt, je vaste lasten en je budget. Zo vergelijkt de app je uitgaven met wat gebruikelijk is en met wat je zelf wilt.",
  bestanden: "Je eigen betaalrekening(en) · CSV, Excel, MT940 of CAMT.053 · of via de bankkoppeling.",
  controleren: "Indeling van de uitgaven en inkomsten nalopen. Beschikbaar na de import.",
});

export const HUISHOUD_WIZARD = Object.freeze({ stappen: HUISHOUD_WIZARD_STAPPEN, openVragen: openHuishoudVragen, isBeantwoord, vraagRelevant, teksten: TEKSTEN });

// Huishouden voor de vergelijking: aantal volwassenen en kinderen, en de woonsituatie.
export function huishoudenUit(a = {}) {
  return {
    volwassenen: a.partner === "ja" ? 2 : 1,
    kinderen: Math.max(0, Math.min(3, Number(a.kinderen) || 0)),
    wonen: ["huurCorporatie", "huurParticulier", "koop", "anders"].includes(a.wonen) ? a.wonen : null,
    beantwoord: a.partner != null && a.kinderen != null,
  };
}
