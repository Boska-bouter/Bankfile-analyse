// Confidence-scoring voor een classificatie — nieuw in v2 (zie migratieplan, sectie 6). Dit
// VERVANGT classify.js niet: resolveClassification blijft de bron van waarheid voor de
// daadwerkelijke categorie. Deze module scoort achteraf hoe zeker die uitkomst is, zodat de UI
// (bijv. het importcontrole-scherm) kan tonen welke transacties extra aandacht verdienen.
//
// Score-niveaus, van hoog naar laag vertrouwen:
// - "override"  — een eerder door de gebruiker bevestigde tegenpartij- of rij-correctie
// - "keyword"    — een match op een specifieke categorieregel (DEFAULT_RULES-keyword)
// - "heuristic"  — een generieke regel zonder keyword-match (bijv. "looksLikePerson", of het
//                  automatisch toekennen van "Zakelijke inkomsten" puur op basis van rekeningtype)
// - "fallback"   — geen van bovenstaande matchte; de transactie is in "Overig" beland

export function scoreClassification(tx, rules, overridesByCounterparty, overridesByRow, resolvedCategory) {
  if (overridesByRow[tx.id]) return { level: "override", label: "Handmatig bevestigd (deze transactie)" };

  const key = `${(tx.counterparty || tx.description || "").trim().toLowerCase()}::${tx.amount >= 0 ? "pos" : "neg"}`;
  if (key && overridesByCounterparty[key]) return { level: "override", label: "Handmatig bevestigd (tegenpartij)" };

  if (resolvedCategory === "Overig") return { level: "fallback", label: "Geen regel gevonden — controleren" };
  if (resolvedCategory === "Overboekingen aan personen") return { level: "heuristic", label: "Herkend als naam, niet als bekende categorie" };

  const text = `${tx.counterparty} ${tx.description} ${tx.fullDescription}`.toLowerCase();
  const matchedRule = rules.find((r) => r.keywords.some((kw) => kw && text.includes(kw.toLowerCase())));
  if (matchedRule) return { level: "keyword", label: `Zoekwoord-match ("${matchedRule.name}")` };

  return { level: "heuristic", label: "Automatisch bepaald (geen specifiek zoekwoord)" };
}

// Handig voor UI-statusiconen (bijv. het importcontrole-scherm, zie migratieplan 6a).
export const CONFIDENCE_ICON = {
  override: "🟢",
  keyword: "🟢",
  heuristic: "🟡",
  fallback: "🔴",
};
