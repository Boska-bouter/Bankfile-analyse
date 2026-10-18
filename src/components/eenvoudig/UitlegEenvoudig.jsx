import { X } from "lucide-react";

// nieuw-V3R0 — handleiding van de eenvoudige weergave, in gewone taal. Opent de eerste keer vanzelf (per gebruiker),
// daarna via de knop "Uitleg" in de bovenbalk.
const H = ({ children }) => <h3 className="mt-5 mb-1.5 text-base font-bold text-slate-900">{children}</h3>;
const P = ({ children }) => <p className="mb-2 text-sm leading-relaxed text-slate-700">{children}</p>;
const Keuze = ({ titel, children }) => (
  <li className="rounded-lg bg-slate-50 px-3 py-2"><b className="text-slate-900">{titel}</b><span className="block text-slate-600">{children}</span></li>
);

export default function UitlegEenvoudig({ onClose, eersteKeer = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold">{eersteKeer ? "Welkom — zo werkt het" : "Uitleg"}</h2>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /> Sluiten</button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2">
          <P>Met deze app zie je op basis van je bankafschriften <b>wat je bedrijf heeft verdiend</b>, <b>hoeveel belasting</b> je ongeveer moet betalen en <b>hoeveel BTW</b> per kwartaal. Je doorloopt vier stappen. Je kunt altijd stoppen; alles wat je doet wordt direct bewaard op dit apparaat.</P>

          <H>Stap 1 · Gegevens</H>
          <P>Hier voeg je de bankbestanden toe: de afschriften van je zakelijke rekening en, als je die hebt, van je privérekening. Je downloadt ze bij je bank (bijvoorbeeld als CSV-bestand). De app leest ze in; er gaat niets naar internet.</P>
          <P>Met <b>Basisvragen</b> (bovenin) vul je een paar dingen over jezelf en je bedrijf in, zoals je naam, of je een eenmanszaak of BV hebt en of je de kleineondernemersregeling (KOR) gebruikt. Die antwoorden bepalen hoe de app rekent.</P>

          <H>Stap 2 · Nakijken</H>
          <P>De app deelt al je boekingen zelf in. Waar hij twijfelt, vraagt hij het jou: <b>één vraag tegelijk</b>, de grootste bedragen eerst. Een vraag gaat over alle boekingen met dezelfde naam; je antwoord geldt voor allemaal, ook in andere jaren. Met <b>Toon de boekingen</b> zie je precies om welke betalingen het gaat.</P>
          <P>Wat gebeurt er met je antwoord?</P>
          <ul className="mb-2 space-y-1.5 text-sm">
            <Keuze titel="Voor mijn bedrijf">Telt mee als omzet (geld van een klant) of als kosten van je bedrijf. Dat verandert de winst, de belasting en de BTW.</Keuze>
            <Keuze titel="Privé">Geld voor jezelf of je huishouden. Telt niet mee voor de winst.</Keuze>
            <Keuze titel="Naar / van mijn eigen rekening">Je hebt alleen geld verschoven tussen je eigen rekeningen. Dat is geen inkomen en geen uitgave.</Keuze>
            <Keuze titel="Iets anders…">Je kiest zelf een preciezere soort uit de lijst, bijvoorbeeld huur, verzekering of autokosten.</Keuze>
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
          <P>Vanaf <b>90% herkend</b> heet de uitkomst <b>Betrouwbaar</b>. Tussen 65% en 90% is hij <b>Redelijk</b>. Onder <b>65%</b> is er te veel onbekend en laat de app nog geen belasting zien. Boven de vraag zie je hoeveel vragen je ongeveer nog nodig hebt tot Betrouwbaar; de rest mag je overslaan.</P>

          <H>Stap 3 · Uitkomst</H>
          <ul className="mb-2 space-y-1.5 text-sm">
            <Keuze titel="Wat heeft je bedrijf verdiend?">De winst: wat je van klanten ontving min de kosten van je bedrijf, zonder BTW. Soms staat er een regel "overige posten" bij, bijvoorbeeld afschrijving op een auto of machine.</Keuze>
            <Keuze titel="Hoeveel belasting ongeveer?">Een schatting van de inkomstenbelasting en de Zvw-bijdrage over die winst, na de kortingen waar je recht op hebt. Wat je dit jaar al via de bank aan de Belastingdienst betaalde, gaat eraf. "Per maand opzij zetten" helpt je om te sparen voor de aanslag.</Keuze>
            <Keuze titel="BTW per kwartaal">Hoeveel BTW je per kwartaal moet betalen of terugkrijgt. Heb je een kwartaal nog niet aangegeven, dan moet die aangifte nog gedaan worden.</Keuze>
          </ul>
          <P>Met <b>Uitkomst downloaden</b>, <b>Indicatieve aangifteberekening</b> en <b>Samenvatting</b> maak je een document dat je kunt bewaren, printen of aan je adviseur geven. Alles is een schatting op basis van je bankgegevens, geen officiële aangifte.</P>

          <H>Stap 4 · Bewaren</H>
          <P>Je werk staat al op dit apparaat. Met <b>Dossier opslaan</b> maak je een bestand dat je ergens anders bewaart of op een ander apparaat weer opent (via Dossier → Dossier laden). Doe dat regelmatig, zeker voordat je een nieuw dossier begint.</P>

          <H>Hulp nodig?</H>
          <P>Gebruik de knop <b>Hulpvraag of feedback</b> rechtsonder. Twijfel je over je belasting of over een boeking, vraag het dan ook je adviseur.</P>
        </div>
        <div className="border-t border-slate-200 px-5 py-3 text-right">
          <button type="button" onClick={onClose} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">{eersteKeer ? "Begrepen, aan de slag" : "Sluiten"}</button>
        </div>
      </div>
    </div>
  );
}
