// Toets op de voorwaarden van de startersaftrek die uit de eigen invoer van de app te controleren zijn.
// Regel (Belastingdienst): de startersaftrek mag maximaal 3 keer worden toegepast, binnen de eerste
// 5 jaar na de start (dus over maximaal 5 opeenvolgende kalenderjaren); en alleen in jaren waarin je
// ook recht hebt op zelfstandigenaftrek (urencriterium gehaald).
// Niet te controleren vanuit bankgegevens: of je in de 5 jaar vóór de start al ondernemer was en wanneer
// je precies bent gestart. De toets hieronder rekent daarom vanaf het EERSTE jaar waarin jij de
// startersaftrek hebt aangegeven; was je eigenlijk al eerder gestart, dan is de periode korter.
//
// Alleen een waarschuwing: de berekening zelf past de keuze van de gebruiker ongewijzigd toe.
export function toetsStartersaftrek(startersaftrekStatus = {}, zelfstandigenaftrekStatus = {}) {
  const jaren = Object.entries(startersaftrekStatus || {})
    .filter(([, v]) => v === "ja")
    .map(([j]) => Number(j))
    .filter((j) => Number.isFinite(j))
    .sort((a, b) => a - b);
  const meldingen = [];
  if (jaren.length === 0) return { jaren, meldingen };

  if (jaren.length > 3) {
    meldingen.push(`Startersaftrek is voor ${jaren.length} jaren aangegeven (${jaren.join(", ")}), maar mag maximaal 3 keer worden toegepast. Haal het uit minstens ${jaren.length - 3} jaar weg.`);
  }
  const buitenPeriode = jaren.filter((j) => j - jaren[0] > 4);
  if (buitenPeriode.length) {
    meldingen.push(`Startersaftrek mag alleen in de eerste 5 jaar na de start. Eerste toepassing is ${jaren[0]}, dus ${buitenPeriode.join(", ")} valt daarbuiten (uiterlijk ${jaren[0] + 4}).`);
  }
  const zonderZa = jaren.filter((j) => zelfstandigenaftrekStatus?.[j] === "nee");
  if (zonderZa.length) {
    meldingen.push(`Startersaftrek in ${zonderZa.join(", ")} terwijl het urencriterium op "nee" staat: startersaftrek kan alleen samen met zelfstandigenaftrek.`);
  }
  return { jaren, meldingen };
}
