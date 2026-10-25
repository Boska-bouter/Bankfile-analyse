// beide-V1R9 — fase 8: de uitleg van de eenvoudige weergave voor een privédossier (zelfde opbouw als de zakelijke
// uitleg in components/eenvoudig/UitlegEenvoudig.jsx, maar over budget en inkomstenbelasting in plaats van winst en BTW).
import { VEILIG_INHOUD } from "./veiligheid.jsx";

const H = ({ children }) => <h3 className="mt-5 mb-1.5 text-base font-bold text-slate-900">{children}</h3>;
const P = ({ children }) => <p className="mb-2 text-sm leading-relaxed text-slate-700">{children}</p>;
const Keuze = ({ titel, children }) => (
  <li className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{titel}</b><span className="block text-slate-600">{children}</span></li>
);

export default function UitlegEenvoudigPrive() {
  return (
    <>
      <P>Met deze app zie je op basis van je bankafschriften <b>waar je geld vandaan komt en waar het naartoe gaat</b>, wat er overblijft, en ongeveer <b>hoeveel inkomstenbelasting</b> je terugkrijgt of moet bijbetalen. Je doorloopt vier stappen. Je kunt altijd stoppen; alles wat je doet wordt direct bewaard op dit apparaat.</P>

      <H>Stap 1 · Gegevens</H>
      <P>Hier voeg je de bankbestanden toe: de afschriften van je betaalrekening en, als je die hebt, van je spaarrekening of van je partner. Je downloadt ze bij je bank (bijvoorbeeld als CSV-bestand). De app leest ze in; er gaat niets naar internet.</P>
      <P>Met <b>Basisvragen</b> (bovenin) vul je een paar dingen over je huishouden in: je naam, of je een fiscale partner hebt, waar jullie inkomen vandaan komt (loon, uitkering, pensioen of AOW), of je huurt of een koopwoning hebt, en of je spaargeld of beleggingen boven de vrijstelling hebt. Die antwoorden bepalen hoe de app rekent.</P>

      <H>Stap 2 · Nakijken</H>
      <P>De app deelt al je boekingen zelf in, bijvoorbeeld in boodschappen, wonen, vervoer of zorg. Waar hij twijfelt, vraagt hij het jou: <b>één vraag tegelijk</b>, de grootste bedragen eerst. Een vraag gaat over alle boekingen met dezelfde naam; je antwoord geldt voor allemaal, ook in andere jaren. Met <b>Toon de boekingen</b> zie je precies om welke betalingen het gaat.</P>
      <P>Wat gebeurt er met je antwoord?</P>
      <ul className="mb-2 space-y-1.5 text-sm">
        <Keuze titel="Loon, uitkering, pensioen of AOW">Telt als inkomen. Daarover rekent de app de inkomstenbelasting uit.</Keuze>
        <Keuze titel="Toeslag of van familie en vrienden">Telt als geld dat binnenkomt in je budget, maar niet als inkomen voor de belasting.</Keuze>
        <Keuze titel="Boodschappen, winkels, vrije tijd, vervoer">Gewone uitgaven. Je ziet ze terug bij "Uitgaven per categorie".</Keuze>
        <Keuze titel="Sparen of naar / van mijn eigen rekening">Je hebt alleen geld verschoven tussen je eigen rekeningen. Dat is geen inkomen en geen uitgave.</Keuze>
        <Keuze titel="Iets anders…">Je kiest zelf een preciezere soort uit de lijst, bijvoorbeeld huur, zorgverzekering of giften.</Keuze>
        <Keuze titel="Weet ik niet, sla over">De vraag komt aan het eind nog een keer terug. Je kunt hem ook laten staan.</Keuze>
      </ul>
      <P>Het groene vak <b>Voorstel</b> is wat de app denkt. Klopt het, tik er dan gewoon op.</P>

      <H>Hoe zeker is de uitkomst?</H>
      <P>De balk laat zien hoeveel van je geld (naar bedrag, niet naar aantal boekingen) de app goed kent:</P>
      <ul className="mb-2 space-y-1 text-sm text-slate-700">
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-600" /><b>Herkend</b> — de app weet het zeker, of jij hebt het bevestigd.</li>
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" /><b>Geschat</b> — de app denkt het te weten, maar niet zeker.</li>
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-600" /><b>Nog onbekend</b> — de app weet niet waar het voor was.</li>
      </ul>
      <P>Is er nog veel onzeker, dan kan je budgetoverzicht nog verschuiven en toont de app nog geen belastingindicatie. Boven de vraag zie je hoeveel vragen je ongeveer nog nodig hebt tot <b>Betrouwbaar</b>.</P>

      <H>Stap 3 · Uitkomst</H>
      <ul className="mb-2 space-y-1.5 text-sm">
        <Keuze titel="Inkomsten en uitgaven">Wat er binnenkwam, wat eruit ging, wat er over is en hoeveel je daarvan spaarde. Met <b>Per maand</b> zie je dat voor elke maand apart.</Keuze>
        <Keuze titel="Indicatie inkomstenbelasting">Een schatting van je inkomstenbelasting na de heffingskortingen, min de loonheffing die je werkgever of uitkeringsinstantie al inhield. Weet de app die loonheffing niet, dan schat hij die. Onder "Aannames" staat wat de app heeft aangenomen.</Keuze>
        <Keuze titel="Uitgaven per categorie">Waar je geld naartoe ging, van groot naar klein.</Keuze>
      </ul>
      <P>Met <b>Samenvatting</b> maak je een document dat je kunt bewaren of printen. Heb je de uitgebreide versie, dan vind je daar ook vaste lasten, sparen, vermogen (box 3) en meerdere jaren naast elkaar. Alles is een schatting op basis van je bankgegevens, geen aangifte. Toeslagen rekent de app niet uit.</P>

      <H>Stap 4 · Bewaren</H>
      <P>Je werk staat al op dit apparaat. Met <b>Dossier opslaan</b> maak je een bestand dat je ergens anders bewaart of op een ander apparaat weer opent (via Dossier → Dossier laden). Doe dat regelmatig, zeker voordat je een nieuw dossier begint.</P>

      <H>Pas op voor oplichting</H>
      <div className="mb-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">{VEILIG_INHOUD}</div>

      <H>Hulp nodig?</H>
      <P>Gebruik de knop <b>Hulpvraag of feedback</b> rechtsonder. Twijfel je over je belasting, bel dan de BelastingTelefoon of vraag het een adviseur.</P>
    </>
  );
}
