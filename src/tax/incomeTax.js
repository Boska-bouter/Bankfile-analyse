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

export function estimateIncomeTax(winst, year) {
  if (!winst || winst <= 0) return { belasting: 0, geëxtrapoleerd: false };
  const clampedYear = Math.max(2023, Math.min(2026, year));
  const t = IB_TARIEVEN_BY_YEAR[clampedYear];
  const naZelfstandigenaftrek = Math.max(0, winst - t.zelfstandigenaftrek);
  const belastbaar = naZelfstandigenaftrek * (1 - t.mkbPct / 100);
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

// Kleinschaligheidsinvesteringsaftrek (KIA) 2026 — drempels volgens de Belastingdienst. Check
// zelf jaarlijks op belastingdienst.nl of deze bedragen nog kloppen.
export const KIA_MIN_TOTAAL = 2901;
export const KIA_MAX_TOTAAL = 398236;
