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

export const eur = (n) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

export const eurShort = (n) =>
  new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(n || 0);

// Zelfde als eur(), maar zonder de spatie die Intl.NumberFormat standaard tussen "€" en het
// getal zet — gebruikt in dichte tabellen zoals het Jaaroverzicht, waar elke centimeter telt.
export const eurTight = (n) => eur(n).replace(/\s/g, "");
