// Alle uitgebreide toelichtingsteksten, gebundeld — hergebruikt door zowel het volledige
// "Help en uitleg"-overzicht als de gerichte pop-up die bij losse "?"-knopjes opent.
export const HELP_CHAPTERS = [
  {
    key: "btw-percentages",
    titel: "BTW-percentages",
    inhoud: (
      <p>
        Het bankbedrag is altijd inclusief BTW — de tool rekent 'm er automatisch uit op basis van het percentage per
        categorie. Alleen van toepassing op Zakelijke transacties. Standaard staan Bankkosten, alle Belastingen, alle
        Verzekeringen, Inhuur personeel, Uitbetaling aan prive, Huur, Overig en Overboekingen aan personen op 0%.
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
    key: "factuurperiode",
    titel: "Factuurperiode vs. boekingskwartaal",
    inhoud: (
      <p>
        Bij het factuurstelsel is BTW verschuldigd op de <strong>factuurdatum</strong>, niet de datum waarop het geld
        binnenkomt — bij het kasstelsel juist andersom. De tool gebruikt standaard de boekingsdatum voor de indeling
        in kwartalen, maar herkent ook periode-notaties in de bank-omschrijving (bijv. "20250301-20250331" of
        vergelijkbare varianten met streepjes/punten). Valt zo'n herkende periode in een ander kwartaal dan de
        boekingsdatum, dan verschijnt dit als suggestie bij "Werk te doen" — nooit automatisch: je kiest zelf per
        post of het kwartaal aangepast moet worden (bijv. bij factuurstelsel) of dat de boekingsdatum al klopt (bijv.
        bij kasstelsel). Een bevestigde verplaatsing raakt alleen de indeling in "BTW-aangifte per kwartaal" — de
        rest van de tool (jaaroverzicht, categorieën, de boekingsdatum zelf) blijft ongewijzigd.
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
        met keuzes/activiteit). Geldt voor zowel Zakelijk als Prive, en is terug te zien in het jaaroverzicht (bij
        "Toon vast/variabel"). Inkomsten en overboekingen tussen Zakelijk/Prive tellen niet mee als kosten.
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
          startdatum en rentepercentage per jaar. Zodra die drie bekend zijn, rekent de tool voor elke betaling terug
          hoeveel rente was en hoeveel aflossing — startend vanaf het leningbedrag op de startdatum, en steeds het
          nog openstaande bedrag bijwerkend na elke betaling. Dat werkt ook gewoon bij onregelmatige betalingen (een
          maand overslaan, een keer extra aflossen) — er wordt geen vast schema aangenomen, alleen de daadwerkelijke
          betalingen uit de bank tellen.
        </p>
        <p>
          Twee velden zijn optioneel, puur ter controle: <strong>al afgelost tot nu</strong> en{" "}
          <strong>totale rente al betaald</strong> — vul die in als je dat toevallig al weet. Wijkt de berekening van
          de tool meer dan €25 af van wat je zelf hebt opgegeven, dan waarschuwt de tool daarvoor.
        </p>
      </div>
    ),
  },
  {
    key: "lease-financieel",
    titel: "Lease (financieel)",
    inhoud: (
      <p>
        Bij <strong>operationele</strong> lease is de hele termijn gewoon aftrekbaar — in feite huur, geen verdere
        actie nodig. Bij <strong>financiële</strong> lease werkt het fiscaal hetzelfde als een lening: alleen de{" "}
        <strong>rente</strong> in de termijn is aftrekbaar, de rest is aflossing (het object zelf wordt apart
        afgeschreven). Uit de bank-omschrijving is dat onderscheid vaak niet te zien, dus bevestig je per lease
        expliciet: operationeel of financieel? Kies je financieel, dan werkt de rente/aflossing-splitsing precies
        zoals bij leningen.
      </p>
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
          aftrek van BTW — "Uitbetaling aan prive"/"Prive opnames"/"Terugboeking van prive", "Belastingen:
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
          <strong>Tekort / Over</strong> is WUO min Totaal prive uitgegeven, min Te betalen OB, min Geschat IB — dus
          wat er overblijft nadat zowel al het privé uitgegeven geld als de nog te betalen belastingen zijn
          meegerekend. Een tekort betekent dat de winst dat niet dekt.
        </p>
        <p>
          <strong>Trend t.o.v. vorig jaar</strong> vergelijkt Tekort/Over met hetzelfde cijfer van het voorgaande
          jaar — alleen te zien als BEIDE jaren volledig zijn (alle 4 kwartalen bevatten minstens 1 zakelijke
          transactie).
        </p>
        <p className="text-xs text-slate-400">
          * Geschat IB is een grove, indicatieve schatting van de inkomstenbelasting over WUO — zonder
          heffingskortingen, startersaftrek of overig inkomen mee te rekenen. Geen belastingadvies, alleen een
          indicatie.
        </p>
      </div>
    ),
  },
  {
    key: "aangifte-checklist",
    titel: "Aangifte-checklist",
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
    key: "detailtabel",
    titel: "Detailtabel",
    inhoud: (
      <p>
        Categorie en type zijn direct als dropdown aanpasbaar — een wijziging geldt meteen voor alle transacties van
        dezelfde tegenpartij, in alle jaren (tenzij er geen bruikbare naam is, dan alleen voor die ene transactie).
        Klik op de tegenpartij of omschrijving om de volledige tekst te zien. Sleep een transactie (aan het handvat)
        naar de andere tabel om 'm van Zakelijk naar Prive te verplaatsen, of andersom. Gebruik de filters op bedrag
        en datum om snel iets specifieks te vinden, en "Uitvergroten" om de tabel over de volle breedte te bekijken.
      </p>
    ),
  },
  {
    key: "tegenpartijregels",
    titel: "Tegenpartijregels",
    inhoud: (
      <p>
        Elke keer dat je in de detailtabel een categorie of type corrigeert, onthoudt de tool dat voortaan voor
        diezelfde tegenpartij — in alle jaren. Bevat het bankbestand een tegenrekening-IBAN, dan wordt die als sleutel
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
          Elke transactie krijgt een van vier niveaus: <strong>🟢 override</strong> (je hebt 'm zelf al eens bevestigd,
          op IBAN of tegenpartij), <strong>🟢 keyword</strong> (matcht een specifieke zoekwoord-regel, bijv. "shell" →
          Brandstof), <strong>🟡 heuristic</strong> (automatisch bepaald zonder specifiek zoekwoord, bijv. op basis van
          rekeningtype of "ziet eruit als een persoonsnaam"), of <strong>🔴 fallback</strong> (geen enkele regel matchte
          — in "Overig" beland).
        </p>
        <p>
          Dit is geen extra classificatiesysteem naast de echte indeling — het is puur een indicatie van hóe die
          indeling tot stand kwam, zodat je niet alles hoeft na te lopen: de 🟢-transacties zijn met vertrouwen
          ingedeeld, de 🟡/🔴-transacties zijn de moeite van het bekijken waard.
        </p>
        <p>
          Klopt een 🟡/🔴-indeling bij nazien gewoon? Dan hoef je 'm niet te wijzigen om 'm te bevestigen — het
          "✓ Klopt zo"-knopje (in de detailtabel naast het icoontje, of hier in deze lijst) legt de huidige indeling
          vast als bevestigde regel, zonder iets te veranderen. Vanaf dan is die tegenpartij 🟢.
        </p>
      </div>
    ),
  },
];
