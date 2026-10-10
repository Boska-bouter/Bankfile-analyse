import { metBolletjes } from "../components/shared/StatusDot.jsx";
import { VOORWAARDEN_INHOUD } from "./voorwaarden.jsx";
// Alle uitgebreide toelichtingsteksten, gebundeld — hergebruikt door zowel het volledige
// "Help en uitleg"-overzicht als de gerichte pop-up die bij losse "?"-knopjes opent.
export const HELP_GROEPEN = [
  { key: "beginnen", titel: "Beginnen en werken met de app" },
  { key: "overzicht", titel: "Tabblad Overzicht" },
  { key: "controleren", titel: "Tabblad Controleren" },
  { key: "instellingen", titel: "Tabblad Instellingen" },
  { key: "documenten", titel: "Documenten (links bij Acties)" },
  { key: "begrippen", titel: "Begrippen en zoeken" },
];

export const HELP_CHAPTERS = [
  {
    key: "werken-met-de-app",
    groep: "beginnen",
    titel: "De route en de tabbladen",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          <strong>De route.</strong> De balk onder de kop laat de stappen zien: Import → Controleren → Bedrijfsmiddelen →
          Instellingen → Advies. Klik op een stap om erheen te gaan. De kaart "Eerstvolgende stap" daaronder zegt wat je nu
          het best kunt doen, met een knop "Ga naar deze stap"; "Overslaan" zet die stap even opzij.
        </p>
        <p>
          <strong>Drie tabbladen.</strong> <em>Overzicht</em> toont de uitkomst: dossiercontrole, jaaroverzicht, BTW per
          kwartaal en de details. <em>Controleren</em> is waar je werk doet: import en kwaliteit, herkomst en opschonen,
          bedrijfsmiddelen (leningen, lease, activa) en aannames en percentages. <em>Instellingen</em> bevat het
          dossierprofiel en de automatisering (BTW-instellingen, regels, vaste kosten). Bij elk onderdeel in de app staat een
          klein "?" dat naar het juiste hoofdstuk hier springt.
        </p>
        <p>
          <strong>Details en overzichten.</strong> Onderaan het Overzicht staan de tabbladen Jaaroverzicht, Transacties,
          Categorieën, Activa, Leningen en Lease. Rechtsboven staan Meerjarenoverzicht, Herkenningsregels, Excel exporteren
          en Print.
        </p>
        <p>
          <strong>Zakelijk en privé.</strong> Onder "Overzicht" staat hoeveel bankbestanden zijn geladen en of dat zakelijk,
          privé of beide zijn. Bij het gekozen jaar staat wat voor dat jaar is geladen. Mist een type, dan zie je dat daar.
        </p>
      </div>
    ),
  },
  {
    key: "hulpvraag-feedback",
    groep: "beginnen",
    titel: "Hulpvraag of feedback sturen",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          Rechtsonder, naast "Categorieën", staat de knop <strong>Hulpvraag of feedback</strong>. Kies of het een hulpvraag
          of feedback is, vul eventueel je naam in, een onderwerp en je bericht, en kies "Versturen". Je blijft in de app; je
          krijgt antwoord op het e-mailadres waarmee je bent ingelogd.
        </p>
        <p>
          Er worden geen dossiergegevens meegestuurd: alleen je bericht, je naam, het releasenummer en het e-mailadres van je
          inlog. Zet zelf geen klantgegevens in je bericht. Lukt versturen niet, dan biedt de app een noodroute via je eigen
          mailapp of "Tekst kopiëren".
        </p>
      </div>
    ),
  },
  {
    key: "gebruiksvoorwaarden",
    groep: "beginnen",
    titel: "Gebruiksvoorwaarden en copyright",
    inhoud: (
      <div className="space-y-2.5">
        <p>Dit zijn de voorwaarden waarmee je bij het eerste gebruik akkoord bent gegaan. Het scherm komt opnieuw als de tekst inhoudelijk wijzigt.</p>
        {VOORWAARDEN_INHOUD}
        <p className="text-xs text-slate-400">© Paul Gerits — alle rechten voorbehouden.</p>
      </div>
    ),
  },
  {
    key: "dossier-opslaan",
    groep: "beginnen",
    titel: "Dossier opslaan en nieuw dossier starten",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          <strong>Automatisch bewaard.</strong> Je bankgegevens worden lokaal in deze browser verwerkt en bewaard; ze gaan niet naar
          een server. De app maakt alleen internetverbinding voor het laden van de app zelf, de controle op een nieuwe versie en (alleen als je het zelf verstuurt) je feedback. Bewaar exports en projectbestanden zorgvuldig: ze kunnen financiële en persoonlijke gegevens bevatten. Met "Dossier opslaan" maak je daarnaast een bestand dat je zelf kunt bewaren en later weer laden.
        </p>
        <p>
          <strong>Met of zonder wachtwoord.</strong> Bij de eerste keer opslaan kies je. Met een
          wachtwoord wordt het bestand versleuteld en krijg je eerst een <strong>herstelcode</strong> te zien: bewaar die
          apart van het dossier. Vergeet je het wachtwoord, dan kun je het dossier alleen nog openen via "Wachtwoord kwijt?
          Herstelcode gebruiken". Er is geen andere manier om het te herstellen. Daarna slaat de app direct op; onder
          "Dossier opslaan" kun je het wachtwoord wijzigen of verwijderen en de code opnieuw bekijken.
        </p>
        <p>
          <strong>Nieuw dossier starten.</strong> Dit sluit het huidige dossier meteen: bestanden, correcties en
          instellingen worden leeggemaakt. De app vraagt eerst of je wilt opslaan. Stop je daarna halverwege de wizard, dan
          houd je een leeg dossier over. Direct na het starten kun je het nog terugdraaien met "Ongedaan maken" in de
          zijbalk. Op het keuzescherm "Vorig dossier gevonden" (bij het opstarten) werkt "Nieuw dossier" anders: daar
          blijft het oude dossier in de browser bewaard totdat je zelf een nieuw bestand toevoegt.
        </p>
      </div>
    ),
  },
  {
    key: "dossiercontrole",
    groep: "overzicht",
    titel: "Dossiercontrole (ring en open punten)",
    inhoud: (
      <div className="space-y-2">
        <p>
          De kaart bovenaan het Overzicht toont per jaar het aantal <strong>open punten</strong>: wat je nog moet
          beoordelen (onzekere indelingen, herkomst van inkomsten, overboekingen aan personen, "Overig") plus openstaande
          vragen bij Instellingen. Daaronder staat tussen haakjes de verdeling, bijvoorbeeld "5 controle · 1 instelling".
          Een indeling die al groen is telt niet mee.
        </p>
        <p>
          De <strong>ring</strong> laat zien welk deel van alle te beoordelen groepen (tegenpartij + categorie) al
          zeker is ingedeeld, plus de overige punten (instellingen, duplicaten, enz.) als open. Voorbeeld: 1.200 groepen
          waarvan er 528 nog open staan geeft ongeveer 56%. Zolang er nog open punten zijn, blijft de ring onder de
          100%; alleen als er niets meer openstaat staat er "Alles afgehandeld" en 100%.
        </p>
        <p>
          Er zijn <strong>twee ringen in elkaar</strong>: de buitenste (<em>hele dossier</em>, groen) telt alle jaren samen, de
          binnenste (blauw) geldt alleen voor het gekozen jaar. De jaarring telt de groepen van dat jaar die nog onzeker zijn, plus de jaarchecks
          die nog openstaan (zoals KOR, BTW-verlegd en het beoordelen van personen en "Overig").
        </p>
        <p>
          Wat er open staat kun je op het tabblad Controleren afhandelen; zie "Herkomst en opschonen". Daar staan ook de
          controles op loonheffing, KOR en BTW-verlegd, en signalen zoals boetes bij naheffingen of een factuurdatum in een
          ander kwartaal dan de boeking.
        </p>
        <p className="text-xs text-slate-400">
          Dossiercontrole zegt alleen dat de administratie rond is. Het zegt niets over of de aangifte zelf al is
          gedaan — dat staat apart bij "Aangifte buiten deze app" (IB, Zvw, BTW). Staan er aannames in de
          indicatieve berekening, dan verschijnt daarnaast een regel "Indicatieve aangifte" met het aantal; zonder aannames
          staat die regel er niet.
        </p>
      </div>
    ),
  },
  {
    key: "jaaroverzicht",
    groep: "overzicht",
    titel: "Jaaroverzicht (WUO, Tekort/Over, trend)",
    inhoud: (
      <div className="space-y-2">
        <p>
          <strong>Zak. Ink.</strong> is de categorie "Zakelijke inkomsten"; <strong>WUO (bruto)</strong> is de winst
          uit onderneming vóór persoonlijke belastingen (Zakelijke inkomsten min de overige zakelijke kosten, na
          aftrek van BTW — "Prive opnames"/"Ontvangen van zakelijk"/"Terugboeking van prive"/"Terugboeking naar zakelijk", "Belastingen:
          ZVW"/"Belastingen: IH", en "Belastingen: Naheffingen OB/IB voorgaande jaren" tellen bewust niet mee: de
          eerste drie zijn onttrekkingen aan/inbreng in de winst, de rest zijn persoonlijke belastingen of een
          balansmutatie — geen van alle zijn het zakelijke kosten of omzet. "Belastingen: Naheffingen LH voorgaande
          jaren" telt WEL gewoon mee als kosten, net als reguliere LH.
        </p>
        <p>
          <strong>Totaal prive uitgegeven</strong> is al het geld dat dat jaar daadwerkelijk privé is uitgegeven — is
          er geen privé-rekening geüpload, dan wordt aangenomen dat het hele bedrag "Uitbetaald/opgenomen naar prive"
          ook echt is uitgegeven (gemarkeerd met *). De handmatige <strong>correctie</strong> komt daar altijd
          bovenop (gemarkeerd met †).
        </p>
        <p>
          <strong>Tekort / Over</strong> is WUO min Totaal prive uitgegeven, min Te betalen OB, min Basisindicatie
          IB/IH — dus wat er overblijft nadat zowel al het privé uitgegeven geld als de nog te betalen belastingen
          zijn meegerekend. Een tekort betekent dat de winst dat niet dekt.
        </p>
        <p>
          <strong>Trend t.o.v. vorig jaar</strong> vergelijkt Tekort/Over met hetzelfde cijfer van het voorgaande
          jaar — alleen te zien als BEIDE jaren volledig zijn (alle 4 kwartalen bevatten minstens 1 zakelijke
          transactie).
        </p>
        <p className="text-xs text-slate-400">
          * Basisindicatie IB/IH is een grove, indicatieve schatting van de inkomstenbelasting over WUO — zonder
          zelfstandigenaftrek, startersaftrek, heffingskortingen of overig inkomen mee te rekenen. Geen
          belastingadvies, alleen een snelle indicatie. Zie de "Indicatieve aangifteberekening" voor de uitgebreidere
          berekening mét deze persoonlijke fiscale aannames — die kan hierdoor een ander bedrag laten zien.
        </p>
      </div>
    ),
  },
  {
    key: "meerjaren-export",
    groep: "overzicht",
    titel: "Meerjarenoverzicht, Excel en Print",
    inhoud: (
      <p>
        Rechtsboven in "Details en overzichten" staan vier snelkoppelingen. <strong>Meerjarenoverzicht</strong> zet de
        jaren naast elkaar. <strong>Herkenningsregels</strong> toont de regels die de app voor je heeft onthouden.{" "}
        <strong>Excel exporteren</strong> levert alle transacties plus de overzichten in één bestand. <strong>Print</strong>{" "}
        drukt het overzicht af.
      </p>
    ),
  },
  {
    key: "btw-aangifte-kwartaal",
    groep: "overzicht",
    titel: "BTW-aangifte per kwartaal (netto/bruto)",
    inhoud: (
      <div className="space-y-2">
      <p>
        De omzet- en kostenbedragen staan <strong>netto</strong> (excl. BTW, zoals je ze invult bij de aangifte), met
        het werkelijke bankbedrag (bruto, incl. BTW) er in klein grijs tussen haakjes onder — zo kun je het altijd
        terugrekenen naar wat er op de bank stond. De BTW-kolommen ernaast laten zien hoeveel dat is, uitgesplitst
        naar 21% en 9%. 
        </p>
        <p>
          Verschuldigde BTW wordt alleen berekend over de omzet ("Zakelijke inkomsten"). Voorbelasting
        is de BTW over alle overige zakelijke uitgaven, die je mag aftrekken, behalve van categorieën die je zelf hebt
        uitgesloten bij de BTW-instellingen. 
        </p>
        <p>
          BTW-verlegde bedragen staan apart van omzet tegen 21% of 9%.
      </p>
      </div>
    ),
  },
  {
    key: "detailtabel",
    groep: "overzicht",
    titel: "Detailtabel",
    inhoud: (
      <div className="space-y-2">
      <p>
        Categorie is direct als dropdown aanpasbaar — een wijziging geldt meteen voor alle transacties van
        dezelfde tegenpartij, in alle jaren (tenzij er geen bruikbare naam is, dan alleen voor die ene transactie).
        
        </p>
        <p>
          Klik op de tegenpartij of omschrijving om de volledige tekst te zien. 
        </p>
        <p>
          Het type (Zakelijk/Privé) staat er
        alleen ter info bij: dat volgt altijd het bankbestand waaruit de transactie is ingelezen en is bewust niet
        los aan te passen — zo blijft precies zichtbaar wat er vanaf welke rekening is betaald. 
        </p>
        <p>
          Gebruik de filters
        op bedrag en datum om snel iets specifieks te vinden, en "Uitvergroten" om de tabel over de volle breedte
        te bekijken.
      </p>
      </div>
    ),
  },
  {
    key: "categorieen-overzicht",
    groep: "overzicht",
    titel: "Categorieën — Zakelijk/Prive",
    inhoud: (
      <p>
        Alle transacties van dat jaar en type, opgeteld per categorie, met de BTW ernaast. Let op het verschil met{" "}
        <strong>WUO</strong> in het jaaroverzicht: dit "Totaal"-bedrag hier telt écht alle categorieën bij elkaar op,
        inclusief de onttrekkingen (privé-overmakingen) en persoonlijke belastingen die WUO bewust uitsluit. Bij een
        flinke privé-onttrekking dat jaar kunnen die twee bedragen dus behoorlijk uit elkaar liggen — dat is geen
        fout, het zijn gewoon twee verschillende dingen: het ene is "alles wat er over de rekening ging", het andere
        is de zakelijke winst.
      </p>
    ),
  },
  {
    key: "prive-categorieen",
    groep: "overzicht",
    titel: "Samengevoegde categorieën (privé en zakelijk)",
    inhoud: (
      <div className="space-y-2">
        <p>
          Voor privé-boekingen zijn er negen keuzes in plaats van de vele fijne categorieën van vroeger. Vier horen bij
          de koppeling met zakelijk: <strong>Prive opnames</strong>, <strong>Ontvangen van zakelijk</strong>,{" "}
          <strong>Terugboeking van prive</strong> en <strong>Terugboeking naar zakelijk</strong>. Daarnaast{" "}
          <strong>Incasso, juridisch &amp; schulden</strong> en <strong>Leningen (privé)</strong>.
        </p>
        <p>
          Wat deels zakelijk kan zijn staat in twee groepen: <strong>Privé - wonen &amp; vaste lasten</strong> (huur, energie
          en water, gemeentelijke kosten) en <strong>Privé - telecom &amp; abonnementen</strong> (mobiel/internet, overige
          abonnementen, streaming). Bij die twee kun je de <em>soort</em> nog apart kiezen in het kleine tweede
          keuzeveld, zodat het zakelijke percentage per soort instelbaar blijft (Persoonlijke aannames).
        </p>
        <p>
          Al het overige — boodschappen, webshops, winkels divers, vrije tijd/uit eten/vakantie, medisch, kinderopvang,
          verzekeringen, hypotheek, toeslagen, alimentatie, overboekingen aan personen, enzovoort — valt onder{" "}
          <strong>Privé kosten algemeen</strong>. De herkenning werkt intern nog op de fijne soort (bijvoorbeeld "Winkels
          divers"), dus bestaande dossiers en regels blijven werken; alleen in lijsten en overzichten zie je de
          samengevoegde naam. De Excel-export blijft de fijne categorie tonen.
        </p>
        <p>
          <strong>Zakelijke categorieën</strong> zijn op dezelfde manier samengevoegd: Huisvesting (huur, energie-water,
          gemeentelijke kosten, ook de "deels zakelijk"-varianten), Vervoer &amp; auto, Telecom &amp; abonnementen,
          Personeel, Belastingen &amp; heffingen, Interne overboekingen en Inkoop &amp; zakelijke uitgaven (inkoop,
          bankkosten, boekhouder, zakelijke verzekering, onderhoud apparatuur, marketing-website, betaalautomaat). Waar
          de aangifte een verschil maakt kies je de <em>soort</em> in het kleine tweede keuzeveld. De aangifte, BTW en
          rubrieken rekenen ongewijzigd op de fijne soort.
        </p>
        <p>
          Wil je toch alle fijne categorieën zien? Zet het vinkje <strong>fijne categorieën</strong> aan in de
          tabblad Categorieën onder "Details en overzichten" (Overzicht). Dat geldt voor alle keuzelijsten en overzichten tot je het
          weer uitzet.
        </p>
      </div>
    ),
  },
  {
    key: "herkomst-opschonen",
    groep: "controleren",
    titel: "Herkomst en opschonen",
    inhoud: (
      <div className="space-y-2">
        <p>
          Op Controleren staan vier punten die je zelf moet beoordelen: de <strong>herkomst van inkomsten</strong> (zakelijk
          of privé), <strong>overboekingen aan personen</strong>, alles wat nog in <strong>"Overig"</strong> staat en
          mogelijke <strong>duplicaten</strong>. Elk punt toont hoeveel er nog te bepalen is; staat er "Niets openstaand",
          dan is het klaar.
        </p>
        <p>
          Bij "Overig opruimen" staan twee snelknoppen voor alles wat nog in "Overig" staat: naar "Prive opnames" (voor een
          zakelijke rekening) of naar "Winkels divers" (voor een privérekening).
        </p>
      </div>
    ),
  },
  {
    key: "classificatiezekerheid",
    groep: "controleren",
    titel: "Classificatiezekerheid",
    inhoud: (
      <div className="space-y-2">
        <p>
          Elke transactie krijgt een van vier niveaus: <strong>{metBolletjes("🟢 override")}</strong> (je hebt 'm zelf al eens bevestigd,
          op IBAN of tegenpartij), <strong>{metBolletjes("🟢 keyword")}</strong> (matcht een specifieke zoekwoord-regel, bijv. "shell" →
          Brandstof), <strong>{metBolletjes("🟡 heuristic")}</strong> (automatisch bepaald zonder specifiek zoekwoord, bijv. op basis van
          rekeningtype of "ziet eruit als een persoonsnaam"), of <strong>{metBolletjes("🔴 fallback")}</strong> (geen enkele regel matchte
          — in "Overig" beland).
        </p>
        <p>
          Dit is geen extra classificatiesysteem naast de echte indeling — het is puur een indicatie van hóe die
          indeling tot stand kwam, zodat je niet alles hoeft na te lopen: de groene transacties zijn met vertrouwen
          ingedeeld, de gele/rode transacties zijn de moeite van het bekijken waard.
        </p>
        <p>
          <strong>Hoe het wordt geteld:</strong> de aantallen onder "Nog te controleren" tellen per{" "}
          <em>groep</em> — zelfde tegenpartij, zelfde bedragsrichting (ontvangen of betaald) en zelfde categorie. Dertig
          pinbetalingen bij dezelfde winkel zijn dus één punt, met erbij hoeveel transacties erachter zitten. Je
          beoordeelt de groep één keer en dat geldt voor alle bijbehorende transacties.
        </p>
        <p>
          <strong>In het controlevenster</strong> (klik op "controleren" of "onduidelijk") staan de groepen gesorteerd op
          totaalbedrag, zodat de punten met de meeste invloed bovenaan staan; je kunt ook sorteren op aantal of naam. Met
          het categoriefilter kies je één categorie en keur je die in één keer goed ("Alles in … goedkeuren"). Losse
          pinbetalingen zonder herkend zoekwoord staan samen in één groep die je kunt uitklappen om per transactie aan te
          passen. Een opdrachtgever of leverancier die je zelf hebt opgegeven telt als herkend, ook als de bank de naam
          met andere leestekens schrijft.
        </p>
        <p>
          <strong>Trefwoorden:</strong> korte standaard-zoekwoorden (tot 5 tekens, zoals "ah", "plus" of "spar") moeten
          aan het begin van een woord staan en tellen niet mee als ze midden in een ander woord zitten. Zo wordt een
          bankrekening of winkelnaam niet per ongeluk herkend op een stukje tekst. Zoekwoorden die je zelf toevoegt
          blijven gewoon op elke plek in de tekst werken.
        </p>
        <p>
          Klopt een gele of rode indeling bij nazien gewoon? Dan hoef je 'm niet te wijzigen om 'm te bevestigen — het
          "✓ Klopt zo"-knopje (in de detailtabel naast het icoontje, of hier in deze lijst) legt de huidige indeling
          vast als bevestigde regel, zonder iets te veranderen. Vanaf dan is die tegenpartij groen.
        </p>
      </div>
    ),
  },
  {
    key: "automatische-herkenning",
    groep: "controleren",
    titel: "Wat de app automatisch herkent",
    inhoud: (
      <div className="space-y-2">
        <p>
          Bij het inlezen deelt de app elke transactie in volgorde in: eigen overboekingen (op IBAN, spaarrekening of
          eigen naam), jouw eigen zoekwoorden, terugboekingen, dan de standaardcategorieën op trefwoord, daarna een
          persoon of buitenlandse pinbetaling, winkels zonder IBAN ("Winkels divers") en als laatste "Overig". De eerste
          regel die past wint.
        </p>
        <p>
          <strong>Retour en terugbetaling:</strong> een bijschrijving met een pasvolgnummer is een teruggeboekte
          pinbetaling en komt in dezelfde categorie als de uitgave (bijv. een Jumbo-retour onder Boodschappen). Een
          bijschrijving met "storno", "terugboeking", "restitutie" of "terugbetaling" krijgt de categorie van de
          partij als die herkend wordt (of van de eerdere afschrijving die je zelf al hebt ingedeeld), anders "Overig"
          ter beoordeling. 
        </p>
        <p>
          Een geldstorting bij de Geldmaat telt niet als retour. Een
          pinbetaling wordt nooit als "persoon" aangemerkt.
        </p>
        <p>
          <strong>Privé of zakelijk:</strong> het type volgt altijd de rekening waarvan is betaald. Bankkosten,
          energie/water, gemeentelijke kosten, huur, mobiel/abonnementen en leningen op een privérekening krijgen de
          bijbehorende "Prive - …"-categorie, tenzij het duidelijk een zakelijke uitgave is. Brandstof, parkeren en
          zakelijke inkoop vanaf een privérekening tellen wel mee als zakelijke kosten.
        </p>
        <p>
          <strong>Voorbeelden:</strong> woningcorporaties en verhuurders vallen onder Huur, laadpassen (bijv. Eneco
          eMobility) onder Brandstof, "rente buiten limiet" onder Bankkosten, Q-Park en Yellowbrick onder Parkeren en
          een overboeking naar een spaarrekening onder "Interne overboeking". Mis je een partij? Corrigeer 'm één keer
          in de detailtabel of voeg een eigen zoekwoord toe; dat geldt vanaf dan overal.
        </p>
      </div>
    ),
  },
  {
    key: "persoonlijke-aannames",
    groep: "controleren",
    titel: "Persoonlijke aannames voor IB",
    inhoud: (
      <div className="space-y-2">
        <p>
          Dit paneel verzamelt de fiscale keuzes en persoonlijke omstandigheden die de app <strong>niet</strong> uit
          bankgegevens kan afleiden, maar die wel invloed hebben op de indicatieve inkomstenbelasting. De app neemt
          hier bewust niets stilzwijgend aan zonder dat zichtbaar te maken.
        </p>
        <p>
          <strong>Urencriterium / zelfstandigenaftrek</strong> — heb je dat jaar minimaal het gebruikelijke aantal
          uren (doorgaans 1.225) aan de onderneming besteed? Zolang je hier niets aangeeft, rekent de app zoals
          voorheen mét zelfstandigenaftrek; kies "Onbekend" om beide scenario's (met/zonder) naast elkaar te zien.
        </p>
        <p>
          <strong>Startersaftrek</strong> — alleen mogelijk als je ook zelfstandigenaftrek krijgt, in minstens 1 van
          de 5 voorgaande jaren nog geen ondernemer was, en dit niet vaker dan 2x eerder hebt toegepast (max. 3x in
          de eerste 5 jaar). Vast bedrag, controleer dit zelf. In het stappenplan kies je per jaar of de aftrek van
          toepassing was ("Startersaftrek"); de overige jaren worden op "nee" gezet. Dit blijft per jaar aan te
          passen. Niet voor een BV.
        </p>
        <p>
          <strong>Auto</strong> — per jaar kies je: geen auto, <em>Auto op de zaak</em> (gekocht, operationele lease of
          financiële lease) of <em>Privéauto zakelijk gebruikt</em>. Bij een auto op de zaak tellen de werkelijke
          autokosten mee met een bijtelling voor privégebruik, en vervalt de %-splitsing op Brandstof/Parkeren voor dat
          jaar. Bij een privéauto vul je de zakelijke kilometers en de vergoeding per km in. Een combinatie van beide
          bestaat niet als keuze; heeft een oud dossier die nog, dan wordt het bij openen omgezet naar "Privéauto
          zakelijk gebruikt" — controleer zo'n jaar even.
        </p>
        <p>
          <strong>Btw bij privégebruik van een auto op de zaak</strong> — heb je btw op de auto afgetrokken (gekocht incl.
          btw, of een financiële lease met een bedrag bij "Te betalen BTW"; bij operationele lease alleen als je dat zelf
          aanvinkt), dan moet je in de laatste btw-aangifte van het jaar btw afdragen voor het privégebruik. De app
          rekent standaard het forfait: 2,7% van de cataloguswaarde (incl. btw en bpm) per jaar, 1,5% vanaf het vijfde
          jaar na de aanschaf, en in het eerste jaar naar rato van de maanden. Het bedrag is nooit hoger dan de btw die
          je op onderhoud en gebruik hebt afgetrokken plus (tot en met het vierde jaar na aanschaf) 1/5 van de btw bij
          aanschaf. Je ziet het terug bij Q4 in het btw-overzicht en het aangiftevoorstel. Per jaar kun je kiezen voor
          werkelijk privégebruik of geen correctie (bij "Auto op de zaak" voor gekocht of operationele lease). Bij een
          privéauto of zonder btw-aftrek is er geen correctie. Alleen voor een zzp; bron: Belastingdienst, "Privégebruik
          auto van de zaak".
        </p>
        <p>
          Gebruik je een pand deels zakelijk? Het percentage zakelijk voor huur, energie-water en gemeentelijke
          kosten stel je in bij "Percentage zakelijk per categorie" — zie "Huur (deels zakelijk)" voor de uitleg.
        </p>
        <p>
          <strong>Heffingskortingen</strong> (algemene heffingskorting + arbeidskorting) worden geschat ervan
          uitgaande dat de winst je enige inkomen is, je de AOW-leeftijd nog niet hebt bereikt, en er geen fiscale
          partner is om mee te verrekenen — klopt een van die aannames niet, dan is de schatting minder betrouwbaar.
        </p>
        <p>
          <strong>Investeringsaftrek (KIA)</strong> wordt hier automatisch voorgesteld op basis van wat er in het
          Activa-paneel aan bedrijfsmiddel-investeringen dat jaar is ingevuld — niet elk bedrijfsmiddel telt mee
          (personenauto's en grond meestal niet), dus dit is een mogelijke, geen definitieve aftrek.
        </p>
        <p className="text-xs text-slate-400">
          Dit paneel toont een snelle indicatie voor het actieve jaar alleen. Genereer het Indicatieve
          aangifteberekening-rapport (met alle jaren erin) voor de volledige, samenhangende berekening — inclusief
          verrekening van startersaftrek en niet-gerealiseerde zelfstandigenaftrek uit andere jaren.
        </p>
      </div>
    ),
  },
  {
    key: "huur-deels-zakelijk",
    groep: "controleren",
    titel: "Huur (deels zakelijk)",
    inhoud: (
      <div className="space-y-2">
        <p>
          Gebruik je maar een déél van een gehuurde ruimte zakelijk — bijvoorbeeld een deel van een schuur, magazijn
          of woning die je ook privé gebruikt? Laat de transacties dan gewoon in <strong>"Huur"</strong> staan en vul
          bij <strong>"Percentage zakelijk per categorie"</strong> per jaar het percentage zakelijk gebruik in. Hetzelfde
          geldt voor "Energie-water" en "Gemeentelijke kosten" van dat pand.
        </p>
        <p>
          Alleen dat percentage van de kosten telt mee in de winstberekening; de rest is privé. Zit er BTW op, dan geldt
          hetzelfde percentage voor de aftrekbare voorbelasting. Leeg betekent 100% zakelijk. Het percentage is per jaar
          apart instelbaar.
        </p>
        <p className="text-xs text-slate-400">
          Vroeger bestonden hiervoor aparte categorieën "Huur (deels zakelijk)", "Energie-water (deels zakelijk)" en
          "Gemeentelijke kosten (deels zakelijk)". Die zijn samengevoegd; bij het openen van een ouder dossier worden
          transacties en percentages automatisch omgezet (zie het logboek voor eventuele afwijkingen).
        </p>
      </div>
    ),
  },
  {
    key: "categorie-percentage-zakelijk",
    groep: "controleren",
    titel: "Percentage zakelijk per categorie",
    inhoud: (
      <div className="space-y-2">
        <p>
          Voor kosten die deels zakelijk en deels privé zijn, ongeacht van welke rekening ze betaald zijn — bijv.
          brandstof, telefonie/internet, reiskosten OV of parkeren die je ook privé gebruikt. In tegenstelling tot
          Net als bij huur hoef je transacties hiervoor niet naar een aparte categorie te verplaatsen: ze
          blijven gewoon in hun eigen categorie (bijv. "Brandstof") staan.
        </p>
        <p>
          Vul bij <strong>"Percentage zakelijk per categorie"</strong> een percentage in voor een categorie in het
          actieve jaar. Alleen dat percentage van het totaalbedrag telt mee in de winstberekening (bij een normaal
          zakelijke categorie is de rest dan privé; bij een normaal privé-categorie telt juist dat percentage er
          extra bij als zakelijke kostenpost). Zit er BTW op, dan geldt hetzelfde percentage voor de aftrekbare
          voorbelasting. Leeg/niet ingevuld betekent het standaardgedrag — 100% voor een zakelijke kostenpost, 0%
          voor een privé-categorie — en het percentage is per jaar apart instelbaar.
        </p>
        <p className="text-xs text-slate-400">
          Alleen van toepassing op gewone kosten- en privé-categorieën, niet op omzet of financiering (Leningen/
          Lease financieel) — daar is alleen de rente aftrekbaar, wat al apart wordt berekend.
        </p>
      </div>
    ),
  },
  {
    key: "activa-afschrijving",
    groep: "controleren",
    titel: "Activa (bedrijfsmiddelen) — afschrijving",
    inhoud: (
      <div className="space-y-2">
        <p>
          Een machine, gereedschap of ander bedrijfsmiddel mag je niet in één keer als kosten aftrekken — de aanschaf
          moet over de gebruiksduur worden <strong>afgeschreven</strong>. Elke transactie in de categorie{" "}
          "Apparatuur &amp; inventaris" verschijnt hier automatisch als los item (niet per leverancier gegroepeerd,
          want dezelfde leverancier kan op verschillende data totaal verschillende bedrijfsmiddelen leveren).
        </p>
        <p>
          Vul per bedrijfsmiddel de <strong>aanschafdatum</strong>, <strong>afschrijvingstermijn</strong> (in jaren)
          en <strong>restwaarde</strong> in — de aanschafwaarde staat al klaar vanuit de bank, maar is aan te passen
          als het aankoopbedrag afweek (bijv. bij een deel-aanbetaling). De app berekent daaruit zelf de{" "}
          <strong>lineaire afschrijving</strong> per jaar, het gangbare standaardstelsel.
        </p>
        <p>
          In het jaar van aanschaf zelf mag je alleen afschrijven naar rato van de resterende maanden (de{" "}
          <strong>tijdklem</strong>) — kocht je de machine bijvoorbeeld in oktober, dan telt dat jaar nog maar 3 van de
          12 maanden. De maanden die daardoor in het eerste jaar "gemist" worden, komen aan het einde van de looptijd
          terug als een extra, deels jaar — zodat er in totaal precies aanschafwaarde minus restwaarde wordt
          afgeschreven, niet minder.
        </p>
        <p>
          Zodra een bedrijfsmiddel hier is ingevuld, gebruikt het aangiftevoorstel de daadwerkelijk berekende
          afschrijving voor het actieve jaar in plaats van het bruto aanschafbedrag met een waarschuwing erbij.
        </p>
        <p className="text-xs text-slate-400">
          Is een bedrijfsmiddel (auto of machine) via een financieel leasecontract gefinancierd in plaats van
          rechtstreeks aangeschaft, dan vul je de kapitalisatie/afschrijving daarvoor in bij dat leasecontract zelf
          — zie "Lease (financieel)" — niet hier in het Activa-paneel.
        </p>
      </div>
    ),
  },
  {
    key: "lease-financieel",
    groep: "controleren",
    titel: "Lease (financieel)",
    inhoud: (
      <div className="space-y-2">
        <p>
          Bij <strong>operationele</strong> lease is de hele termijn gewoon aftrekbaar — in feite huur, geen verdere
          actie nodig. Bij <strong>financiële</strong> lease werkt het fiscaal hetzelfde als een lening: alleen de{" "}
          <strong>rente</strong> in de termijn is aftrekbaar, de rest is aflossing (het object zelf wordt apart
          afgeschreven). Uit de bank-omschrijving is dat onderscheid vaak niet te zien, dus bevestig je per lease
          expliciet: operationeel of financieel? Kies je financieel, dan werkt de rente/aflossing-splitsing precies
          zoals bij leningen.
        </p>
        <p className="font-medium text-slate-700 pt-1">Kapitalisatie &amp; afschrijving (optioneel)</p>
        <p>
          Betreft het financiële leasecontract een <strong>auto of machine</strong>, dan is het geleasde object
          fiscaal een eigen bedrijfsmiddel — net als bij een gewone aanschaf (zie ook "Activa (bedrijfsmiddelen) —
          afschrijving") wordt dat gekapitaliseerd en afgeschreven, los van de rente/aflossing-splitsing hierboven.
          
        </p>
        <p>
          Vul daarvoor bij het contract "Soort" (Auto of Machine/overig) in, met de afschrijvingstermijn (voor een
          auto minimaal 5 jaar) en optioneel de <strong>restwaarde</strong> — de verwachte waarde aan het einde van
          de afschrijvingstermijn (bij een lease-object met een aanzienlijke eindbetaling is dat vaak niet nul).
          
        </p>
        <p>
          Leeg betekent restwaarde €0 (volledig afschrijven), zoals voorheen — een bestaand contract zonder dit veld
          rekent dus ongewijzigd door. De aanschafwaarde wordt automatisch het gefinancierde bedrag bij aanvang van
          dít contract. 
        </p>
        <p>
          Laat "Soort" op "Niet ingevuld" staan om de oude berekening (alleen rente aftrekbaar,
          geen afschrijving) ongewijzigd te laten — dat blijft de standaard voor elk bestaand contract.
        </p>
        <p>
          Net als bij een los bedrijfsmiddel geldt ook hier de <strong>tijdklem</strong>: in het jaar van aanvang van
          het contract wordt naar rato van de resterende maanden afgeschreven, en de "gemiste" maanden komen aan het
          einde van de looptijd terug als een extra, deels jaar — zie ook "Activa (bedrijfsmiddelen) — afschrijving"
          voor de volledige uitleg van dat principe.
        </p>
        <p>
          Bij "Soort: Auto" komt daar de <strong>bijtelling/onttrekking</strong> bovenop bij privégebruik van meer
          dan 500 km per jaar: cataloguswaarde en bijtellingspercentage invullen, en per jaar aanvinken of dat
          privégebruik van toepassing was. Anders dan de standaard werknemers-bijtelling wordt hier de bijtelling
          afgetopt op de werkelijke totale autokosten dat jaar — je onttrekt nooit meer dan er daadwerkelijk aan
          autokosten is geboekt. In het aangiftevoorstel staat, als de aftopping daadwerkelijk iets afknipt, de
          werkelijke (ongeaftopte) bijtelling er tussen haakjes bij ter controle.
        </p>
        <p>
          <strong>Kenteken</strong> is alleen relevant als hetzelfde leasecontract halverwege de looptijd is
          vervangen of geherfinancierd (bijv. een nieuw contract na een tussentijdse aanpassing), terwijl het nog
          om dezelfde auto/machine gaat. Je legt dat vast als vervolgsegment van hetzelfde contract, met hetzelfde
          kenteken als het vorige — de app herkent dat en telt de afschrijving en bijtelling dan maar één keer, in
          plaats van dubbel (eenmaal per contract). Bij een afwijkende cataloguswaarde/bijtellingspercentage tussen
          gekoppelde segmenten verschijnt een niet-blokkerende waarschuwing, zodat je dat zelf kunt controleren.
        </p>
        <p className="font-medium text-slate-700 pt-1">Automatisch samenvoegen van leasebetalingen</p>
        <p>
          Staan alle betalingen van een lease-groep op dezelfde tegenrekening (IBAN) van de leasemaatschappij, in
          dezelfde categorie, dan voegt de app zulke groepen automatisch samen tot één lease (bijvoorbeeld wanneer
          de omschrijving per contractnummer of naamvariant verschilt). Dat gebeurt nooit als dat IBAN ook bij
          andere, niet-lease betalingen voorkomt. Een automatische samenvoeging is altijd ongedaan te maken; die keuze
          wordt onthouden. Handmatig samenvoegen kan nog steeds.
        </p>
      </div>
    ),
  },
  {
    key: "rente-per-lening",
    groep: "controleren",
    titel: "Rentepercentage per lening",
    inhoud: (
      <div className="space-y-2">
        <p>
          Categorie "Leningen" is altijd 0% BTW — een lening is geen omzet of kost waar BTW op zit. De{" "}
          <strong>rente</strong> die je over een lening betaalt, is wél aftrekbaar van de winst voor de
          inkomstenbelasting; de <strong>aflossing</strong> van de hoofdsom niet. 
        </p>
        <p>
          Bij "Rentepercentage per lening"
          kun je per lening de volledige gegevens invullen: leningbedrag (het oorspronkelijk geleende bedrag),
          startdatum en rentepercentage per jaar. Zodra die drie bekend zijn, rekent de app voor elke betaling terug
          hoeveel rente was en hoeveel aflossing — startend vanaf het leningbedrag op de startdatum, en steeds het
          nog openstaande bedrag bijwerkend na elke betaling. 
        </p>
        <p>
          Dat werkt ook gewoon bij onregelmatige betalingen (een
          maand overslaan, een keer extra aflossen) — er wordt geen vast schema aangenomen, alleen de daadwerkelijke
          betalingen uit de bank tellen.
        </p>
        <p>
          Twee velden zijn optioneel, puur ter controle: <strong>al afgelost tot nu</strong> en{" "}
          <strong>totale rente al betaald</strong> — vul die in als je dat toevallig al weet. Wijkt de berekening van
          de app meer dan €25 af van wat je zelf hebt opgegeven, dan waarschuwt de app daarvoor.
        </p>
      </div>
    ),
  },
  {
    key: "dossierprofiel",
    groep: "instellingen",
    titel: "Dossierprofiel",
    inhoud: (
      <p>
        Het dossierprofiel bundelt de basisgegevens: de onderneming (rechtsvorm), de rekeninghouder en de rekeningen die
        zijn geladen of extra zijn opgegeven. "Nog niet opgegeven" telt de vragen die nog open staan. Die vragen komen uit
        het stappenplan; je kunt het stappenplan daar opnieuw openen om basisvragen aan te passen.
      </p>
    ),
  },
  {
    key: "btw-percentages",
    groep: "instellingen",
    titel: "BTW-percentages",
    inhoud: (
      <div className="space-y-2">
      <p>
        Het bankbedrag is altijd inclusief BTW — de app rekent 'm er automatisch uit op basis van het percentage per
        categorie. Alleen van toepassing op Zakelijke transacties. 
        </p>
        <p>
          Standaard staat alles op 21% (Reiskosten OV op 9%), met
        uitzondering van categorieën waar geen BTW op zit: Bankkosten, alle Belastingen en Gemeentelijke kosten, alle
        Verzekeringen/AOV, Huur, Leningen, Lease (financieel), Hypotheek, Loon, Prive opnames/Ontvangen van zakelijk,
        interne overboekingen, Overboekingen aan personen, Kinderopvang, Toeslagen, alimentatie en Overig. 
        </p>
        <p>
          Inhuur personeel
        staat juist op 21% (een freelancer factureert normaal met BTW). Per categorie aan te passen.
      </p>
      </div>
    ),
  },
  {
    key: "tegenpartijregels",
    groep: "instellingen",
    titel: "Tegenpartijregels",
    inhoud: (
      <div className="space-y-2">
      <p>
        Elke keer dat je in de detailtabel een categorie of type corrigeert, onthoudt de app dat voortaan voor
        diezelfde tegenpartij — in alle jaren. 
        </p>
        <p>
          Ontvangen en betaalde bedragen worden apart onthouden: een
        correctie op de uitgaven bij een winkel geldt dus niet automatisch voor een terugbetaling van diezelfde winkel. 
        </p>
        <p>
          Bevat het bankbestand een tegenrekening-IBAN, dan wordt die als sleutel
        gebruikt in plaats van de naam: dat is stabieler, want een bank kan dezelfde rekening de ene keer "KPN B.V."
        en de andere keer "KPN Mobile" noemen, terwijl het rekeningnummer gelijk blijft. Zonder IBAN in het
        bankbestand wordt de (genormaliseerde) naam gebruikt. 
        </p>
        <p>
          Een regel verwijderen laat de betrokken transacties
        terugvallen op de automatische classificatie.
      </p>
      </div>
    ),
  },
  {
    key: "vaste-variabele-kosten",
    groep: "instellingen",
    titel: "Vaste/variabele kosten",
    inhoud: (
      <p>
        Bepaalt welke categorieën als <strong>vast</strong> gelden (lopen door ongeacht omzet/activiteit, niet zomaar
        af te bouwen — huur, verzekeringen, abonnementen e.d.) en welke als <strong>variabel</strong> (bewegen mee
        met keuzes/activiteit). Geldt voor zowel Zakelijk als Privé, en is terug te zien in het jaaroverzicht (bij
        "Toon vast/variabel"). Inkomsten en overboekingen tussen Zakelijk/Privé tellen niet mee als kosten.
      </p>
    ),
  },
  {
    key: "terugkerende-betalingen",
    groep: "instellingen",
    titel: "Terugkerende betalingen",
    inhoud: (
      <p>
        Toont tegenpartijen die minstens een instelbaar aantal keer voorkomen binnen het actieve jaar — handig om
        vaste lasten te herkennen of om te zien of er een maand ontbreekt bij iets dat normaal elke maand terugkomt.
        Het bedrag hoeft niet vast te zijn (bijv. energienota's wisselen legitiem, maar zijn wel terugkerend). De
        herkenning kijkt naar de naam zonder datum/tijd/pasvolgnummer, zodat bijv. "Albert Heijn 1234" en "Albert
        Heijn 5678" als dezelfde tegenpartij tellen.
      </p>
    ),
  },
  {
    key: "doc-aangifteberekening",
    groep: "documenten",
    titel: "Indicatieve aangifteberekening",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          Het uitgebreide voorstel per jaar, of voor meerdere jaren tegelijk. Je opent het links bij Acties. Eerst zie je
          de status van het gekozen jaar en de punten die nog openstaan; daarna kies je "Berekening bekijken" of "Ander
          jaar/meerdere jaren kiezen". Het is een <strong>onafhankelijke reconstructie</strong>: de bedragen komen
          uitsluitend uit de bankgegevens en de persoonlijke aannames in het dossier.
        </p>
        <p>
          Vergelijk de uitkomst gerust met een eerder ingediende aangifte, maar een verschil betekent niet automatisch dat
          er iets misging in die aangifte, en ook niet dat deze reconstructie klopt. Een aangifte kan gebaseerd zijn op
          facturen die niet via deze rekening liepen, memoriaalboekingen of correcties. Een verschil is een signaal om
          samen na te gaan waar het vandaan komt.
        </p>
        <p>
          <strong>Bron.</strong> Op het scherm staat bij veel regels "ⓘ bron": klik erop om de transacties erachter te zien.
          Die bron staat niet in een gedownload of geprint bestand; daarvoor is het onderbouwingsdocument.
        </p>
        <p>
          <strong>Uitleg meenemen.</strong> Met dit vinkje voeg je de algemene toelichting als bijlage achteraan toe, samen
          met de verwijzingen ernaar in de tekst. Staat het uit (standaard), dan blijft het document korter en staan ook die
          verwijzingen er niet in.
        </p>
        <p>
          <strong>Afschrijvingen en huur.</strong> Afschrijvingen staan verdeeld in "Auto's" en "Machines". "Huur (deels
          zakelijk)" telt alleen met het zelf ingestelde zakelijke percentage mee. Autokosten zoals MRB, verzekering,
          brandstof, parkeren en onderhoud staan samen op één regel "Overige autokosten".
        </p>
        <p className="text-xs text-slate-400">
          Dit is indicatief en geen aangifte of fiscaal advies. De daadwerkelijke aangiften (IB, Zvw, BTW) worden buiten deze
          app gedaan.
        </p>
      </div>
    ),
  },
  {
    key: "doc-samenvatting",
    groep: "documenten",
    titel: "Samenvatting voor klant",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          Eén pagina voor de klant. Je opent hem links bij Acties; bij meerdere jaren kies je eerst het jaar of de jaren
          (dan staan ze naast elkaar in kolommen). De cijfers zijn dezelfde als op het Overzicht en in de indicatieve
          aangifteberekening; er is geen aparte berekening.
        </p>
        <p>
          <strong>Wat staat erin:</strong> het <em>resultaat</em> (omzet, zakelijke kosten, winst of resultaat vóór Vpb), de{" "}
          <em>indicatieve belasting en premies</em> (BTW en IB met Zvw, of BTW en Vpb), wat er is <em>meegenomen</em> in de
          berekening (bijvoorbeeld leningen, lease en auto), <em>waarvan is uitgegaan</em> (rechtsvorm, jaren, rekeninghouder,
          geladen bankbestanden, BTW-keuzes) en wat er <em>nog openstaat</em>.
        </p>
        <p>
          <strong>Wanneer gebruik je hem:</strong> om aan de klant te laten zien waar het dossier staat, zonder alle details.
          Bedragen kunnen nog veranderen zolang er open punten staan; dat staat er ook bij.
        </p>
        <p className="text-xs text-slate-400">Indicatief en geen aangifte of fiscaal advies.</p>
      </div>
    ),
  },
  {
    key: "doc-onderbouwing",
    groep: "documenten",
    titel: "Onderbouwing overzichten",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          Een apart document met de <strong>transacties achter de bedragen</strong> in de indicatieve aangifteberekening. Je
          opent het links bij Acties; bij meerdere jaren kies je eerst het jaar of de jaren.
        </p>
        <p>
          <strong>Hoe is het opgebouwd:</strong> per jaar, per rubriek van de aangifte (bijvoorbeeld Opbrengsten of Overige
          bedrijfskosten) en daarbinnen per categorie. Elke categorie is een tabel met datum, tegenpartij, omschrijving en
          bedrag, met onderaan het aantal transacties en het totaal.
        </p>
        <p>
          <strong>Let op de bedragen:</strong> die staan zoals op het bankafschrift, dus inclusief BTW. In de berekening staan
          ze netto (exclusief BTW) en, waar dat van toepassing is, na het zakelijke percentage. Een totaal in dit document
          kan daarom afwijken van het bedrag in het voorstel; dat is geen fout.
        </p>
        <p>
          <strong>Wanneer gebruik je het:</strong> als iemand (klant, boekhouder, inspecteur) wil nagaan waar een bedrag
          vandaan komt. Op het scherm kun je bij het voorstel zelf ook op "ⓘ bron" klikken, maar die bron staat niet in een
          gedownload of geprint voorstel. Dit onderbouwingsdocument is daarvoor de plek.
        </p>
        <p className="text-xs text-slate-400">Indicatief en geen aangifte of fiscaal advies.</p>
      </div>
    ),
  },
  {
    key: "begrippen",
    groep: "begrippen",
    titel: "Zoeken en begrippen",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          Het vergrootglas onderin links (of Cmd/Ctrl+K) zoekt in alle transacties. Het boek-icoon opent uitleg bij
          vakbegrippen; onderstreepte begrippen in de tekst tonen die uitleg als je erover gaat of erop tikt.
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>WUO</strong> — winst uit onderneming, vóór persoonlijke belastingen (zie Jaaroverzicht).</li>
          <li><strong>Tekort / Over</strong> — wat er overblijft na privé-uitgaven en de nog te betalen belastingen.</li>
          <li><strong>Open punt</strong> — iets dat je nog moet beoordelen of invullen; de Dossiercontrole telt ze.</li>
          <li><strong>Aannames</strong> — fiscale keuzes die niet uit de bank blijken (urencriterium, auto, startersaftrek).</li>
          <li><strong>Indicatief</strong> — een reconstructie uit bankgegevens, geen aangifte en geen advies.</li>
          <li><strong>Aangifte buiten deze app</strong> — of IB, Zvw en BTW al daadwerkelijk zijn ingediend; dat vink je zelf af.</li>
        </ul>
      </div>
    ),
  },
];
