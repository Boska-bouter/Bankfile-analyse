// beide-V8R2 — zoeken in "Mijn antwoorden" (Eenvoudig, wens Boska 27-10): op naam, categorie, bedrag of datum.
// - Bedrag: "40" vindt boekingen van € 40,00 t/m € 40,99; "40,0" of "40.02" zoekt preciezer (begint met). Teken telt niet.
// - Datum: met "-" of "/", bijv. "12-03-2026", "03-2026", "12-03" of "2026-03".
// Geeft null (geen treffer) of { boeking } met de eerste boeking die op bedrag/datum past (null bij naam/categorie).
const twee = (n) => String(n).padStart(2, "0");
const datumTekst = (d) => (d instanceof Date && !isNaN(d) ? [`${twee(d.getDate())}-${twee(d.getMonth() + 1)}-${d.getFullYear()}`, `${d.getFullYear()}-${twee(d.getMonth() + 1)}-${twee(d.getDate())}`] : []);
const bedragTekst = (b) => Math.abs(b).toFixed(2).replace(".", ",");

export function soortZoekterm(z) {
  const t = String(z || "").trim();
  if (!t) return null;
  if (/^\d{1,4}([-/]\d{1,4}){1,2}$/.test(t)) return { soort: "datum", t: t.replace(/\//g, "-").split("-").map((x) => (x.length === 1 ? twee(x) : x)).join("-") };
  if (/^[−-]?\s?€?\s?\d+([.,]\d{0,2})?$/.test(t)) return { soort: "bedrag", t: t.replace(/[−€\s-]/g, "").replace(".", ",") };
  return { soort: "tekst", t: t.toLowerCase() };
}

export function zoekAntwoord(rij, term) {
  if (!term) return { boeking: null };
  const tekstTreffer = String(rij.naam || "").toLowerCase().includes(term.t) || String(rij.categorieen ? rij.categorieen.join(" ") : rij.categorie || "").toLowerCase().includes(term.t);
  if (term.soort === "tekst") return tekstTreffer ? { boeking: null } : null;
  const boekingen = rij.boekingen || [];
  const b = term.soort === "bedrag"
    ? boekingen.find((x) => (term.t.includes(",") ? bedragTekst(x.bedrag).startsWith(term.t) : bedragTekst(x.bedrag).split(",")[0] === term.t))
    : boekingen.find((x) => datumTekst(x.datum).some((d) => d.includes(term.t)));
  if (b) return { boeking: b };
  return tekstTreffer ? { boeking: null } : null; // bijv. "2394" in "SB TANK 2394"
}
