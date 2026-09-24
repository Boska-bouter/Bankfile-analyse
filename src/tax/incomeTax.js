// Grove, indicatieve schatting van de inkomstenbelasting (box 1) over de winst uit onderneming
// — bewust vereenvoudigd: geen heffingskortingen, geen overig inkomen, geen startersaftrek.
// Bron: gepubliceerde belastingschijven, zelfstandigenaftrek en mkb-winstvrijstelling per jaar.
// Check jaarlijks op belastingdienst.nl of deze bedragen nog kloppen — ze wijzigen per jaar.
//
// v191 — 2020/2021/2022 toegevoegd: dit ontbrak, waardoor computeBelastbaarWinst (hieronder) een
// jaar vóór 2023 stilzwijgend met de 2023-cijfers doorrekende (via de clamp op
// IB_MIN_YEAR/IB_MAX_YEAR hieronder). Voor de mkb-winstvrijstelling maakte dat niet uit (ongewijzigd
// 14% van 2020 t/m 2023), maar de zelfstandigenaftrek verschilde wél fors (2020: € 7.030, 2021:
// € 6.670, 2022: € 6.310, tegenover € 5.030 in 2023) — bij een winst boven de aftrek werd de
// belastbare winst voor die jaren daardoor te hoog ingeschat, en de geschatte IB/Zvw dus ook.
// Gevonden bij het doorrekenen van een dossier met 2021/2022-jaren als regressietest. Bronnen
// (Belastingdienst-cijfers, meerdere malen kruisgecontroleerd): zelfstandigenaftrek en
// belastingschijven 2020-2022 volgens gepubliceerde overzichten; mkb-winstvrijstelling ongewijzigd
// op 14%.
export const IB_TARIEVEN_BY_YEAR = {
  2020: { brackets: [{ tot: 68508, tarief: 0.3735 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 7030, mkbPct: 14 },
  2021: { brackets: [{ tot: 68508, tarief: 0.371 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 6670, mkbPct: 14 },
  2022: { brackets: [{ tot: 69398, tarief: 0.3707 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 6310, mkbPct: 14 },
  2023: { brackets: [{ tot: 73031, tarief: 0.3693 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 5030, mkbPct: 14 },
  2024: { brackets: [{ tot: 75518, tarief: 0.3697 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 3750, mkbPct: 13.31 },
  2025: { brackets: [{ tot: 38441, tarief: 0.3582 }, { tot: 76817, tarief: 0.3748 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 2470, mkbPct: 12.7 },
  2026: { brackets: [{ tot: 38883, tarief: 0.3575 }, { tot: 78426, tarief: 0.3756 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 1200, mkbPct: 12.7 },
};
// Ondergrens/bovengrens van de hierboven daadwerkelijk ingevulde jaren — computeBelastbaarWinst,
// estimateIncomeTax en estimateZvw klemmen een jaar buiten dit bereik naar het dichtstbijzijnde
// bekende jaar (zie IB_TARIEVEN_BY_YEAR/ZVW_TARIEVEN_BY_YEAR hierboven/hieronder) en zetten dan
// `geëxtrapoleerd: true`. De heffingskortingen/arbeidskorting/KIA-tabellen verderop in dit bestand
// beginnen nog bij 2023 (voor 2020-2022 kon geen betrouwbare, onderling consistente bron voor die
// tabellen worden bevestigd) — die klemmen dus nog altijd naar 2023, ook voor 2020-2022.
export const IB_MIN_YEAR = 2020;
export const IB_MAX_YEAR = 2026;

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
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  const naZelfstandigenaftrek = zelfstandigenaftrekToegepast ? Math.max(0, winst - t.zelfstandigenaftrek) : Math.max(0, winst);
  return naZelfstandigenaftrek * (1 - t.mkbPct / 100);
}

export function estimateIncomeTax(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { belasting: 0, geëxtrapoleerd: false };
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
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
  2020: { pct: 5.45, maxBijdrageInkomen: 57232 },
  2021: { pct: 5.75, maxBijdrageInkomen: 58311 },
  2022: { pct: 5.5, maxBijdrageInkomen: 59706 },
  2023: { pct: 5.43, maxBijdrageInkomen: 66956 },
  2024: { pct: 5.32, maxBijdrageInkomen: 71624 },
  2025: { pct: 5.26, maxBijdrageInkomen: 75864 },
  2026: { pct: 4.85, maxBijdrageInkomen: 79409 },
};

export function estimateZvw(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { bijdrage: 0, geëxtrapoleerd: false, grondslag: 0, gemaximeerd: false };
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const z = ZVW_TARIEVEN_BY_YEAR[clampedYear];
  const belastbaar = computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast);
  const gemaximeerd = belastbaar > z.maxBijdrageInkomen;
  const grondslag = Math.min(belastbaar, z.maxBijdrageInkomen);
  return { bijdrage: grondslag * (z.pct / 100), geëxtrapoleerd: clampedYear !== year, grondslag, gemaximeerd };
}

// ---------------------------------------------------------------------------------------------
// Startersaftrek en verrekening niet-gerealiseerde zelfstandigenaftrek — GROVE INDICATIE.
// ---------------------------------------------------------------------------------------------
// Bron: gepubliceerde regels van de Belastingdienst over ondernemersaftrek/zelfstandigenaftrek en
// startersaftrek. Check jaarlijks op belastingdienst.nl of dit nog klopt (de startersaftrek
// verdwijnt naar verwachting per 2027).
//
// Startersaftrek: alleen voor wie zelfstandigenaftrek krijgt, in minstens 1 van de 5 voorgaande
// kalenderjaren nog geen ondernemer was, en in die 5 jaar niet vaker dan 2x eerder
// zelfstandigenaftrek toepaste (dus maximaal 3x in de eerste 5 jaar). Vast bedrag, sinds 2023
// ongewijzigd. Mét startersaftrek mag de gecombineerde ondernemersaftrek de winst wél volledig
// wegstrepen (zelfs tot een negatief bedrag); zónder startersaftrek kan zelfstandigenaftrek de
// winst nooit verder verlagen dan € 0.
export const STARTERSAFTREK_BEDRAG = 2123;

// Niet-gerealiseerde zelfstandigenaftrek: het deel van de zelfstandigenaftrek dat in een jaar niet
// kon worden benut omdat de winst te laag was. Mag tot 9 jaar later alsnog worden verrekend, in een
// jaar waarin (a) wél aan het urencriterium is voldaan (zelfstandigenaftrekStatus !== "nee") én
// (b) de winst hoger is dan de normale zelfstandigenaftrek van dat jaar (er dus "ruimte" is). Deze
// tool houdt dit zelf bij (in plaats van de aanslagbiljetten van eerdere jaren) — reken dit na als
// er al eerdere jaren buiten dit rapport vielen.
//
// jarenData: array van { year, winst, zelfstandigenaftrekStatus: "ja"|"nee"|undefined,
// startersaftrekToegepast: boolean }, in willekeurige volgorde (wordt hier chronologisch gesorteerd).
// Retourneert per jaar het werkelijk toe te passen bedrag, uitgesplitst.
export function computeOndernemersaftrekMetReserve(jarenData) {
  const resultaat = {};
  let reserves = []; // [{ jaar, bedrag }], oudste eerst
  const sorted = [...jarenData].sort((a, b) => a.year - b.year);
  for (const { year, winst, zelfstandigenaftrekStatus, startersaftrekToegepast } of sorted) {
    // Reserves ouder dan 9 jaar zijn vervallen — verwijderen vóórdat dit jaar er weer uit put.
    reserves = reserves.filter((r) => year - r.jaar <= 9);

    if (zelfstandigenaftrekStatus === "nee") {
      resultaat[year] = {
        zelfstandigenaftrekBedrag: 0,
        startersaftrekBedrag: 0,
        verrekendUitReserve: 0,
        nietGerealiseerdNieuw: 0,
        reserveresterend: reserves.reduce((a, r) => a + r.bedrag, 0),
      };
      continue;
    }

    const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
    const basisBedrag = IB_TARIEVEN_BY_YEAR[clampedYear].zelfstandigenaftrek;
    const winstPositief = Math.max(0, winst || 0);

    // Winstbeperking op de zelfstandigenaftrek ("niet-gerealiseerd, reserveren voor later") geldt
    // alleen wanneer er GEEN startersaftrek wordt toegepast. Mét startersaftrek mag de gecombineerde
    // ondernemersaftrek de winst immers al volledig (tot onder € 0) wegstrepen (zie toelichting
    // hierboven) — dan is er dus niets "niet-gerealiseerd": de volledige zelfstandigenaftrek is dit
    // jaar zelf al verwerkt, en hoeft niet als reserve voor een later jaar bewaard te worden.
    const gerealiseerdBasis = startersaftrekToegepast ? basisBedrag : Math.min(winstPositief, basisBedrag);
    const nietGerealiseerdNieuw = startersaftrekToegepast ? 0 : Math.max(0, basisBedrag - gerealiseerdBasis);
    const extraRuimte = Math.max(0, winstPositief - basisBedrag);

    let verrekendUitReserve = 0;
    let resterendeRuimte = extraRuimte;
    const nieuweReserves = [];
    for (const r of reserves) {
      if (resterendeRuimte <= 0) { nieuweReserves.push(r); continue; }
      const gebruik = Math.min(r.bedrag, resterendeRuimte);
      verrekendUitReserve += gebruik;
      resterendeRuimte -= gebruik;
      if (r.bedrag - gebruik > 0) nieuweReserves.push({ jaar: r.jaar, bedrag: r.bedrag - gebruik });
    }
    reserves = nieuweReserves;
    if (nietGerealiseerdNieuw > 0) reserves.push({ jaar: year, bedrag: nietGerealiseerdNieuw });

    resultaat[year] = {
      zelfstandigenaftrekBedrag: gerealiseerdBasis + verrekendUitReserve,
      startersaftrekBedrag: startersaftrekToegepast ? STARTERSAFTREK_BEDRAG : 0,
      verrekendUitReserve,
      nietGerealiseerdNieuw,
      reserveresterend: reserves.reduce((a, r) => a + r.bedrag, 0),
    };
  }
  return resultaat;
}

// Gedeelde grondslagberekening voor de "...MetOndernemersaftrek"-varianten hieronder: winst minus
// een expliciet meegegeven ondernemersaftrek-bedrag (zelfstandigenaftrek + eventuele reserve +
// eventuele startersaftrek), met de MKB-winstvrijstelling erover. staatNegatiefToe: alleen waar
// (bij toepassing van startersaftrek) mag dit tot onder € 0 komen.
function computeBelastbaarInkomenGeneriek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe) {
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  let naAftrek = (winst || 0) - (ondernemersaftrekBedrag || 0);
  if (!staatNegatiefToe) naAftrek = Math.max(0, naAftrek);
  return naAftrek * (1 - t.mkbPct / 100);
}

function berekenBelastingOverSchijven(belastbaar, year) {
  if (!(belastbaar > 0)) return 0;
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  let belasting = 0;
  let vorige = 0;
  for (const schijf of t.brackets) {
    const inDezeSchijf = Math.min(belastbaar, schijf.tot) - vorige;
    if (inDezeSchijf > 0) belasting += inDezeSchijf * schijf.tarief;
    vorige = schijf.tot;
    if (belastbaar <= schijf.tot) break;
  }
  return belasting;
}

// IB-schatting met een expliciet ondernemersaftrek-bedrag (voor gebruik samen met
// computeOndernemersaftrekMetReserve, dat rekening houdt met verrekening van niet-gerealiseerde
// zelfstandigenaftrek en met startersaftrek).
export function estimateIncomeTaxMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const belastbaar = computeBelastbaarInkomenGeneriek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe);
  return { belasting: berekenBelastingOverSchijven(belastbaar, year), geëxtrapoleerd: clampedYear !== year, belastbaar };
}

export function estimateZvwMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  const clampedYear = Math.max(IB_MIN_YEAR, Math.min(IB_MAX_YEAR, year));
  const z = ZVW_TARIEVEN_BY_YEAR[clampedYear];
  const belastbaar = Math.max(0, computeBelastbaarInkomenGeneriek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe));
  const gemaximeerd = belastbaar > z.maxBijdrageInkomen;
  const grondslag = Math.min(belastbaar, z.maxBijdrageInkomen);
  return { bijdrage: grondslag * (z.pct / 100), geëxtrapoleerd: clampedYear !== year, grondslag, gemaximeerd };
}

export function estimateHeffingskortingenMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  if (!winst || winst <= 0) return { algemeneHeffingskorting: 0, arbeidskorting: 0, totaal: 0 };
  const belastbaarInkomen = Math.max(0, computeBelastbaarInkomenGeneriek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe));
  const algemeneHeffingskorting = computeAlgemeneHeffingskorting(belastbaarInkomen, year);
  const arbeidskorting = computeArbeidskorting(winst, year);
  return { algemeneHeffingskorting, arbeidskorting, totaal: algemeneHeffingskorting + arbeidskorting };
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
