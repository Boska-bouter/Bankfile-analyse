// release20V3 — soort ruimte waarvoor huur/energie/gemeentelijke lasten (vaak vanaf de privérekening) worden betaald.
// Fiscaal verschil (indicatief, controleer zelf):
//  - bedrijfsruimte: een zakelijk gehuurd pand/schuur → gewone zakelijke huisvestingskosten, voor het zakelijke deel.
//  - zelfstandig:    zelfstandige werkruimte in de eigen woning → kosten naar rato aftrekbaar als bedrijfskosten.
//  - niet_zelfstandig: thuiskantoor/kamer/hoek in de eigen woning → huur, energie en gemeentelijke lasten NIET aftrekbaar.
// Niet aangegeven = ongewijzigd gedrag (zoals voor deze release): de ingestelde percentages gelden.
export const WERKRUIMTE_CATEGORIEEN = ["Huur", "Energie-water", "Gemeentelijke kosten", "Privé - huur", "Privé - energie-water", "Privé - gemeentelijke kosten"];

export const WERKRUIMTE_LABELS = {
  bedrijfsruimte: "Zakelijk gehuurd pand/bedrijfsruimte",
  zelfstandig: "Zelfstandige werkruimte in de eigen woning",
  niet_zelfstandig: "Kamer/hoek in de eigen woning (niet zelfstandig)",
  prive: "Privé (geen zakelijk gebruik)",
};

export const WERKRUIMTE_KORT = {
  bedrijfsruimte: "zakelijk gehuurde bedrijfsruimte",
  zelfstandig: "zelfstandige werkruimte in de eigen woning",
  niet_zelfstandig: "niet-zelfstandige werkruimte in de eigen woning",
  prive: "privé",
};

// Soorten die niet aftrekbaar zijn: het percentage staat dan vast op 0%.
export const WERKRUIMTE_NIET_AFTREKBAAR = ["niet_zelfstandig", "prive"];

// De keuze staat per jaar en per rekening: { jaar: { zakelijk: soort, prive: soort } }. Een oudere keuze als losse tekst
// ({ jaar: soort }) gold voor beide rekeningen.
// release33V4 — standaard uit de wizard, voor jaren zonder eigen keuze (ook jaren die later bijkomen).
export const WERKRUIMTE_STANDAARD = "_standaard";
export function werkruimteUitWizard({ pand, woning }) {
  if (pand) return { zakelijk: "bedrijfsruimte", prive: woning === "zelfstandig" || woning === "niet_zelfstandig" ? woning : "bedrijfsruimte" };
  if (woning === "zelfstandig" || woning === "niet_zelfstandig") return { zakelijk: woning, prive: woning };
  return { zakelijk: "prive", prive: "prive" };
}
// Vult de jaren zonder keuze met de standaard. Een jaar met alleen { gevraagd: true } (oude wizard: twee keer "Nee")
// telt als zonder keuze; staat er nog geen standaard, dan is dat antwoord privé/privé. Geeft hetzelfde object terug
// als er niets verandert.
export function vulWerkruimteJaren(status, jaren) {
  let std = status?.[WERKRUIMTE_STANDAARD];
  const leegJaar = (v) => !v || (typeof v === "object" && v.gevraagd && !v.zakelijk && !v.prive);
  const heeftGevraagd = Object.entries(status || {}).some(([k, v]) => k !== WERKRUIMTE_STANDAARD && v && typeof v === "object" && v.gevraagd && !v.zakelijk && !v.prive);
  if (!std && heeftGevraagd) std = { zakelijk: "prive", prive: "prive" };
  if (!std) return status;
  let next = status;
  const zet = (k, v) => { if (next === status) next = { ...status }; next[k] = v; };
  if (!status[WERKRUIMTE_STANDAARD]) zet(WERKRUIMTE_STANDAARD, std);
  for (const y of new Set([...(jaren || []).map(String), ...Object.keys(status || {}).filter((k) => k !== WERKRUIMTE_STANDAARD)])) {
    if (leegJaar(status[y])) zet(y, { ...std });
  }
  return next;
}

export function werkruimteSoorten(werkruimteStatus, year) {
  const v = werkruimteStatus?.[year];
  if (!v) return { zakelijk: null, prive: null };
  if (typeof v === "string") return { zakelijk: v, prive: v };
  return { zakelijk: v.zakelijk || null, prive: v.prive || null };
}

// Maakt van de ingestelde percentages de "effectieve": voor een rekening met een niet-aftrekbare soort tellen huur, energie-water en
// gemeentelijke kosten (ook de privé-varianten) voor 0% mee. De ingevulde percentages zelf blijven in het dossier staan.
// beide-V8R4 — `dossierJaren`: jaren met boekingen. Een jaar zonder antwoord op de werkruimtevraag (en zonder standaard) telt
// voorzichtig: huur, energie-water en gemeentelijke kosten voor 0%, tenzij er voor die categorie en dat jaar zelf een percentage
// is ingevuld. De vraag blijft open staan (openBasisvragen). Voorheen telden ze dan volledig als kosten (wens Boska 27-10,
// vergelijking Eenvoudig ↔ Uitgebreid: ± € 6.000 te veel kosten in een dossier zonder antwoord).
export function percentagesMetWerkruimte(categoryZakelijkPercentage, werkruimteStatus, dossierJaren = []) {
  const jaren = Object.keys(werkruimteStatus || {}).filter((k) => k !== WERKRUIMTE_STANDAARD);
  const std = werkruimteStatus?.[WERKRUIMTE_STANDAARD];
  const onbeantwoord = std ? [] : (dossierJaren || []).map(String).filter((y) => !jaren.includes(y) || (() => { const s = werkruimteSoorten(werkruimteStatus, y); return !s.zakelijk && !s.prive; })());
  if (jaren.length === 0 && onbeantwoord.length === 0) return categoryZakelijkPercentage;
  const result = { ...(categoryZakelijkPercentage || {}) };
  for (const y of onbeantwoord) {
    for (const cat of ["Huur", "Energie-water", "Gemeentelijke kosten"]) {
      const eigen = result[cat] || {};
      if (eigen[y] != null || eigen[`${y}:zakelijk`] != null || eigen[`${y}:prive`] != null) continue;
      result[cat] = { ...eigen, [y]: 0 };
    }
  }
  for (const y of jaren) {
    const soorten = werkruimteSoorten(werkruimteStatus, y);
    for (const rek of ["zakelijk", "prive"]) {
      // beide-V10R3 — zelfstandige werkruimte zonder ingevuld percentage: woonlasten tellen voor 0% (niet 100%) tot er
      // een deel van de woning is opgegeven (vergelijking Eenvoudig ↔ Uitgebreid R. Meijer 28-10: anders ± € 15.000 te veel kosten).
      if (soorten[rek] === "zelfstandig") {
        for (const cat of WERKRUIMTE_CATEGORIEEN) {
          const eigen = result[cat] || {};
          if (eigen[y] == null && eigen[`${y}:${rek}`] == null) result[cat] = { ...eigen, [`${y}:${rek}`]: 0 };
        }
        continue;
      }
      if (!WERKRUIMTE_NIET_AFTREKBAAR.includes(soorten[rek])) continue;
      for (const cat of WERKRUIMTE_CATEGORIEEN) {
        result[cat] = { ...(result[cat] || {}), [`${y}:${rek}`]: 0 };
      }
    }
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
