// release20V3 — soort ruimte waarvoor huur/energie/gemeentelijke lasten (vaak vanaf de privérekening) worden betaald.
// Fiscaal verschil (indicatief, controleer zelf):
//  - bedrijfsruimte: een zakelijk gehuurd pand/schuur → gewone zakelijke huisvestingskosten, voor het zakelijke deel.
//  - zelfstandig:    zelfstandige werkruimte in de eigen woning → kosten naar rato aftrekbaar als bedrijfskosten.
//  - niet_zelfstandig: thuiskantoor/kamer/hoek in de eigen woning → huur, energie en gemeentelijke lasten NIET aftrekbaar.
// Niet aangegeven = ongewijzigd gedrag (zoals voor deze release): de ingestelde percentages gelden.
export const WERKRUIMTE_CATEGORIEEN = ["Huur", "Energie-water", "Gemeentelijke kosten", "Privé - huur", "Privé - energie-water", "Privé - gemeentelijke kosten"];

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

// release20V4 — wat is er per categorie betaald vanaf de zakelijke en vanaf de privérekening? (netto betaald = som van de
// bedragen, spiegelboekingen tellen niet mee). Zo is zichtbaar of het van één rekening komt of van beide, en of die bedragen gelijk zijn.
export function betaaldPerRekening(classified, year) {
  const uit = {};
  for (const c of WERKRUIMTE_CATEGORIEEN) uit[c] = { zakelijk: 0, prive: 0, aantalZakelijk: 0, aantalPrive: 0 };
  for (const tx of classified || []) {
    if (tx.isMirror || tx.year !== year || !uit[tx.category]) continue;
    const r = uit[tx.category];
    if (tx.type === "Zakelijk") { r.zakelijk += -tx.amount; r.aantalZakelijk++; } else { r.prive += -tx.amount; r.aantalPrive++; }
  }
  for (const c of WERKRUIMTE_CATEGORIEEN) {
    const r = uit[c];
    r.zakelijk = Math.round(r.zakelijk * 100) / 100; r.prive = Math.round(r.prive * 100) / 100;
    r.beide = r.aantalZakelijk > 0 && r.aantalPrive > 0;
    r.gelijk = r.beide && Math.abs(r.zakelijk - r.prive) < 0.005;
  }
  return Object.fromEntries(Object.entries(uit).filter(([, r]) => r.aantalZakelijk + r.aantalPrive > 0));
}
