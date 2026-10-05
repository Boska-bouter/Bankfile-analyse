import { SPLIT_CATEGORY_NAMES } from "./categories.js";
import { looksLikePerson, counterpartyKey, ibanKey, ibansMatch } from "../utils/normalization.js";

// Categorieën die per definitie Zakelijk zijn wanneer ze via een snelkoppeling worden gekozen.
export function defaultTypeForCategory(category) {
  return category === "Zakelijke inkomsten" || category === "Prive opnames"
    ? "Zakelijk"
    : "Prive";
}

// Generieke trefwoorden voor een interne overboeking naar/van de eigen zakelijke spaarrekening
// (bijv. ING's ingebouwde "Oranje Spaarrekening" gekoppeld aan de zakelijke rekening) — werkt bij
// vrijwel elke bank, ongeacht hoe de subrekening precies heet, zonder dat de gebruiker deze eerst
// via de wizard hoeft te bevestigen. Zo'n overboeking is geen zakelijke omzet/uitgave en geen
// "overboeking aan een persoon" (de naam bevat vaak toevallig 2-3 hoofdlettertermen, waardoor hij
// anders door looksLikePerson zou worden opgepikt) — het is puur geld dat binnen de eigen
// zakelijke sfeer verschuift.
const ZAKELIJK_SPAAR_KEYWORDS = ["spaarrekening", "zakelijk sparen", "vermogenssparen", "flexibel sparen"];

// Landcodes zoals banken die aan het einde van de tegenpartijnaam zetten bij een buitenlandse pin-/
// creditcardbetaling (bijv. "KARAVOLIAS BAKERY IALYSOS DO GRC", "Kochmuetze Neuss Neuss DEU") — dit
// is een generiek, bank-onafhankelijk patroon (geen lijst met duizenden buitenlandse winkelnamen
// nodig). "NLD" hoort hier bewust NIET bij: dat betekent juist een BINNENLANDSE transactie. Een
// redelijk uitgebreide, maar niet volledig uitputtende ISO 3166-1 alpha-3-lijst van landen waar
// doorgaans op vakantie/voor een uitje wordt gepind — dit is een HEURISTIEK (zie confidence.js: komt
// als "controleer" in de reviewlijst terecht), geen definitieve/onomkeerbare classificatie.
const FOREIGN_COUNTRY_CODES = new Set([
  "DEU", "BEL", "FRA", "GBR", "ESP", "ITA", "GRC", "PRT", "AUT", "CHE", "POL", "TUR", "LUX", "DNK",
  "SWE", "NOR", "FIN", "IRL", "HUN", "CZE", "HRV", "SVN", "SVK", "BGR", "ROU", "EST", "LVA", "LTU",
  "MLT", "CYP", "ISL", "MAR", "EGY", "THA", "IDN", "ARE", "MEX", "CAN", "AUS", "ZAF", "BRA", "USA",
  "ALB", "MNE", "SRB", "MKD", "AND", "MCO", "TUN", "IND", "CHN", "JPN", "KOR", "SGP", "NZL",
]);

// Exported zodat confidence.js exact dezelfde herkenning gebruikt om het vertrouwensniveau te
// bepalen (in plaats van deze regex/lijst te dupliceren en op termijn uit de pas te laten lopen).
export function looksLikeForeignCardPayment(tx) {
  const check = (val) => {
    const m = (val || "").trim().match(/\b([A-Z]{3})$/);
    return !!m && FOREIGN_COUNTRY_CODES.has(m[1]);
  };
  return check(tx.counterparty) || check(tx.description);
}

export function autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType, ownAccountsElsewhere = [], eigenNamen = [], zakelijkeSpaarKeywords = []) {
  // `type` volgt UITSLUITEND het geregistreerde rekeningtype van deze transactie (accountType) —
  // nooit de categorie of een trefwoordmatch. Dit is bewust: het is precies hoe zichtbaar wordt dat
  // een cliënt een zakelijke uitgave per ongeluk vanaf de privérekening heeft betaald (of andersom) —
  // dat moet zichtbaar blijven als "verkeerde rekening gebruikt", niet automatisch worden
  // "gecorrigeerd" naar het type dat toevallig bij de categorie/trefwoorden past. De categorie
  // hieronder bepaalt nog steeds de fiscale aard van de transactie (was het een zakelijke of een
  // privé-uitgave/-inkomst, zie fiscalTreatmentOf in categories.js) — dat blijft een aparte,
  // onafhankelijke as, precies zoals de winst/BTW-berekening dit al deed (die rekent al op basis van
  // de categorie, niet van tx.type — zie yearlySummary.js). Vóór deze fix overschreven een paar
  // categorie-/trefwoord-gebaseerde regels hieronder `type` alsnog (ALWAYS_PRIVE_CATEGORIES, een
  // herkend zakelijke-uitgave-trefwoord op een privérekening, of "factuur"/een bevestigde zakelijke
  // tegenpartij op welke rekening dan ook) — daardoor verdween precies het "verkeerde rekening"-
  // signaal dat nu juist zichtbaar moet blijven.
  const type = accountType === "Zakelijk" ? "Zakelijk" : "Prive";

  if (tx.outOfYearRange) {
    return { category: "Inkomsten/betalingen niet dit jaar", type };
  }

  // Kopspatie: sommige trefwoorden zijn bewust met spaties omsloten (" bp ", " action ") om te
  // voorkomen dat ze als stukje van een ander woord matchen — maar zonder deze kopspatie zou zo'n
  // trefwoord nooit matchen wanneer het merk toevallig het allereerste woord is (bijv. een
  // tegenpartij "BP Boxtel" of "Action 1234 Boxtel").
  const text = ` ${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  const isIncome = tx.amount > 0;

  // Een overboeking naar/van een van je eigen andere geladen rekeningen — herkend op
  // rekeningnummer (IBAN), niet op een tekstlabel dat bank tot bank verschilt of soms
  // ontbreekt. Werkt dus hetzelfde bij CSV, MT940 en CAMT.053, en bij elke bank, zolang je de
  // betreffende andere rekening ook zelf hebt geladen.
  //
  // De categorienaam is bewust voor elke rekening/richting-combinatie anders (v213) — elk van deze
  // vier benoemt de boeking zoals hij vanaf DIE rekening gezien wordt, in plaats van dat dezelfde
  // ("zakelijke-kant"-)naam ook op de privérekening zelf verschijnt:
  //   - Zakelijk, geld gaat weg naar privé:      "Prive opnames"
  //   - Zakelijk, geld komt terug van privé:     "Terugboeking van prive"
  //   - Prive,    geld komt van zakelijk:        "Ontvangen van zakelijk"   (vóór v213: "Uitbetaling aan prive")
  //   - Prive,    geld gaat terug naar zakelijk: "Terugboeking naar zakelijk" (vóór v213: ook "Terugboeking van prive")
  // Vóór deze wijziging kreeg de privérekening dezelfde namen als de zakelijke kant ("Uitbetaling
  // aan prive"/"Terugboeking van prive") — vanaf de privérekening zelf bekeken klopt die formulering
  // niet ("uitbetaling AAN prive" alsof je zelf de betaler bent, terwijl je hier juist ontvangt), en
  // "Terugboeking van prive" stond zo voor twee verschillende, tegenovergestelde boekingsrichtingen
  // tegelijk (zowel het ontvangen ván als het terugstorten náár zakelijk). Fiscaal verandert er
  // niets: alle vier blijven "geen" (zie CATEGORY_FISCAL_TREATMENT) en tellen voor de spiegel-/
  // saldocontrole (App.jsx/checklist.js) nog steeds als hetzelfde soort overboeking.
  const ownTransfer = detectOwnAccountTransfer(tx, accountType, ownAccountsElsewhere);
  if (ownTransfer) return ownTransfer;

  // Interne overboeking naar/van een eigen (zakelijke of privé) spaarrekening. Zo'n spaarrekening is
  // vrijwel altijd een pakketkeuze bij dezelfde bank als de betaalrekening zelf (niet iets wat je bij
  // een andere bank apart afsluit), dus deze overboekingen staan gewoon als gewone regels tussen de
  // transacties van die rekening zelf, in dezelfde MT940-/CSV-export — er is geen apart te laden
  // bestand of aparte IBAN voor nodig. Daarom hier bewust op tekst herkend in plaats van op IBAN
  // zoals de "eigen rekening elders"-check hierboven. Werkt sinds v212 ook op een privérekening (bijv.
  // een aan de privé-betaalrekening gekoppelde "Oranje Spaarrekening") — hetzelfde principe als bij
  // de zakelijke kant: puur een verschuiving binnen dezelfde rekeninghouder, dus nooit inkomen van
  // een klant. Vóór v212 viel zo'n boeking op een privérekening terug op de generieke "Inkomsten"-
  // categorie, waardoor de "wie zijn je zakelijke klanten?"-review 'm (vaak tientallen keren) ten
  // onrechte als mogelijke klant voorlegde.
  // De generieke bank-trefwoorden (hierboven) gelden voor beide rekeningtypes — de door de
  // gebruiker zelf opgegeven `zakelijkeSpaarKeywords` (wizardvraag "zakelijke spaarrekening") is
  // expliciet over de ZAKELIJKE rekening en telt dus alleen mee aan die kant.
  const isEigenSpaarrekeningTekst = ZAKELIJK_SPAAR_KEYWORDS.some((kw) => text.includes(kw)) ||
    (accountType === "Zakelijk" && zakelijkeSpaarKeywords.some((kw) => kw && text.includes(kw)));
  if (isEigenSpaarrekeningTekst) {
    return { category: accountType === "Zakelijk" ? "Interne overboeking: zakelijk sparen" : "Interne overboeking: privé sparen", type };
  }

  // Een overboeking naar/van de ondernemer zelf (of fiscaal partner), herkend op naam — voor de
  // situatie waarin de tegenrekening-IBAN ontbreekt of naar een rekening wijst die je niet zelf
  // hebt geladen (zie ook de "eigen rekening (niet geladen)"-vraag in de wizard, die hetzelfde
  // via IBAN afvangt). Minder hard bewijs dan een IBAN-match, maar wel een bewust door de
  // gebruiker zelf opgegeven naam — geen gok van de tool.
  // v223: `eigenNamen` bevat sinds nu de volledige, genormaliseerde naam (voorletter(s) + achternaam
  // samen, bijv. "r meijer") in plaats van alléén de kale achternaam (App.jsx/normalizePersonName) —
  // een bare achternaam bleek in de praktijk ook te matchen op de rekening van naamgenoten/
  // familieleden (bijv. de ouders "F Meijer en/of A Meijer-le Roux", of een zoon "Ricardo Meijer"),
  // die dan ten onrechte als "overboeking naar/van de ondernemer zelf" werden geboekt. Leestekens in
  // de transactietekst zelf ("R. Meijer" met punt) moeten daarvoor ook hier weg, anders matcht "r
  // meijer" niet met "r. meijer" in de tekst — vandaar deze apart genormaliseerde variant, alleen
  // voor déze check (de gewone `text` hierboven/hieronder blijft ongewijzigd voor de andere regels,
  // die wél op leestekens als "b.v."/".nl" steunen).
  const textForEigenNaam = text.replace(/[^a-zà-ÿ0-9\s]/g, " ").replace(/\s+/g, " ");
  if (eigenNamen.length > 0) {
    // V37 — de naam telt alleen als die in de NAAM van de tegenpartij staat. Staat er wél een andere
    // tegenpartij (bijv. Amvest) en komt de eigen naam alleen voor in de mededelingen (bijv. "…ARC FUND
    // R. Meijer en J.M. Wintermans"), dan is het géén overboeking van/naar jezelf. Alleen als de
    // tegenpartijnaam leeg is, kijken we nog naar de volledige tekst.
    const cpNorm = String(tx.counterparty || "").toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const nameHaystack = cpNorm ? ` ${cpNorm} ` : textForEigenNaam;
    const matchedNaam = eigenNamen.find((naam) => naam && nameHaystack.includes(naam));
    if (matchedNaam) {
      if (accountType === "Zakelijk") {
        return isIncome ? { category: "Terugboeking van prive", type } : { category: "Prive opnames", type };
      }
      return isIncome ? { category: "Ontvangen van zakelijk", type } : { category: "Terugboeking naar zakelijk", type };
    }
  }

  // "Derdengelden Intersolve" komt in de praktijk voor als inkomen (ook wanneer het incidenteel
  // als een terugboeking/afschrijving in het bankbestand staat) — altijd als inkomen behandelen,
  // los van het teken van het bedrag.
  if (text.includes("derdengelden intersolve")) {
    return accountType === "Zakelijk" ? { category: "Zakelijke inkomsten", type } : { category: "Inkomsten", type };
  }

  // Een tegenpartij die je zelf al expliciet als zakelijke klant hebt bevestigd (via "Zakelijke
  // tegenpartijen" of de inkomsten-review) blijft altijd de categorie "Zakelijke inkomsten" — dat is
  // een bewuste, eerder gegeven bevestiging en weegt zwaarder dan de hieronder volgende automatische
  // herkenning van "dit lijkt geen omzet"-bronnen. `type` volgt gewoon de rekening: komt deze
  // betaling van een bevestigde zakelijke klant toch op de privérekening binnen, dan blijft dat
  // zichtbaar (category "Zakelijke inkomsten", type "Prive") in plaats van stilzwijgend als
  // "Zakelijk" te worden geboekt.
  const isBiz = businessKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (isBiz) {
    return { category: "Zakelijke inkomsten", type };
  }

  // Niet elke bijschrijving op een zakelijke rekening is omzet: een lening-uitkering,
  // verzekeringsuitkering, belastingteruggave of terugbetaling/storno telt niet mee als omzet en
  // zou de BTW-aangifte en het omzetcijfer anders onterecht ophogen. Hergebruikt bewust dezelfde
  // trefwoordenlijsten als de uitgavenkant (Leningen/Verzekeringen), zodat een bekende
  // geldverstrekker of verzekeraar ook als afzender wordt herkend, niet alleen als ontvanger.
  if (isIncome) {
    const findRule = (name) => rules.find((r) => r.name === name);
    const matchesRule = (name) => {
      const rule = findRule(name);
      return !!rule && rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase()));
    };
    if (matchesRule("Leningen")) {
      // Zelfde account-gebaseerde standaardgok als bij de uitgavenkant hieronder (SPLIT_CATEGORY_NAMES)
      // — een lening-uitkering op de zakelijke rekening wordt standaard "Leningen" (zakelijk), op de
      // privérekening standaard "Leningen (privé)". Is de lening zelf feitelijk privé (bijv. DUO) maar
      // toevallig op de zakelijke rekening ontvangen, dan kan de categorie hierna nog gewoon handmatig
      // op "Leningen (privé)" gezet worden — net als bij elke andere categorie.
      return { category: accountType === "Zakelijk" ? "Leningen" : "Leningen (privé)", type };
    }
    if (matchesRule("Verzekering: Zakelijk") || matchesRule("Verzekeringen")) {
      const category = accountType === "Zakelijk" ? "Verzekering: Zakelijk" : "Verzekeringen";
      return { category, type };
    }
    if (text.includes("belastingdienst")) {
      return { category: "Belastingen: overig", type };
    }
    // "terugboeking" staat er sinds v215 ook bij: banken zetten voor een terug-geannuleerde incasso
    // vaak "Reden: Terugboeking op verzoek klant" neer, zonder een van de andere signaalwoorden.
    if (/\b(terugbetaling|restitutie|storno|creditnota|credit nota|terugstorting|terugboeking)\b/i.test(text)) {
      // Wél nog te herleiden WAT er is terugbetaald? Dan hergebruiken we dezelfde trefwoordenlijsten
      // als de uitgavenkant hieronder (SPLIT_CATEGORY_NAMES) — een KPN-/Eneco-/verzekeraar-
      // terugboeking hoort bij dezelfde categorie als de oorspronkelijke uitgave, niet in de
      // generieke "Overig"-controleerlijst. Blijft de tegenpartij onherkend, dan is "Overig" nog
      // steeds de juiste keuze: onduidelijk WAT er precies terugbetaald is, dus bewust niet gokken.
      for (const rule of rules) {
        if (rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase())) && !isKnownFalsePositiveRuleMatch(rule, text, accountType)) {
          const isBizExpense = accountType === "Zakelijk" || businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
          const categoryName = !isBizExpense && SPLIT_CATEGORY_NAMES[rule.name] ? SPLIT_CATEGORY_NAMES[rule.name] : rule.name;
          return { category: categoryName, type };
        }
      }
      return { category: "Overig", type };
    }
  }

  if (isIncome && /factuur(nr|nummer)?/i.test(text)) {
    return { category: "Zakelijke inkomsten", type };
  }

  if (isIncome) {
    if (accountType === "Zakelijk") {
      return { category: "Zakelijke inkomsten", type };
    }
    // Geld dat op de privérekening binnenkomt van een kennelijk persoon (geen bedrijfsnaam) — bijv.
    // het terugkrijgen van een voorgeschoten etentje, een cadeau, of een andere onderlinge
    // afrekening tussen bekenden. Dit is nooit omzet van een klant, dus hoort niet thuis in de
    // generieke "Inkomsten"-emmer (die de "wie zijn je zakelijke klanten?"-review juist WEL
    // doorloopt — zie GEEN_KLANT_CATEGORIES in reviewSummaries.js) en verdient een eigen, herkenbare
    // categorie in plaats van elke keer opnieuw te moeten worden bevestigd als "geen klant".
    if (looksLikePerson(tx.counterparty || tx.description)) {
      return { category: "Overboeking van bekenden", type };
    }
    return { category: "Inkomsten", type };
  }

  // Uitgaven: eerst kijken of een specifieke categorie matcht — die blijft altijd leidend,
  // ongeacht rekeningtype of tegenpartijlijst. Alleen de CATEGORIE hangt hier nog af van of dit
  // (op basis van rekeningtype/trefwoorden) een herkenbare zakelijke uitgave lijkt — `type` volgt
  // altijd gewoon de rekening waarvandaan is betaald, ongeacht die herkenning. Zo blijft
  // bijvoorbeeld een Netflix-abonnement op de zakelijke rekening zichtbaar als category "Prive
  // overige abonnementen" + type "Zakelijk" (verkeerde rekening) in plaats van stilzwijgend op
  // type "Prive" gezet te worden.
  // v312 (V33) — "verhuur" is niet hetzelfde als "huur": eerst op Overig laten beoordelen i.p.v. gokken.
  if (/verhuur/.test(text)) return { category: "Overig", type };

  for (const rule of rules) {
    if (rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase())) && !isKnownFalsePositiveRuleMatch(rule, text, accountType)) {
      const isBizExpense = accountType === "Zakelijk" || businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
      const categoryName = !isBizExpense && SPLIT_CATEGORY_NAMES[rule.name] ? SPLIT_CATEGORY_NAMES[rule.name] : rule.name;
      return { category: categoryName, type };
    }
  }

  const explicitBizExpense = businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (explicitBizExpense) {
    return { category: "Zakelijke inkoop/uitgaven", type };
  }

  // Buitenlandse pinbetaling op een privérekening, nog niet via een specifiek trefwoord herkend —
  // vrijwel altijd een vakantie-/uitje-uitgave. Bewust VÓÓR de looksLikePerson-check hieronder: veel
  // kleine buitenlandse (horeca-)ondernemers staan met een persoonsnaam in de bankexport (bijv.
  // "Kasapis Vasileios Rodos GRC"), en zijn dan feitelijk een lokale vakantie-uitgave, geen
  // overboeking aan een bekende. Dit is een HEURISTIEK/schatting (zie confidence.js), geen definitieve
  // classificatie — komt zichtbaar als "controleren" in de reviewlijst terecht, precies zodat een
  // zakelijke uitgave bij een buitenlandse leverancier (software, congres, hosting) alsnog
  // gecorrigeerd kan worden.
  if (accountType !== "Zakelijk" && looksLikeForeignCardPayment(tx)) {
    return { category: "Prive - vrijetijd-uitgaan-vakantie & uit eten", type };
  }

  if (looksLikePerson(tx.counterparty || tx.description)) {
    return { category: "Overboekingen aan personen", type };
  }

  // Laatste redmiddel op een privérekening: een pinbetaling zonder tegenrekening-IBAN (dus geen
  // gewone bankoverschrijving naar een met naam bekende partij, maar een kaartbetaling bij een
  // winkel/dienst) die nergens anders op matcht, is vrijwel altijd een gewone winkelaankoop — een
  // voorzichtige standaardgok naar "Winkels divers" in plaats van de generieke "Overig", zodat
  // niet elke losse pinbetaling apart handmatig hoeft te worden ingedeeld. Net als de vakantie-gok
  // hierboven een HEURISTIEK: zichtbaar als "controleren" in de reviewlijst, dus corrigeerbaar.
  // Alleen op de PRIVÉrekening — op de zakelijke rekening blijft een onherkende uitgave bewust op
  // "Overig" staan, omdat de fiscale inzet (aftrekbaarheid) daar te groot is om te gokken.
  if (accountType !== "Zakelijk" && !tx.counterpartyIban && tx.amount < 0) {
    return { category: "Winkels divers", type };
  }

  return { category: "Overig", type };
}

// Een eerder toegekende "Overig" is per definitie nooit een bewuste, definitieve keuze — dat is
// juist de controleer-/restcategorie (zie confidence.js en de checklist-review). Nu er een eigen
// categorie voor de eigen-spaarrekening-overboeking bestaat (zakelijk én, sinds v212, privé), mag
// zo'n oude "Overig"-override daarom alsnog automatisch worden bijgewerkt zodra de tekst
// overduidelijk een overboeking naar/van die spaarrekening is — anders zou een tegenpartij/rij die
// vóór deze herkenning al eens (noodgedwongen) op "Overig" is gezet, voor altijd op de
// controleerlijst blijven staan, terwijl identieke, nog niet eerder aangeraakte transacties
// automatisch wél goed terechtkomen. Elke andere, bewust gekozen categorie (ook "Zakelijke
// inkomsten" of "Prive: overig") blijft gewoon onaangetast — alleen "Overig" wordt op deze manier
// "heropend".
//
// Sinds v213 ook heropend op een IBAN-match met een eigen andere (elders geladen/opgegeven)
// rekening — anders bleef een OUDE, puur op tegenpartijnaam+teken gebaseerde "Overig"-override
// (bijv. "bouwservice ricobello::neg", ooit gezet vóór de privérekening zelf was geladen) een
// volledig andere, nieuw binnengekomen transactie van dezelfde tegenpartij blokkeren — ook als die
// nieuwe transactie via de tegenrekening-IBAN allang met zekerheid als "overboeking naar/van je
// eigen andere rekening" herkend kon worden (zie ook confidence.js/isOwnAccountTransferMatch, dat
// dezelfde IBAN-check gebruikt om zo'n transactie hoog te scoren). Een counterparty-key-override is
// namelijk puur tekst+teken-gebaseerd en onderscheidt niet WELKE transactie van die tegenpartij het
// was — dus een override die ooit terecht op één (destijds nog onduidelijke) transactie is gezet,
// kan een compleet andere, achteraf overduidelijke transactie meesleuren.
// Sinds v215 ook heropend wanneer de transactietekst een duidelijk terugboeking-/terugbetaal-
// signaal bevat ÉN nu een specifieke leverancier-trefwoordregel matcht (zie het "isIncome"-blok
// hierboven) — bijv. "kpn bv::pos"/"cz groep zorgverzekeraar::pos"/"eneco services::pos", ooit op
// "Overig" gezet omdat de classificatie toen nog geen idee had wat voor soort terugboeking dit was.
// Nu die herkenning bestaat, mag de override net als de andere twee gevallen hierboven wijken voor
// de nieuwe, specifiekere automatische classificatie.
// Sommige regels herkennen hun trefwoord ondubbelzinnig verkeerd in een specifiek, goed te
// herkennen tekstpatroon — dit vangt die bekende gevallen af vóórdat een trefwoordmatch wordt
// geaccepteerd, in plaats van de trefwoordenlijst zelf onveilig smal te maken (v220).
export function isKnownFalsePositiveRuleMatch(rule, text, accountType) {
  // "Betaalautomaat kosten" herkent (onder andere) de merknamen van pinbetaaldiensten (SumUp,
  // Zettle, CCV, Mollie, ...) om de eigen, door de bank in rekening gebrachte servicekosten van
  // zo'n dienst te herkennen. Diezelfde merknamen staan echter OOK op de rekening van de klant die
  // bij een kraam/winkel/horecazaak met zo'n pinapparaat heeft afgerekend — zulke aankopen hebben
  // vrijwel altijd het patroon "<merk>*<winkelnaam>" (bijv. "Zettle*MaasakkersH",
  // "CCV*KFC Nederweert", "SumUp *Van Nielen"). Dat is een gewone aankoop bij die winkel/kraam, geen
  // factuur van de betaaldienst zelf aan de rekeninghouder — een asterisk in de tekst is hiervoor een
  // betrouwbaar signaal (komt in gewone bankomschrijvingen vrijwel nooit los voor).
  if (rule.name === "Betaalautomaat kosten" && text.includes("*")) return true;
  // "Betaalautomaat kosten" (vervolg, v223): twee vergelijkbare "koopt-iets-bij-een-online-partij"-
  // patronen, ontdekt in een echt dossier (R. Meijer) waar een privérekening was geladen. Net als bij
  // de "*"-check hierboven staat de merknaam van de betaaldienst er ook gewoon op te lezen wanneer
  // iemand een HEEL GEWONE consumentenaankoop/-abonnement online afrekent — niet omdat de
  // rekeninghouder zelf servicekosten van die betaaldienst betaalt:
  //   1) "<webwinkel/abonnement> via/door/by <betaaldienst>" — de manier waarop veel Nederlandse
  //      incasso's/afschrijvingen de onderliggende betaaldienst vermelden naast de eigenlijke
  //      verkopende partij (bijv. "VIDEOLAND DOOR BUCKAROO", "Kaartje2go NL verkoop via Stichting
  //      Mollie Payments", "NS Reizigers B.V. by Buckaroo").
  //   2) "... Doorlopende incasso Overige partij: <BETAALDIENST> N.V." — dezelfde situatie maar dan
  //      in de vaste Nederlandse-incasso-omschrijving: "Overige partij" is hier de PSP die de incasso
  //      namens de werkelijke leverancier verwerkt (bijv. "HBO MAX ... Doorlopende incasso Overige
  //      partij: ADYEN N.V." — Adyen int hier voor HBO Max, niet voor de rekeninghouder zelf).
  // In beide gevallen staat de betaaldienst-merknaam er dus als TUSSENPARTIJ bij, niet als degene die
  // de rekeninghouder zelf kosten in rekening brengt — vandaar dat we deze twee patronen, net als de
  // "*"-aankopen, uitsluiten van de "Betaalautomaat kosten"-classificatie.
  if (
    rule.name === "Betaalautomaat kosten" &&
    (/\b(via|door|by)\b\s+(stichting\s+)?(mollie|buckaroo|adyen|ccv|worldline|multisafepay|pay\.nl|sumup|mypos|payter|viva\s+wallet|zettle|cm\.com)/.test(text) ||
      /overige partij:\s*(stichting\s+)?(mollie|buckaroo|adyen|ccv|worldline|multisafepay|pay\.nl|sumup|mypos|payter|viva\s+wallet|zettle|cm\.com)/.test(text))
  ) {
    return true;
  }
  // "Betaalautomaat kosten" (vervolg, v223): "ovpay.nl" (het OV-chipkaart-/reizigersbetaalsysteem
  // van het openbaar vervoer, bijv. "NLOVLX5MAGXWYMK5WG www.ovpay.nl") bevat toevallig de trefwoord-
  // substring "pay.nl" (de betaaldienst Pay.nl) — dat is een heel andere partij, en dit is gewoon een
  // OV-reis, geen betaaldienst-kostenafschrijving.
  if (rule.name === "Betaalautomaat kosten" && text.includes("ovpay")) return true;
  // v312 (V33) — "Huur" herkent het trefwoord "huur " ook BINNEN andere woorden: "verhuur" (iets anders dan
  // huur: de tegenpartij verhuurt zelf iets) en "inhuur" (personeel). Een voorafgaande letter betekent
  // dat het geen losstaand "huur" is, dus geen Huur-match. Bij "verhuur" valt de transactie in
  // autoClassify bovendien eerst op "Overig" (zie daar), zodat die bewust wordt beoordeeld.
  if (rule.name === "Huur" && /[a-zà-ÿ]huur/.test(text)) return true;
  // "Telecom" herkent "ziggo" (provider), maar "Ziggo Dome" is de concertzaal: een uitgaansuitgave.
  if (text.includes("ziggo dome") && rule.name !== "Prive - vrijetijd-uitgaan-vakantie & uit eten") return true;
  // "Betaalautomaat kosten" herkent o.a. "buckaroo" — op een zakelijke rekening zijn dat servicekosten van de
  // betaaldienst, op een privérekening vrijwel altijd een gewone online aankoop/uitje (zie Uitgaan).
  if (rule.name === "Betaalautomaat kosten" && accountType !== "Zakelijk" && accountType !== undefined && text.includes("buckaroo")) return true;
  // "Bankkosten" herkent (onder andere) de eigen bank op naam, voor de periodieke pakket-/
  // servicekosten die de bank zelf afschrijft. Een "Betaalverzoek"/Tikkie-achtige betaling via
  // diezelfde bank-app is geen kostenafschrijving maar een gewone overboeking tussen twee mensen —
  // de banknaam staat er toevallig ook in (bijv. "ING Betaalverzoek via ING Bank").
  if (rule.name === "Bankkosten" && /betaalverzoek|tikkie/.test(text)) return true;
  // "Boekhouder, accountant & administratie" herkent het boekhoudpakket AFAS op het kale woord
  // "afas" — dat matcht óók op "AFAS Live" (de concertzaal in Amsterdam-Zuidoost, gesponsord door
  // hetzelfde bedrijf), een heel gewone privé-uitgave (kaartje/consumptie), geen boekhoudpakket-
  // factuur. Bewust hier afgevangen (en niet louter door het standaard-trefwoord in categories.js aan
  // te scherpen naar "afas software"): een al opgeslagen dossier neemt zijn EIGEN, op het moment van
  // opslaan bewaarde trefwoordenlijst mee en voegt die samen met de (nieuwe) standaardlijst (zie
  // mergeCategoryRules) — de kale "afas" blijft daardoor ook na deze wijziging nog meekomen bij een
  // ouder, al geladen project, tenzij hij hier expliciet wordt uitgesloten.
  if (rule.name === "Boekhouder, accountant & administratie" && text.includes("afas live")) return true;
  return false;
}

function looksLikeRecognizedRefund(text, rules) {
  if (!/\b(terugbetaling|restitutie|storno|creditnota|credit nota|terugstorting|terugboeking)\b/i.test(text)) return false;
  return rules.some((r) => r.keywords.some((kw) => kw && text.includes(kw.toLowerCase())));
}

// v311 (V33) — een overboeking tussen twee eigen rekeningen van een verschillend type (zakelijk ↔ privé),
// herkend op het rekeningnummer van de tegenrekening, is hard bewezen: de categorie ligt daarmee vast
// (zie de vier namen hieronder, per kant/richting) en mag niet handmatig worden aangepast — anders
// raken beide kanten van dezelfde overboeking uit balans (bijv. de zakelijke kant als "Zakelijke
// inkomsten" terwijl de privékant als "Terugboeking naar zakelijk" blijft staan). Geeft null als dit
// géén herkende overboeking tussen eigen rekeningen is. Een herkenning op naam (eigenNamen) is minder
// hard bewijs en blijft daarom wel aan te passen.
export function detectOwnAccountTransfer(tx, accountType, ownAccountsElsewhere = []) {
  if (tx.outOfYearRange || !tx.counterpartyIban || !ownAccountsElsewhere || ownAccountsElsewhere.length === 0) return null;
  const matchedOwn = ownAccountsElsewhere.find((o) => ibansMatch(tx.counterpartyIban, o.iban));
  if (!matchedOwn || !matchedOwn.accountType || matchedOwn.accountType === accountType) return null;
  const type = accountType === "Zakelijk" ? "Zakelijk" : "Prive";
  const isIncome = tx.amount > 0;
  if (accountType === "Zakelijk") {
    return isIncome ? { category: "Terugboeking van prive", type } : { category: "Prive opnames", type };
  }
  return isIncome ? { category: "Ontvangen van zakelijk", type } : { category: "Terugboeking naar zakelijk", type };
}

function isStaleOverigForKnownTransfer(override, tx, accountType, zakelijkeSpaarKeywords, ownAccountsElsewhere, rules) {
  if (!override || override.category !== "Overig") return false;
  const text = ` ${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  if (ZAKELIJK_SPAAR_KEYWORDS.some((kw) => text.includes(kw))) return true;
  if (accountType === "Zakelijk" && zakelijkeSpaarKeywords.some((kw) => kw && text.includes(kw))) return true;
  if (tx.counterpartyIban && ownAccountsElsewhere && ownAccountsElsewhere.length > 0) {
    const matched = ownAccountsElsewhere.find((o) => ibansMatch(tx.counterpartyIban, o.iban));
    if (matched && matched.accountType && matched.accountType !== accountType) return true;
  }
  if (looksLikeRecognizedRefund(text, rules)) return true;
  return false;
}

// V43 — `type` volgt ALTIJD de rekening waar de transactie op staat (zie autoClassify). Overrides uit
// oudere dossiers (of acties zoals "zakelijke tegenpartij bevestigen") konden type "Zakelijk" meegeven
// terwijl de boeking op een privérekening staat; daardoor toonde het detailvenster "Zakelijk" bij een
// privérekening. De categorie van de override blijft gelden, het type niet.
function withAccountType(override, accountType) {
  if (!override) return override;
  const type = accountType === "Zakelijk" ? "Zakelijk" : "Prive";
  return override.type === type ? override : { ...override, type };
}

export function resolveClassification(tx, rules, businessKeywords, businessExpenseKeywords, accountType, overridesByCounterparty, overridesByRow, ownAccountsElsewhere = [], eigenNamen = [], zakelijkeSpaarKeywords = []) {
  const lockedTransfer = detectOwnAccountTransfer(tx, accountType, ownAccountsElsewhere);
  if (lockedTransfer) return lockedTransfer;
  const rowOverride = overridesByRow[tx.id];
  if (rowOverride && !isStaleOverigForKnownTransfer(rowOverride, tx, accountType, zakelijkeSpaarKeywords, ownAccountsElsewhere, rules)) return withAccountType(rowOverride, accountType);
  // IBAN is stabieler dan de naam (die per bank-export kan wisselen) — dus die heeft voorrang
  // wanneer het bankbestand een tegenrekening-IBAN bevatte.
  const ik = ibanKey(tx.counterpartyIban, tx.amount);
  const ibanOverride = ik && overridesByCounterparty[ik];
  if (ibanOverride && !isStaleOverigForKnownTransfer(ibanOverride, tx, accountType, zakelijkeSpaarKeywords, ownAccountsElsewhere, rules)) return withAccountType(ibanOverride, accountType);
  const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
  const keyOverride = key && overridesByCounterparty[key];
  if (keyOverride && !isStaleOverigForKnownTransfer(keyOverride, tx, accountType, zakelijkeSpaarKeywords, ownAccountsElsewhere, rules)) return withAccountType(keyOverride, accountType);
  // V37 — een storno/terugboeking (bijv. een teruggeboekte incasso, "Reden: Terugboeking op verzoek klant")
  // hoort bij dezelfde categorie als de oorspronkelijke afschrijving van dezelfde tegenpartij (op IBAN).
  if (tx.amount > 0 && /\b(terugboeking|storno|terugbetaling|restitutie)\b/i.test(`${tx.description} ${tx.fullDescription}`)) {
    const negIban = tx.counterpartyIban && overridesByCounterparty[ibanKey(tx.counterpartyIban, -1)];
    const negKey = overridesByCounterparty[counterpartyKey(tx.counterparty || tx.description, -1)];
    let negPrefix = null;
    if (!negIban && !negKey) {
      // Dezelfde partij onder een langere naam (bijv. "Amvest" ↔ "AMVEST RCF CUSTODIANFGR1"): vergelijk op beginwoord.
      const cpBase = counterpartyKey(tx.counterparty || tx.description, -1).replace(/::neg$/, "");
      for (const k of Object.keys(overridesByCounterparty)) {
        if (!k.endsWith("::neg")) continue;
        const base = k.slice(0, -5);
        if (base.length >= 4 && cpBase.startsWith(base + " ")) { negPrefix = overridesByCounterparty[k]; break; }
      }
    }
    const mirror = negIban || negKey || negPrefix;
    if (mirror && mirror.category && mirror.category !== "Overig" && !isStaleOverigForKnownTransfer(mirror, tx, accountType, zakelijkeSpaarKeywords, ownAccountsElsewhere, rules)) {
      return { ...mirror, type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
    }
  }
  return autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType, ownAccountsElsewhere, eigenNamen, zakelijkeSpaarKeywords);
}
