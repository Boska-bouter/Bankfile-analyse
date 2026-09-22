// Grove, indicatieve schatting van de inkomstenbelasting (box 1) over de winst uit onderneming
// — bewust vereenvoudigd: geen heffingskortingen, geen overig inkomen, geen startersaftrek.
// Bron: gepubliceerde belastingschijven, zelfstandigenaftrek en mkb-winstvrijstelling per jaar.
// Check jaarlijks op belastingdienst.nl of deze bedragen nog kloppen — ze wijzigen per jaar.
export const IB_TARIEVEN_BY_YEAR = {
  2023: { brackets: [{ tot: 73031, tarief: 0.3693 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 5030, mkbPct: 14 },
  2024: { brackets: [{ tot: 75518, tarief: 0.3697 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 3750, mkbPct: 13.31 },
  2025: { brackets: [{ tot: 38441, tarief: 0.3582 }, { tot: 76817, tarief: 0.3748 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 2470, mkbPct: 12.7 },
  2026: { brackets: [{ tot: 38883, tarief: 0.3575 }, { tot: 78426, tarief: 0.3756 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 1200, mkbPct: 12.7 },
};

// Winst na zelfstandigenaftrek en mkb-winstvrijstelling — dit is tegelijk de belastbare winst
// voor box 1 (IB) én de grondslag ("bijdrage-inkomen") voor de inkomensafhankelijke bijdrage
// Zvw. Eén plek voor deze tussenstap, zodat beide schattingen altijd van hetzelfde bedrag uitgaan.
//
// zelfstandigenaftrekToegepast: standaard true (bestaand gedrag, ongewijzigd voor oude projecten).
// Zelfstandigenaftrek is een persoonlijke aftrek die alleen mag worden toegepast als aan het
// urencriterium (doorgaans: minimaal 1225 uur per jaar aan de onderneming besteed) is voldaan —
// dat weet deze tool niet uit bankgegevens. Zet dit expliciet op false om het scenario "geen
// zelfstandigenaftrek" te berekenen (bijv. omdat niet aan het urencriterium is voldaan).
function computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast = true) {
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  const naZelfstandigenaftrek = zelfstandigenaftrekToegepast ? Math.max(0, winst - t.zelfstandigenaftrek) : Math.max(0, winst);
  return naZelfstandigenaftrek * (1 - t.mkbPct / 100);
}

export function estimateIncomeTax(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { belasting: 0, geëxtrapoleerd: false };
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  const belastbaar = computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast);
  let belasting = 0;
  let vorige = 0;
  for (const schijf of t.brackets) {
    const inDezeSchijf = Math.min(belastbaar, schijf.tot) - vorige;
    if (inDezeSchijf > 0) belasting += inDezeSchijf * schijf.tarief;
    vorige = schijf.tot;
    if (belastbaar <= schijf.tot) break;
  }
  return { belasting, geëxtrapoleerd: clampedYear !== year };
}

// Berekent zowel het scenario mét als zónder zelfstandigenaftrek — voor gebruik wanneer niet
// bekend is of aan het urencriterium is voldaan ("Onbekend"), zodat de tool geen schijnzekerheid
// geeft door zomaar één van de twee te kiezen.
export function estimateIncomeTaxScenarios(winst, year) {
  return {
    metZelfstandigenaftrek: estimateIncomeTax(winst, year, true),
    zonderZelfstandigenaftrek: estimateIncomeTax(winst, year, false),
  };
}

// Grove, indicatieve schatting van de inkomensafhankelijke bijdrage Zorgverzekeringswet (Zvw) die
// een zelfstandige (eenmanszaak/zzp) via de eigen aanslag IB betaalt — dit is het "lage" tarief
// (zelfstandigen dragen zelf de volledige bijdrage af, in tegenstelling tot werknemers waarbij de
// werkgever een deel vergoedt). Grondslag is dezelfde belastbare winst als bij de IB-schatting
// hierboven, met een wettelijk maximum bijdrage-inkomen per jaar. Bron: gepubliceerde Zvw-
// percentages en -maxima van de Belastingdienst. Check jaarlijks of deze bedragen nog kloppen.
export const ZVW_TARIEVEN_BY_YEAR = {
  2023: { pct: 5.43, maxBijdrageInkomen: 66956 },
  2024: { pct: 5.32, maxBijdrageInkomen: 71624 },
  2025: { pct: 5.26, maxBijdrageInkomen: 75864 },
  2026: { pct: 4.85, maxBijdrageInkomen: 79409 },
};

export function estimateZvw(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { bijdrage: 0, geëxtrapoleerd: false, grondslag: 0, gemaximeerd: false };
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const z = ZVW_TARIEVEN_BY_YEAR[clampedYear];
  const belastbaar = computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast);
  const gemaximeerd = belastbaar > z.maxBijdrageInkomen;
  const grondslag = Math.min(belastbaar, z.maxBijdrageInkomen);
  return { bijdrage: grondslag * (z.pct / 100), geëxtrapoleerd: clampedYear !== year, grondslag, gemaximeerd };
}

// ---------------------------------------------------------------------------------------------
// Heffingskortingen (algemene heffingskorting + arbeidskorting) — GROVE INDICATIE.
// ---------------------------------------------------------------------------------------------
// Beide kortingen zijn wettelijk afhankelijk van meer dan alleen de winst uit onderneming: de
// algemene heffingskorting van het volledige verzamelinkomen (box 1+2+3) en eventueel een fiscale
// partner, de arbeidskorting alleen van het (positieve) arbeidsinkomen. Deze tool kent alleen de
// winst uit onderneming uit de bankgegevens — geen overig inkomen, geen box 2/3, geen partner, en
// gaat er daarom bewust van uit dat:
// - de winst uit onderneming het enige inkomen is (geen loon, uitkering, of ander box 1/2/3-inkomen),
// - de AOW-leeftijd nog niet is bereikt (jongere tarieven/percentages),
// - er geen fiscale partner is om mee te verrekenen.
// Klopt een van deze aannames niet, dan is de uitkomst hieronder minder betrouwbaar. Bronnen:
// gepubliceerde tabellen algemene heffingskorting/arbeidskorting van de Belastingdienst. Check
// jaarlijks op belastingdienst.nl of deze bedragen nog kloppen.
export const ALGEMENE_HEFFINGSKORTING_BY_YEAR = {
  2023: { max: 3070, afbouwGrens: 22660, afbouwPct: 6.095 },
  2024: { max: 3362, afbouwGrens: 24812, afbouwPct: 6.63 },
  2025: { max: 3068, afbouwGrens: 28406, afbouwPct: 6.337 },
  2026: { max: 3115, afbouwGrens: 29736, afbouwPct: 6.398 },
};

// Grondslag: belastbaar inkomen uit werk en woning (= dezelfde belastbare winst als bij de
// IB-schatting hierboven, ervan uitgaande dat dit het enige inkomen is).
export function computeAlgemeneHeffingskorting(belastbaarInkomen, year) {
  if (!belastbaarInkomen || belastbaarInkomen <= 0) return 0;
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const a = ALGEMENE_HEFFINGSKORTING_BY_YEAR[clampedYear];
  if (belastbaarInkomen <= a.afbouwGrens) return a.max;
  return Math.max(0, a.max - (belastbaarInkomen - a.afbouwGrens) * (a.afbouwPct / 100));
}

// Opbouw- en afbouwtraject per jaar, voor personen onder de AOW-leeftijd. Elke opbouwstap heeft
// een bovengrens ("tot"), en — behalve de eerste stap — een startpunt ("van") en basisbedrag
// ("basis") waar vanaf verder wordt opgebouwd; de laatste stap se "tot" is tegelijk het punt
// waarop de afbouw begint (waar het maximum "max" wordt bereikt).
export const ARBEIDSKORTING_BY_YEAR = {
  2023: {
    opbouw: [
      { tot: 10740, pct: 8.231 },
      { tot: 23201, van: 10740, basis: 884, pct: 29.861 },
      { tot: 37691, van: 23201, basis: 4605, pct: 3.085 },
    ],
    max: 5052,
    afbouwVanaf: 37691,
    afbouwPct: 6.51,
  },
  2024: {
    opbouw: [
      { tot: 11490, pct: 8.425 },
      { tot: 24820, van: 11490, basis: 968, pct: 31.433 },
      { tot: 39957, van: 24820, basis: 5158, pct: 2.471 },
    ],
    max: 5532,
    afbouwVanaf: 39957,
    afbouwPct: 6.51,
  },
  2025: {
    opbouw: [
      { tot: 12169, pct: 8.053 },
      { tot: 26288, van: 12169, basis: 980, pct: 30.03 },
      { tot: 43071, van: 26288, basis: 5220, pct: 2.258 },
    ],
    max: 5599,
    afbouwVanaf: 43071,
    afbouwPct: 6.51,
  },
  2026: {
    opbouw: [
      { tot: 11965, pct: 8.324 },
      { tot: 25845, van: 11965, basis: 996, pct: 31.009 },
      { tot: 45592, van: 25845, basis: 5300, pct: 1.95 },
    ],
    max: 5685,
    afbouwVanaf: 45592,
    afbouwPct: 6.51,
  },
};

// Grondslag: arbeidsinkomen — voor een zzp'er/eenmanszaak is dit de winst uit onderneming vóór
// zelfstandigenaftrek en mkb-winstvrijstelling (dus de ruwe "winst" zoals de tool die al elders
// gebruikt), niet de belastbare winst ná die aftrekken.
export function computeArbeidskorting(arbeidsinkomen, year) {
  if (!arbeidsinkomen || arbeidsinkomen <= 0) return 0;
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const a = ARBEIDSKORTING_BY_YEAR[clampedYear];
  if (arbeidsinkomen >= a.afbouwVanaf) {
    return Math.max(0, a.max - (arbeidsinkomen - a.afbouwVanaf) * (a.afbouwPct / 100));
  }
  for (const stap of a.opbouw) {
    if (arbeidsinkomen <= stap.tot) {
      return stap.van != null ? stap.basis + (arbeidsinkomen - stap.van) * (stap.pct / 100) : arbeidsinkomen * (stap.pct / 100);
    }
  }
  return a.max;
}

// Combineert beide kortingen tot één indicatief totaal, gebruik makend van dezelfde
// zelfstandigenaftrek-aanname als de IB-schatting (zodat "IB ná heffingskortingen" en de
// onderliggende belastbare winst altijd bij elkaar aansluiten).
export function estimateHeffingskortingen(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { algemeneHeffingskorting: 0, arbeidskorting: 0, totaal: 0 };
  const belastbaarInkomen = computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast);
  const algemeneHeffingskorting = computeAlgemeneHeffingskorting(belastbaarInkomen, year);
  const arbeidskorting = computeArbeidskorting(winst, year);
  return { algemeneHeffingskorting, arbeidskorting, totaal: algemeneHeffingskorting + arbeidskorting };
}

// IB-schatting ná algemene heffingskorting + arbeidskorting — de kortingen kunnen de te betalen
// IB nooit negatief maken (dat zou een teruggave via een ándere weg zijn, niet iets wat deze
// grove schatting claimt te kunnen berekenen).
export function estimateIncomeTaxNaHeffingskortingen(winst, year, zelfstandigenaftrekToegepast = true) {
  const voor = estimateIncomeTax(winst, year, zelfstandigenaftrekToegepast);
  const kortingen = estimateHeffingskortingen(winst, year, zelfstandigenaftrekToegepast);
  return {
    ...voor,
    ...kortingen,
    belastingVoorKortingen: voor.belasting,
    belastingNaKortingen: Math.max(0, voor.belasting - kortingen.totaal),
  };
}

// ---------------------------------------------------------------------------------------------
// Kleinschaligheidsinvesteringsaftrek (KIA) — GROVE INDICATIE.
// ---------------------------------------------------------------------------------------------
// Niet elke aanschaf van een bedrijfsmiddel telt mee (bijv. personenauto's, grond en woningen zijn
// doorgaans uitgesloten, en elk bedrijfsmiddel moet minimaal ca. €450 kosten) — deze tool kent dat
// onderscheid niet uit bankgegevens, dus dit is uitdrukkelijk een "mogelijke KIA", geen definitieve
// aftrek. Bron: gepubliceerde KIA-tabel van de Belastingdienst. Check jaarlijks op belastingdienst.nl
// of deze bedragen nog kloppen.
export const KIA_STAFFEL_BY_YEAR = {
  2023: { drempel: 2600, vast1Tot: 63716, pct1: 28, vastBedrag: 17841, vastTot: 117841, afbouwPct: 7.56, nul: 353973 },
  2024: { drempel: 2800, vast1Tot: 69765, pct1: 28, vastBedrag: 19535, vastTot: 129194, afbouwPct: 7.56, nul: 387580 },
  2025: { drempel: 2900, vast1Tot: 70602, pct1: 28, vastBedrag: 19769, vastTot: 130744, afbouwPct: 7.56, nul: 392230 },
  2026: { drempel: 2900, vast1Tot: 71683, pct1: 28, vastBedrag: 20072, vastTot: 132746, afbouwPct: 7.56, nul: 398236 },
};
// Behouden voor bestaande imports elders in de tool.
export const KIA_MIN_TOTAAL = 2901;
export const KIA_MAX_TOTAAL = 398236;

export function computeMogelijkeKia(totaalInvestering, year) {
  if (!totaalInvestering || totaalInvestering <= 0) return 0;
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const s = KIA_STAFFEL_BY_YEAR[clampedYear];
  if (totaalInvestering <= s.drempel) return 0;
  if (totaalInvestering <= s.vast1Tot) return totaalInvestering * (s.pct1 / 100);
  if (totaalInvestering <= s.vastTot) return s.vastBedrag;
  if (totaalInvestering <= s.nul) return Math.max(0, s.vastBedrag - (totaalInvestering - s.vastTot) * (s.afbouwPct / 100));
  return 0;
}
