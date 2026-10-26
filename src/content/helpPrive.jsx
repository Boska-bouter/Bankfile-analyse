// beide-V1R9 — fase 8: Help en uitleg voor een privédossier. Zakelijke hoofdstukken (BTW, activa, lease, percentages
// zakelijk, onderbouwing) worden verborgen; hoofdstukken met dezelfde sleutel worden vervangen door een privéversie;
// de rest (opslaan, oplichting, herkenning, regels, begrippen) blijft gelijk. Alleen tekst, geen logica.
import { HELP_CHAPTERS, HELP_GROEPEN } from "./helpChapters.jsx";
import { PRIVACY_KORT } from "./privacy.jsx";
import { VOORWAARDEN_PRIVE_INHOUD } from "./voorwaardenPrive.jsx";

const VERBORGEN_IN_PRIVE = new Set([
  "jaaroverzicht", "btw-aangifte-kwartaal", "categorieen-overzicht", "persoonlijke-aannames", "huur-deels-zakelijk",
  "categorie-percentage-zakelijk", "activa-afschrijving", "lease-financieel", "btw-percentages", "doc-onderbouwing",
]);

const Li = ({ children }) => <li className="flex gap-2.5"><span className="text-slate-400 shrink-0">•</span><span>{children}</span></li>;

export const PRIVE_INTRO = (
  <ol className="space-y-2.5 list-none">
    <Li>Dit is een <strong>privédossier</strong>: een particulier huishouden, zonder onderneming. Het toont de inkomsten, uitgaven, vaste lasten en sparen, en een indicatie van de inkomstenbelasting. BTW, winst en bedrijfsmiddelen komen hier niet voor.</Li>
    <Li>De wizard (Basisvragen) vraagt naar de naam, een fiscale partner, waar het inkomen vandaan komt, wonen (huur of koop) en spaargeld. In de uitgebreide weergave komen daar onder meer WOZ-waarde, hypotheekrente, vermogen op 1 januari en de loonheffing van de jaaropgave bij.</Li>
    <Li>Laad de bankbestanden (CSV, Excel, MT940 of CAMT.053). De app deelt de boekingen in categorieën in, zoals Wonen, Boodschappen, Vervoer en Zorg. Klopt een indeling niet? Pas hem aan bij Controleren; dat onthoudt de app voor dezelfde tegenpartij, in alle jaren.</Li>
    <Li>Het Overzicht toont per jaar het budget en de belastingindicatie. Links bij Acties staan de berekening inkomstenbelasting, de samenvatting en het budgetoverzicht (als PDF, Excel of HTML).</Li>
    <Li>{PRIVACY_KORT} Gebruik "Dossier opslaan" voor een back-upbestand.</Li>
  </ol>
);

export const PRIVE_HELP_CHAPTERS = [
  {
    key: "werken-met-de-app",
    groep: "beginnen",
    titel: "De route en de tabbladen",
    inhoud: (
      <div className="space-y-2.5">
        <p><strong>De route.</strong> De balk onder de kop laat de stappen zien: Import → Controleren → Instellingen → Advies. De kaart "Eerstvolgende stap" zegt wat nu de beste volgende stap is.</p>
        <p><strong>Drie tabbladen.</strong> <em>Overzicht</em> toont het budget en de belastingindicatie. <em>Controleren</em> is de plek om de indeling na te kijken en te zien welke gegevens de belastingberekening nog mist. <em>Instellingen</em> bevat het huishouden, de rekeningen, de categorieregels en de vaste lasten.</p>
        <p><strong>Eenvoudig of Uitgebreid.</strong> Eenvoudig bestaat uit vier stappen (Gegevens, Nakijken, Uitkomst, Bewaren). Uitgebreid toont alles, met vaste lasten, box 3 en meerdere jaren naast elkaar. Een dossier in Eenvoudig kan één keer worden omgezet naar Uitgebreid; terug kan daarna niet meer.</p>
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
        <p className="text-xs text-slate-400">Dossiercontrole zegt alleen dat het overzicht rond is. Of de aangifte inkomstenbelasting al is gedaan, is apart aan te vinken op de kaart "Indicatie inkomstenbelasting".</p>
      </div>
    ),
  },
  {
    key: "prive-budget",
    groep: "overzicht",
    titel: "Inkomsten, uitgaven, vaste lasten en sparen",
    inhoud: (
      <div className="space-y-2.5">
        <p><strong>Inkomsten en uitgaven.</strong> Alles wat er in het jaar binnenkwam en eruit ging, plus wat er gespaard of belegd is. "Over" is inkomsten min uitgaven. Daaronder staat hoeveel daarvan naar sparen en beleggen ging (of eraf kwam) en hoe het saldo van de rekening veranderde. Gaat er meer opzij dan er over is, dan daalt dat saldo; dat is geen tekort. Overboekingen met andere eigen betaalrekeningen tellen niet mee. <em>Per maand</em> toont elke maand apart, ook te downloaden als PDF, Excel of HTML, of om te printen.</p>
        <p><strong>Uitgaven per categorie.</strong> De uitgaven per hoofdcategorie (Wonen, Boodschappen, Vervoer …), van groot naar klein. Klik op een categorie voor de onderverdeling.</p>
        <p><strong>Vaste lasten.</strong> Huur of hypotheek, energie, verzekeringen, abonnementen en dergelijke: wat elke maand terugkomt, met het bedrag per maand. Welke categorieën vast zijn, staat bij Instellingen → Vaste/variabele kosten.</p>
        <p><strong>Sparen.</strong> Wat er netto naar spaarrekeningen of beleggingen ging. In Uitgebreid staat hier ook het vermogen voor box 3.</p>
        <p><strong>Meerjarenoverzicht.</strong> Zijn er meerdere jaren geladen, dan staan ze naast elkaar, eventueel per categorie.</p>
      </div>
    ),
  },
  {
    key: "prive-belasting",
    groep: "overzicht",
    titel: "Indicatie inkomstenbelasting",
    inhoud: (
      <div className="space-y-2.5">
        <p>De app rekent de <strong>inkomstenbelasting</strong> uit over het jaar en trekt de loonheffing af die de werkgever, uitkeringsinstantie of het pensioenfonds al inhield. Het verschil is ongeveer wat er terugkomt of moet worden bijbetaald.</p>
        <p><strong>Box 1.</strong> Loon, uitkering, pensioen en AOW (bruto), plus het eigenwoningforfait min de aftrekbare hypotheekrente, min aftrekposten. Daarover gelden de schijven van dat jaar; wie de AOW-leeftijd heeft, betaalt in de eerste schijf minder. Daarna gaan de heffingskortingen eraf: algemene heffingskorting, arbeidskorting en ouderenkorting.</p>
        <p><strong>Loonheffing.</strong> Op de bank staat alleen het netto bedrag. Weet de app de loonheffing niet, dan rekent hij terug wat het bruto loon geweest moet zijn, en schat hij de loonheffing alsof die precies klopte. Het verschil is dan ongeveer nul. Vul in Uitgebreid de bedragen van de jaaropgave in voor een echte uitkomst.</p>
        <p><strong>Eigen woning.</strong> Met een koopwoning telt het eigenwoningforfait (een percentage van de WOZ-waarde) als inkomen en is de hypotheekrente aftrekbaar. Een aflossingsvrije lening die na 2012 is afgesloten, geeft geen renteaftrek. Is het forfait hoger dan de rente, dan geldt de regeling Hillen (deels).</p>
        <p><strong>Aftrekposten.</strong> Giften aan een ANBI (boven een drempel en tot een maximum), specifieke zorgkosten (boven een drempel), lijfrentepremie en partneralimentatie. De app neemt de bedragen uit de bank; niet alles daarvan is aftrekbaar, dat staat bij de aannames.</p>
        <p><strong>Aannames.</strong> Onder de uitkomst staat wat de app heeft aangenomen, bijvoorbeeld een ontbrekende WOZ-waarde of inkomsten die nog niet als loon zijn ingedeeld. Met "Gegevens aanvullen" zijn ze aan te vullen.</p>
        <p className="text-xs text-slate-400">Toeslagen rekent de app niet uit. De aangifte zelf gaat via de Belastingdienst; de uitkomst daar kan afwijken.</p>
      </div>
    ),
  },
  {
    key: "prive-partner",
    groep: "overzicht",
    titel: "Fiscale partner",
    inhoud: (
      <div className="space-y-2.5">
        <p>Met een fiscale partner rekent de app voor beiden. Inkomsten op een rekening van de partner tellen bij de partner; geef in de wizard (Uitgebreid) op welke rekening van wie is. Zonder die opgave telt alles bij de hoofdpersoon van het dossier.</p>
        <p>Gezamenlijke posten mogen fiscale partners vrij verdelen: de eigen woning, de aftrekposten en het vermogen in box 3. De app probeert de verdelingen en kiest de verdeling waarbij de partners samen het minst betalen. Welke dat is, staat in de berekening.</p>
      </div>
    ),
  },
  {
    key: "prive-box3",
    groep: "overzicht",
    titel: "Box 3: sparen en beleggen",
    inhoud: (
      <div className="space-y-2.5">
        <p>Box 3 zit alleen in de uitgebreide weergave. Vul per jaar het vermogen op 1 januari in: spaargeld, beleggingen en schulden. De app rekent met het forfaitaire rendement per soort vermogen, trekt het heffingsvrij vermogen af (dubbel met een fiscale partner) en past het tarief van dat jaar toe.</p>
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
        <p>Een paar categorieën tellen mee in de belasting: loon, uitkering en pensioen (inkomen), hypotheek (rente), giften, zorgkosten, lijfrente en partneralimentatie. Toeslagen en kinderbijslag tellen als inkomsten in het budget, maar niet voor de belasting.</p>
        <p>"Nog te beoordelen" (Overig) betekent dat de app het niet weet. Deel die boekingen in bij Controleren of in Eenvoudig bij Nakijken.</p>
      </div>
    ),
  },
  {
    key: "prive-gegevens",
    groep: "controleren",
    titel: "Gegevens voor de belasting",
    inhoud: (
      <p>Deze kaart bij Controleren laat zien wat de belastingberekening voor het gekozen jaar nog mist of heeft aangenomen: de loonheffing van de jaaropgave, de WOZ-waarde, de hypotheekrente, het vermogen op 1 januari of inkomsten die nog niet zijn ingedeeld. "Aanvullen" opent de wizard bij de juiste vraag.</p>
    ),
  },
  {
    key: "dossierprofiel",
    groep: "instellingen",
    titel: "Dossierprofiel (huishouden)",
    inhoud: (
      <p>Het dossierprofiel bundelt de gegevens van het huishouden: naam, fiscale partner, inkomen, wonen en vermogen, en de rekeningen die zijn geladen. "Nog niet opgegeven" telt de basisvragen die nog open staan; "Nu beantwoorden" opent de wizard.</p>
    ),
  },
  {
    key: "meerjaren-export",
    groep: "overzicht",
    titel: "Downloaden en Print",
    inhoud: (
      <p><strong>Budgetoverzicht downloaden</strong> vraagt welk formaat gewenst is. <em>PDF</em> en <em>HTML</em> bevatten het budget, uitgaven per categorie, vaste lasten en de maanden. <em>Excel</em> maakt per jaar een tabblad Budget en een tabblad Per maand, plus een tabblad met alle transacties. Elk rapport in de app heeft dezelfde knop Downloaden met de keuze PDF, Excel of HTML. <strong>Print budgetoverzicht</strong> opent een printbare pagina met het budget, uitgaven per categorie, vaste lasten en de maanden. Bewaar deze bestanden zorgvuldig: ze bevatten financiële gegevens.</p>
    ),
  },
  {
    key: "doc-aangifteberekening",
    groep: "documenten",
    titel: "Berekening inkomstenbelasting",
    inhoud: (
      <p>Een document met de volledige berekening per jaar: box 1 per persoon (inkomen, eigen woning, aftrekposten, belasting, heffingskortingen), box 3, de ingehouden loonheffing en het verschil, met de aannames. Het is een indicatie om de aangifte voor te bereiden of met een adviseur te bespreken, geen aangifte.</p>
    ),
  },
  {
    key: "doc-samenvatting",
    groep: "documenten",
    titel: "Samenvatting",
    inhoud: (
      <p>Het budget en de belastingindicatie in één oogopslag, voor één of meer jaren, met de aannames en wat er nog open staat. Handig om te bewaren, te printen of mee te nemen naar een gesprek.</p>
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
