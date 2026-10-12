// release20V3 — blok in de indicatieve aangifteberekening over huur/energie/gemeentelijke lasten voor een werkruimte.
import { computeSplitsbareCategorieTotalenVoorJaar, defaultZakelijkPercentage } from "../tax/categorySplit.js";
import { WERKRUIMTE_CATEGORIEEN, WERKRUIMTE_KORT } from "../tax/werkruimte.js";
import { eur } from "../utils/amounts.js";

// `categoryZakelijkPercentage` is de effectieve map (niet_zelfstandig staat daar al op 0).
export function werkruimteRegelsVoorJaar(year, classified, categoryZakelijkPercentage, werkruimteStatus, autoStatus, heeftLeaseAuto) {
  const soort = werkruimteStatus?.[year] || null;
  const totalen = computeSplitsbareCategorieTotalenVoorJaar(classified, year, autoStatus, !!heeftLeaseAuto);
  const regels = WERKRUIMTE_CATEGORIEEN.filter((c) => totalen[c] > 0).map((c) => {
    const raw = categoryZakelijkPercentage?.[c]?.[year];
    const pct = raw ?? defaultZakelijkPercentage(c);
    return { categorie: c, totaal: totalen[c], percentage: pct, zakelijk: totalen[c] * (pct / 100), expliciet: raw != null };
  });
  return { soort, regels };
}

export function werkruimteBlokHtml(year, classified, categoryZakelijkPercentage, werkruimteStatus, autoStatus, heeftLeaseAuto) {
  const { soort, regels } = werkruimteRegelsVoorJaar(year, classified, categoryZakelijkPercentage, werkruimteStatus, autoStatus, heeftLeaseAuto);
  if (regels.length === 0) return "";
  if (!soort && !regels.some((r) => r.expliciet)) return "";
  const koptekst = {
    bedrijfsruimte: "Zakelijk gehuurde bedrijfsruimte — huur, energie en gemeentelijke lasten",
    zelfstandig: "Zelfstandige werkruimte in de eigen woning — kosten van de werkruimte",
    niet_zelfstandig: "Werkruimte in de eigen woning (niet zelfstandig) — niet aftrekbaar",
  }[soort] || "Huur, energie en gemeentelijke lasten — soort ruimte niet aangegeven";
  const uitleg = {
    bedrijfsruimte: "Het betreft een zakelijk gehuurde ruimte. Ook als dit vanaf de privérekening is betaald, zijn het zakelijke huisvestingskosten voor het zakelijke deel (percentage hieronder).",
    zelfstandig: "Het betreft een zelfstandige werkruimte in de eigen woning (eigen ingang en voorzieningen, niet via de woonruimte bereikbaar, en aan de extra voorwaarden voldaan). De kosten zijn dan voor het zakelijke deel bedrijfskosten van de werkruimte — geen aparte aftrekpost naast de ondernemersaftrek. Controleer de voorwaarden zelf.",
    niet_zelfstandig: "Het betreft een kamer of hoek in de eigen woning (geen zelfstandige werkruimte). Huur, energie en gemeentelijke lasten zijn dan niet aftrekbaar en tellen niet mee in de winst; alleen de inrichting (bureau, stoel, verlichting) kan wel aftrekbaar zijn.",
  }[soort] || "Het is niet aangegeven of dit een zakelijk gehuurde bedrijfsruimte of een werkruimte in de eigen woning is. De app rekent met de ingestelde percentages. Geef dit aan in de app, want voor een werkruimte in de eigen woning gelden andere regels.";
  const totaalZakelijk = regels.reduce((a, r) => a + r.zakelijk, 0);
  return `
  <div class="totaal-kaart">
    <p class="aannames-kop">${koptekst}</p>
    <p class="toelichting">${uitleg}</p>
    <table class="samenvatting-scenarios"><thead><tr><th>Kostensoort${soort ? ` (${WERKRUIMTE_KORT[soort]})` : ""} ${year}</th><th class="num">Totaal (bruto)</th><th class="num">% zakelijk</th><th class="num">Zakelijk deel</th></tr></thead><tbody>
      ${regels.map((r) => `<tr><td>${r.categorie}</td><td class="num">${eur(r.totaal)}</td><td class="num">${r.percentage}%</td><td class="num">${eur(r.zakelijk)}</td></tr>`).join("")}
      <tr class="total"><td>Totaal</td><td class="num">${eur(regels.reduce((a, r) => a + r.totaal, 0))}</td><td></td><td class="num">${eur(totaalZakelijk)}</td></tr>
    </tbody></table>
  </div>`;
}
