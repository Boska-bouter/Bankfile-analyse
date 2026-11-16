// beide-V15R5 — tegenpartijen die op elkaar lijken (wens Boska 5-11: "vd Linden Oirschot OIRSCHOT NLD" en "v.d. Linden Oirschot
// OIRSCHOT", of alle "Trans.Reference: F958…"). Kies je bij één een categorie, dan biedt de controlelijst aan de andere in één keer mee
// te zetten. Alleen een voorstel: de gebruiker bevestigt.
const VOORVOEGSELS = [
  [/\bv\.?\s?d\.?(?=\s|$)/g, "vd"], [/\bvan\s+de[rn]?\b/g, "vd"], [/\bv\.?\s?\/?\s?d\.?\s/g, "vd "],
];
const RUIS = new Set(["nld", "nl", "bel", "be", "deu", "de", "via", "bv", "b.v.", "nv", "vof"]);

// nieuw-V4R6 — de woorden zonder ruis, cijfers en "via …"; ook gebruikt door bedrijfSleutel (gedeelde namenlijst).
export function vergelijkWoorden(naam) {
  let t = String(naam || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  t = t.split(/\s+via\s+/)[0];
  for (const [re, door] of VOORVOEGSELS) t = t.replace(re, door);
  return t
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !/\d/.test(w) && !RUIS.has(w));
}

export function vergelijkSleutel(naam) {
  const woorden = vergelijkWoorden(naam);
  // Losse letters (voorletters) tellen niet mee, behalve als er verder niets is.
  const kern = woorden.filter((w) => w.length > 1);
  const basis = kern.length ? kern : woorden;
  return basis.length >= 2 || (basis[0] && basis[0].length >= 4) ? basis.slice(0, 2).join(" ") : "";
}

// Andere items met dezelfde sleutel en hetzelfde teken (betaald/ontvangen).
export function vergelijkbareItems(item, items) {
  const k = vergelijkSleutel(item.name);
  if (!k) return [];
  const teken = Math.sign(item.amount ?? item.total ?? 0);
  return items.filter((i) => i.key !== item.key && vergelijkSleutel(i.name) === k && Math.sign(i.amount ?? i.total ?? 0) === teken);
}
