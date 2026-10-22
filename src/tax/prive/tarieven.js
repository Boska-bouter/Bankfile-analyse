// beide-V1R8 (fase 5) — tabellen per jaar voor de privéberekening. Alleen wat incomeTax.js nog niet heeft;
// box 1-schijven, algemene heffingskorting en arbeidskorting komen daar vandaan (niet gekopieerd).
// Bron: Belastingdienst (Fiscale Informatie per jaar, Handboek loonheffingen, toelichtingen Belastingplan).
// Alles is indicatief: check jaarlijks of de bedragen nog kloppen. Een jaar zonder eigen regel gebruikt het
// dichtstbijzijnde eerdere jaar (status "benadering"), net als bij de zakelijke tarieven.

// Box 1 voor wie de AOW-leeftijd heeft: geen AOW-premie (17,90%) in de eerste schijf, met een eigen grens.
export const AOW_SCHIJF_BY_YEAR = {
  2020: { tot: 34712, tarief: 0.1945 },
  2021: { tot: 35129, tarief: 0.192 },
  2022: { tot: 35472, tarief: 0.1917 },
  2023: { tot: 38703, tarief: 0.1903 },
  2024: { tot: 38098, tarief: 0.1907 },
  2025: { tot: 38441, tarief: 0.1792 },
  2026: { tot: 38883, tarief: 0.1785 },
};

// Heffingskortingen voor AOW-gerechtigden: de algemene heffingskorting en arbeidskorting zijn ongeveer de helft
// (alleen het belastingdeel), plus de ouderenkorting.
export const AOW_KORTING_FACTOR = 0.516;
export const OUDERENKORTING_BY_YEAR = {
  2020: { max: 1622, grens: 37372, afbouwPct: 15 },
  2021: { max: 1703, grens: 37970, afbouwPct: 15 },
  2022: { max: 1726, grens: 38464, afbouwPct: 15 },
  2023: { max: 1835, grens: 40888, afbouwPct: 15 },
  2024: { max: 2010, grens: 44770, afbouwPct: 15 },
  2025: { max: 2035, grens: 45308, afbouwPct: 15 },
};

// Eigen woning: forfait als percentage van de WOZ-waarde, daarboven (villagrens) een hoger percentage;
// Hillen = aftrek wegens geen of geringe eigenwoningschuld (afbouwend percentage van het verschil).
export const EIGEN_WONING_BY_YEAR = {
  2020: { forfaitPct: 0.6, villagrens: 1090000, villaPct: 2.35, hillenPct: 93.333 },
  2021: { forfaitPct: 0.5, villagrens: 1110000, villaPct: 2.35, hillenPct: 90 },
  2022: { forfaitPct: 0.45, villagrens: 1130000, villaPct: 2.35, hillenPct: 86.667 },
  2023: { forfaitPct: 0.35, villagrens: 1200000, villaPct: 2.35, hillenPct: 83.333 },
  2024: { forfaitPct: 0.35, villagrens: 1310000, villaPct: 2.35, hillenPct: 80 },
  2025: { forfaitPct: 0.35, villagrens: 1330000, villaPct: 2.35, hillenPct: 76.667 },
  2026: { forfaitPct: 0.35, villagrens: 1350000, villaPct: 2.35, hillenPct: 71.867 },
};

// Box 3 (forfaitaire rendementen na het Kerstarrest; "overbruggingswet"). Heffingsvrij vermogen en
// schuldendrempel per persoon (met fiscale partner samen het dubbele).
export const BOX3_BY_YEAR = {
  2020: { heffingsvrij: 30846, sparenPct: 0.04, beleggenPct: 5.28, schuldenPct: 2.74, schuldendrempel: 3100, tariefPct: 30 },
  2021: { heffingsvrij: 50000, sparenPct: 0.01, beleggenPct: 5.69, schuldenPct: 2.46, schuldendrempel: 3200, tariefPct: 31 },
  2022: { heffingsvrij: 50650, sparenPct: 0.0, beleggenPct: 5.53, schuldenPct: 2.28, schuldendrempel: 3200, tariefPct: 31 },
  2023: { heffingsvrij: 57000, sparenPct: 0.92, beleggenPct: 6.17, schuldenPct: 2.46, schuldendrempel: 3400, tariefPct: 32 },
  2024: { heffingsvrij: 57000, sparenPct: 1.44, beleggenPct: 6.04, schuldenPct: 2.61, schuldendrempel: 3700, tariefPct: 36 },
  2025: { heffingsvrij: 57684, sparenPct: 1.37, beleggenPct: 5.88, schuldenPct: 2.7, schuldendrempel: 3800, tariefPct: 36 },
  2026: { heffingsvrij: 51396, sparenPct: 1.28, beleggenPct: 6.0, schuldenPct: 2.7, schuldendrempel: 3800, tariefPct: 36 },
};

// Persoonsgebonden aftrek. Giften: drempel 1% van het drempelinkomen (minimaal € 60), maximaal 10%.
// Specifieke zorgkosten: vaste drempel tot `laag`, daarboven 1,65%, boven `hoog` extra 5,75% over het meerdere.
export const AFTREK_BY_YEAR = {
  2020: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 136, zorgLaag: 8241, zorgPct: 1.65, zorgHoog: 43833, zorgExtraPct: 5.75 },
  2021: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 138, zorgLaag: 8345, zorgPct: 1.65, zorgHoog: 44372, zorgExtraPct: 5.75 },
  2022: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 139, zorgLaag: 8426, zorgPct: 1.65, zorgHoog: 44768, zorgExtraPct: 5.75 },
  2023: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 144, zorgLaag: 8728, zorgPct: 1.65, zorgHoog: 46368, zorgExtraPct: 5.75 },
  2024: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 154, zorgLaag: 9344, zorgPct: 1.65, zorgHoog: 49647, zorgExtraPct: 5.75 },
  2025: { giftenMin: 60, giftenPct: 1, giftenMaxPct: 10, zorgVast: 159, zorgLaag: 9631, zorgPct: 1.65, zorgHoog: 51168, zorgExtraPct: 5.75 },
};

const TABELLEN = { aow: AOW_SCHIJF_BY_YEAR, ouderen: OUDERENKORTING_BY_YEAR, woning: EIGEN_WONING_BY_YEAR, box3: BOX3_BY_YEAR, aftrek: AFTREK_BY_YEAR };

// → { waarde, status: "standaard" | "benadering", bronJaar }
export function priveTarief(groep, jaar) {
  const tabel = TABELLEN[groep];
  if (tabel[jaar]) return { waarde: tabel[jaar], status: "standaard", bronJaar: jaar };
  const jaren = Object.keys(tabel).map(Number).sort((a, b) => a - b);
  const lager = jaren.filter((j) => j < jaar);
  const bronJaar = lager.length ? lager[lager.length - 1] : jaren[0];
  return { waarde: tabel[bronJaar], status: "benadering", bronJaar };
}

export function priveTariefStatus(jaar) {
  const benaderd = Object.keys(TABELLEN).filter((g) => priveTarief(g, jaar).status === "benadering");
  return { status: benaderd.length ? "benadering" : "standaard", benaderd };
}
