// Nieuwe, realistische invoer voor financiële lease: in plaats van dat de gebruiker zelf een
// rentepercentage moet weten (wat bij een leasecontract meestal niet met dat woord genoemd wordt),
// vult die de aankoop- en leasestructuur in zoals die op een leasecontract staat, en leidt de tool
// daaruit het jaarlijkse rentepercentage af.

// Sectie 1 — wat er daadwerkelijk gefinancierd moet worden.
export function computeOnbetaaldGedeelteKoop(details) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(details.koopprijs) + n(details.teBetalenBtw) - n(details.aanbetaling) - n(details.inruilwaarde) + n(details.inlossingLopendeLening);
}

// Sectie 2 — de leasestructuur zelf. Lost de kasstromen (aanbetaling van de hoofdsom, dan de
// betalingen) op naar het maandelijkse rentepercentage waarvoor de netto contante waarde van alle
// betalingen precies gelijk is aan het gefinancierde bedrag (dezelfde soort berekening als IRR/
// interne-rentevoet in een spreadsheet) — met bisectie, want hier is geen nette formule voor.
export function computeFinancialLeaseRate(details) {
  const principal = computeOnbetaaldGedeelteKoop(details);
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const extra = details.extraBedrag1eTermijn === "" || details.extraBedrag1eTermijn == null ? 0 : Number(details.extraBedrag1eTermijn);

  if (!(principal > 0) || !(looptijd > 0) || !(maandbedrag > 0)) return null;

  const cashflow = (month) => {
    let v = month === 1 ? maandbedrag + extra : maandbedrag;
    if (month === looptijd) v += eindbetaling;
    return v;
  };
  const npv = (monthlyRate) => {
    let total = -principal;
    for (let m = 1; m <= looptijd; m++) total += cashflow(m) / Math.pow(1 + monthlyRate, m);
    return total;
  };

  // Bisectie tussen 0% en 5%/maand (~60%+ per jaar, ruim boven wat een reële lease ooit zou zijn).
  // NPV daalt monotoon met een stijgende rente (hogere rente = betalingen minder waard nu), dus
  // een simpele bisectie is hier voldoende en robuuster dan Newton-Raphson (geen afgeleide nodig,
  // geen risico op divergeren).
  let lo = 0;
  let hi = 0.05;
  if (npv(hi) > 0) return null; // ook bij 5%/maand nog steeds niet passend — onrealistische invoer
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid;
    else hi = mid;
  }
  const monthlyRate = (lo + hi) / 2;
  return monthlyRate * 12 * 100; // jaarlijks percentage, zoals de rest van de tool dat al gebruikt
}

// Totaal van alle leasebetalingen (informatief, ter controle tegen het zelf opgegeven "Lease
// vergoeding"-bedrag).
export function computeTotaleLeaseBetalingen(details) {
  const looptijd = Number(details.looptijd);
  const maandbedrag = Number(details.maandbedrag);
  if (!(looptijd > 0) || !(maandbedrag > 0)) return null;
  const eindbetaling = details.eindbetaling === "" || details.eindbetaling == null ? 0 : Number(details.eindbetaling);
  const extra = details.extraBedrag1eTermijn === "" || details.extraBedrag1eTermijn == null ? 0 : Number(details.extraBedrag1eTermijn);
  return maandbedrag * looptijd + eindbetaling + extra;
}
