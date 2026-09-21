import { SPLIT_CATEGORY_NAMES } from "./categories.js";
import { looksLikePerson, counterpartyKey, ibanKey, ibansMatch } from "../utils/normalization.js";

// Categorieën die vrijwel nooit een echte zakelijke aftrekpost zijn, ook niet wanneer ze
// toevallig vanaf een zakelijke rekening betaald zijn (bijv. een Netflix-abonnement op de
// zakelijke rekening) — die volgen daarom niet het rekeningtype zoals de meeste andere
// categorieën, maar blijven altijd Privé.
const ALWAYS_PRIVE_CATEGORIES = new Set(["Prive overige abonnementen"]);

// Categorieën die per definitie Zakelijk zijn wanneer ze via een snelkoppeling worden gekozen.
export function defaultTypeForCategory(category) {
  return category === "Zakelijke inkomsten" || category === "Uitbetaling aan prive" || category === "Prive opnames"
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

export function autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType, ownAccountsElsewhere = [], eigenNamen = [], zakelijkeSpaarKeywords = []) {
  if (tx.outOfYearRange) {
    return { category: "Inkomsten/betalingen niet dit jaar", type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
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
  if (tx.counterpartyIban && ownAccountsElsewhere.length > 0) {
    const matchedOwn = ownAccountsElsewhere.find((o) => ibansMatch(tx.counterpartyIban, o.iban));
    if (matchedOwn && matchedOwn.accountType && matchedOwn.accountType !== accountType) {
      if (accountType === "Zakelijk") {
        return isIncome ? { category: "Terugboeking van prive", type: "Zakelijk" } : { category: "Prive opnames", type: "Zakelijk" };
      }
      return isIncome ? { category: "Uitbetaling aan prive", type: "Prive" } : { category: "Terugboeking van prive", type: "Prive" };
    }
  }

  // Interne overboeking naar/van de eigen zakelijke spaarrekening — vaak binnen dezelfde
  // MT940-/CSV-export van de zakelijke rekening zelf (de spaarrekening is meestal geen apart te
  // laden bestand, maar een subrekening bij dezelfde bank), dus hier bewust op tekst herkend in
  // plaats van op IBAN zoals de "eigen rekening elders"-check hierboven. Alleen relevant vanaf een
  // zakelijke rekening: beide kanten van deze overboeking horen bij dezelfde onderneming.
  if (accountType === "Zakelijk" && (ZAKELIJK_SPAAR_KEYWORDS.some((kw) => text.includes(kw)) || zakelijkeSpaarKeywords.some((kw) => kw && text.includes(kw)))) {
    return { category: "Interne overboeking: zakelijk sparen", type: "Zakelijk" };
  }

  // Een overboeking naar/van de ondernemer zelf (of fiscaal partner), herkend op naam — voor de
  // situatie waarin de tegenrekening-IBAN ontbreekt of naar een rekening wijst die je niet zelf
  // hebt geladen (zie ook de "eigen rekening (niet geladen)"-vraag in de wizard, die hetzelfde
  // via IBAN afvangt). Minder hard bewijs dan een IBAN-match, maar wel een bewust door de
  // gebruiker zelf opgegeven naam — geen gok van de tool.
  if (eigenNamen.length > 0) {
    const matchedNaam = eigenNamen.find((naam) => naam && text.includes(naam));
    if (matchedNaam) {
      if (accountType === "Zakelijk") {
        return isIncome ? { category: "Terugboeking van prive", type: "Zakelijk" } : { category: "Prive opnames", type: "Zakelijk" };
      }
      return isIncome ? { category: "Uitbetaling aan prive", type: "Prive" } : { category: "Terugboeking van prive", type: "Prive" };
    }
  }

  // "Derdengelden Intersolve" komt in de praktijk voor als inkomen (ook wanneer het incidenteel
  // als een terugboeking/afschrijving in het bankbestand staat) — altijd als inkomen behandelen,
  // los van het teken van het bedrag.
  if (text.includes("derdengelden intersolve")) {
    return accountType === "Zakelijk" ? { category: "Zakelijke inkomsten", type: "Zakelijk" } : { category: "Inkomsten", type: "Prive" };
  }

  // Een tegenpartij die je zelf al expliciet als zakelijke klant hebt bevestigd (via "Zakelijke
  // tegenpartijen" of de inkomsten-review) blijft altijd zakelijke inkomsten — dat is een
  // bewuste, eerder gegeven bevestiging en weegt zwaarder dan de hieronder volgende automatische
  // herkenning van "dit lijkt geen omzet"-bronnen.
  const isBiz = businessKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (isBiz) {
    return { category: "Zakelijke inkomsten", type: "Zakelijk" };
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
      return { category: "Leningen", type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
    }
    if (matchesRule("Verzekering: Zakelijk") || matchesRule("Verzekeringen")) {
      const category = accountType === "Zakelijk" ? "Verzekering: Zakelijk" : "Verzekeringen";
      return { category, type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
    }
    if (text.includes("belastingdienst")) {
      return { category: "Belastingen: overig", type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
    }
    if (/\b(terugbetaling|restitutie|storno|creditnota|credit nota|terugstorting)\b/i.test(text)) {
      // Onduidelijk WAT er precies terugbetaald is — bewust naar "Overig" (controleren) in plaats
      // van te gokken, in plaats van dit stilzwijgend als omzet te boeken.
      return { category: "Overig", type: accountType === "Zakelijk" ? "Zakelijk" : "Prive" };
    }
  }

  if (isIncome && /factuur(nr|nummer)?/i.test(text)) {
    return { category: "Zakelijke inkomsten", type: "Zakelijk" };
  }

  if (isIncome) {
    if (accountType === "Zakelijk") {
      return { category: "Zakelijke inkomsten", type: "Zakelijk" };
    }
    return { category: "Inkomsten", type: "Prive" };
  }

  // Uitgaven: eerst kijken of een specifieke categorie matcht — die blijft altijd leidend,
  // ongeacht rekeningtype of tegenpartijlijst.
  for (const rule of rules) {
    if (rule.keywords.some((kw) => kw && text.includes(kw.toLowerCase()))) {
      if (ALWAYS_PRIVE_CATEGORIES.has(rule.name)) {
        return { category: rule.name, type: "Prive" };
      }
      const isBizExpense = accountType === "Zakelijk" || businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
      const categoryName = !isBizExpense && SPLIT_CATEGORY_NAMES[rule.name] ? SPLIT_CATEGORY_NAMES[rule.name] : rule.name;
      return { category: categoryName, type: isBizExpense ? "Zakelijk" : "Prive" };
    }
  }

  const explicitBizExpense = businessExpenseKeywords.some((kw) => kw && text.includes(kw.toLowerCase()));
  if (explicitBizExpense) {
    return { category: "Zakelijke uitgaven", type: "Zakelijk" };
  }

  const expenseType = accountType === "Zakelijk" ? "Zakelijk" : "Prive";
  if (looksLikePerson(tx.counterparty || tx.description)) {
    return { category: "Overboekingen aan personen", type: expenseType };
  }
  return { category: "Overig", type: expenseType };
}

// Een eerder toegekende "Overig" is per definitie nooit een bewuste, definitieve keuze — dat is
// juist de controleer-/restcategorie (zie confidence.js en de checklist-review). Nu er een eigen
// categorie voor de zakelijke-spaarrekening-overboeking bestaat, mag zo'n oude "Overig"-override
// daarom alsnog automatisch worden bijgewerkt zodra de tekst overduidelijk een overboeking
// naar/van de zakelijke spaarrekening is — anders zou een tegenpartij/rij die vóór deze fix al
// eens (noodgedwongen) op "Overig" is gezet, voor altijd op de controleerlijst blijven staan,
// terwijl identieke, nog niet eerder aangeraakte transacties automatisch wél goed terechtkomen.
// Elke andere, bewust gekozen categorie (ook "Zakelijke inkomsten" of "Prive: overig") blijft
// gewoon onaangetast — alleen "Overig" wordt op deze manier "heropend".
function isStaleOverigForZakelijkSpaar(override, tx, accountType, zakelijkeSpaarKeywords) {
  return !!override && override.category === "Overig" && accountType === "Zakelijk" &&
    (() => {
      const text = ` ${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
      return ZAKELIJK_SPAAR_KEYWORDS.some((kw) => text.includes(kw)) || zakelijkeSpaarKeywords.some((kw) => kw && text.includes(kw));
    })();
}

export function resolveClassification(tx, rules, businessKeywords, businessExpenseKeywords, accountType, overridesByCounterparty, overridesByRow, ownAccountsElsewhere = [], eigenNamen = [], zakelijkeSpaarKeywords = []) {
  const rowOverride = overridesByRow[tx.id];
  if (rowOverride && !isStaleOverigForZakelijkSpaar(rowOverride, tx, accountType, zakelijkeSpaarKeywords)) return rowOverride;
  // IBAN is stabieler dan de naam (die per bank-export kan wisselen) — dus die heeft voorrang
  // wanneer het bankbestand een tegenrekening-IBAN bevatte.
  const ik = ibanKey(tx.counterpartyIban, tx.amount);
  const ibanOverride = ik && overridesByCounterparty[ik];
  if (ibanOverride && !isStaleOverigForZakelijkSpaar(ibanOverride, tx, accountType, zakelijkeSpaarKeywords)) return ibanOverride;
  const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
  const keyOverride = key && overridesByCounterparty[key];
  if (keyOverride && !isStaleOverigForZakelijkSpaar(keyOverride, tx, accountType, zakelijkeSpaarKeywords)) return keyOverride;
  return autoClassify(tx, rules, businessKeywords, businessExpenseKeywords, accountType, ownAccountsElsewhere, eigenNamen, zakelijkeSpaarKeywords);
}
