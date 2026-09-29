// Confidence-scoring voor een classificatie. Dit
// VERVANGT classify.js niet: resolveClassification blijft de bron van waarheid voor de
// daadwerkelijke categorie. Deze module scoort achteraf hoe zeker die uitkomst is, zodat de UI
// (bijv. het importcontrole-scherm) kan tonen welke transacties extra aandacht verdienen.
//
// Score-niveaus, van hoog naar laag vertrouwen:
// - "override"  — een eerder door de gebruiker bevestigde tegenpartij- of rij-correctie
// - "keyword"    — een match op een specifieke categorieregel (DEFAULT_RULES-keyword), of een
//                  overboeking naar/van een eigen andere rekening die is herkend op IBAN (zie
//                  PRIVE_TRANSFER_CATEGORIES hieronder) — een IBAN-match op een door de gebruiker
//                  zelf bevestigde eigen rekening is minstens zo hard bewijs als een keyword-match,
//                  dus die twee delen bewust hetzelfde (hoogste automatische) vertrouwensniveau
// - "heuristic"  — een generieke regel zonder keyword-match (bijv. "looksLikePerson", of het
//                  automatisch toekennen van "Zakelijke inkomsten" puur op basis van rekeningtype)
// - "fallback"   — geen van bovenstaande matchte; de transactie is in "Overig" beland

import { counterpartyKey, ibanKey, ibansMatch } from "../utils/normalization.js";
import { looksLikeForeignCardPayment, isKnownFalsePositiveRuleMatch } from "./classify.js";

// Zelfde drietal categorieën als in classify.js (overboeking tussen zakelijk en privé). Een
// resolvedCategory die hierin voorkomt én waarvan de tegenrekening-IBAN overeenkomt met een eigen,
// elders geladen/opgegeven rekening (ongeacht of dát de zakelijke of de privé-kant is) is vrijwel
// zeker automatisch juist bepaald — dat is precies de IBAN-check uit autoClassify() in classify.js.
// Zonder deze check belandde zo'n transactie (voor het eerst gezien, dus nog geen eigen override)
// op "heuristic" en dus in de "nog te controleren"-lijst — bij het laden van een privérekening met
// veel onderlinge overboekingen ontstond zo een lange rij overbodige controlevragen over boekingen
// die feitelijk al via de andere rekening zijn vastgelegd/beoordeeld.
const PRIVE_TRANSFER_CATEGORIES = [
  "Prive opnames", "Terugboeking van prive", // zakelijke kant
  "Ontvangen van zakelijk", "Terugboeking naar zakelijk", // privé kant (v213)
];
function isOwnAccountTransferMatch(tx, ownAccountsElsewhere) {
  if (!tx.counterpartyIban || !ownAccountsElsewhere || ownAccountsElsewhere.length === 0) return false;
  return ownAccountsElsewhere.some((o) => o.accountType && ibansMatch(tx.counterpartyIban, o.iban));
}

export function scoreClassification(tx, rules, overridesByCounterparty, overridesByRow, resolvedCategory, ownAccountsElsewhere = []) {
  // Vergelijk ook de CATEGORIE van de override met de uiteindelijk gebruikte categorie: bij een
  // oude "Overig"-override die resolveClassification inmiddels zelf heeft "heropend" (zie
  // isStaleOverigForZakelijkSpaar in classify.js) wijkt resolvedCategory af van de opgeslagen
  // override — dan is dit dus geen echte, actuele handmatige bevestiging meer, en valt dit verder
  // terug op de heuristische score hieronder (die "Interne overboeking: zakelijk sparen" al apart
  // afvangt).
  const rowOverride = overridesByRow[tx.id];
  if (rowOverride && rowOverride.category === resolvedCategory) return { level: "override", label: "Handmatig bevestigd (deze transactie)" };

  const ik = ibanKey(tx.counterpartyIban, tx.amount);
  const ibanOverride = ik && overridesByCounterparty[ik];
  if (ibanOverride && ibanOverride.category === resolvedCategory) return { level: "override", label: "Handmatig bevestigd (IBAN)" };
  const key = counterpartyKey(tx.counterparty || tx.description, tx.amount);
  const keyOverride = key && overridesByCounterparty[key];
  if (keyOverride && keyOverride.category === resolvedCategory) return { level: "override", label: "Handmatig bevestigd (tegenpartij)" };

  if (PRIVE_TRANSFER_CATEGORIES.includes(resolvedCategory) && isOwnAccountTransferMatch(tx, ownAccountsElsewhere)) {
    return { level: "keyword", label: "Automatisch herkend: overboeking naar/van eigen andere rekening (IBAN)" };
  }

  if (resolvedCategory === "Overig") return { level: "fallback", label: "Geen regel gevonden — controleren" };
  if (resolvedCategory === "Overboekingen aan personen") return { level: "heuristic", label: "Herkend als naam, niet als bekende categorie" };
  if (resolvedCategory === "Interne overboeking: zakelijk sparen") return { level: "heuristic", label: "Herkend als overboeking naar/van zakelijke spaarrekening" };
  if (resolvedCategory === "Interne overboeking: privé sparen") return { level: "heuristic", label: "Herkend als overboeking naar/van privé spaarrekening" };

  const text = ` ${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  const matchedRule = rules.find((r) => r.keywords.some((kw) => kw && text.includes(kw.toLowerCase())) && !isKnownFalsePositiveRuleMatch(r, text));
  if (matchedRule) return { level: "keyword", label: `Zoekwoord-match ("${matchedRule.name}")` };

  // De twee "laatste redmiddel"-gokken uit autoClassify() (zie classify.js) — geen enkel zoekwoord
  // matchte (anders had de check hierboven al gematched), dus dit is puur een structurele schatting
  // (buitenlandse pinbetaling / kaartbetaling zonder tegenrekening-IBAN), geen inhoudelijke
  // herkenning. Bewust op "heuristic" (net als "Overboekingen aan personen"), zodat dit zichtbaar in
  // de "nog te controleren"-lijst blijft staan.
  if (resolvedCategory === "Prive - vrijetijd-uitgaan-vakantie & uit eten" && looksLikeForeignCardPayment(tx)) {
    return { level: "heuristic", label: "Geschat: buitenlandse pinbetaling, waarschijnlijk vakantie/uitje" };
  }
  if (resolvedCategory === "Winkels divers" && !tx.counterpartyIban) {
    return { level: "heuristic", label: "Geschat: losse pinbetaling zonder herkend zoekwoord" };
  }

  return { level: "heuristic", label: "Automatisch bepaald (geen specifiek zoekwoord)" };
}
