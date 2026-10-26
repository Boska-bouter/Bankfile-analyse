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
      <P>Deze app laat op basis van de bankafschriften zien <b>waar het geld vandaan komt en waar het naartoe gaat</b>, wat er overblijft, en ongeveer <b>hoeveel inkomstenbelasting</b> er terugkomt of moet worden bijbetaald. Er zijn vier stappen. Stoppen kan altijd; alles wordt direct bewaard op dit apparaat.</P>

      <H>Stap 1 · Gegevens</H>
      <P>Hier komen de bankbestanden: de afschriften van de betaalrekening en, als die er zijn, van de spaarrekening of van de partner. Ze zijn te downloaden bij de bank (bijvoorbeeld als CSV-bestand). De app leest ze in; er gaat niets naar internet.</P>
      <P>Bij <b>Basisvragen</b> (bovenin) staan een paar vragen over het huishouden: de naam, of er een fiscale partner is, waar het inkomen vandaan komt (loon, uitkering, pensioen of AOW), huur of koopwoning, en of er spaargeld of beleggingen boven de vrijstelling zijn. Die antwoorden bepalen hoe de app rekent.</P>

      <H>Stap 2 · Nakijken</H>
      <P>De app deelt alle boekingen zelf in, bijvoorbeeld in boodschappen, wonen, vervoer of zorg. Waar hij twijfelt, stelt hij een vraag: <b>één vraag tegelijk</b>, de grootste bedragen eerst. Een vraag gaat over alle boekingen met dezelfde naam; het antwoord geldt voor allemaal, ook in andere jaren. <b>Toon de boekingen</b> laat precies zien om welke betalingen het gaat.</P>
      <P>Wat gebeurt er met het antwoord?</P>
      <ul className="mb-2 space-y-1.5 text-sm">
        <Keuze titel="Loon, uitkering, pensioen of AOW">Telt als inkomen. Daarover rekent de app de inkomstenbelasting uit.</Keuze>
        <Keuze titel="Toeslag of van familie en vrienden">Telt als geld dat binnenkomt in het budget, maar niet als inkomen voor de belasting.</Keuze>
        <Keuze titel="Boodschappen, winkels, vrije tijd, vervoer">Gewone uitgaven. Ze staan bij "Uitgaven per categorie".</Keuze>
        <Keuze titel="Sparen of naar / van een eigen rekening">Er is alleen geld verschoven tussen eigen rekeningen. Dat is geen inkomen en geen uitgave.</Keuze>
        <Keuze titel="Iets anders…">Kies zelf een preciezere soort uit de lijst, bijvoorbeeld huur, zorgverzekering of giften.</Keuze>
        <Keuze titel="Weet ik niet, sla over">De vraag komt aan het eind nog een keer terug. Laten staan kan ook.</Keuze>
      </ul>
      <P>Het groene vak <b>Voorstel</b> is wat de app denkt. Klopt het, tik er dan gewoon op.</P>

      <H>Hoe zeker is de uitkomst?</H>
      <P>De balk laat zien hoeveel van het geld (naar bedrag, niet naar aantal boekingen) de app goed kent:</P>
      <ul className="mb-2 space-y-1 text-sm text-slate-700">
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-600" /><b>Herkend</b> — de app weet het zeker, of het is bevestigd.</li>
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" /><b>Geschat</b> — de app denkt het te weten, maar niet zeker.</li>
        <li><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-600" /><b>Nog onbekend</b> — de app weet niet waar het voor was.</li>
      </ul>
      <P>Is er nog veel onzeker, dan kan het budgetoverzicht nog verschuiven en toont de app nog geen belastingindicatie. Boven de vraag staat hoeveel vragen er ongeveer nog nodig zijn tot <b>Betrouwbaar</b>.</P>

      <H>Stap 3 · Uitkomst</H>
      <ul className="mb-2 space-y-1.5 text-sm">
        <Keuze titel="Inkomsten en uitgaven">Wat er binnenkwam, wat eruit ging, wat er over is en hoeveel daarvan gespaard is. <b>Per maand</b> toont dat voor elke maand apart.</Keuze>
        <Keuze titel="Indicatie inkomstenbelasting">Een schatting van de inkomstenbelasting na de heffingskortingen, min de loonheffing die de werkgever of uitkeringsinstantie al inhield. Weet de app die loonheffing niet, dan schat hij die. Onder "Aannames" staat wat de app heeft aangenomen.</Keuze>
        <Keuze titel="Uitgaven per categorie">Waar het geld naartoe ging, van groot naar klein.</Keuze>
      </ul>
      <P><b>Samenvatting</b> maakt een document om te bewaren of te printen. In de uitgebreide versie staan daar ook vaste lasten, sparen, vermogen (box 3) en meerdere jaren naast elkaar. Alles is een schatting op basis van de bankgegevens, geen aangifte. Toeslagen rekent de app niet uit.</P>

      <H>Stap 4 · Bewaren</H>
      <P>Het werk staat al op dit apparaat. <b>Dossier opslaan</b> maakt een bestand om ergens anders te bewaren of op een ander apparaat weer te openen (via Dossier → Dossier laden). Doe dat regelmatig, zeker voor het begin van een nieuw dossier.</P>

      <H>Pas op voor oplichting</H>
      <div className="mb-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">{VEILIG_INHOUD}</div>

      <H>Hulp nodig?</H>
      <P>Gebruik de knop <b>Hulpvraag of feedback</b> rechtsonder. Bij twijfel over de belasting: bel de BelastingTelefoon of vraag het een adviseur.</P>
    </>
  );
}
