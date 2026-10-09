// Toets op de voorwaarden van de startersaftrek die uit de eigen invoer van de app te controleren zijn.
// Regel (Belastingdienst): de startersaftrek mag maximaal 3 keer worden toegepast, binnen de eerste
// 5 jaar na de start (dus over maximaal 5 opeenvolgende kalenderjaren); en alleen in jaren waarin je
// ook recht hebt op zelfstandigenaftrek (urencriterium gehaald).
// Niet te controleren vanuit bankgegevens: of je in de 5 jaar vóór de start al ondernemer was en wanneer
// je precies bent gestart. De toets hieronder rekent daarom vanaf het EERSTE jaar waarin jij de
// startersaftrek hebt aangegeven; was je eigenlijk al eerder gestart, dan is de periode korter.
//
// De toets bepaalt ook welke jaren daadwerkelijk meetellen (`toegepast`) en welke niet (`genegeerd`):
// de berekening gebruikt alleen `toegepast`. Jaren met urencriterium "nee" tellen niet mee; de eerste
// overgebleven jaar is het startjaar; daarna maximaal 3 jaren binnen 5 jaar.
export function toetsStartersaftrek(startersaftrekStatus = {}, zelfstandigenaftrekStatus = {}) {
  const jaren = Object.entries(startersaftrekStatus || {})
    .filter(([, v]) => v === "ja")
    .map(([j]) => Number(j))
    .filter((j) => Number.isFinite(j))
    .sort((a, b) => a - b);
  const meldingen = [];
  if (jaren.length === 0) return { jaren, meldingen, toegepast: [], genegeerd: [] };

  const zonderZa = jaren.filter((j) => zelfstandigenaftrekStatus?.[j] === "nee");
  const geldig = jaren.filter((j) => !zonderZa.includes(j));
  const start = geldig[0];
  const toegepast = [];
  const buitenPeriode = [];
  const teVeel = [];
  for (const j of geldig) {
    if (j - start > 4) buitenPeriode.push(j);
    else if (toegepast.length >= 3) teVeel.push(j);
    else toegepast.push(j);
  }
  const genegeerd = [...zonderZa, ...buitenPeriode, ...teVeel].sort((a, b) => a - b);

  if (teVeel.length) {
    meldingen.push(`Startersaftrek is voor ${jaren.length} jaren aangegeven (${jaren.join(", ")}), maar mag maximaal 3 keer worden toegepast. In de berekening telt ze alleen mee voor ${toegepast.join(", ")}; ${teVeel.join(", ")} wordt niet toegepast.`);
  }
  if (buitenPeriode.length) {
    meldingen.push(`Startersaftrek mag alleen in de eerste 5 jaar na de start. Eerste toepassing is ${start}, dus ${buitenPeriode.join(", ")} valt daarbuiten (uiterlijk ${start + 4}) en wordt in de berekening niet toegepast.`);
  }
  if (zonderZa.length) {
    meldingen.push(`Startersaftrek in ${zonderZa.join(", ")} terwijl het urencriterium op "nee" staat: startersaftrek kan alleen samen met zelfstandigenaftrek, dus ze wordt in de berekening niet toegepast.`);
  }
  return { jaren, meldingen, toegepast, genegeerd };
}

// Status zoals de berekening die moet gebruiken: alleen de jaren waarin startersaftrek mag.
export function effectieveStartersaftrekStatus(startersaftrekStatus = {}, zelfstandigenaftrekStatus = {}) {
  const { toegepast, genegeerd } = toetsStartersaftrek(startersaftrekStatus, zelfstandigenaftrekStatus);
  if (genegeerd.length === 0) return startersaftrekStatus || {};
  const uit = { ...(startersaftrekStatus || {}) };
  for (const j of genegeerd) uit[j] = "nee";
  for (const j of toegepast) uit[j] = "ja";
  return uit;
}
