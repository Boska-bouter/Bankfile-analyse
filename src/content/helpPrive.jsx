// beide-V1R9 — fase 8: Help en uitleg voor een privédossier. Zakelijke hoofdstukken (BTW, activa, lease, percentages
// zakelijk, onderbouwing) worden verborgen; hoofdstukken met dezelfde sleutel worden vervangen door een privéversie;
// de rest (opslaan, oplichting, herkenning, regels, begrippen) blijft gelijk. Alleen tekst, geen logica.
import { HELP_CHAPTERS, HELP_GROEPEN } from "./helpChapters.jsx";
import { VOORWAARDEN_PRIVE_INHOUD } from "./voorwaardenPrive.jsx";

const VERBORGEN_IN_PRIVE = new Set([
  "jaaroverzicht", "btw-aangifte-kwartaal", "categorieen-overzicht", "persoonlijke-aannames", "huur-deels-zakelijk",
  "categorie-percentage-zakelijk", "activa-afschrijving", "lease-financieel", "btw-percentages", "doc-onderbouwing",
]);

const Li = ({ children }) => <li className="flex gap-2.5"><span className="text-slate-400 shrink-0">•</span><span>{children}</span></li>;

export const PRIVE_INTRO = (
  <ol className="space-y-2.5 list-none">
    <Li>Dit is een <strong>privédossier</strong>: alleen je eigen huishouden, zonder onderneming. Je ziet je inkomsten, uitgaven, vaste lasten en sparen, en een indicatie van je inkomstenbelasting. BTW, winst en bedrijfsmiddelen komen hier niet voor.</Li>
    <Li>De wizard (Basisvragen) vraagt naar je naam, een fiscale partner, waar jullie inkomen vandaan komt, wonen (huur of koop) en spaargeld. In de uitgebreide weergave komen daar onder meer WOZ-waarde, hypotheekrente, vermogen op 1 januari en de loonheffing van je jaaropgave bij.</Li>
    <Li>Laad je bankbestanden (CSV, Excel, MT940 of CAMT.053). De app deelt de boekingen in categorieën in, zoals Wonen, Boodschappen, Vervoer en Zorg. Klopt een indeling niet? Pas hem aan bij Controleren; dat onthoudt de app voor dezelfde tegenpartij, in alle jaren.</Li>
    <Li>Het Overzicht toont per jaar je budget en de belastingindicatie. Links bij Acties maak je de berekening inkomstenbelasting, de samenvatting, een Excel-bestand of een printbaar budgetoverzicht.</Li>
    <Li>Je bankgegevens worden lokaal in deze browser verwerkt en bewaard, niet op een server. Gebruik "Dossier opslaan" voor een back-upbestand.</Li>
  </ol>
);

export const PRIVE_HELP_CHAPTERS = [
  {
    key: "werken-met-de-app",
    groep: "beginnen",
    titel: "De route en de tabbladen",
    inhoud: (
      <div className="space-y-2.5">
        <p><strong>De route.</strong> De balk onder de kop laat de stappen zien: Import → Controleren → Instellingen → Advies. De kaart "Eerstvolgende stap" zegt wat je nu het best kunt doen.</p>
        <p><strong>Drie tabbladen.</strong> <em>Overzicht</em> toont je budget en de belastingindicatie. <em>Controleren</em> is waar je de indeling nakijkt en ziet welke gegevens de belastingberekening nog mist. <em>Instellingen</em> bevat het huishouden, je rekeningen, de categorieregels en de vaste lasten.</p>
        <p><strong>Eenvoudig of Uitgebreid.</strong> In Eenvoudig loop je vier stappen door (Gegevens, Nakijken, Uitkomst, Bewaren). Uitgebreid toont alles, met vaste lasten, box 3 en meerdere jaren naast elkaar.</p>
      </div>
    ),
  },
  {
    key: "dossiercontrole",
    groep: "overzicht",
    titel: "Dossiercontrole (ring en open punten)",
    inhoud: (
      <div className="space-y-2">
        <p>De kaart bovenaan het Overzicht toont per jaar het aantal <strong>open punten</strong>: onzekere indelingen, overboekingen aan personen, "Overig" en basisvragen die nog open staan.</p>
        <p>De buitenste ring telt het hele dossier, de binnenste alleen het gekozen jaar. Bij 100% staat er "Alles afgehandeld".</p>
        <p className="text-xs text-slate-400">Dossiercontrole zegt alleen dat je overzicht rond is. Of je de aangifte inkomstenbelasting al hebt gedaan, vink je apart aan op de kaart "Indicatie inkomstenbelasting".</p>
      </div>
    ),
  },
  {
    key: "prive-budget",
    groep: "overzicht",
    titel: "Inkomsten, uitgaven, vaste lasten en sparen",
    inhoud: (
      <div className="space-y-2.5">
        <p><strong>Inkomsten en uitgaven.</strong> Alles wat er in het jaar binnenkwam en eruit ging, plus wat je spaarde of belegde. "Over" is wat er overbleef, "Tekort" wat er meer uitging dan binnenkwam. Overboekingen tussen je eigen rekeningen tellen niet mee. Met <em>Per maand</em> zie je elke maand apart, ook als download voor Excel.</p>
        <p><strong>Uitgaven per categorie.</strong> Je uitgaven per hoofdcategorie (Wonen, Boodschappen, Vervoer …), van groot naar klein. Klik op een categorie voor de onderverdeling.</p>
        <p><strong>Vaste lasten.</strong> Huur of hypotheek, energie, verzekeringen, abonnementen en dergelijke: wat elke maand terugkomt, met het bedrag per maand. Welke categorieën vast zijn, stel je in bij Instellingen → Vaste/variabele kosten.</p>
        <p><strong>Sparen.</strong> Wat er netto naar je spaarrekening of beleggingen ging. In Uitgebreid staat hier ook je vermogen voor box 3.</p>
        <p><strong>Meerjarenoverzicht.</strong> Heb je meerdere jaren geladen, dan zie je ze naast elkaar, eventueel per categorie.</p>
      </div>
    ),
  },
  {
    key: "prive-belasting",
    groep: "overzicht",
    titel: "Indicatie inkomstenbelasting",
    inhoud: (
      <div className="space-y-2.5">
        <p>De app rekent je <strong>inkomstenbelasting</strong> uit over het jaar en trekt de loonheffing af die je werkgever, uitkeringsinstantie of pensioenfonds al inhield. Het verschil is wat je ongeveer terugkrijgt of moet bijbetalen.</p>
        <p><strong>Box 1.</strong> Loon, uitkering, pensioen en AOW (bruto), plus het eigenwoningforfait min de aftrekbare hypotheekrente, min aftrekposten. Daarover gelden de schijven van dat jaar; wie de AOW-leeftijd heeft, betaalt in de eerste schijf minder. Daarna gaan de heffingskortingen eraf: algemene heffingskorting, arbeidskorting en ouderenkorting.</p>
        <p><strong>Loonheffing.</strong> Op de bank zie je alleen het netto bedrag. Weet de app de loonheffing niet, dan rekent hij terug wat het bruto loon geweest moet zijn, en schat hij de loonheffing alsof die precies klopte. Het verschil is dan ongeveer nul. Vul in Uitgebreid de bedragen van je jaaropgave in voor een echte uitkomst.</p>
        <p><strong>Eigen woning.</strong> Met een koopwoning telt het eigenwoningforfait (een percentage van de WOZ-waarde) als inkomen en is de hypotheekrente aftrekbaar. Een aflossingsvrije lening die na 2012 is afgesloten, geeft geen renteaftrek. Is het forfait hoger dan de rente, dan geldt de regeling Hillen (deels).</p>
        <p><strong>Aftrekposten.</strong> Giften aan een ANBI (boven een drempel en tot een maximum), specifieke zorgkosten (boven een drempel), lijfrentepremie en partneralimentatie. De app neemt de bedragen uit de bank; niet alles daarvan is aftrekbaar, dat staat bij de aannames.</p>
        <p><strong>Aannames.</strong> Onder de uitkomst staat wat de app heeft aangenomen, bijvoorbeeld een ontbrekende WOZ-waarde of inkomsten die nog niet als loon zijn ingedeeld. Met "Gegevens aanvullen" vul je ze aan.</p>
        <p className="text-xs text-slate-400">Toeslagen rekent de app niet uit. De aangifte doe je zelf bij de Belastingdienst; de uitkomst daar kan afwijken.</p>
      </div>
    ),
  },
  {
    key: "prive-partner",
    groep: "overzicht",
    titel: "Fiscale partner",
    inhoud: (
      <div className="space-y-2.5">
        <p>Met een fiscale partner rekent de app voor jullie allebei. Inkomsten op een rekening van je partner tellen bij je partner; geef in de wizard (Uitgebreid) op welke rekening van wie is. Zonder die opgave telt alles bij jou.</p>
        <p>Gezamenlijke posten mogen fiscale partners vrij verdelen: de eigen woning, de aftrekposten en het vermogen in box 3. De app probeert de verdelingen en kiest de verdeling waarbij jullie samen het minst betalen. Welke dat is, zie je in de berekening.</p>
      </div>
    ),
  },
  {
    key: "prive-box3",
    groep: "overzicht",
    titel: "Box 3: sparen en beleggen",
    inhoud: (
      <div className="space-y-2.5">
        <p>Box 3 zit alleen in de uitgebreide weergave. Vul per jaar je vermogen op 1 januari in: spaargeld, beleggingen en schulden. De app rekent met het forfaitaire rendement per soort vermogen, trekt het heffingsvrij vermogen af (dubbel met een fiscale partner) en past het tarief van dat jaar toe.</p>
        <p className="text-xs text-slate-400">De regels voor box 3 veranderen (na het Kerstarrest, en later een stelsel op basis van werkelijk rendement). De uitkomst is daarom extra indicatief.</p>
      </div>
    ),
  },
  {
    key: "prive-categorieen",
    groep: "overzicht",
    titel: "Categorieën in een privédossier",
    inhoud: (
      <div className="space-y-2.5">
        <p>Een privédossier kent veertien hoofdcategorieën: Inkomen, Wonen, Verzekeringen, Zorg, Boodschappen, Vervoer, Kinderen, Abonnementen, Vrije tijd, Giften, Sparen en beleggen, Aflossingen, Belastingen en Overig.</p>
        <p>Een paar categorieën tellen mee in de belasting: loon, uitkering en pensioen (inkomen), hypotheek (rente), giften, zorgkosten, lijfrente en partneralimentatie. Toeslagen en kinderbijslag tellen als inkomsten in je budget, maar niet voor de belasting.</p>
        <p>"Nog te beoordelen" (Overig) betekent dat de app het niet weet. Deel die boekingen in bij Controleren of in Eenvoudig bij Nakijken.</p>
      </div>
    ),
  },
  {
    key: "prive-gegevens",
    groep: "controleren",
    titel: "Gegevens voor de belasting",
    inhoud: (
      <p>Deze kaart bij Controleren laat zien wat de belastingberekening voor het gekozen jaar nog mist of heeft aangenomen: de loonheffing van je jaaropgave, de WOZ-waarde, de hypotheekrente, het vermogen op 1 januari of inkomsten die nog niet zijn ingedeeld. "Aanvullen" opent de wizard bij de juiste vraag.</p>
    ),
  },
  {
    key: "dossierprofiel",
    groep: "instellingen",
    titel: "Dossierprofiel (huishouden)",
    inhoud: (
      <p>Het dossierprofiel bundelt de gegevens van je huishouden: naam, fiscale partner, inkomen, wonen en vermogen, en de rekeningen die zijn geladen. "Nog niet opgegeven" telt de basisvragen die nog open staan; met "Nu beantwoorden" open je de wizard.</p>
    ),
  },
  {
    key: "meerjaren-export",
    groep: "overzicht",
    titel: "Excel en Print",
    inhoud: (
      <p><strong>Excel exporteren</strong> maakt per jaar een tabblad Budget en een tabblad Per maand, plus een tabblad met alle transacties. <strong>Print budgetoverzicht</strong> opent een printbare pagina met je budget, uitgaven per categorie, vaste lasten en de maanden. Bewaar deze bestanden zorgvuldig: ze bevatten je financiële gegevens.</p>
    ),
  },
  {
    key: "doc-aangifteberekening",
    groep: "documenten",
    titel: "Berekening inkomstenbelasting",
    inhoud: (
      <p>Een document met de volledige berekening per jaar: box 1 per persoon (inkomen, eigen woning, aftrekposten, belasting, heffingskortingen), box 3, de ingehouden loonheffing en het verschil, met de aannames. Het is een indicatie om je aangifte voor te bereiden of met een adviseur te bespreken, geen aangifte.</p>
    ),
  },
  {
    key: "doc-samenvatting",
    groep: "documenten",
    titel: "Samenvatting",
    inhoud: (
      <p>Je budget en de belastingindicatie in één oogopslag, voor één of meer jaren, met de aannames en wat er nog open staat. Handig om te bewaren, te printen of mee te nemen naar een gesprek.</p>
    ),
  },
  {
    key: "gebruiksvoorwaarden",
    groep: "beginnen",
    titel: "Gebruiksvoorwaarden privé en copyright",
    inhoud: (
      <div className="space-y-2.5">
        <p>Dit zijn de voorwaarden voor privédossiers waarmee je akkoord bent gegaan. Het scherm komt opnieuw als de tekst inhoudelijk wijzigt.</p>
        {VOORWAARDEN_PRIVE_INHOUD}
        <p className="text-xs text-slate-400">© Paul Gerits — alle rechten voorbehouden.</p>
      </div>
    ),
  },
];

// Hoofdstukken voor een soort dossier: zakelijk ongewijzigd; privé = gedeelde hoofdstukken, met privéversies op hun
// plek (zelfde sleutel) en nieuwe privéhoofdstukken achteraan in hun groep.
export function helpVoorSoort(soort) {
  if (soort !== "prive") return { intro: undefined, chapters: HELP_CHAPTERS, groepen: HELP_GROEPEN };
  const vervang = new Map(PRIVE_HELP_CHAPTERS.map((c) => [c.key, c]));
  const basis = HELP_CHAPTERS.filter((c) => !VERBORGEN_IN_PRIVE.has(c.key)).map((c) => vervang.get(c.key) || c);
  const bekend = new Set(basis.map((c) => c.key));
  const nieuw = PRIVE_HELP_CHAPTERS.filter((c) => !bekend.has(c.key));
  const chapters = HELP_GROEPEN.flatMap((g) => [...basis, ...nieuw].filter((c) => c.groep === g.key));
  return { intro: PRIVE_INTRO, chapters, groepen: HELP_GROEPEN };
}
