// Grove, indicatieve schatting van de inkomstenbelasting (box 1) over de winst uit onderneming
// — bewust vereenvoudigd: geen heffingskortingen, geen overig inkomen, geen startersaftrek.
// Bron: gepubliceerde belastingschijven, zelfstandigenaftrek en mkb-winstvrijstelling per jaar.
// Check jaarlijks op belastingdienst.nl of deze bedragen nog kloppen — ze wijzigen per jaar.
//
// 2020/2021/2022 zijn nodig zodat computeBelastbaarWinst (hieronder) een jaar vóór 2023 niet
// stilzwijgend met de 2023-cijfers doorrekent (via de clamp op IB_MIN_YEAR/IB_MAX_YEAR hieronder).
// De zelfstandigenaftrek verschilt fors per jaar (2020: € 7.030, 2021: € 6.670, 2022: € 6.310,
// tegenover € 5.030 in 2023) — bij een winst boven de aftrek zou de belastbare winst voor die jaren
// anders te hoog worden ingeschat, en de geschatte IB/Zvw dus ook. De mkb-winstvrijstelling is
// ongewijzigd 14% van 2020 t/m 2023. Bronnen (Belastingdienst-cijfers, meerdere malen
// kruisgecontroleerd): zelfstandigenaftrek en belastingschijven 2020-2022 volgens gepubliceerde
// overzichten.
export const IB_TARIEVEN_BY_YEAR = {
  2020: { brackets: [{ tot: 68508, tarief: 0.3735 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 7030, mkbPct: 14, aftrekBeperkingPct: 46 },
  2021: { brackets: [{ tot: 68508, tarief: 0.371 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 6670, mkbPct: 14, aftrekBeperkingPct: 43 },
  2022: { brackets: [{ tot: 69398, tarief: 0.3707 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 6310, mkbPct: 14, aftrekBeperkingPct: 40 },
  2023: { brackets: [{ tot: 73031, tarief: 0.3693 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 5030, mkbPct: 14, aftrekBeperkingPct: 36.93 },
  2024: { brackets: [{ tot: 75518, tarief: 0.3697 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 3750, mkbPct: 13.31, aftrekBeperkingPct: 36.97 },
  2025: { brackets: [{ tot: 38441, tarief: 0.3582 }, { tot: 76817, tarief: 0.3748 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 2470, mkbPct: 12.7, aftrekBeperkingPct: 37.48 },
  2026: { brackets: [{ tot: 38883, tarief: 0.3575 }, { tot: 78426, tarief: 0.3756 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 1200, mkbPct: 12.7, aftrekBeperkingPct: 37.56 },
  // beide-V6R6 — 2027 voorlopig (Belastingplan 2027, Prinsjesdag 2026; nog niet door het parlement).
  2027: { brackets: [{ tot: 39247, tarief: 0.3623 }, { tot: 78426, tarief: 0.3816 }, { tot: Infinity, tarief: 0.495 }], zelfstandigenaftrek: 900, mkbPct: 12.7, aftrekBeperkingPct: 38.16 },
};
// beide-V6R6 — jaren waarvan de tarieven wel zijn ingevuld, maar nog voorlopig zijn (wetsvoorstel,
// kan nog wijzigen). Status "voorlopig" in plaats van "standaard"; na vaststelling uit deze lijst halen.
export const VOORLOPIGE_JAREN = new Set([2027]);
// Eén status voor een lijst statussen: aangepast > benadering > voorlopig > standaard.
export function combineerTariefStatus(statussen) {
  for (const s of ["aangepast", "benadering", "voorlopig"]) if (statussen.includes(s)) return s;
  return "standaard";
}
// Ondergrens/bovengrens van de hierboven daadwerkelijk ingevulde jaren — computeBelastbaarWinst,
// estimateIncomeTax en estimateZvw klemmen een jaar buiten dit bereik naar het dichtstbijzijnde
// bekende jaar (zie IB_TARIEVEN_BY_YEAR/ZVW_TARIEVEN_BY_YEAR hierboven/hieronder) en zetten dan
// `geëxtrapoleerd: true`. De heffingskortingen/arbeidskorting/KIA-tabellen verderop in dit bestand
// beginnen nog bij 2023 (voor 2020-2022 kon geen betrouwbare, onderling consistente bron voor die
// tabellen worden bevestigd) — die klemmen dus nog altijd naar 2023, ook voor 2020-2022.

// ---------------------------------------------------------------------------------------------
// Parameters per jaar: standaardtabellen (hierboven/hieronder) + eigen overschrijvingen.
// ---------------------------------------------------------------------------------------------
// Een jaar zonder eigen tabel (bijv. een jaar ná het laatst ingevulde jaar) gebruikt tijdelijk de
// waarden van het dichtstbijzijnde eerdere jaar en krijgt status "benadering". Een door de gebruiker
// ingevulde groep (dossier-instelling `tariefOverrides`, per jaar en per groep: ib/zvw/ahk/ak/kia)
// wint altijd en krijgt status "aangepast". Het register wordt door App.jsx bij elke render gezet
// (registerTariefInstellingen), zodat alle berekeningen hieronder zonder extra argumenten werken.
let _overrides = {};
let _overigInkomen = {};
export function registerTariefInstellingen({ overrides, overigInkomen } = {}) {
  _overrides = overrides && typeof overrides === "object" ? overrides : {};
  _overigInkomen = overigInkomen && typeof overigInkomen === "object" ? overigInkomen : {};
}
export function getOverigInkomenBox1(year) {
  const v = Number(_overigInkomen?.[year]);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
const TARIEF_GROEPEN = () => ({
  ib: IB_TARIEVEN_BY_YEAR, zvw: ZVW_TARIEVEN_BY_YEAR, ahk: ALGEMENE_HEFFINGSKORTING_BY_YEAR,
  ak: ARBEIDSKORTING_BY_YEAR, kia: KIA_STAFFEL_BY_YEAR,
});
export function standaardJaarVoor(groep, year) {
  const tabel = TARIEF_GROEPEN()[groep];
  const jaren = Object.keys(tabel).map(Number).sort((a, b) => a - b);
  if (tabel[year]) return year;
  const lager = jaren.filter((j) => j < year);
  return lager.length ? lager[lager.length - 1] : jaren[0];
}
// → { waarde, status: "standaard" | "voorlopig" | "benadering" | "aangepast", bronJaar }
export function resolveTariefGroep(groep, year) {
  const eigen = _overrides?.[year]?.[groep];
  const bronJaar = standaardJaarVoor(groep, year);
  const basis = TARIEF_GROEPEN()[groep][bronJaar];
  if (eigen && typeof eigen === "object") {
    const waarde = { ...basis, ...eigen };
    // JSON kent geen Infinity: de bovenste schijf wordt opgeslagen als tot: null.
    if (Array.isArray(waarde.brackets)) waarde.brackets = waarde.brackets.map((b) => ({ ...b, tot: b.tot == null || !Number.isFinite(Number(b.tot)) ? Infinity : Number(b.tot) }));
    return { waarde, status: "aangepast", bronJaar };
  }
  return { waarde: basis, status: bronJaar !== year ? "benadering" : VOORLOPIGE_JAREN.has(year) ? "voorlopig" : "standaard", bronJaar };
}
// beide-V1R9 — eigen waarden voor andere tabellen (privé: tax/prive/tarieven.js), in hetzelfde dossierveld.
export const tariefOverride = (year, groep) => { const e = _overrides?.[year]?.[groep]; return e && typeof e === "object" ? e : null; };
export function getIbParams(year) { return resolveTariefGroep("ib", year).waarde; }
export function tariefStatusVoorJaar(year) {
  const groepen = ["ib", "zvw", "ahk", "ak", "kia"];
  const per = Object.fromEntries(groepen.map((g) => [g, resolveTariefGroep(g, year)]));
  const statussen = groepen.map((g) => per[g].status);
  return { status: combineerTariefStatus(statussen), per };
}

export const IB_MIN_YEAR = 2020;
export const IB_MAX_YEAR = 2027;

// Winst na zelfstandigenaftrek en mkb-winstvrijstelling — dit is tegelijk de belastbare winst
// voor box 1 (IB) én de grondslag ("bijdrage-inkomen") voor de inkomensafhankelijke bijdrage
// Zvw. Eén plek voor deze tussenstap, zodat beide schattingen altijd van hetzelfde bedrag uitgaan.
//
// zelfstandigenaftrekToegepast: standaard true (bestaand gedrag, ongewijzigd voor oude projecten).
// Zelfstandigenaftrek is een persoonlijke aftrek die alleen mag worden toegepast als aan het
// urencriterium (doorgaans: minimaal 1225 uur per jaar aan de onderneming besteed) is voldaan —
// dat weet deze app niet uit bankgegevens. Zet dit expliciet op false om het scenario "geen
// zelfstandigenaftrek" te berekenen (bijv. omdat niet aan het urencriterium is voldaan).
function computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast = true) {
  return computeBelastbareWinstUitsplitsing(winst, year, zelfstandigenaftrekToegepast ? Math.min(Math.max(0, winst || 0), getIbParams(year).zelfstandigenaftrek) : 0, false).belastbaar;
}

function belastingOverSchijvenVoor(bedrag, t) {
  if (!(bedrag > 0)) return 0;
  let belasting = 0;
  let vorige = 0;
  for (const schijf of t.brackets) {
    const inDezeSchijf = Math.min(bedrag, schijf.tot) - vorige;
    if (inDezeSchijf > 0) belasting += inDezeSchijf * schijf.tarief;
    vorige = schijf.tot;
    if (bedrag <= schijf.tot) break;
  }
  return belasting;
}

// IB over de belastbare winst, rekening houdend met (a) overig inkomen box 1 uit de wizard — de IB
// over de winst is dan het verschil tussen de belasting over winst + overig inkomen en over het
// overige inkomen alleen — en (b) de beperking van het belastingvoordeel van aftrekposten bij hoog
// inkomen: het deel van de aftrekposten (zelfstandigenaftrek, startersaftrek, mkb-winstvrijstelling)
// dat in de hoogste schijf valt, geeft maar voordeel tegen `aftrekBeperkingPct` i.p.v. het
// toptarief. Bron: Belastingdienst, "Afbouw tarief aftrekposten bij hoog inkomen".
function berekenIbMetToevoegingen(belastbaar, year, aftrekposten) {
  const { waarde: t, status } = resolveTariefGroep("ib", year);
  const overig = getOverigInkomenBox1(year);
  const b = Math.max(0, belastbaar || 0);
  const basis = Math.max(0, belastingOverSchijvenVoor(b + overig, t) - belastingOverSchijvenVoor(overig, t));
  const topGrens = t.brackets.length > 1 ? t.brackets[t.brackets.length - 2].tot : 0;
  const toptarief = t.brackets[t.brackets.length - 1].tarief;
  const verschil = Math.max(0, toptarief - (t.aftrekBeperkingPct || 0) / 100);
  const inkomenZonderAftrek = (belastbaar || 0) + (aftrekposten || 0) + overig;
  const deelInTopschijf = Math.max(0, Math.min(aftrekposten || 0, inkomenZonderAftrek - topGrens));
  const beperking = t.aftrekBeperkingPct ? deelInTopschijf * verschil : 0;
  return { belasting: basis + beperking, belastingVoorBeperking: basis, beperkingAftrek: beperking, overigInkomen: overig, tariefStatus: status };
}

export function estimateIncomeTax(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { belasting: 0, geëxtrapoleerd: false, beperkingAftrek: 0, overigInkomen: getOverigInkomenBox1(year) };
  const za = zelfstandigenaftrekToegepast ? Math.min(winst, getIbParams(year).zelfstandigenaftrek) : 0;
  const u = computeBelastbareWinstUitsplitsing(winst, year, za, false);
  const r = berekenIbMetToevoegingen(u.belastbaar, year, za + u.mkbVrijstellingBedrag);
  return { ...r, geëxtrapoleerd: r.tariefStatus === "benadering" };
}

// Berekent zowel het scenario mét als zónder zelfstandigenaftrek — voor gebruik wanneer niet
// bekend is of aan het urencriterium is voldaan ("Onbekend"), zodat de app geen schijnzekerheid
// geeft door zomaar één van de twee te kiezen.
export function estimateIncomeTaxScenarios(winst, year) {
  return {
    metZelfstandigenaftrek: estimateIncomeTax(winst, year, true),
    zonderZelfstandigenaftrek: estimateIncomeTax(winst, year, false),
  };
}

// Een jaar waarvoor het urencriterium nooit is aangegeven mag niet zomaar stilzwijgend "mét
// zelfstandigenaftrek" geven (zie `zaStatus !== "nee"` in reports/aangiftevoorstel.js en
// PersoonlijkeAannamesPanel.jsx) — dat oogt voor een gebruiker als "niets ingevuld, dus de app heeft
// het wel ongeveer goed", terwijl het urencriterium juist NIET uit bankgegevens is af te leiden (de
// Belastingdienst koppelt de zelfstandigenaftrek er direct aan). Dit stille "Ja"-gedrag geldt daarom
// alleen nog voor dossiers die al bestonden vóórdat deze regel werd ingevoerd (`zaLegacyJaDefault` —
// zie App.jsx/loadProjectFile, resulteert hier in "ja"), zodat een eerder opgeslagen dossier niet met
// terugwerkende kracht andere cijfers toont; voor een gloednieuw dossier resulteert een onbeantwoord
// jaar in "onbekend" (beide scenario's naast elkaar, net als bij een expliciete "Onbekend"-keuze) —
// de veiligere aanname zolang niemand het urencriterium heeft bevestigd. Een expliciet gezet jaar
// (ja/nee/onbekend) wint hier altijd, ongeacht zaLegacyJaDefault.
export function resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, year, zaLegacyJaDefault) {
  const raw = zelfstandigenaftrekStatus?.[year];
  if (raw != null) return raw;
  return zaLegacyJaDefault ? "ja" : "onbekend";
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
  2027: { pct: 5.02, maxBijdrageInkomen: 82547 },
};

function zvwBerekening(belastbaarRuw, year) {
  const { waarde: z, status } = resolveTariefGroep("zvw", year);
  const belastbaar = Math.max(0, belastbaarRuw);
  // Over overig inkomen (loon/uitkering) is al Zvw-bijdrage betaald; het maximum bijdrage-inkomen geldt
  // voor het totaal, dus er blijft minder ruimte voor de winst.
  const max = Math.max(0, z.maxBijdrageInkomen - getOverigInkomenBox1(year));
  const gemaximeerd = belastbaar > max;
  const grondslag = Math.min(belastbaar, max);
  return { bijdrage: grondslag * (z.pct / 100), geëxtrapoleerd: status === "benadering", grondslag, gemaximeerd };
}

export function estimateZvw(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { bijdrage: 0, geëxtrapoleerd: false, grondslag: 0, gemaximeerd: false };
  return zvwBerekening(computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast), year);
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
// beide-V6R6 — Belastingplan 2027: € 10 in 2027 (voorlopig), afgeschaft vanaf 2028.
export const STARTERSAFTREK_BEDRAG = 2123;
// beide-V6R7 — als tabel, zodat het tarievenbestand op de server een jaar kan toevoegen of wijzigen.
export const STARTERSAFTREK_BY_YEAR = { 2023: 2123, 2024: 2123, 2025: 2123, 2026: 2123, 2027: 10, 2028: 0 };
export function startersaftrekBedrag(year) {
  if (STARTERSAFTREK_BY_YEAR[year] != null) return STARTERSAFTREK_BY_YEAR[year];
  const lager = Object.keys(STARTERSAFTREK_BY_YEAR).map(Number).filter((j) => j < year).sort((a, b) => a - b);
  return lager.length ? STARTERSAFTREK_BY_YEAR[lager[lager.length - 1]] : STARTERSAFTREK_BEDRAG;
}

// Niet-gerealiseerde zelfstandigenaftrek: het deel van de zelfstandigenaftrek dat in een jaar niet
// kon worden benut omdat de winst te laag was. Mag tot 9 jaar later alsnog worden verrekend, in een
// jaar waarin (a) wél aan het urencriterium is voldaan (zelfstandigenaftrekStatus !== "nee") én
// (b) de winst hoger is dan de normale zelfstandigenaftrek van dat jaar (er dus "ruimte" is). Deze
// app houdt dit zelf bij (in plaats van de aanslagbiljetten van eerdere jaren) — reken dit na als
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

    const basisBedrag = getIbParams(year).zelfstandigenaftrek;
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
      startersaftrekBedrag: startersaftrekToegepast ? startersaftrekBedrag(year) : 0,
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
  return computeBelastbareWinstUitsplitsing(winst, year, ondernemersaftrekBedrag, staatNegatiefToe).belastbaar;
}

// Uitsplitsing van winst → ondernemersaftrek → MKB-winstvrijstelling → belastbare winst als aparte,
// herbruikbare stappen (i.p.v. alleen het eindresultaat, zoals computeBelastbaarInkomenGeneriek
// hierboven al doet) — voor het compacte dashboard bovenaan de Indicatieve aangifteberekening, dat
// elke stap los toont.
export function computeBelastbareWinstUitsplitsing(winst, year, ondernemersaftrekBedrag, staatNegatiefToe) {
  const mkbPct = getIbParams(year).mkbPct;
  let naOndernemersaftrek = (winst || 0) - (ondernemersaftrekBedrag || 0);
  if (!staatNegatiefToe) naOndernemersaftrek = Math.max(0, naOndernemersaftrek);
  const mkbVrijstellingBedrag = naOndernemersaftrek * (mkbPct / 100);
  return { naOndernemersaftrek, mkbPct, mkbVrijstellingBedrag, belastbaar: naOndernemersaftrek - mkbVrijstellingBedrag };
}

// IB-schatting met een expliciet ondernemersaftrek-bedrag (voor gebruik samen met
// computeOndernemersaftrekMetReserve, dat rekening houdt met verrekening van niet-gerealiseerde
// zelfstandigenaftrek en met startersaftrek).
export function estimateIncomeTaxMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  const u = computeBelastbareWinstUitsplitsing(winst, year, ondernemersaftrekBedrag, staatNegatiefToe);
  const toegepast = (winst || 0) - u.naOndernemersaftrek;
  const r = berekenIbMetToevoegingen(u.belastbaar, year, toegepast + u.mkbVrijstellingBedrag);
  return { ...r, geëxtrapoleerd: r.tariefStatus === "benadering", belastbaar: u.belastbaar };
}

export function estimateZvwMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  return zvwBerekening(computeBelastbareWinstUitsplitsing(winst, year, ondernemersaftrekBedrag, staatNegatiefToe).belastbaar, year);
}

// Heffingskortingen over de winst, rekening houdend met overig inkomen box 1 (wizard): de korting
// is het verschil tussen de kortingen over winst + overig inkomen en over het overige inkomen
// alleen (dat al via de loonheffing is verrekend). Het overige inkomen telt hier als arbeidsinkomen
// (loon/uitkering) — bij pensioen of ander niet-arbeidsinkomen is de arbeidskorting dus te hoog
// ingeschat. Heeft de gebruiker de werkelijke heffingskorting ingevuld (tariefOverrides[jaar]
// .werkelijkeHeffingskorting), dan vervangt die het totaal.
function heffingskortingenVoor(winst, belastbaarInkomen, year) {
  const overig = getOverigInkomenBox1(year);
  const bi = Math.max(0, belastbaarInkomen);
  const algemeneHeffingskorting = computeAlgemeneHeffingskorting(bi + overig, year) - (overig > 0 ? computeAlgemeneHeffingskorting(overig, year) : 0);
  const arbeidskorting = computeArbeidskorting(winst + overig, year) - (overig > 0 ? computeArbeidskorting(overig, year) : 0);
  const werkelijk = Number(_overrides?.[year]?.werkelijkeHeffingskorting);
  const heeftWerkelijk = _overrides?.[year]?.werkelijkeHeffingskorting != null && _overrides?.[year]?.werkelijkeHeffingskorting !== "" && Number.isFinite(werkelijk) && werkelijk >= 0;
  const geschat = algemeneHeffingskorting + arbeidskorting;
  return {
    algemeneHeffingskorting, arbeidskorting,
    totaal: heeftWerkelijk ? werkelijk : geschat,
    geschatTotaal: geschat,
    werkelijkIngevuld: heeftWerkelijk,
  };
}

export function estimateHeffingskortingenMetOndernemersaftrek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe = false) {
  if (!winst || winst <= 0) return { algemeneHeffingskorting: 0, arbeidskorting: 0, totaal: 0 };
  return heffingskortingenVoor(winst, computeBelastbaarInkomenGeneriek(winst, year, ondernemersaftrekBedrag, staatNegatiefToe), year);
}

export function estimateHeffingskortingen(winst, year, zelfstandigenaftrekToegepast = true) {
  if (!winst || winst <= 0) return { algemeneHeffingskorting: 0, arbeidskorting: 0, totaal: 0 };
  return heffingskortingenVoor(winst, computeBelastbaarWinst(winst, year, zelfstandigenaftrekToegepast), year);
}

// ---------------------------------------------------------------------------------------------
// Heffingskortingen (algemene heffingskorting + arbeidskorting) — GROVE INDICATIE.
// ---------------------------------------------------------------------------------------------
// Beide kortingen zijn wettelijk afhankelijk van meer dan alleen de winst uit onderneming: de
// algemene heffingskorting van het volledige verzamelinkomen (box 1+2+3) en eventueel een fiscale
// partner, de arbeidskorting alleen van het (positieve) arbeidsinkomen. Deze app kent alleen de
// winst uit onderneming uit de bankgegevens — geen overig inkomen, geen box 2/3, geen partner, en
// gaat er daarom bewust van uit dat:
// - de winst uit onderneming het enige inkomen is (geen loon, uitkering, of ander box 1/2/3-inkomen),
// - de AOW-leeftijd nog niet is bereikt (jongere tarieven/percentages),
// - er geen fiscale partner is om mee te verrekenen.
// Klopt een van deze aannames niet, dan is de uitkomst hieronder minder betrouwbaar. Bronnen:
// gepubliceerde tabellen algemene heffingskorting/arbeidskorting van de Belastingdienst. Check
// jaarlijks op belastingdienst.nl of deze bedragen nog kloppen.
export const ALGEMENE_HEFFINGSKORTING_BY_YEAR = {
  // 2020–2022: Belastingdienst, Fiscale Informatie (fisin2020/21/22 → Heffingskortingen).
  2020: { max: 2711, afbouwGrens: 20711, afbouwPct: 5.672 },
  2021: { max: 2837, afbouwGrens: 21043, afbouwPct: 5.977 },
  2022: { max: 2888, afbouwGrens: 21317, afbouwPct: 6.007 },
  2023: { max: 3070, afbouwGrens: 22660, afbouwPct: 6.095 },
  2024: { max: 3362, afbouwGrens: 24812, afbouwPct: 6.63 },
  2025: { max: 3068, afbouwGrens: 28406, afbouwPct: 6.337 },
  2026: { max: 3115, afbouwGrens: 29736, afbouwPct: 6.398 },
  2027: { max: 3154, afbouwGrens: 30910, afbouwPct: 6.638 },
};

// Grondslag: belastbaar inkomen uit werk en woning (= dezelfde belastbare winst als bij de
// IB-schatting hierboven, ervan uitgaande dat dit het enige inkomen is).
export function computeAlgemeneHeffingskorting(belastbaarInkomen, year) {
  if (!belastbaarInkomen || belastbaarInkomen <= 0) return 0;
  const a = resolveTariefGroep("ahk", year).waarde;
  if (belastbaarInkomen <= a.afbouwGrens) return a.max;
  return Math.max(0, a.max - (belastbaarInkomen - a.afbouwGrens) * (a.afbouwPct / 100));
}

// Opbouw- en afbouwtraject per jaar, voor personen onder de AOW-leeftijd. Elke opbouwstap heeft
// een bovengrens ("tot"), en — behalve de eerste stap — een startpunt ("van") en basisbedrag
// ("basis") waar vanaf verder wordt opgebouwd; de laatste stap se "tot" is tegelijk het punt
// waarop de afbouw begint (waar het maximum "max" wordt bereikt).
export const ARBEIDSKORTING_BY_YEAR = {
  // 2020–2022: Belastingdienst, Fiscale Informatie (fisin2020/21/22 → Heffingskortingen).
  2020: {
    opbouw: [
      { tot: 9921, pct: 2.812 },
      { tot: 21430, van: 9921, basis: 279, pct: 28.812 },
      { tot: 34954, van: 21430, basis: 3595, pct: 1.656 },
    ],
    max: 3819,
    afbouwVanaf: 34954,
    afbouwPct: 6,
  },
  2021: {
    opbouw: [
      { tot: 10108, pct: 4.581 },
      { tot: 21835, van: 10108, basis: 463, pct: 28.771 },
      { tot: 35652, van: 21835, basis: 3837, pct: 2.663 },
    ],
    max: 4205,
    afbouwVanaf: 35652,
    afbouwPct: 6,
  },
  2022: {
    opbouw: [
      { tot: 10350, pct: 4.541 },
      { tot: 22356, van: 10350, basis: 470, pct: 28.461 },
      { tot: 36649, van: 22356, basis: 3887, pct: 2.61 },
    ],
    max: 4260,
    afbouwVanaf: 36649,
    afbouwPct: 5.86,
  },
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
  2027: {
    opbouw: [
      { tot: 12438, pct: 9.503 },
      { tot: 26866, van: 12438, basis: 1182, pct: 30.205 },
      { tot: 47834, van: 26866, basis: 5540, pct: 1.855 },
    ],
    max: 5929,
    afbouwVanaf: 47834,
    afbouwPct: 6.51,
  },
};

// Grondslag: arbeidsinkomen — voor een zzp'er/eenmanszaak is dit de winst uit onderneming vóór
// zelfstandigenaftrek en mkb-winstvrijstelling (dus de ruwe "winst" zoals de app die al elders
// gebruikt), niet de belastbare winst ná die aftrekken.
export function computeArbeidskorting(arbeidsinkomen, year) {
  if (!arbeidsinkomen || arbeidsinkomen <= 0) return 0;
  const a = resolveTariefGroep("ak", year).waarde;
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

// ---------------------------------------------------------------------------------------------
// Kleinschaligheidsinvesteringsaftrek (KIA) — GROVE INDICATIE.
// ---------------------------------------------------------------------------------------------
// Niet elke aanschaf van een bedrijfsmiddel telt mee (bijv. personenauto's, grond en woningen zijn
// doorgaans uitgesloten, en elk bedrijfsmiddel moet minimaal ca. €450 kosten) — deze app kent dat
// onderscheid niet uit bankgegevens, dus dit is uitdrukkelijk een "mogelijke KIA", geen definitieve
// aftrek. Bron: gepubliceerde KIA-tabel van de Belastingdienst. Check jaarlijks op belastingdienst.nl
// of deze bedragen nog kloppen.
export const KIA_STAFFEL_BY_YEAR = {
  2023: { drempel: 2600, vast1Tot: 63716, pct1: 28, vastBedrag: 17841, vastTot: 117841, afbouwPct: 7.56, nul: 353973 },
  2024: { drempel: 2800, vast1Tot: 69765, pct1: 28, vastBedrag: 19535, vastTot: 129194, afbouwPct: 7.56, nul: 387580 },
  2025: { drempel: 2900, vast1Tot: 70602, pct1: 28, vastBedrag: 19769, vastTot: 130744, afbouwPct: 7.56, nul: 392230 },
  2026: { drempel: 2900, vast1Tot: 71683, pct1: 28, vastBedrag: 20072, vastTot: 132746, afbouwPct: 7.56, nul: 398236 },
};
export function computeMogelijkeKia(totaalInvestering, year) {
  if (!totaalInvestering || totaalInvestering <= 0) return 0;
  const s = resolveTariefGroep("kia", year).waarde;
  if (totaalInvestering <= s.drempel) return 0;
  if (totaalInvestering <= s.vast1Tot) return totaalInvestering * (s.pct1 / 100);
  if (totaalInvestering <= s.vastTot) return s.vastBedrag;
  if (totaalInvestering <= s.nul) return Math.max(0, s.vastBedrag - (totaalInvestering - s.vastTot) * (s.afbouwPct / 100));
  return 0;
}
