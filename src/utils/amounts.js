// Bedragen parsen (uit CSV/Excel) en formatteren voor weergave.

export function parseEuroNumber(raw) {
  if (typeof raw === "number") return raw;
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/\s/g, "");
  if (s === "") return NaN;
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/^-/, "");
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const v = parseFloat(s);
  return neg ? -v : v;
}

const EUR_FORMAT = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
// Negatieve bedragen overal als "− € 1.078,73" (echt minteken, zelfde schrijfwijze als de aftrekregels in de
// aangifte), niet meer als "€ -1.078,73". Bedragen die op nul afronden krijgen geen minteken ("€ 0,00").
export const eur = (n) => {
  const v = n || 0;
  const tekst = EUR_FORMAT.format(Math.abs(v));
  return v < 0 && Math.round(Math.abs(v) * 100) > 0 ? `\u2212\u00a0${tekst}` : tekst;
};

// Zelfde als eur(), maar zonder de spatie die Intl.NumberFormat standaard tussen "€" en het
// getal zet — gebruikt in dichte tabellen zoals het Jaaroverzicht, waar elke centimeter telt.
export const eurTight = (n) => eur(n).replace(/\s/g, "");
