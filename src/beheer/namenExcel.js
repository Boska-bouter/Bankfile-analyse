// nieuw-V4R5 — Beheer → Namenlijst naar Excel en weer inlezen (wens Boska 13-11). Puur: geen fetch, geen DOM.
// In de kolom "Nieuwe categorie" vult de beheerder een categorie in (de naam zoals in de keuzelijst, of de interne naam);
// bij inlezen wordt die als keuze van de beheerder opgeslagen. De kolom "Sleutel" koppelt de regel aan de naam in de app.
import { keuzeGroepen } from "../classification/categories.js";

export const KOPPEN = ["Naam", "Boeking", "Dossier", "Branche", "AI-voorstel", "Door beheerder", "Keuzes gebruikers", "Nieuwe categorie", "Sleutel"];
const SOORT = { zakelijk: "Zakelijk", prive: "Privé", "prive-dossier": "Privé-dossier" };

// Alle kiesbare categorieën: label en interne naam (kleine letters) → interne naam.
export function categorieZoeker() {
  const m = new Map();
  for (const g of keuzeGroepen("")) for (const o of g.opties) {
    m.set(String(o.value).toLowerCase(), o.value);
    m.set(String(o.label).toLowerCase(), o.value);
  }
  return (tekst) => m.get(String(tekst || "").trim().replace(/\s+/g, " ").toLowerCase()) || null;
}

export function namenNaarRijen(namen = [], labelVan = (c) => c) {
  const rijen = [KOPPEN];
  for (const n of namen) {
    const stemmen = Object.entries(n.stemmen || {}).sort((a, b) => b[1] - a[1]).map(([c, x]) => `${labelVan(c)}: ${x}×`).join("; ");
    rijen.push([
      n.naam, n.teken === "pos" ? "bijschrijving" : "afschrijving", SOORT[n.soort] || n.soort, n.branche || "",
      n.ai?.categorie ? labelVan(n.ai.categorie) : "", n.ai?.beheerder ? "ja" : "", stemmen, "", n.k,
    ]);
  }
  return rijen;
}

// rijen: array van arrays (eerste rij = koppen). Geeft { wijzigingen: [{ regel, k, naam, categorie }], fouten: [{ regel, naam, reden }], fout }.
export function leesNamenRijen(rijen = [], zoek = categorieZoeker()) {
  const kopIdx = rijen.findIndex((r) => Array.isArray(r) && r.some((c) => /^sleutel$/i.test(String(c ?? "").trim())));
  if (kopIdx < 0) return { wijzigingen: [], fouten: [], fout: 'Kolom "Sleutel" niet gevonden. Gebruik een bestand dat met "Naar Excel" is gemaakt.' };
  const kop = rijen[kopIdx].map((c) => String(c ?? "").trim().toLowerCase());
  const iS = kop.indexOf("sleutel"), iC = kop.indexOf("nieuwe categorie"), iN = kop.indexOf("naam");
  if (iC < 0) return { wijzigingen: [], fouten: [], fout: 'Kolom "Nieuwe categorie" niet gevonden.' };
  const wijzigingen = [], fouten = [];
  rijen.slice(kopIdx + 1).forEach((r, i) => {
    if (!Array.isArray(r)) return;
    const regel = kopIdx + i + 2;
    const tekst = String(r[iC] ?? "").trim();
    if (!tekst) return;
    const k = String(r[iS] ?? "").trim();
    const naam = String(r[iN] ?? "").trim() || k.split("|")[0];
    if (k.split("|").length !== 4) { fouten.push({ regel, naam, reden: "sleutel ontbreekt of is aangepast" }); return; }
    const categorie = zoek(tekst);
    if (!categorie) { fouten.push({ regel, naam, reden: `categorie "${tekst}" niet herkend` }); return; }
    wijzigingen.push({ regel, k, naam, categorie });
  });
  return { wijzigingen, fouten, fout: wijzigingen.length || fouten.length ? null : 'Geen regels met een "Nieuwe categorie" gevonden.' };
}
