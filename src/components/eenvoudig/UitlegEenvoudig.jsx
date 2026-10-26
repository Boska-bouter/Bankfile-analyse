import { X } from "lucide-react";
import { VEILIG_INHOUD } from "../../content/veiligheid.jsx";

// nieuw-V3R0 — handleiding van de eenvoudige weergave, in gewone taal. Opent de eerste keer vanzelf (per gebruiker),
// daarna via de knop "Uitleg" in de bovenbalk.
const H = ({ children }) => <h3 className="mt-5 mb-1.5 text-base font-bold text-slate-900">{children}</h3>;
const P = ({ children }) => <p className="mb-2 text-sm leading-relaxed text-slate-700">{children}</p>;
const Keuze = ({ titel, children }) => (
  <li className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{titel}</b><span className="block text-slate-600">{children}</span></li>
);

// beide-V1R9 — Inhoud: andere uitleg (privédossier: content/uitlegEenvoudigPrive.jsx); zonder Inhoud de zakelijke tekst.
export default function UitlegEenvoudig({ onClose, eersteKeer = false, Inhoud = null }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">{eersteKeer ? "Welkom — zo werkt het" : "Uitleg"}</h2>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2">
          {Inhoud ? <Inhoud /> : <>
          <P>Deze app laat op basis van de bankafschriften zien <b>wat het bedrijf heeft verdiend</b>, <b>hoeveel belasting</b> er ongeveer betaald moet worden en <b>hoeveel BTW</b> per kwartaal. Er zijn vier stappen. Stoppen kan altijd; alles wordt direct bewaard op dit apparaat.</P>

          <H>Stap 1 · Gegevens</H>
          <P>Hier komen de bankbestanden: de afschriften van de zakelijke rekening en, als die er is, van de privérekening. Ze zijn te downloaden bij de bank (bijvoorbeeld als CSV-bestand). De app leest ze in; er gaat niets naar internet.</P>
          <P>Bij <b>Basisvragen</b> (bovenin) staan een paar vragen over de ondernemer en het bedrijf, zoals de naam, eenmanszaak of BV, en of de kleineondernemersregeling (KOR) wordt gebruikt. Die antwoorden bepalen hoe de app rekent.</P>

          <H>Stap 2 · Nakijken</H>
          <P>De app deelt alle boekingen zelf in. Waar hij twijfelt, stelt hij een vraag: <b>één vraag tegelijk</b>, de grootste bedragen eerst. Een vraag gaat over alle boekingen met dezelfde naam; het antwoord geldt voor allemaal, ook in andere jaren. <b>Toon de boekingen</b> laat precies zien om welke betalingen het gaat.</P>
          <P>Wat gebeurt er met het antwoord?</P>
          <ul className="mb-2 space-y-1.5 text-sm">
            <Keuze titel="Voor het bedrijf">Telt mee als omzet (geld van een klant) of als kosten van het bedrijf. Dat verandert de winst, de belasting en de BTW.</Keuze>
            <Keuze titel="Privé">Geld voor de ondernemer zelf of het huishouden. Telt niet mee voor de winst.</Keuze>
            <Keuze titel="Naar / van een eigen rekening">Er is alleen geld verschoven tussen eigen rekeningen. Dat is geen inkomen en geen uitgave.</Keuze>
            <Keuze titel="Iets anders…">Kies zelf een preciezere soort uit de lijst, bijvoorbeeld huur, verzekering of autokosten.</Keuze>
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
          <P>De balk laat de voortgang zien. Of de uitkomst <b>betrouwbaar</b> is, hangt af van hoeveel geld er nog onzeker is, in euro's. Wat onzeker is op de <b>zakelijke</b> rekening telt volledig mee. Op de <b>privé</b>rekening telt het maar voor een kwart, want privé-uitgaven veranderen de winst zelden. Onder de balk staat bijvoorbeeld: "Nog € 4.800 onzeker; de belasting kan daardoor ongeveer € 1.900 afwijken."</P>
          <ul className="mb-2 space-y-1 text-sm text-slate-700">
            <li><b>Betrouwbaar</b> — hooguit € 2.500 onzeker (of 5% van de omzet, als dat meer is).</li>
            <li><b>Redelijk</b> — hooguit € 7.500 onzeker (of 15% van de omzet).</li>
            <li><b>Nog onzeker</b> — meer dan dat. De app laat dan nog geen belasting zien.</li>
          </ul>
          <P>Boven de vraag staat hoeveel vragen er ongeveer nog nodig zijn tot Betrouwbaar; de vragen met de meeste invloed komen eerst. Daarna mag de rest worden overgeslagen.</P>

          <H>Stap 3 · Uitkomst</H>
          <ul className="mb-2 space-y-1.5 text-sm">
            <Keuze titel="Wat heeft het bedrijf verdiend?">De winst: wat er van klanten binnenkwam min de kosten van het bedrijf, zonder BTW. Soms staat er een regel "overige posten" bij, bijvoorbeeld afschrijving op een auto of machine.</Keuze>
            <Keuze titel="Hoeveel belasting ongeveer?">Een schatting van de inkomstenbelasting en de Zvw-bijdrage over die winst, na de kortingen waar recht op is. Wat dit jaar al via de bank aan de Belastingdienst is betaald, gaat eraf. "Per maand opzij zetten" helpt om te sparen voor de aanslag.</Keuze>
            <Keuze titel="BTW per kwartaal">Hoeveel BTW er per kwartaal betaald moet worden of terugkomt. Is een kwartaal nog niet aangegeven, dan moet die aangifte nog gedaan worden.</Keuze>
          </ul>
          <P><b>Samenvatting</b> maakt een document van één pagina om te bewaren, te printen of aan een adviseur te geven; bovenaan staat hoe zeker de cijfers zijn. Met toegang tot de uitgebreide versie zijn er ook <b>Maandoverzicht</b> en <b>Indicatieve aangifteberekening</b>. Alles is een schatting op basis van de bankgegevens, geen officiële aangifte.</P>

          <H>Stap 4 · Bewaren</H>
          <P>Het werk staat al op dit apparaat. <b>Dossier opslaan</b> maakt een bestand om ergens anders te bewaren of op een ander apparaat weer te openen (via Dossier → Dossier laden). Doe dat regelmatig, zeker voor het begin van een nieuw dossier.</P>

          <H>Pas op voor oplichting</H>
          <div className="mb-2 space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">{VEILIG_INHOUD}</div>

          <H>Hulp nodig?</H>
          <P>Gebruik de knop <b>Hulpvraag of feedback</b> rechtsonder. Bij twijfel over de belasting of over een boeking: vraag het ook een adviseur.</P>
          </>}
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-right">
          <button type="button" onClick={onClose} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{eersteKeer ? "Begrepen, aan de slag" : "Sluiten"}</button>
        </div>
      </div>
    </div>
  );
}
