// huishoudboekje-V1R0 — Help voor een Huishoudboekje: de privéhoofdstukken zonder belasting en aangifte, met eigen
// hoofdstukken over het overzicht per maand en week, budgetten, "past het bij je inkomen" en besparen.
import { PRIVACY_KORT } from "./privacy.jsx";
import { RICHTWAARDEN } from "../calc/huishoudboekje/richtwaarden.js";

const Li = ({ children }) => <li className="flex gap-2.5"><span className="text-slate-400 shrink-0">•</span><span>{children}</span></li>;

// Hoofdstukken uit privé en zakelijk die in een Huishoudboekje niet gelden.
export const VERBORGEN_IN_HUISHOUDBOEKJE = new Set([
  "prive-belasting", "prive-partner", "prive-box3", "prive-gegevens", "doc-aangifteberekening", "doc-samenvatting",
  "prive-budget", "dossiercontrole", "meerjaren-export",
]);

export const HUISHOUD_INTRO = (
  <ol className="space-y-2.5 list-none">
    <Li>Dit is een <strong>Huishoudboekje</strong>: per week en per maand zien waar je geld blijft. Er wordt geen belasting berekend.</Li>
    <Li>Beantwoord de korte vragen (wie er in het huishouden wonen, huur of koop). Daarmee vergelijkt de app je uitgaven met cijfers van het Nibud en het CBS.</Li>
    <Li>Laad je bankbestanden (CSV, Excel, MT940 of CAMT.053) of gebruik de bankkoppeling. De app deelt de boekingen in: vaste lasten en variabele uitgaven. Klopt een indeling niet? Pas hem aan bij Controleren.</Li>
    <Li>Het Overzicht toont de gekozen maand of week, met het verschil met de vorige periode, je budgetten, hoe je uitgaven passen bij je inkomen en waar je het meest kunt besparen.</Li>
    <Li>{PRIVACY_KORT} Gebruik "Dossier opslaan" voor een back-upbestand.</Li>
  </ol>
);

export const HUISHOUD_HELP_CHAPTERS = [
  {
    key: "werken-met-de-app",
    groep: "beginnen",
    titel: "De tabbladen van het Huishoudboekje",
    inhoud: (
      <div className="space-y-2.5">
        <p><em>Overzicht</em> toont de inkomsten en uitgaven per maand of per week. <em>Controleren</em> is de plek om de indeling na te kijken. <em>Instellingen</em> bevat het huishouden, de rekeningen, de categorieregels en welke categorieën vaste lasten zijn.</p>
        <p>Het Huishoudboekje is een eigen abonnement, zonder Eenvoudig of Uitgebreid.</p>
      </div>
    ),
  },
  {
    key: "huishoud-overzicht",
    groep: "overzicht",
    titel: "Per maand of per week",
    inhoud: (
      <div className="space-y-2.5">
        <p>Kies bovenaan <strong>Maand</strong> of <strong>Week</strong> en blader met de pijltjes. Een week loopt van maandag tot en met zondag.</p>
        <p>Bij elk bedrag staat hoeveel procent het hoger of lager is dan de vorige periode. Hogere uitgaven zijn rood, lagere groen. Is de vorige periode nul, dan staat er "nieuw". Een periode die nog loopt of waarin je bankbestand halverwege begint, heet "onvolledig" en krijgt geen percentage.</p>
        <p><strong>Vaste lasten</strong> zijn de uitgaven die elke maand terugkomen: huur of hypotheek, energie, water, verzekeringen, abonnementen. <strong>Variabele uitgaven</strong> zijn de rest: boodschappen, uit eten, vakantie, kleding en dergelijke. Welke categorie vast is, stel je in bij Instellingen → Vaste/variabele kosten.</p>
        <p>Vaste lasten die per kwartaal of per jaar komen (bijvoorbeeld gemeentelijke belastingen) kun je laten uitsmeren over de maanden, zodat een maand niet ineens duur lijkt.</p>
        <p>Sparen en overboekingen tussen je eigen rekeningen tellen niet als uitgave. Terugbetalingen (Tikkie, retour) verlagen de uitgave.</p>
      </div>
    ),
  },
  {
    key: "huishoud-budget",
    groep: "overzicht",
    titel: "Budgetten",
    inhoud: (
      <div className="space-y-2.5">
        <p>Geef per categorie aan hoeveel je per maand wilt uitgeven, bijvoorbeeld € 400 voor boodschappen. Gaat een categorie erover, dan krijg je bovenaan een waarschuwing en kleurt de categorie rood. Vanaf 90% kleurt hij oranje.</p>
        <p>In de weekweergave rekent de app het maandbudget om naar een week (× 12 / 52).</p>
      </div>
    ),
  },
  {
    key: "huishoud-inkomen",
    groep: "overzicht",
    titel: "Past het bij je inkomen?",
    inhoud: (
      <div className="space-y-2.5">
        <p>De app vergelijkt een paar uitgaven met je netto inkomen: woonlasten, alle vaste lasten, boodschappen en sparen. Als inkomen telt het gemiddelde van de laatste drie volledige maanden, zodat één maand met vakantiegeld de uitkomst niet vertekent.</p>
        <p>Daarnaast staat een richtwaarde voor een vergelijkbaar huishouden. Groen = binnen de richtwaarde, oranje = tot 5 procentpunt erboven (of tot 15% boven een bedrag), rood = meer.</p>
        <p className="text-xs text-slate-500">Bronnen van de richtwaarden (stand {RICHTWAARDEN.stand}): {RICHTWAARDEN.bronnen.map((b) => b.naam).join("; ")}. Het zijn indicaties, geen persoonlijk advies.</p>
      </div>
    ),
  },
  {
    key: "huishoud-besparen",
    groep: "overzicht",
    titel: "Waar kun je besparen?",
    inhoud: (
      <div className="space-y-2.5">
        <p>Geef je meer uit dan er binnenkomt, of staat een verhouding op rood, dan toont de app de plekken waar besparen het meest oplevert: categorieën boven de richtwaarde of boven je budget, uitgaven die flink zijn gestegen, vaste lasten die duurder zijn geworden, en abonnementen die op elkaar lijken.</p>
        <p>Komt je huishouden structureel tekort? Kijk voor hulp op <a className="text-teal-700 underline" href="https://www.nibud.nl" target="_blank" rel="noreferrer">nibud.nl</a>, <a className="text-teal-700 underline" href="https://www.geldfit.nl" target="_blank" rel="noreferrer">geldfit.nl</a> of bij de schuldhulpverlening van je gemeente.</p>
      </div>
    ),
  },
  {
    key: "prive-categorieen",
    groep: "overzicht",
    titel: "Categorieën in het Huishoudboekje",
    inhoud: (
      <div className="space-y-2.5">
        <p>Het Huishoudboekje gebruikt de categorieën van een privédossier, met een fijnere indeling: energie en water apart, uit eten en afhalen, vakantie en dagjes uit, bioscoop/theater/concerten, kleding en schoenen, en drogist en huishouden (non-food).</p>
        <p>"Nog te beoordelen" betekent dat de app het niet weet. Deel die boekingen in bij Controleren.</p>
      </div>
    ),
  },
];
