// release31V4 — welke periode dekken de zakelijke en de privébestanden samen? Buiten die gezamenlijke periode
// kan een overboeking tussen de twee rekeningen nooit een tegenboeking vinden (de andere kant is niet geladen).

const MAAND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export const maandTekst = (d) => `${MAAND[d.getMonth()]} ${d.getFullYear()}`;
const maandStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const vorigeMaand = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
const volgendeMaand = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

// bestandInfo: { [bestand]: { van: Date, tot: Date } }; types: { [bestand]: "Zakelijk" | "Prive" }
export function periodesPerSoort(bestandInfo = {}, types = {}) {
  const r = {};
  for (const [bestand, i] of Object.entries(bestandInfo)) {
    const t = types[bestand];
    if (t !== "Zakelijk" && t !== "Prive") continue;
    const p = (r[t] ||= { van: i.van, tot: i.tot });
    if (i.van < p.van) p.van = i.van;
    if (i.tot > p.tot) p.tot = i.tot;
  }
  return r;
}

// Gezamenlijke periode + de maanden waarin maar één van beide rekeningen gegevens heeft.
// Geeft null als niet beide soorten geladen zijn (dan is er niets te vergelijken).
export function gezamenlijkePeriode(zak, pri) {
  if (!zak || !pri) return null;
  const van = zak.van > pri.van ? zak.van : pri.van;
  const tot = zak.tot < pri.tot ? zak.tot : pri.tot;
  const eenzijdig = [];
  const voeg = (a, b, alleen) => { if (a <= b) eenzijdig.push({ van: a, tot: b, alleen, tekst: `${maandTekst(a)}${maandTekst(a) === maandTekst(b) ? "" : ` t/m ${maandTekst(b)}`}` }); };
  // Alleen hele maanden die volledig buiten de andere kant vallen.
  if (maandStart(zak.van) < maandStart(pri.van)) voeg(maandStart(zak.van), vorigeMaand(pri.van), "zakelijk");
  if (maandStart(pri.van) < maandStart(zak.van)) voeg(maandStart(pri.van), vorigeMaand(zak.van), "privé");
  if (maandStart(zak.tot) > maandStart(pri.tot)) voeg(volgendeMaand(pri.tot), maandStart(zak.tot), "zakelijk");
  if (maandStart(pri.tot) > maandStart(zak.tot)) voeg(volgendeMaand(zak.tot), maandStart(pri.tot), "privé");
  return { van, tot, overlap: van <= tot, eenzijdig };
}
