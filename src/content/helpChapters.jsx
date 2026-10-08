import { metBolletjes } from "../components/shared/StatusDot.jsx";
// Alle uitgebreide toelichtingsteksten, gebundeld — hergebruikt door zowel het volledige
// "Help en uitleg"-overzicht als de gerichte pop-up die bij losse "?"-knopjes opent.
export const HELP_CHAPTERS = [
  {
    key: "werken-met-de-app",
    titel: "Werken met de app (route, opslaan, documenten)",
    inhoud: (
      <div className="space-y-2.5">
        <p>
          <strong>De route.</strong> De balk onder de kop laat de stappen zien: Import → Controleren → Bedrijfsmiddelen →
          Instellingen → Advies. Klik op een stap om erheen te gaan. De kaart "Eerstvolgende stap" daaronder zegt wat je nu
          het best kunt doen, met een knop "Ga naar deze stap"; "Overslaan" zet die stap even opzij.
        </p>
        <p>
          <strong>Details en overzichten.</strong> Onder de route staan de jaaroverzichten en tabbladen (Transacties,
          Categorieën, Activa, Leningen, Lease). Rechtsboven staan Meerjarenoverzicht, Herkenningsregels, Excel exporteren
          (alle transacties plus overzichten) en Print.
        </p>
        <p>
          <strong>Zakelijk en privé.</strong> Onder "Overzicht" staat hoeveel bankbestanden zijn geladen en of dat zakelijk,
          privé of beide zijn. Bij het gekozen jaar staat wat voor dat jaar is geladen. Mist een type, dan zie je dat daar.
        </p>
        <p>
          <strong>Dossier opslaan, met of zonder wachtwoord.</strong> Bij de eerste keer opslaan kies je. Met een
          wachtwoord wordt het bestand versleuteld en krijg je eerst een <strong>herstelcode</strong> te zien: bewaar die
          apart van het dossier. Vergeet je het wachtwoord, dan kun je het dossier alleen nog openen via "Wachtwoord kwijt?
          Herstelcode gebruiken". Er is geen andere manier om het te herstellen. Daarna slaat de app direct op; onder
          "Dossier opslaan" kun je het wachtwoord wijzigen of verwijderen en de code opnieuw bekijken.
        </p>
        <p>
          <strong>Documenten (links bij Acties).</strong> "Indicatieve aangifteberekening" is het uitgebreide voorstel per
          jaar (of meerdere jaren). "Samenvatting voor klant" is één pagina met resultaat, indicatieve belasting, wat er is
          meegenomen en wat nog openstaat. "Onderbouwing overzichten" is een apart document met de transacties achter de
          bedragen, per jaar en rubriek. Alle drie zijn indicatief en geen aangifte of fiscaal advies.
        </p>
        <p>
          <strong>Bron en uitleg in het voorstel.</strong> Op het scherm staat bij veel regels "ⓘ bron": klik erop om de
          transacties erachter te zien. Die bron staat niet in een gedownload of geprint bestand; daarvoor is het
          onderbouwingsdocument. Met het vinkje "Uitleg meenemen" voeg je de algemene toelichting achteraan het voorstel toe
          (standaard uit, zodat het document korter blijft).
        </p>
        <p>
          <strong>Zoeken en begrippen.</strong> Het vergrootglas onderin links (of Cmd/Ctrl+K) zoekt in alle transacties. Het
          boek-icoon opent uitleg bij vakbegrippen; onderstreepte begrippen in de tekst tonen die uitleg als je erover
          gaat of erop tikt.
        </p>
      </div>
    ),
  },
  {
    key: "btw-percentages",
    titel: "BTW-percentages",
    inhoud: (
      <p>
        Het bankbedrag is altijd inclusief BTW — de app rekent 'm er automatisch uit op basis van het percentage per
        categorie. Alleen van toepassing op Zakelijke transacties. Standaard staat alles op 21% (Reiskosten OV op 9%), met
        uitzondering van categorieën waar geen BTW op zit: Bankkosten, alle Belastingen en Gemeentelijke kosten, alle
        Verzekeringen/AOV, Huur, Leningen, Lease (financieel), Hypotheek, Loon, Prive opnames/Ontvangen van zakelijk,
        interne overboekingen, Overboekingen aan personen, Kinderopvang, Toeslagen, alimentatie en Overig. Inhuur personeel
        staat juist op 21% (een freelancer factureert normaal met BTW). Per categorie aan te passen.
      </p>
    ),
  },
  {
    key: "btw-aangifte-kwartaal",
    titel: "BTW-aangifte per kwartaal (netto/bruto)",
    inhoud: (
      <p>
        De omzet- en kostenbedragen staan <strong>netto</strong> (excl. BTW, zoals je ze invult bij de aangifte), met
        het werkelijke bankbedrag (bruto, incl. BTW) er in klein grijs tussen haakjes onder — zo kun je het altijd
        terugrekenen naar wat er op de bank stond. De BTW-kolommen ernaast laten zien hoeveel dat is, uitgesplitst
        naar 21% en 9%. Verschuldigde BTW wordt alleen berekend over de omzet ("Zakelijke inkomsten"). Voorbelasting
        is de BTW over alle overige zakelijke uitgaven, die je mag aftrekken.
      </p>
    ),
  },
  {
    key: "vaste-variabele-kosten",
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
    key: "rente-per-lening",
    titel: "Rentepercentage per lening",
    inhoud: (
      <div className="space-y-2">
        <p>
          Categorie "Leningen" is altijd 0% BTW — een lening is geen omzet of kost waar BTW op zit. De{" "}
          <strong>rente</strong> die je over een lening betaalt, is wél aftrekbaar van de winst voor de
          inkomstenbelasting; de <strong>aflossing</strong> van de hoofdsom niet. Bij "Rentepercentage per lening"
          kun je per lening de volledige gegevens invullen: leningbedrag (het oorspronkelijk geleende bedrag),
          startdatum en rentepercentage per jaar. Zodra die drie bekend zijn, rekent de app voor elke betaling terug
          hoeveel rente was en hoeveel aflossing — startend vanaf het leningbedrag op de startdatum, en steeds het
          nog openstaande bedrag bijwerkend na elke betaling. Dat werkt ook gewoon bij onregelmatige betalingen (een
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
    key: "lease-financieel",
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
          Vul daarvoor bij het contract "Soort" (Auto of Machine/overig) in, met de afschrijvingstermijn (voor een
          auto minimaal 5 jaar) en optioneel de <strong>restwaarde</strong> — de verwachte waarde aan het einde van
          de afschrijvingstermijn (bij een lease-object met een aanzienlijke eindbetaling is dat vaak niet nul).
          Leeg betekent restwaarde €0 (volledig afschrijven), zoals voorheen — een bestaand contract zonder dit veld
          rekent dus ongewijzigd door. De aanschafwaarde wordt automatisch het gefinancierde bedrag bij aanvang van
          dít contract. Laat "Soort" op "Niet ingevuld" staan om de oude berekening (alleen rente aftrekbaar,
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
    key: "activa-afschrijving",
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
    key: "jaaroverzicht",
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
    key: "aangifte-checklist",
    titel: "Controlelijst",
    inhoud: (
      <p>
        Een verzamellijst van alles wat de moeite waard is om te checken vóór je aangifte doet: hoeveel procent is al
        gecategoriseerd, of de KOR- en BTW-verlegd-vragen beantwoord zijn, welke kwartalen nog niet zijn aangegeven of
        betaald, een indicatieve controle op de loonheffing-verhouding, en signalen zoals boetes bij naheffingen of
        een factuurdatum die in een ander kwartaal valt dan de boekingsdatum. Een groen vinkje betekent dat er niets
        meer te doen is voor dat punt; een amber icoontje betekent dat er nog iets openstaat.
      </p>
    ),
  },
  {
    key: "terugkerende-betalingen",
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
    key: "categorieen-overzicht",
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
          categorieënkaart (Controleren → Categorieën). Dat geldt voor alle keuzelijsten en overzichten tot je het
          weer uitzet.
        </p>
      </div>
    ),
  },
  {
    key: "detailtabel",
    titel: "Detailtabel",
    inhoud: (
      <p>
        Categorie is direct als dropdown aanpasbaar — een wijziging geldt meteen voor alle transacties van
        dezelfde tegenpartij, in alle jaren (tenzij er geen bruikbare naam is, dan alleen voor die ene transactie).
        Klik op de tegenpartij of omschrijving om de volledige tekst te zien. Het type (Zakelijk/Privé) staat er
        alleen ter info bij: dat volgt altijd het bankbestand waaruit de transactie is ingelezen en is bewust niet
        los aan te passen — zo blijft precies zichtbaar wat er vanaf welke rekening is betaald. Gebruik de filters
        op bedrag en datum om snel iets specifieks te vinden, en "Uitvergroten" om de tabel over de volle breedte
        te bekijken.
      </p>
    ),
  },
  {
    key: "tegenpartijregels",
    titel: "Tegenpartijregels",
    inhoud: (
      <p>
        Elke keer dat je in de detailtabel een categorie of type corrigeert, onthoudt de app dat voortaan voor
        diezelfde tegenpartij — in alle jaren. Ontvangen en betaalde bedragen worden apart onthouden: een
        correctie op de uitgaven bij een winkel geldt dus niet automatisch voor een terugbetaling van diezelfde winkel. Bevat het bankbestand een tegenrekening-IBAN, dan wordt die als sleutel
        gebruikt in plaats van de naam: dat is stabieler, want een bank kan dezelfde rekening de ene keer "KPN B.V."
        en de andere keer "KPN Mobile" noemen, terwijl het rekeningnummer gelijk blijft. Zonder IBAN in het
        bankbestand wordt de (genormaliseerde) naam gebruikt. Een regel verwijderen laat de betrokken transacties
        terugvallen op de automatische classificatie.
      </p>
    ),
  },
  {
    key: "classificatiezekerheid",
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
    key: "dossiercontrole",
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
          Bij "Overig opruimen" (onder Controleren) staan twee snelknoppen voor alles wat nog in "Overig" staat: naar "Prive
          opnames" (voor een zakelijke rekening) of naar "Winkels divers" (voor een privérekening).
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
    key: "automatische-herkenning",
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
          ter beoordeling. Een geldstorting bij de Geldmaat telt niet als retour. Een
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
    key: "ob-ib-vakken",
    titel: "Waar vind ik dit op het OB/IB-aangifteformulier",
    inhoud: (
      <div className="space-y-2">
        <p>
          Deze app maakt een <strong>onafhankelijke reconstructie</strong>: de bedragen in de indicatieve
          aangifteberekening komen uitsluitend uit de bankgegevens. Vergelijk ze gerust met een eerder ingediende aangifte — maar een
          verschil betekent niet automatisch dat er iets misging in die aangifte, en ook niet automatisch dat deze
          reconstructie klopt. Een eerdere aangifte kan bijvoorbeeld gebaseerd zijn op facturen die niet via deze
          rekening liepen, memoriaalboekingen of correcties — dingen die niet uit bankgegevens blijken. Een verschil
          is vooral een signaal om samen na te gaan waar het vandaan komt.
        </p>
        <p className="font-medium text-slate-700">BTW-aangifte</p>
        <p>
          <strong>Vak 1a / 1b</strong> — Omzet en BTW hoog/laag tarief: het BTW-percentage dat je bij categorie
          "Zakelijke inkomsten" hebt ingesteld bepaalt of je omzet bij vak 1a (21%) of 1b (9%) hoort. BTW-verlegde
          bedragen gaan naar vak 1e in plaats van 1a/1b.
        </p>
        <p>
          <strong>Vak 5b</strong> — Voorbelasting: de BTW over je zakelijke kostencategorieën telt hier mee als
          aftrekbare voorbelasting, met uitzondering van de categorieën die je zelf hebt uitgesloten bij de
          BTW-instellingen (te zien onder "BTW-percentages" bij Categorieën).
        </p>
        <p className="font-medium text-slate-700 pt-1">Inkomstenbelasting (winst uit onderneming)</p>
        <p>
          De indicatieve aangifteberekening volgt exact dezelfde volgorde en rubrieken als de winst-en-verliesrekening op de
          aangifte zelf: Opbrengsten → Inkoopkosten, uitbesteed werk en andere externe kosten → Afschrijvingen →
          Overige bedrijfskosten (auto/transport, huisvesting, verkoop, andere kosten) → Financiële baten en lasten
          → Privéonttrekkingen en -stortingen → Belastingafdrachten (geen bedrijfskosten). Zo kun je één op één
          meelezen met je eigen aangifte.
        </p>
        <p>
          <strong>Afschrijvingen</strong> staat hierbij onderverdeeld in "Auto's" en "Machines" (elk apart getoond,
          ook als het bedrag €0 is) — dat sluit aan bij hoe veel aangifteformulieren deze twee al gescheiden
          uitvragen. <strong>"Huur (deels zakelijk)"</strong> valt onder Overige bedrijfskosten → Huisvesting, maar
          dan met alleen het zelf ingestelde zakelijke percentage — zie ook "Huur (deels zakelijk)".
        </p>
      </div>
    ),
  },
  {
    key: "huur-deels-zakelijk",
    titel: "Huur (deels zakelijk)",
    inhoud: (
      <div className="space-y-2">
        <p>
          Voor de situatie dat je maar een déél van een gehuurde ruimte zakelijk gebruikt — bijvoorbeeld een deel van
          een schuur, magazijn of woning die je ook privé gebruikt. Ken transacties hiervoor toe aan de aparte
          categorie <strong>"Huur (deels zakelijk)"</strong> (in plaats van de gewone categorie "Huur", die er
          vanuit gaat dat alles zakelijk is).
        </p>
        <p>
          Bij "Persoonlijke aannames voor IB" vul je vervolgens per jaar het <strong>percentage zakelijk gebruik</strong>{" "}
          in. Alleen dat percentage van de huur telt mee als aftrekbare zakelijke kosten in de winstberekening; de
          rest is privé en telt niet mee. Zit er BTW op de huur, dan geldt hetzelfde percentage voor de aftrekbare
          voorbelasting — de rest van de BTW is niet aftrekbaar. Leeg/niet ingevuld betekent 100% (volledig
          aftrekbaar, hetzelfde resultaat als bij gewone "Huur"), en het percentage is per jaar apart instelbaar,
          voor als de verhouding zakelijk/privé in de loop van de tijd verandert.
        </p>
        <p className="text-xs text-slate-400">
          Deze categorie bestaat naast de gewone "Huur"-categorie — gebruik "Huur" gewoon zolang een ruimte volledig
          zakelijk is, en alleen "Huur (deels zakelijk)" voor het gedeeltelijke geval.
        </p>
      </div>
    ),
  },
  {
    key: "categorie-percentage-zakelijk",
    titel: "Percentage zakelijk per categorie",
    inhoud: (
      <div className="space-y-2">
        <p>
          Voor kosten die deels zakelijk en deels privé zijn, ongeacht van welke rekening ze betaald zijn — bijv.
          brandstof, telefonie/internet, reiskosten OV of parkeren die je ook privé gebruikt. In tegenstelling tot
          "Huur (deels zakelijk)" hoef je transacties hiervoor niet naar een aparte categorie te verplaatsen: ze
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
    key: "persoonlijke-aannames",
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
          Zijn er dat jaar transacties in "Energie-water (deels zakelijk)" of "Gemeentelijke kosten (deels zakelijk)",
          dan staat hier ook per categorie het percentage zakelijk gebruik, net als bij huur. Leeg betekent 100%.
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
        <p>
          Zijn er dat jaar transacties in de categorie "Huur (deels zakelijk)", dan staat hier ook het{" "}
          <strong>percentage zakelijk gebruik</strong> van die huur — zie "Huur (deels zakelijk)" voor de uitleg
          daarvan.
        </p>
        <p className="text-xs text-slate-400">
          Dit paneel toont een snelle indicatie voor het actieve jaar alleen. Genereer het Indicatieve
          aangifteberekening-rapport (met alle jaren erin) voor de volledige, samenhangende berekening — inclusief
          verrekening van startersaftrek en niet-gerealiseerde zelfstandigenaftrek uit andere jaren.
        </p>
      </div>
    ),
  },
];
