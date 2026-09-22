// Grove, indicatieve schattingen voor de BV-tak: vennootschapsbelasting (Vpb) over het resultaat
// vóór Vpb, box 2-belasting over een dividenduitkering, en de gebruikelijk-loonregeling als losse
// controle. Zelfde opzet/voorbehoud als incomeTax.js: geen aftrekposten/investeringsregelingen
// (bijv. KIA), geen fiscale eenheid. Bronnen: belastingdienst.nl — check jaarlijks of deze
// bedragen nog kloppen, ze wijzigen per jaar.

// Vpb-tarief is sinds 2023 ongewijzigd: 19% tot €200.000, 25,8% daarboven (belastingdienst.nl —
// "Tarieven voor de vennootschapsbelasting", geraadpleegd september 2026).
export const VPB_TARIEVEN_BY_YEAR = {
  2023: { brackets: [{ tot: 200000, tarief: 0.19 }, { tot: Infinity, tarief: 0.258 }] },
  2024: { brackets: [{ tot: 200000, tarief: 0.19 }, { tot: Infinity, tarief: 0.258 }] },
  2025: { brackets: [{ tot: 200000, tarief: 0.19 }, { tot: Infinity, tarief: 0.258 }] },
  2026: { brackets: [{ tot: 200000, tarief: 0.19 }, { tot: Infinity, tarief: 0.258 }] },
};

// Vennootschapsbelasting over het resultaat vóór Vpb van de (werk-)BV. Geen zelfstandigenaftrek of
// mkb-winstvrijstelling (die bestaan alleen in de IB) — de volledige winst is belastbaar, in
// schijven.
export function estimateVpb(resultaatVoorVpb, year) {
  if (!resultaatVoorVpb || resultaatVoorVpb <= 0) return { belasting: 0, geëxtrapoleerd: false };
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const t = VPB_TARIEVEN_BY_YEAR[clampedYear];
  let belasting = 0;
  let vorige = 0;
  for (const schijf of t.brackets) {
    const inDezeSchijf = Math.min(resultaatVoorVpb, schijf.tot) - vorige;
    if (inDezeSchijf > 0) belasting += inDezeSchijf * schijf.tarief;
    vorige = schijf.tot;
    if (resultaatVoorVpb <= schijf.tot) break;
  }
  return { belasting, geëxtrapoleerd: clampedYear !== year };
}

// Box 2 (aanmerkelijk belang) — belasting die de DGA privé betaalt over een dividenduitkering.
// 2023 was nog één vlak tarief; sinds 2024 zijn er twee schijven met een oplopende inkomensgrens.
// Bron: belastingdienst.nl — "Box 2: uitleg en tarieven", geraadpleegd september 2026.
export const BOX2_TARIEVEN_BY_YEAR = {
  2023: { brackets: [{ tot: Infinity, tarief: 0.269 }] },
  2024: { brackets: [{ tot: 67000, tarief: 0.245 }, { tot: Infinity, tarief: 0.33 }] },
  2025: { brackets: [{ tot: 67804, tarief: 0.245 }, { tot: Infinity, tarief: 0.31 }] },
  2026: { brackets: [{ tot: 68843, tarief: 0.245 }, { tot: Infinity, tarief: 0.31 }] },
};

// dividendBedrag is het bedrag dat de DGA in dit jaar privé ontvangt (dus ná een eventuele
// tussenliggende, onder de deelnemingsvrijstelling vallende uitkering aan een holding — die telt
// hier niet mee, zie de toelichting bij de holdingstructuur in het bouwplan).
export function estimateBox2(dividendBedrag, year) {
  if (!dividendBedrag || dividendBedrag <= 0) return { belasting: 0, geëxtrapoleerd: false };
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const t = BOX2_TARIEVEN_BY_YEAR[clampedYear];
  let belasting = 0;
  let vorige = 0;
  for (const schijf of t.brackets) {
    const inDezeSchijf = Math.min(dividendBedrag, schijf.tot) - vorige;
    if (inDezeSchijf > 0) belasting += inDezeSchijf * schijf.tarief;
    vorige = schijf.tot;
    if (dividendBedrag <= schijf.tot) break;
  }
  return { belasting, geëxtrapoleerd: clampedYear !== year };
}

// Gebruikelijk-loonregeling: het wettelijk minimumbedrag dat een DGA (in de regel) als loon aan
// zichzelf moet uitkeren. Puur een signaal/waarschuwing — geen harde berekening, want de werkelijke
// regeling kent uitzonderingen (laagste van drie toetsen: 100%-norm, meestverdienende werknemer,
// of dit wettelijk minimum als dat hoger is). Bron: belastingdienst.nl — "Loon en aanmerkelijk
// belang", geraadpleegd september 2026.
export const GEBRUIKELIJK_LOON_MINIMUM_BY_YEAR = { 2023: 51000, 2024: 56000, 2025: 56000, 2026: 58000 };

export function checkGebruikelijkLoon(dgaSalaris, year) {
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const minimum = GEBRUIKELIJK_LOON_MINIMUM_BY_YEAR[clampedYear];
  const bedrag = dgaSalaris || 0;
  return { minimum, voldoetVermoedelijk: bedrag >= minimum, verschil: minimum - bedrag, geëxtrapoleerd: clampedYear !== year };
}
