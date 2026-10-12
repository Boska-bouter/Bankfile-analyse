// release20V3 — soort ruimte waarvoor huur/energie/gemeentelijke lasten (vaak vanaf de privérekening) worden betaald.
// Fiscaal verschil (indicatief, controleer zelf):
//  - bedrijfsruimte: een zakelijk gehuurd pand/schuur → gewone zakelijke huisvestingskosten, voor het zakelijke deel.
//  - zelfstandig:    zelfstandige werkruimte in de eigen woning → kosten naar rato aftrekbaar als bedrijfskosten.
//  - niet_zelfstandig: thuiskantoor/kamer/hoek in de eigen woning → huur, energie en gemeentelijke lasten NIET aftrekbaar.
// Niet aangegeven = ongewijzigd gedrag (zoals voor deze release): de ingestelde percentages gelden.
export const WERKRUIMTE_CATEGORIEEN = ["Huur", "Energie-water", "Gemeentelijke kosten"];

export const WERKRUIMTE_LABELS = {
  bedrijfsruimte: "Zakelijk gehuurd pand/bedrijfsruimte (betaald vanaf privé)",
  zelfstandig: "Zelfstandige werkruimte in de eigen woning",
  niet_zelfstandig: "Werkruimte in de eigen woning, niet zelfstandig (kamer/hoek)",
};

export const WERKRUIMTE_KORT = {
  bedrijfsruimte: "zakelijk gehuurde bedrijfsruimte",
  zelfstandig: "zelfstandige werkruimte in de eigen woning",
  niet_zelfstandig: "niet-zelfstandige werkruimte in de eigen woning",
};

// Maakt van de ingestelde percentages de "effectieve": een jaar met niet_zelfstandig telt huur, energie-water en
// gemeentelijke kosten voor 0% mee. De ingevulde percentages zelf blijven in het dossier staan.
export function percentagesMetWerkruimte(categoryZakelijkPercentage, werkruimteStatus) {
  const jaren = Object.entries(werkruimteStatus || {}).filter(([, v]) => v === "niet_zelfstandig").map(([y]) => y);
  if (jaren.length === 0) return categoryZakelijkPercentage;
  const result = { ...(categoryZakelijkPercentage || {}) };
  for (const cat of WERKRUIMTE_CATEGORIEEN) {
    const perJaar = { ...(result[cat] || {}) };
    for (const y of jaren) perJaar[y] = 0;
    result[cat] = perJaar;
  }
  return result;
}
